# Technical Plan - Spec 025: Agent Readiness Optimization (/precios & /blog)

## 1. Arquitectura de Cambios

### 1.1. Manejo Dinámico y Canónico de OAuth Protected Resource (RFC 9728)
- **Problema:** El escáner solicita `/.well-known/oauth-protected-resource/precios` y `/.well-known/oauth-protected-resource/blog`. Al ser un directorio estático que no contiene esos archivos, Vercel respondía con HTML 404 bajo cabecera `Content-Type: application/json`.
- **Solución:**
  1. Crear `api/oauth-protected-resource.js` que responda a cualquier ruta y subruta con metadatos JSON válidos RFC 9728.
  2. Configurar en `vercel.json` rewrites para `/.well-known/oauth-protected-resource/:path*` y `/.well-known/oauth-protected-resource` apuntando a `api/oauth-protected-resource.js`.
  3. Añadir a `Link` header general en `vercel.json`: `</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"`.

### 1.2. Protocolo Poppy (`/.well-known/poppy.json`)
- **Problema:** El escáner busca `/.well-known/poppy.json`. Al no existir, Vercel devolvía 404 HTML con cabecera application/json, disparando error de sintaxis JSON.
- **Solución:**
  1. Crear `public/.well-known/poppy.json` con especificación oficial v0.1 (`protocol_version: "0.1"`, `organization`, `web: {}`).
  2. Añadir en `public/.well-known/oauth-authorization-server` los campos `"poppy_domains": ["cuatropuntas.com"]` y `"revocation_endpoint": "https://www.cuatropuntas.com/api/auth/revoke"`.

### 1.3. Soporte Integral WebMCP (Imperativo y Declarativo)
- **Problema:** En `/precios` y `/blog` no había herramientas WebMCP registradas.
- **Solución:**
  1. En `public/precios.html`:
     - Agregar formulario declarativo con atributos `toolname="cotizar_construccion"` y `tooldescription="..."`.
     - Agregar script WebMCP para registrar la herramienta en `document.modelContext` y `navigator.modelContext` con la matriz oficial de precios.
     - Agregar `<link rel="alternate" type="text/markdown" href="/precios">`.
     - Agregar `<link rel="oauth-protected-resource" href="/.well-known/oauth-protected-resource">`.
  2. En `public/blog/index.html`:
     - Agregar formulario declarativo con `toolname="buscar_articulos_blog"`.
     - Agregar script WebMCP para registrar `buscar_articulos_blog` y `cotizar_construccion` en `document.modelContext` y `navigator.modelContext`.
     - Agregar `<link rel="alternate" type="text/markdown" href="/blog">`.
     - Agregar `<link rel="oauth-protected-resource" href="/.well-known/oauth-protected-resource">`.

### 1.4. Content Negotiation en `api/markdown.js`
- **Problema:**
  - `/precios` tenía precios viejos (11 a 16 UF/m² en vez de 19, 21, 25 UF).
  - `/blog` retornaba la portada.
  - Artículos individuales de blog no estaban soportados en markdown.
- **Solución:**
  - Actualizar el generador de Markdown en `api/markdown.js` con las 3 ramas:
    1. `precio`: Matriz oficial completa con alcance, exclusiones, estándar Zona 3 RM, teléfonos oficiales y enlaces a cotizador.
    2. `blog`: Índice técnico completo de los 16 artículos con enlaces directos a sus versiones Markdown y web.
    3. `blog/posts/:post`: Renderizado de artículo individual a Markdown limpio.
    4. `subsidio`: Mantener y optimizar.
    5. `index`: Mantener y enriquecer.
  - Actualizar `vercel.json` rewrites para incluir `/blog` y `/blog/posts/:post*`.

### 1.5. Higiene de Agent Skills y Criptografía SHA-256
- **Problema:**
  - `cotizar-proyecto/SKILL.md` contenía el teléfono purgado `63482439` y tarifas viejas.
  - `asesoria-materiales/SKILL.md` contenía tarifas viejas.
  - Los digests sha256 en `public/.well-known/agent-skills/index.json` no coincidían con los archivos.
- **Solución:**
  - Purgar el teléfono obsoleto y colocar `+56 9 2738 4075` y `https://cal.com/cuatropuntas.com/visita-tecnica`.
  - Actualizar las tarifas en ambos `SKILL.md`.
  - Recalcular con Node crypto los sha256 reales y actualizar `index.json`.
