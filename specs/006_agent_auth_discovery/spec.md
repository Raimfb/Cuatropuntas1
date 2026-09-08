# Especificación de Requerimientos: Spec 006 - Agent Auth Metadata & Well-Known Discovery Polish
**Feature ID:** `006_agent_auth_discovery`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** PENDING APPROVAL  

---

## 1. Resumen Ejecutivo y Propósito
Optimizar y pulir la suite de metadatos de descubrimiento para Agentes de IA en **Constructora Cuatropuntas SpA** (`cuatropuntas.com`), subsanando los dos hallazgos remanentes de la auditoría en vivo de **isitagentready.com** (que actualmente califica con 87/100 y Nivel 5: Agent-Native):
1. **Auth.md Agent Registration:** Incorporar el frontmatter YAML formal y estandarizar el bloque canónico `agent_auth` en los metadatos de autorización OAuth para resolver el aviso `auth.md exists but agent_auth metadata was not found`.
2. **Web Bot Auth Request Signing:** Implementar el endpoint canónico `/.well-known/http-message-signatures-directory` con estructura JWKS válida (`{ "keys": [] }`) y tipo MIME `application/json` para evitar respuestas erróneas en formato HTML/fallback.
3. **Robustez de Cabeceras HTTP en Vercel:** Asegurar que todo el árbol `/.well-known/*` se despache con `Content-Type: application/json; charset=utf-8` y cabeceras CORS permisivas (`Access-Control-Allow-Origin: *`), garantizando un puntaje óptimo y compatibilidad al 100% con agentes autónomos.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Requerimientos Ubicuos (Ubiquitous Requirements)
- **UB-01 (MIME Types y CORS en .well-known):** El servidor **deberá** servir todos los recursos bajo `/.well-known/*` con cabecera `Access-Control-Allow-Origin: *` y el `Content-Type` estricto correspondiente (`application/json; charset=utf-8` o `application/linkset+json` para `api-catalog`), impidiendo que el fallback de SPA o HTML estático intercepte estas rutas.
- **UB-02 (Cumplimiento de SSOT y Canales Oficiales):** Todo archivo de documentación o metadatos de agente **deberá** apegarse estrictamente a `AGENTS.md`:
  * Cero menciones al número purgado `63482439`.
  * Canal de captura y prospección: `+56 9 2738 4075` (`https://wa.me/56927384075`).
  * Enlace oficial de visita técnica: `https://cal.com/cuatropuntas.com/visita-tecnica`.
- **UB-03 (Esquema Unificado de Agent Auth):** Los metadatos de autorización **deberán** exponer el bloque oficial `agent_auth` conteniendo simultáneamente los atributos estándar requeridos por los escáneres de IA (`supported_identity_types`, `credential_types`, `register_uri`, `instructions`, `skill`, `identity_types_supported`).

### 2.2. Requerimientos Basados en Eventos (Event-Driven Requirements)
- **EV-01 (Consulta de Web Bot Auth Signatures Directory):** **Cuando** un agente o auditor HTTP consulte `GET /.well-known/http-message-signatures-directory`, el servidor **deberá** responder con HTTP 200, `Content-Type: application/json; charset=utf-8` y el payload JSON `{ "keys": [] }`.
- **EV-02 (Consulta de Auth.md para Registro de Agentes):** **Cuando** un agente consulte `GET /auth.md`, el servidor **deberá** responder con HTTP 200, `Content-Type: text/markdown; charset=utf-8`, conteniendo:
  1. Frontmatter YAML estructurado con `name`, `version`, `register_uri`, `instructions`, `supported_identity_types` y `credential_types`.
  2. Encabezado principal H1 `# auth.md - Cuatro Puntas Agent Registration & API Authorization`.
  3. Instrucciones detalladas de registro sin credenciales previas para agentes autónomos.
- **EV-03 (Consulta de OAuth Authorization Server y Protected Resource):** **Cuando** un cliente consulte `GET /.well-known/oauth-authorization-server` o `GET /.well-known/oauth-protected-resource`, el sistema **deberá** retornar la configuración JSON validada que vincula el recurso (`https://www.cuatropuntas.com`), el servidor de autorización y el bloque `agent_auth`.

### 2.3. Requerimientos de Estado (State-Driven Requirements)
- **ST-01 (Enrutamiento en Edge Middleware y Vercel CDN):** **Mientras** se procese cualquier solicitud HTTP hacia rutas de descubrimiento de agentes (`/.well-known/*`, `/auth.md`, `/llms.txt`), la capa de distribución en Vercel **deberá** entregar los archivos estáticos y cabeceras definidas sin redirecciones ni reescrituras que degraden a HTML.

### 2.4. Requerimientos No Deseados y Fallbacks (Unwanted Behavior)
- **UN-01 (Prevención de Respuestas HTML 404/SPA):** **Si** un agente solicita cualquier archivo bajo `/.well-known/`, el servidor **no deberá** responder bajo ninguna circunstancia con páginas HTML ni texto plano `text/plain`.
- **UN-02 (Prevención de URLs con Caracteres de Escape Inválidos):** **Si** se documentan endpoints en `/auth.md`, **no deberán** incluirse backticks ni caracteres pegados que provoquen que los parsers automáticos generen URLs con `%60` u otros errores de escape.

---

## 3. Criterios de Aceptación Técnicos
1. El archivo `public/.well-known/http-message-signatures-directory` existe, es un JSON sintácticamente válido y contiene `{ "keys": [] }`.
2. El archivo `public/auth.md` contiene el frontmatter YAML canónico y la documentación técnica de registro.
3. El archivo `public/.well-known/oauth-authorization-server` contiene el bloque `agent_auth` con `register_uri`, `instructions`, `supported_identity_types` y `credential_types`.
4. La configuración `vercel.json` garantiza cabeceras `Content-Type: application/json; charset=utf-8` y `Access-Control-Allow-Origin: *` para `http-message-signatures-directory` y todos los endpoints de `/.well-known/*`.
5. La suite Playwright `tests/agent-readiness.spec.js` valida localmente y en vivo la existencia, cabeceras y contenido de estos endpoints.
6. El despliegue a producción vía Git compila limpiamente y la verificación en vivo en `isitagentready.com` confirma la subsanación.
