# Especificación Funcional: 003 - Pipeline y Motor Automatizado de Publicación del Blog
**Feature ID:** `003_blog_automation_engine`  
**Estado:** DRAFT / PROPUESTA  
**Única Fuente de Verdad:** `AGENTS.md` y `docs/constitution.md`

---

## 1. Resumen Ejecutivo y Planteamiento del Problema
Actualmente, los 7 artículos en `public/blog/posts/` y el catálogo en `public/blog/index.html` fueron construidos de manera artesanal y manual. Aunque existe un script inicial en `scripts/generate_blog_post.js`, este contiene un listado estático predefinido (`TOPIC_POOL`), no admite ingesta externa (Markdown con frontmatter o payloads JSON vía Webhook/API), no actualiza el grid HTML estático de `public/blog/index.html`, y carece de un endpoint protegido para integraciones de automatización externa (Make, n8n o agentes autónomos).

La **Spec 003** tiene como objetivo crear un pipeline robusto, idempotente y desacoplado de publicación de contenidos que:
1. Convierta artículos en Markdown (con frontmatter) o payloads JSON a páginas HTML estáticas optimizadas para SEO/GEO y Schema.org.
2. Actualice atómicamente el catálogo JSON (`public/blog/posts.json`), el índice estático SSR (`public/blog/index.html`) y el mapa del sitio (`public/sitemap.xml`).
3. Exponga una API segura (`POST /api/blog-publish`) protegida por Bearer Token (`BLOG_PUBLISH_SECRET`) para ingesta remota desatendida.
4. Mantenga una estricta adhesión a las directrices de `AGENTS.md` (números telefónicos oficiales, enlaces de Cal.com, sin dependencias pesadas innecesarias).

---

## 2. Requisitos del Sistema (Notación EARS)

### 2.1. Requisitos Ubicuos (Ubiquitous Requirements)
- **UB-01:** El motor de publicación deberá admitir ejecución local por CLI (`node scripts/publish-blog.js <archivo.md>`) y ejecución remota vía Webhook HTTP (`POST /api/blog-publish`).
- **UB-02:** El compilador deberá aceptar documentos en formato Markdown con Frontmatter YAML o payloads JSON directos con las propiedades canónicas: `title`, `slug`, `author`, `date`, `excerpt`, `category`, `content`, `tags`, `image`, `readTime` y `faq`.
- **UB-03:** Todo artículo generado en `public/blog/posts/[slug].html` deberá contar con metadatos completos: `<title>`, `<meta name="description">`, canonical URL, OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type="article"`), Twitter Card y Schema.org JSON-LD (`Article` o `TechArticle` y opcionalmente `FAQPage`).
- **UB-04:** Todo artículo generado deberá incluir los banners de conversión oficiales: botón hacia `#cotizador` y enlace directo a la agenda técnica oficial en Cal.com (`https://cal.com/cuatropuntas.com/visita-tecnica`).
- **UB-05:** El proceso de publicación deberá ser idempotente: si se publica un artículo con un `slug` preexistente, deberá actualizar el archivo HTML, reemplazar la entrada en `posts.json`, refrescar la tarjeta en `public/blog/index.html` y mantener `sitemap.xml` sin entradas duplicadas.

### 2.2. Requisitos Basados en Eventos (Event-Driven Requirements)
- **EV-01 (CLI Ingestion):** Cuando el operador ejecute `node scripts/publish-blog.js <ruta-archivo.md>`, el script deberá parsear el frontmatter y el contenido Markdown, compilar el HTML en `public/blog/posts/[slug].html`, actualizar `posts.json`, inyectar la tarjeta en `index.html`, registrar la URL en `sitemap.xml` y terminar con código de salida 0.
- **EV-02 (API Ingestion):** Cuando se reciba una petición `POST` en `/api/blog-publish` con el encabezado `Authorization: Bearer <BLOG_PUBLISH_SECRET>` y un cuerpo JSON válido, el endpoint deberá compilar y persistir el artículo, devolviendo HTTP 200 con `{ success: true, slug, url, message }`.
- **EV-03 (Index Synchronization):** Al generarse un nuevo post, el compilador deberá inyectar la tarjeta HTML correspondiente en el contenedor `#postsGrid` de `public/blog/index.html` ordenado cronológicamente (más reciente primero), asegurando la indexación previa para motores de búsqueda que no ejecutan JavaScript.

### 2.3. Requisitos de Situaciones No Deseadas (Unwanted Behavior Requirements)
- **UN-01 (Autenticación Inválida):** Si una petición `POST` a `/api/blog-publish` no incluye el encabezado `Authorization` o el token no coincide exactamente con `process.env.BLOG_PUBLISH_SECRET`, el sistema deberá rechazar la solicitud de inmediato con HTTP 401 Unauthorized y `{ error: "No autorizado" }`.
- **UN-02 (Carga Incompleta / Faltante):** Si el payload carece de campos obligatorios (`title`, `slug`, `content`, `excerpt`), el sistema deberá responder con HTTP 400 Bad Request detallando los campos faltantes, sin alterar ningún archivo en disco.
- **UN-03 (Teléfonos u URLs Prohibidas):** Si el contenido del post contiene menciones al número obsoleto purgado `+56 9 6348 2439` (o su formato compacto `56963482439`), el compilador deberá rechazar la publicación o sanitizar automáticamente el texto reemplazándolo por el número oficial de captura `+56 9 2738 4075`.
- **UN-04 (Fallback por Error en Tiempo de Ejecución):** Si ocurre un error de lectura/escritura en el sistema de archivos durante la publicación, la API deberá capturar la excepción, registrar el error y responder con HTTP 500 Internal Server Error sin corromper `posts.json` ni `sitemap.xml`.

### 2.4. Requisitos Opcionales y Especiales (Optional Requirements)
- **OP-01 (Soporte de FAQ y Schema FAQPage):** Donde el artículo incluya una sección de preguntas frecuentes (`faq: [{ question, answer }]` o bloque FAQ en Markdown), el renderizador deberá generar tanto el componente visual con estilo Tailwind (`bg-orange-50`) como el nodo estructurado Schema.org `FAQPage`.
- **OP-02 (Tablas Técnicas Markdown):** Donde el contenido contenga tablas en Markdown (`| Header | ... |`), el renderizador deberá convertirlas en tablas HTML responsivas envueltas en `<div class="overflow-x-auto">` con clases Tailwind uniformes (`border-collapse`, `divide-y`, etc.).
- **OP-03 (Cálculo Automático de ReadTime):** Si el frontmatter o payload no define `readTime`, el sistema deberá calcularlo automáticamente en base a una tasa estándar de 200 palabras por minuto (ej: `Math.ceil(words / 200) + ' min de lectura'`).

---

## 3. Criterios de Aceptación Técnicos
1. **Verificación Sintáctica:** `node -c scripts/publish-blog.js` y `node -c api/blog-publish.js` deben retornar código de salida 0.
2. **Prueba de Ingesta CLI:** Compilación de un post de prueba (`tests/fixtures/post-test.md`) generando exitosamente el archivo HTML, la entrada en `posts.json`, la tarjeta en `index.html` y la URL en `sitemap.xml`.
3. **Prueba de Seguridad API:**
   - Petición sin token &rarr; 401 Unauthorized.
   - Petición con token incorrecto &rarr; 401 Unauthorized.
   - Petición con token correcto &rarr; 200 OK con URL canónica accesible.
4. **Prueba de Integridad de Enlaces:** El post generado no debe contener enlaces a archivos inexistentes, estilos rotos ni números prohibidos.
5. **Cero Regresiones:** El 100% de las 39 pruebas existentes en Playwright deben continuar pasando en verde.
