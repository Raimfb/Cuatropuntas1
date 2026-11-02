# Tasks Breakdown - Spec 025: Agent Readiness Optimization (/precios & /blog)

- [ ] **Task 1: RFC 9728 Endpoint y Configuración Vercel**
  - Crear `api/oauth-protected-resource.js` para responder con metadatos JSON válidos ante cualquier subruta.
  - Actualizar `vercel.json` con rewrites para `/.well-known/oauth-protected-resource` y subrutas.
  - Añadir relación `rel="oauth-protected-resource"` a la cabecera `Link` en `vercel.json`.

- [ ] **Task 2: Manifiesto Poppy v0.1 y OAuth Server Binding**
  - Crear `public/.well-known/poppy.json` conforme a la especificación v0.1.
  - Actualizar `public/.well-known/oauth-authorization-server` con `"poppy_domains"` y `"revocation_endpoint"`.

- [ ] **Task 3: Implementación WebMCP en `/precios` y `/blog`**
  - Agregar marcado declarativo WebMCP (`<form toolname="..." tooldescription="...">`) en `public/precios.html` y `public/blog/index.html`.
  - Agregar inicialización imperativa WebMCP (`document.modelContext` / `navigator.modelContext`) con la matriz oficial SSOT.
  - Añadir enlaces `<link rel="alternate" type="text/markdown" ...>` y `<link rel="oauth-protected-resource" ...>` en los encabezados `<head>`.

- [ ] **Task 4: Content Negotiation en `api/markdown.js`**
  - Implementar contenido para `/precios` con matriz oficial completa y normas OGUC Zona 3 RM.
  - Implementar contenido para `/blog` con catálogo completo de artículos técnicos y enlaces.
  - Implementar soporte para artículos específicos de blog (`/blog/posts/:slug`).
  - Actualizar rewrites en `vercel.json` para enrutar peticiones Markdown de blog.

- [ ] **Task 5: Higiene de Agent Skills y Actualización de Hashes SHA-256**
  - Purgar teléfono `+56 9 6348 2439` de `public/.well-known/agent-skills/cotizar-proyecto/SKILL.md` y actualizar tarifas.
  - Actualizar tarifas en `public/.well-known/agent-skills/asesoria-materiales/SKILL.md`.
  - Calcular hashes reales y sincronizar `public/.well-known/agent-skills/index.json`.

- [ ] **Task 6: Tests Automatizados y Verificación Real**
  - Extender `tests/agent-readiness.spec.js` para validar `/precios`, `/blog`, `oauth-protected-resource`, `poppy.json` y WebMCP.
  - Ejecutar suite de pruebas con Playwright.
  - Ejecutar verificación de sintaxis (`node -c`) y búsqueda de higiene de teléfonos.
