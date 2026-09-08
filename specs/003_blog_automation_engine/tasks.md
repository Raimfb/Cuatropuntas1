# Tasks Breakdown: 003 - Pipeline y Motor Automatizado de Publicación del Blog
**Feature ID:** `003_blog_automation_engine`  
**Estado:** COMPLETED  
**Regla Estricta:** No marcar ninguna tarea como completada sin su comando de verificación ejecutado con éxito.

---

## Fase 1: Pruebas Automatizadas Primero (TDD / Red Phase)
- [x] **T01: Crear suite de pruebas unitarias y de integración (`tests/blog-automation.spec.js`)**
  - Archivo: `tests/blog-automation.spec.js`
  - Crear archivo de prueba fixture `tests/fixtures/test-post.md` con frontmatter, secciones H2/H3, tabla comparativa, FAQs y notas.
  - Diseñar tests para:
    1. Parseo de frontmatter y compilación a HTML estático en `public/blog/posts/`.
    2. Validación de metadatos SEO, OpenGraph y nodos Schema.org (`Article` + `FAQPage`).
    3. Inserción ordenada en `public/blog/posts.json` y tarjeta SSR en `public/blog/index.html`.
    4. Incorporación sin duplicados en `public/sitemap.xml`.
    5. Seguridad del endpoint `api/blog-publish.js` (401 sin token, 400 faltante, 200 éxito).
    6. Limpieza automática de artefactos temporales tras la ejecución de las pruebas.
  - *Comando de verificación:* `npx playwright test tests/blog-automation.spec.js` (Fase roja comprobada con 7 fallos iniciales).

---

## Fase 2: Motor Compilador Central (Green Phase)
- [x] **T02: Implementar módulo compilador `scripts/publish-blog.js`**
  - Desarrollar parser liviano de Frontmatter YAML y convertidor de Markdown a HTML (encabezados, listas, tablas GFM, notas y FAQs).
  - Implementar plantilla canónica HTML que incorpore Tailwind, Schema.org, metadatos OpenGraph, CTA a `#cotizador`, botón a Cal.com y botón flotante de WhatsApp oficial (`+56 9 2738 4075`).
  - Implementar sanitización de textos para purgar clichés de IA y números obsoletos según `AGENTS.md`.
  - Exportar función pura `compileAndPublishPost(postData, options)` para uso modular.
  - *Comando de verificación:* `node -c scripts/publish-blog.js` (Código de salida 0).

- [x] **T03: Implementar sincronización atómica de catálogos e índices**
  - Implementar actualización de `public/blog/posts.json` prepending o actualizando por `slug`.
  - Implementar inyección o actualización de la tarjeta HTML en `#postsGrid` dentro de `public/blog/index.html`.
  - Implementar inyección de la URL canónica en `public/sitemap.xml`.
  - *Comando de verificación:* `npx playwright test tests/blog-automation.spec.js -g "sincronización"` (Pruebas de catálogos en verde).

---

## Fase 3: Endpoint Serverless Seguro (Webhooks)
- [x] **T04: Implementar endpoint `api/blog-publish.js`**
  - Implementar handler serverless para Vercel (`POST /api/blog-publish`).
  - Validación de seguridad con Bearer Token contra `process.env.BLOG_PUBLISH_SECRET`.
  - Soporte de ingesta vía Markdown puro (`{ markdown: "..." }`) o JSON estructurado.
  - Respuestas HTTP estructuradas (400 si faltan campos, 401 si no está autorizado, 500 en error interno, 200 con `{ success: true, slug, url }`).
  - *Comando de verificación:* `node -c api/blog-publish.js` (Código de salida 0).

---

## Fase 4: Entorno Local y Documentación
- [x] **T05: Montar endpoint en `local-dev-server.js` y actualizar `.env.example`**
  - Registrar ruta `POST /api/blog-publish` en `local-dev-server.js` para desarrollo y pruebas locales.
  - Documentar `BLOG_PUBLISH_SECRET` en `.env.example`.
  - *Comando de verificación:* `node -c local-dev-server.js` (Código de salida 0).

---

## Fase 5: Verificación Integral y Certificación Final
- [x] **T06: Ejecución completa de la suite de pruebas Playwright**
  - Ejecutar `tests/blog-automation.spec.js` validando el 100% de los casos de prueba de publicación (7/7 en verde).
  - Ejecutar `npx playwright test` confirmando cero regresiones en los 39 tests existentes más la nueva suite (46/46 en verde).
  - *Comando de verificación:* `npx playwright test` (46 passed en 17.2s).
