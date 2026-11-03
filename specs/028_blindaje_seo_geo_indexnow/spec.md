# Especificación 028: Blindaje Integral SEO Canónico, GEO 2026 e IndexNow
**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-03  
**Estado:** Aprobado / En Ejecución  

---

## 1. Contexto y Objetivos
Completar el blindaje técnico para motores de búsqueda tradicionales (Google, Bing) y motores generativos de respuesta (ChatGPT Search, Perplexity, Gemini, Claude, Apple Intelligence) eliminando cadenas de redirección 308 por extensiones `.html`, sincronizando precios en Schema.org con la matriz oficial SSOT, completando datos estructurados (`BreadcrumbList`, `FAQPage`, `WebPage`), habilitando directivas de snippets ilimitados para IA y desplegando el protocolo de indexación instantánea **IndexNow**.

---

## 2. Requisitos Funcionales y Técnicos (Sintaxis EARS)

### Fase 1: Eliminación Total de Extensiones `.html` (Cero Redirecciones 308)
- **REQ-028-01 (Compilador Limpio):** Cuando `scripts/publish-blog.js` compile un artículo, el sistema DEBE generar URLs limpias sin `.html` en `<link rel="canonical">`, `<meta property="og:url">`, Schema `@id`, tarjetas de `public/blog/index.html` y entradas de `public/sitemap.xml`.
- **REQ-028-02 (Migración de los 17 Posts):** Cuando un rastreador inspeccione cualquiera de los 17 artículos en `public/blog/posts/*.html`, el canonical, OpenGraph y Schema `@id` DEBEN apuntar a `https://www.cuatropuntas.com/blog/posts/[slug]` sin `.html`.
- **REQ-028-03 (Enlaces Internos y Catálogos):** Cuando se consulten `public/blog/index.html`, `public/sitemap.xml`, `public/llms-full.txt` y `scripts/publish-facebook.js`, ningún enlace a artículos del blog DEBE terminar en `.html`.
- **REQ-028-04 (Cobertura Completa en Sitemap):** Cuando se lea `public/sitemap.xml`, el archivo DEBE incluir `https://www.cuatropuntas.com/privacidad`.

### Fase 2: Corrección SSOT de Precios y Enriquecimiento de Schemas
- **REQ-028-05 (SSOT en Remodelaciones):** Cuando se consulte el Schema `AggregateOffer` en `public/servicios/remodelaciones.html`, el sistema DEBE declarar `"lowPrice": "11"` y `"highPrice": "13"` (UF/m²).
- **REQ-028-06 (Breadcrumbs en Blog):** Cuando un motor analice `public/blog/index.html` o cualquiera de los 17 posts del blog, el bloque JSON-LD DEBE incluir un nodo `BreadcrumbList` válido.
- **REQ-028-07 (FAQPage y WebPage):** Cuando se analice `public/blog/posts/metalcon-vs-albanileria-vs-sip.html`, DEBE incluir un nodo `FAQPage`. Cuando se analicen `public/politicas.html` y `public/privacidad.html`, DEBEN incluir un bloque JSON-LD de tipo `WebPage`.

### Fase 3: Directivas IA 2026 e IndexNow
- **REQ-028-08 (Bots de Búsqueda IA):** Cuando un agente revise `public/robots.txt`, DEBEN figurar explícitamente con `Allow: /` los agentes `OAI-SearchBot`, `ChatGPT-User` y `CCBot`.
- **REQ-028-09 ( Directivas de Snippets Ilimitados):** Cuando un rastreador cargue cualquier página HTML o consulte cabeceras en `vercel.json`, el sistema DEBE declarar `max-image-preview:large, max-snippet:-1, max-video-preview:-1`.
- **REQ-028-10 (Protocolo IndexNow):** El repositorio DEBE contar con una clave de verificación en `public/[key].txt`, un script `scripts/indexnow-notify.js` y su integración en `.github/workflows/weekly-blog.yml`.

### Fase 4: Verificación y Guardia Automatizada
- **REQ-028-11 (Guardia Playwright):** La suite `tests/seo-geo-optimization.spec.js` y el resto de tests existentes en `tests/` DEBEN pasar al 100% sin regresiones.
