# Plan Técnico de Implementación: Spec 006 - Agent Auth Metadata & Well-Known Discovery Polish
**Feature ID:** `006_agent_auth_discovery`  
**Estado:** PENDING APPROVAL  

---

## 1. Arquitectura de Solución y Diagnóstico de Hallazgos

### Hallazgo 1: Auth.md Agent Registration
- **Diagnóstico:** El auditor de Cloudflare / isitagentready detecta `auth.md`, pero exige que la información de registro del agente contenga:
  1. Frontmatter YAML estructurado en `public/auth.md`.
  2. El bloque canónico `agent_auth` en `public/.well-known/oauth-authorization-server` y `openid-configuration`:
     ```json
     {
       "agent_auth": {
         "supported_identity_types": ["ephemeral", "delegated", "anonymous", "identity_assertion"],
         "credential_types": ["bearer", "api_key"],
         "register_uri": "https://www.cuatropuntas.com/api/mcp",
         "instructions": "https://www.cuatropuntas.com/auth.md",
         "skill": "https://www.cuatropuntas.com/auth.md",
         "identity_types_supported": ["identity_assertion", "anonymous"],
         "anonymous": {
           "credential_types_supported": ["bearer"],
           "claim_uri": "https://www.cuatropuntas.com/api/mcp"
         },
         "identity_assertion": {
           "assertion_types_supported": ["verified_email", "urn:ietf:params:oauth:token-type:id-jag"],
           "credential_types_supported": ["bearer"],
           "claim_uri": "https://www.cuatropuntas.com/api/mcp"
         }
       }
     }
     ```
  3. `public/.well-known/oauth-protected-resource` configurado de forma estricta con `"resource": "https://www.cuatropuntas.com"` y `"authorization_servers": ["https://www.cuatropuntas.com"]`.

### Hallazgo 2: Web Bot Auth Request Signing
- **Diagnóstico:** El escáner ejecuta `GET /.well-known/http-message-signatures-directory`. Como el archivo no existía en disco, Vercel devolvía fallback 404 text/html.
- **Solución:** Crear `public/.well-known/http-message-signatures-directory` conteniendo:
  ```json
  {
    "keys": []
  }
  ```
  y añadir regla explícita en `vercel.json` para forzar `Content-Type: application/json; charset=utf-8` y CORS.

### Hallazgo 3: Enrutamiento y Cabeceras en vercel.json
- **Solución:** Expandir la regla de cabeceras en `vercel.json` para cubrir con comodín `/.well-known/(.*)` y específicamente:
  - `/.well-known/http-message-signatures-directory`
  - `/.well-known/oauth-authorization-server`
  - `/.well-known/oauth-protected-resource`
  - `/.well-known/openid-configuration`
  - `/.well-known/api-catalog` (`application/linkset+json`)
  - `/.well-known/ai-catalog.json`
  - `/.well-known/mcp.json`
  - `/.well-known/agent-card.json`

---

## 2. Estrategia de Testing Automatizado (TDD First)
Actualizaremos `tests/agent-readiness.spec.js` con pruebas unitarias y de integración:
1. **Verificación Local de Contenido y JSON:**
   - Cargar y parsear `public/.well-known/http-message-signatures-directory`.
   - Validar bloque `agent_auth` en `oauth-authorization-server`.
   - Validar frontmatter YAML y encabezados en `public/auth.md`.
2. **Verificación de Servidor Local / Endpoints:**
   - Validar que cada endpoint responda con HTTP 200 y cabecera `Content-Type` JSON o Markdown correspondiente.
3. **Verificación Live Post-Despliegue:**
   - Ejecutar el escáner contra `https://isitagentready.com/api/scan`.
   - Tomar captura actualizada del escáner en interfaz web.

---

## 3. Plan de Despliegue y Validación
1. Confirmación de aprobación de la spec.
2. Aplicación quirúrgica de cambios en archivos de `public/`, `vercel.json` y `tests/`.
3. Ejecución local de `npx playwright test tests/agent-readiness.spec.js`.
4. Git commit y push a `origin/main`.
5. Espera de propagación en Vercel y escaneo en vivo final.
