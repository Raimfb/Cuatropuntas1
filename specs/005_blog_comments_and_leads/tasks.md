# Tasks Breakdown: 005 - Sistema de Comentarios y Captura de Leads para Email Marketing
**Feature ID:** `005_blog_comments_and_leads`  
**Estado:** COMPLETED  
**Regla Estricta:** No marcar ninguna tarea como completada sin su comando de verificación ejecutado con éxito.

---

## Fase 1: Pruebas Automatizadas Primero (TDD / Red Phase)
- [x] **T01: Crear suite de pruebas de comentarios y captura de leads (`tests/blog-comments.spec.js`)**
  - Archivo: `tests/blog-comments.spec.js`
  - Diseñar casos de prueba para:
    1. Renderizado del contenedor `#blog-comments-container`, estado bloqueado y copy persuasivo de Email Marketing.
    2. Identificación por formulario alternativo (Nombre + Email + Checkbox) y decodificación de credenciales.
    3. Validación y rechazo de comentarios menores a 10 caracteres o vacíos.
    4. Manejo de métodos `GET` y `POST` en `api/blog-comments.js` con sanitización anti-XSS.
    5. Resiliencia fail-safe de persistencia en Sheets ante timeout de 3.5s o webhook no configurado.
  - *Comando de verificación:* `npx playwright test tests/blog-comments.spec.js` (Fase roja confirmada con 10 fallos iniciales).

---

## Fase 2: Backend Serverless y Persistencia Fail-Safe (Green Phase)
- [x] **T02: Implementar endpoint serverless en `api/blog-comments.js`**
  - Crear `api/blog-comments.js` con soporte para `GET`, `POST` y `OPTIONS`.
  - Integrar protección contra bots y honeypots vía `api/_botGuard.js`.
  - Implementar sanitización estricta contra inyección XSS (`escapeHtml`).
  - Implementar almacenamiento local/catálogo atómico en `data/blog-comments.json`.
  - Implementar `persistCommentLeadToGoogleSheets` con `AbortController` (timeout de 3.5s) hacia `GOOGLE_SHEETS_WEBHOOK_URL` (no bloqueante).
  - *Comando de verificación:* `node -c api/blog-comments.js` (Código de salida 0) y tests de backend 6/6 en verde.

---

## Fase 3: Componente Frontend Reactivo
- [x] **T03: Implementar componente modular en `public/blog-comments.js`**
  - Montaje automático en `<div id="blog-comments-container" data-slug="...">`.
  - Integración con Google Identity Services (`https://accounts.google.com/gsi/client`) y decodificador JWT client-side.
  - Formulario alternativo accesible (Nombre + Email + Checkbox comercial) para usuarios sin Google o con adblocker.
  - Almacenamiento y restauración de sesión en `localStorage`.
  - Formulario activo de redacción con contador de caracteres (10-1000) y protección honeypot.
  - Renderizado dinámico de comentarios con avatars, fechas legibles y badge de equipo técnico.
  - *Comando de verificación:* `node -c public/blog-comments.js` (Código de salida 0).

---

## Fase 4: Integración en Pipeline y Artículos Existentes
- [x] **T04: Actualizar `scripts/publish-blog.js` y sincronizar los 8 artículos existentes**
  - Inyectar el contenedor `#blog-comments-container` y los scripts (`gsi/client` y `/blog-comments.js`) en la plantilla canónica `generatePostHtml`.
  - Sincronizar los 8 posts existentes en `public/blog/posts/*.html` para asegurar que todos dispongan de la caja de comentarios.
  - *Comando de verificación:* `node -c scripts/publish-blog.js` y verificación de presencia del selector en posts HTML.

---

## Fase 5: Verificación Integral y Certificación Final
- [x] **T05: Ejecutar suite de pruebas de comentarios y regresión total del sistema**
  - Ejecutar `npx playwright test tests/blog-comments.spec.js` (100% de tests en verde, 11/11 passed).
  - Ejecutar la suite completa del proyecto (`npx playwright test`) validando que ninguna prueba preexistente sufra regresiones.
  - *Comando de verificación:* `npx playwright test` (62/62 passed en 18.3s).
