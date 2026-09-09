# Desglose de Tareas: Spec 012 - Generación Automatizada de Portadas con IA
**Feature ID:** `012_automated_blog_cover_generation`  
**Estado:** COMPLETED & CERTIFIED  

---

## Tareas de Implementación

- [x] **T01: Crear módulo central `scripts/generate-blog-cover.js`**
  - Implementar la función `buildVisualPrompt(topicData)` con las restricciones arquitectónicas de Santiago de Chile (Metalcom/SIP/Albañilería, termopanel, iluminación natural) y negative prompt estricto (sin personas, sin textos ni logos).
  - Implementar el motor dual de compresión `processImageToWebp(inputBufferOrPath, targetPath, options)` compatible con FFmpeg (Ubuntu CI) y Python Pillow (Windows local).
  - Configurar redimensionamiento y recorte centrado a 16:9 ($1200 \times 675\text{ px}$).
  - Implementar bucle dinámico de ajuste de calidad (`quality: 80 -> 70 -> 60`) garantizando un peso estricto $< 100\text{ KB}$.
  - *Comando de verificación:* `node -c scripts/generate-blog-cover.js` (Código 0 exitoso).

- [x] **T02: Implementar llamada a API de imágenes y mecanismo de Graceful Fallback**
  - Conectar llamada a la API de generación de imágenes con `process.env.GEMINI_API_KEY` o `process.env.GOOGLE_GENERATIVE_AI_API_KEY`.
  - Implementar bloque `try/catch` con *graceful fallback*: si la API responde con cuota excedida (429), límite 0 o error de red, registrar advertencia en consola y procesar un asset limpio del catálogo hacia `public/blog/images/${slug}.webp` sin arrojar error fatal.
  - Soportar el flag `--dry-run` para simulación limpia sin llamadas a la API ni escritura de archivos.
  - *Comando de verificación:* `node scripts/generate-blog-cover.js --dry-run` (Código 0 exitoso).

- [x] **T03: Integrar generación de portada en `scripts/auto-curate-and-publish.js`**
  - Invocar `generateBlogCover` tras la redacción del borrador en el pipeline semanal.
  - Asignar la ruta `/blog/images/${slug}.webp` en el frontmatter del archivo Markdown generado en `content/drafts/${slug}.md`.
  - *Comando de verificación:* `node scripts/auto-curate-and-publish.js --dry-run` (Código 0 exitoso).

- [x] **T04: Sincronizar directorio de imágenes y metadatos en `scripts/publish-blog.js`**
  - Asegurar la creación recursiva de `public/blog/images/` si no existe.
  - Verificar que el compilador inyecte la ruta canónica `/blog/images/${slug}.webp` en:
    * `public/blog/posts.json`
    * Metatags `<meta property="og:image">` y `<meta property="twitter:image">`
    * Schema.org `TechArticle`
    * Tarjeta SSR en `public/blog/index.html`
  - *Comando de verificación:* `node -c scripts/publish-blog.js` (Código 0 exitoso).

- [x] **T05: Implementar suite automatizada `tests/blog-image-generation.spec.js` y certificar regresiones**
  - Escribir pruebas unitarias e integrales para:
    1. Exportaciones y sintaxis del prompt visual (restricciones arquitectónicas y negative prompt).
    2. Compresión a WebP (resolución $1200 \times 675$, formato WebP, peso $< 100\text{ KB}$).
    3. Resiliencia del *graceful fallback* ante fallos de cuota/API.
    4. Unicidad de ruta de imagen por slug en el HTML compilado y `posts.json`.
  - Ejecutar la suite global de pruebas Playwright (`tests/`) garantizando 0 regresiones.
  - *Comando de verificación:* `npx playwright test tests/blog-image-generation.spec.js` (5/5 passed) y `npx playwright test` (82/82 passed).
