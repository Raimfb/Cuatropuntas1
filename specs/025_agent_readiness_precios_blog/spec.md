# Spec 025: Optimización de Agent Readiness para /precios y /blog (IsItAgentReady)

## 1. Visión General
Esta especificación define las mejoras necesarias para elevar al máximo nivel de compatibilidad con Agentes de Inteligencia Artificial ("Agent-Native Level 5") y estándares abiertos (RFC 9728, WebMCP, Poppy / Personal Agent Protocol, Agent Skills v0.2.0, Content Negotiation Markdown) las páginas `/precios` y `/blog`, auditadas en `isitagentready.com`.

---

## 2. Requerimientos en Sintaxis EARS

### 2.1. Descubrimiento y Protocolos OAuth (RFC 9728)
* **REQ-EARS-001 (Ubiquitous):** El sistema DEBE responder con metadatos JSON válidos de recurso protegido bajo RFC 9728 ante peticiones `GET /.well-known/oauth-protected-resource` y ante cualquier sub-ruta derivada del recurso escaneado (ej. `/.well-known/oauth-protected-resource/precios`, `/.well-known/oauth-protected-resource/blog`).
* **REQ-EARS-002 (Ubiquitous):** Las cabeceras HTTP `Link` de todas las páginas DEBEN incluir la relación canónica `</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"` para que agentes de IA descubran de inmediato el servidor de autorización y alcances sin depender de reintentos heurísticos.

### 2.2. Protocolo de Agente Personal (Poppy v0.1)
* **REQ-EARS-003 (Event-Driven):** CUANDO un agente o escáner solicite `GET /.well-known/poppy.json`, el sistema DEBE retornar código HTTP 200 con encabezado `Content-Type: application/json; charset=utf-8` y un manifiesto válido conforme al protocolo Poppy v0.1 (`protocol_version: "0.1"`, `organization: { name, domain }`, `web: {}`).
* **REQ-EARS-004 (Ubiquitous):** El archivo `public/.well-known/oauth-authorization-server` DEBE declarar el campo `"poppy_domains": ["cuatropuntas.com"]` y `"revocation_endpoint"` para consistencia total entre especificaciones.

### 2.3. Herramientas WebMCP (Imperativas y Declarativas)
* **REQ-EARS-005 (State-Driven):** MIENTRAS un navegador o agente autónomo cargue `/precios` o `/blog`, la página DEBE registrar herramientas estructuradas WebMCP mediante la API imperativa (`document.modelContext.registerTool` / `navigator.modelContext.registerTool`) y mediante elementos HTML declarativos (`<form toolname="..." tooldescription="...">`).
* **REQ-EARS-006 (Ubiquitous):** La herramienta `cotizar_construccion` en WebMCP DEBE operar estrictamente con la Matriz Oficial de Precios (AGENTS.md):
  - Casas nuevas: desde 19 UF/m² (Metalcom), 21 UF/m² (SIP), 25 UF/m² (Albañilería).
  - Segundos pisos / ampliaciones: desde 22 UF/m² (Metalcom), 24 UF/m² (SIP), 27 UF/m² (Albañilería).
  - Quinchos: desde 12 UF/m² (Metalcom), 15 UF/m² (Albañilería).
  - Remodelaciones: desde 11 UF/m².
* **REQ-EARS-007 (State-Driven):** En la landing de `/blog`, la página DEBE exponer la herramienta WebMCP `buscar_articulos_blog` para que agentes consulten y filtren el catálogo de 16 artículos técnicos sin necesidad de scrapear el DOM visual.

### 2.4. Negociación de Contenido Markdown (Content Negotiation & SSOT)
* **REQ-EARS-008 (Event-Driven):** CUANDO un cliente HTTP solicite `/precios` con cabecera `Accept: text/markdown`, el endpoint `/api/markdown` DEBE servir un resumen en Markdown estructurado, exhaustivo y 100% fiel al SSOT (valores netos +IVA, recintos húmedos, quinchos, exclusiones y estándar térmico Zona 3 RM).
* **REQ-EARS-009 (Event-Driven):** CUANDO un cliente HTTP solicite `/blog` con cabecera `Accept: text/markdown`, el endpoint `/api/markdown` DEBE servir el índice completo de artículos técnicos clasificados por categoría, fecha, slug y resumen técnico, en lugar de redirigir o servir la página de inicio.
* **REQ-EARS-010 (Event-Driven):** CUANDO un cliente HTTP solicite un artículo específico de blog (`/blog/posts/:post*` o `/blog/:slug`) con `Accept: text/markdown`, el endpoint `/api/markdown` DEBE procesar y devolver el contenido del post en formato Markdown limpio con encabezado `x-markdown-tokens`.

### 2.5. Higiene de Telefonía y Canales Oficiales
* **REQ-EARS-011 (Ubiquitous):** Queda terminantemente PROHIBIDO el uso del número purgado `+56 9 6348 2439` (o `56963482439`). Todo canal debe apuntar al número oficial de captura `+56 9 2738 4075` y agendamiento `https://cal.com/cuatropuntas.com/visita-tecnica`.
* **REQ-EARS-012 (Ubiquitous):** Los archivos de Agent Skills (`cotizar-proyecto/SKILL.md`, `asesoria-materiales/SKILL.md`, `index.json`) DEBEN actualizarse con precios de la matriz SSOT y sus hashes SHA-256 deben coincidir exactamente con los archivos físicos.
