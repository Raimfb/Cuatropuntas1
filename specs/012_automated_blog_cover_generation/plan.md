# Plan Técnico de Arquitectura: Spec 012 - Generación Automatizada de Portadas con IA
**Feature ID:** `012_automated_blog_cover_generation`  
**Estado:** APPROVED & IMPLEMENTED  

---

## 1. Arquitectura General del Flujo

```text
       ┌────────────────────────────────────────────────────────┐
       │   GitHub Actions (weekly-blog.yml - Viernes 09:00 CL)  │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │  Curaduría & Generación de Texto con Gemini            │
       │  (scripts/auto-curate-and-publish.js)                  │
       └───────────────────────────┬────────────────────────────┘
                                   │ { title, slug, excerpt, category }
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │  Módulo Especializado: scripts/generate-blog-cover.js   │
       ├────────────────────────────────────────────────────────┤
       │ 1. buildVisualPrompt(topicData):                       │
       │    - Arquitectura residencial Santiago de Chile        │
       │    - Materiales: Metalcom, SIP, Albañilería, Vidrio    │
       │    - Negative: No people, no text, no watermarks       │
       │                                                        │
       │ 2. fetchAiImage(prompt, apiKey):                       │
       │    - Intenta generar vía API Google GenAI / Imagen     │
       │    - Si 429 Quota / Offline -> GRACEFUL FALLBACK       │
       │                                                        │
       │ 3. processImageToWebp(rawBuffer, targetPath):          │
       │    - Dual-Engine: FFmpeg 7.1 o Python Pillow           │
       │    - Redimensionamiento y recorte 16:9 (1200x675 px)   │
       │    - Compresión WebP dinámica (Target: < 100 KB)       │
       │    - Guarda en public/blog/images/${slug}.webp         │
       └───────────────────────────┬────────────────────────────┘
                                   │ image: "/blog/images/${slug}.webp"
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │  Compilación y Sincronización (publish-blog.js)        │
       ├────────────────────────────────────────────────────────┤
       │ - Inyecta ruta única en posts.json                     │
       │ - Genera og:image y twitter:image absolutos            │
       │ - Schema.org TechArticle con imagen canónica           │
       │ - Genera tarjeta SSR en public/blog/index.html         │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │  Verificación de Calidad (Playwright)                  │
       │  (tests/blog-image-generation.spec.js)                 │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Componentes Técnicos Detallados

### 2.1. Ingeniería del Prompt Visual (`buildVisualPrompt`)
El generador sintetiza un prompt arquitectónico fotorrealista basado en el tema técnico:

* **Sintaxis Base:**
  > `"Architectural photography of a contemporary modern residential house in Santiago de Chile. Built with [Metalcom steel framing / SIP panels / solid reinforced masonry], large double-glazed hermetic windows (termopanel), clean geometry, flat or low-pitch roof, concrete foundation. Clear blue sky with Andean mountain foothills in soft natural morning sunlight. Editorial architectural magazine quality, 8k resolution, photorealistic exterior view."`
* **Negative Prompt Obligatorio:**
  > `"people, humans, faces, silhouettes, typography, text, watermark, signature, logo, low resolution, 3d cartoon render, blur, distorted, surreal"`

### 2.2. Motor de Generación y Graceful Fallback (`generateBlogCover`)
* **Endpoint / SDK:** Conecta mediante `process.env.GEMINI_API_KEY` o `process.env.GOOGLE_GENERATIVE_AI_API_KEY`.
* **Manejo de Contingencia (Graceful Fallback):**
  Si la llamada arroja error (ej: cuota gratuita `limit: 0`, HTTP 429 o falta de red):
  1. Registra advertencia pedagógica en log: `⚠️ [COVER GENERATOR] Fallo en API visual (${err.message}). Activando fallback limpio...`.
  2. Selecciona un asset limpio de base según la categoría del post (`/blog_precios_construccion.jpg`, `/material_semi_ligero_sip_1770072450181.webp`, etc.).
  3. Procesa dicho asset a `public/blog/images/${slug}.webp` mediante el pipeline de optimización, asegurando que **cada artículo mantenga un asset físico independiente con su propio slug**.
  4. Garantiza que el proceso **nunca se caiga** y el cron de GitHub Actions termine exitosamente en verde.

### 2.3. Pipeline Dual de Procesamiento a WebP (`processImageToWebp`)
Para garantizar compatibilidad total tanto en Windows local como en Ubuntu runner (`ubuntu-latest` de GitHub Actions):
* **Motor A (FFmpeg):** Pre-instalado por defecto en GitHub Actions Ubuntu runners (`/usr/bin/ffmpeg`).
  ```bash
  ffmpeg -i <input> -vf "scale=1200:675:force_original_aspect_ratio=increase,crop=1200:675" -c:v libwebp -quality 80 -y <output.webp>
  ```
* **Motor B (Python Pillow):** Pre-instalado en entorno Windows local (`python -c "from PIL import Image..."`).
  ```python
  from PIL import Image
  img = Image.open(input_path)
  # Resize con proporción 16:9 y crop centrado a 1200x675
  # Guardar como WebP optimizado con quality=80
  ```
* **Bucle Dinámico de Presupuesto de Peso:**
  Si el archivo resultante es $\ge 100\text{ KB}$, se re-ejecuta con `quality = 70`, y si persiste, con `quality = 60`, garantizando que siempre sea $< 100\text{ KB}$.

### 2.4. Integración con `auto-curate-and-publish.js` y `publish-blog.js`
1. En `scripts/auto-curate-and-publish.js`:
   * Tras generar el Markdown, llama a `await generateBlogCover(topicData, slug, options)`.
   * Sustituye o inyecta en el frontmatter: `image: "/blog/images/${slug}.webp"`.
2. En `scripts/publish-blog.js`:
   * Verifica la existencia de `public/blog/images/` (creando la carpeta si no existe).
   * Genera las URLs canónicas absolutas: `https://www.cuatropuntas.com/blog/images/${slug}.webp`.

---

## 3. Plan de Verificación y Pruebas (`tests/blog-image-generation.spec.js`)

Se diseñará una suite de pruebas automatizadas con 5 casos exhaustivos:
1. **T01.1 (Módulo y Prompts):** Verifica que `scripts/generate-blog-cover.js` exporte las funciones clave y genere prompts fotográficos que prohíban personas y textos.
2. **T01.2 (Compresión a WebP 16:9 y < 100 KB):** Valida que el motor de compresión procese una imagen fixture produciendo un archivo WebP exacto de 1200x675 px y con peso $< 100\text{ KB}$.
3. **T01.3 (Graceful Fallback):** Simula una falla de API (clave inválida o error 429) y verifica que el módulo genere la imagen sin lanzar errores ni interrumpir el flujo.
4. **T01.4 (Unicidad y Metadatos):** Valida que el compilador `publish-blog.js` sincronice correctamente `public/blog/images/${slug}.webp` en `posts.json`, `index.html`, OpenGraph y Schema.org `TechArticle`.
5. **T01.5 (Cero Regresiones):** Ejecución completa de la suite global para certificar 100% de tests en verde.
