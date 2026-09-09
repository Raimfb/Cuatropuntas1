# Especificación de Requerimientos: Spec 012 - Generación Automatizada de Portadas con IA para el Blog
**Feature ID:** `012_automated_blog_cover_generation`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** APPROVED & IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Propósito
Actualmente, el pipeline automatizado de publicación del blog (`scripts/auto-curate-and-publish.js` y `scripts/publish-blog.js`) asigna imágenes preexistentes compartidas por categoría cuando se genera un artículo. Esta redundancia visual degrada la frescura editorial de la marca y perjudica la tasa de clics (CTR) en Google Discover, Google Search y redes sociales.

La **Spec 012** implementa un subsistema autónomo de generación de portadas fotográficas hiperrealistas impulsadas por IA (`GEMINI_API_KEY`), adaptadas contextualmente al contenido técnico de cada artículo. Cada portada se procesa localmente mediante un pipeline de compresión (FFmpeg / Pillow) con relación de aspecto estricta 16:9 (1200x675 px), formato WebP de alto rendimiento (< 100 KB) y persistencia única en `public/blog/images/${slug}.webp`, garantizando cero impacto negativo en Core Web Vitals (LCP) y tolerancia a fallos mediante un mecanismo de contingencia (*graceful fallback*).

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Requerimientos Ubicuos (Ubiquitous Requirements)
- **[EARS-012-01] Unicidad de Portada por Artículo:** El sistema **DEBE** asociar cada artículo generado con un archivo físico de imagen único almacenado en `public/blog/images/${slug}.webp`. Bajo ninguna circunstancia se deberán reutilizar imágenes entre artículos distintos.
- **[EARS-012-02] Restricciones Estéticas y Arquitectónicas del Prompt:** Todo prompt visual generado **DEBE** describir estrictamente:
  1. Fotografía de arquitectura residencial contemporánea situada en Santiago de Chile.
  2. Materialidades y técnicas constructivas coherentes con Cuatropuntas (perfiles de acero galvanizado Metalcom, paneles SIP con alma EPS, albañilería confinada/armada, ventanales termopanel herméticos, radier o cubiertas térmicas).
  3. Iluminación natural realista (luz solar matutina o atardecer del valle central chileno).
  4. Prohibición expresa (negative prompt): ausencia total de personas, rostros, siluetas humanas, textos superpuestos, marcas de agua, logotipos o estética de render 3D sintético/caricaturesco.
- **[EARS-012-03] Presupuesto de Rendimiento y Dimensiones (LCP):** Toda imagen procesada **DEBE** cumplir estrictamente:
  * **Formato:** WebP (`image/webp`).
  * **Relación de Aspecto:** 16:9 exacta con dimensiones canónicas de $1200 \times 675$ píxeles.
  * **Presupuesto de Peso:** Estrictamente menor a **100 KB** ($< 102{,}400$ bytes) para garantizar un LCP óptimo (< 1.2s en móvil).
- **[EARS-012-04] Sincronización en Frontmatter y Metadatos:** El pipeline **DEBE** registrar la ruta relativa `/blog/images/${slug}.webp` en el campo `image` del frontmatter YAML del Markdown y sincronizar automáticamente las etiquetas `og:image`, `twitter:image` y la entidad Schema.org `TechArticle` en el HTML final compilado.

### 2.2. Requerimientos Basados en Eventos (Event-Driven Requirements)
- **[EARS-012-05] Disparo Durante el Ciclo Editorial Semanal:** **Cuando** el script `scripts/auto-curate-and-publish.js` genere el borrador Markdown con Gemini, el sistema **DEBE** sintetizar el prompt visual contextual a partir del título, categoría y resumen técnico, y gatillar la generación de la imagen correspondiente.
- **[EARS-012-06] Procesamiento Automático Post-Descarga:** **Cuando** la API retorne el buffer de la imagen cruda (PNG/JPEG), el sistema **DEBE** canalizarlo automáticamente hacia el motor de compresión local (FFmpeg 7.1 o Pillow en Python) para redimensionar, recortar al ratio 16:9 y codificar a WebP optimizado antes de invocar a `publish-blog.js`.

### 2.3. Requerimientos de Estado (State-Driven Requirements)
- **[EARS-012-07] Comportamiento en Modo Simulación (`--dry-run`):** **Mientras** el script se ejecute con el parámetro `--dry-run`, el sistema **DEBE** generar y validar el prompt visual en consola y simular la generación sin consumir cuota innecesaria de la API ni escribir archivos en `public/blog/images/`.

### 2.4. Requerimientos No Deseados y Manejo de Errores (Unwanted Behavior / Fail-Safe)
- **[EARS-012-08] Resiliencia ante Fallo de Cuota o Red (Graceful Fallback):** **Si** la llamada al modelo de generación de imagen falla por límite de cuota (HTTP 429), ausencia de permisos en la clave API, indisponibilidad de red o timeout, el sistema **DEBE**:
  1. Registrar un `console.warn` explicativo sin arrojar excepciones fatales ni abortar el proceso (`process.exit(1)`).
  2. Activar un fallback limpio asignando una imagen estricta y limpia del catálogo base para no paralizar el cron de los viernes.
- **[EARS-012-09] Prevención de Sobrepeso (> 100 KB):** **Si** la codificación inicial a WebP excede los 100 KB, el pipeline de compresión **DEBE** iterar ajustando dinámicamente el factor de calidad (`quality` de 80 a 70 o 65) hasta que el archivo final cumpla el límite de 100 KB.

---

## 3. Criterios de Aceptación Técnicos
1. Existe el módulo `scripts/generate-blog-cover.js` (o función integrada certificada) capaz de sintetizar el prompt visual y procesar la imagen a WebP 16:9 (< 100 KB).
2. El script `scripts/auto-curate-and-publish.js` invoca el generador de portada vinculando el archivo a `public/blog/images/${slug}.webp`.
3. `scripts/publish-blog.js` respeta la ruta `/blog/images/${slug}.webp` en Open Graph, Twitter Cards, Schema.org `TechArticle` y la tarjeta SSR de `public/blog/index.html`.
4. El pipeline ejecuta de forma no destructiva: si falla la API de imágenes, el cron se completa exitosamente mediante *graceful fallback*.
5. La suite de pruebas automatizadas `tests/blog-image-generation.spec.js` valida dimensiones, peso < 100 KB, formato WebP y unicidad de rutas.
6. La suite completa del repositorio mantiene 0 regresiones.
