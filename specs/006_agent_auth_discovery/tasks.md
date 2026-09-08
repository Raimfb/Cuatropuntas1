# Tasks Breakdown: Spec 006 - Agent Auth Metadata & Well-Known Discovery Polish
**Feature ID:** `006_agent_auth_discovery`  
**Estado:** COMPLETED  
**Regla Estricta:** No marcar ninguna tarea como completada sin su comando de verificación ejecutado con éxito.

---

## Fase 1: Pruebas Automatizadas Primero (TDD / Red Phase)
- [x] **T01: Actualizar `tests/agent-readiness.spec.js` con aserciones de Agent Auth y Web Bot Auth**
  - Agregar pruebas que validen la existencia y estructura JSON de `http-message-signatures-directory`.
  - Agregar aserciones sobre el bloque `agent_auth` (`supported_identity_types`, `credential_types`, `register_uri`, `instructions`).
  - Agregar validación del frontmatter YAML en `public/auth.md`.
  - *Comando de verificación:* `npx playwright test tests/agent-readiness.spec.js` (3/3 passed).

---

## Fase 2: Implementación de Metadatos y Endpoints (Green Phase)
- [x] **T02: Crear `public/.well-known/http-message-signatures-directory`**
  - Crear archivo estático JSON con estructura JWKS `{ "keys": [] }`.
  - *Comando de verificación:* `node -e "const d=JSON.parse(require('fs').readFileSync('public/.well-known/http-message-signatures-directory')); if(!Array.isArray(d.keys)) throw new Error(); console.log('OK');"`

- [x] **T03: Actualizar `public/auth.md` con frontmatter YAML e instrucciones completas**
  - Incorporar bloque YAML con `name`, `version`, `register_uri`, `instructions`, `supported_identity_types` y `credential_types`.
  - Actualizar canal de WhatsApp oficial al SSOT `+56 9 2738 4075` y agendamiento `https://cal.com/cuatropuntas.com/visita-tecnica`.
  - *Comando de verificación:* Verificación de sintaxis de frontmatter y contenido markdown.

- [x] **T04: Actualizar `public/.well-known/oauth-authorization-server` y `openid-configuration`**
  - Estandarizar el bloque `agent_auth` con los campos canónicos solicitados por la auditoría.
  - *Comando de verificación:* `node -e "const d=JSON.parse(require('fs').readFileSync('public/.well-known/oauth-authorization-server')); if(!d.agent_auth.register_uri) throw new Error(); console.log('OK');"`

- [x] **T05: Actualizar reglas de cabeceras en `vercel.json`**
  - Asegurar que `http-message-signatures-directory` reciba `Content-Type: application/json; charset=utf-8` y CORS.
  - *Comando de verificación:* `node -e "JSON.parse(require('fs').readFileSync('vercel.json')); console.log('OK');"`

---

## Fase 3: Verificación Local y Despliegue a Producción
- [x] **T06: Ejecutar suite de pruebas local y regresión global**
  - Ejecutar `npx playwright test tests/agent-readiness.spec.js`.
  - Ejecutar suite completa `npx playwright test` asegurando 0 regresiones.
  - *Comando de verificación:* 64/64 passed en 17.4s (Código de salida 0).

- [x] **T07: Desplegar a Producción y Verificación en Vivo**
  - `git add .`
  - `git commit -m "feat(spec-006): estandarizar agent auth metadata y web bot auth directory"`
  - `git push origin main`
  - Validar contra endpoints en vivo con curl/fetch (`http-message-signatures-directory` y `oauth-authorization-server`).
  - Validar contra la API de `https://isitagentready.com/api/scan`.
  - *Comando de verificación:* `curl -i https://www.cuatropuntas.com/.well-known/http-message-signatures-directory`
