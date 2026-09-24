# Desglose de Tareas: Spec 023 - Agente Asesor Consultivo y Orquestación de Estados

**Feature ID:** `023_conversational_advisor_agent`  
**Estado:** COMPLETED  

---

## Tareas de Implementación (Ciclo SDD / TDD)

- [x] **T01: Creación del Arnés de Pruebas TDD (`tests/conversational-advisor.spec.js`) [Fase Roja]**
  - Crear archivo `tests/conversational-advisor.spec.js`.
  - Definir casos de prueba para:
    * `T01.1`: Transición de estados en `lib/leads-state.js` (`COTIZADO` ➔ `EN_CONVERSACION` ➔ `VISITA_AGENDADA`).
    * `T01.2`: Regla de negocio `canBotReply(phone)`: `false` si no existe o si está en `VISITA_AGENDADA`; `true` en `COTIZADO` y `EN_CONVERSACION`.
    * `T01.3`: `lib/meta-client.js`: conmutación a modo Mock sin credenciales y registro de mensajes salientes.
    * `T01.4`: `lib/agent-consultor.js`: generación de respuesta técnica con tono de ingeniero/arquitecto, datos de cotización previa y enlace a Cal.com.
    * `T01.5`: Webhook de Meta (`api/webhooks/whatsapp.js`): handshake GET (200 con challenge) y silencio IA en POST si `canBotReply === false`.
    * `T01.6`: Webhook de Cal.com (`api/webhooks/calcom.js`): transición a `VISITA_AGENDADA`, entrega de teléfono del Director Técnico (`+56 9 7909 2027`) y silencio posterior.
    * `T01.7`: Integración en `api/quote.js`: verificar que una cotización exitosa siembra el estado `COTIZADO`.
  - Certificar la fase roja controlada (`Cannot find module 'lib/leads-state.js'`).

- [x] **T02: Implementación de la Máquina de Estados (`lib/leads-state.js`)**
  - Implementar normalizador telefónico E.164 (`569XXXXXXXX`).
  - Implementar almacén en memoria desacoplado con soporte REST para Vercel KV / Upstash Redis si existen variables de entorno.
  - Implementar funciones: `setLeadState`, `getLeadState`, `updateLeadState`, `findLeadByPhoneOrEmail`, `canBotReply` y `resetStateStore`.
  - Verificar que las pruebas unitarias de estados pasen a verde.

- [x] **T03: Implementación del Cliente Meta (`lib/meta-client.js`) y Agente Asesor (`lib/agent-consultor.js`)**
  - Implementar `lib/meta-client.js`:
    * Mock automático si no hay `WHATSAPP_TOKEN`.
    * Registro de mensajes para pruebas unitarias.
  - Implementar `lib/agent-consultor.js`:
    * Prompt de sistema con rol de Ingeniero/Arquitecto consultor de Cuatropuntas.
    * Matriz técnica: radieres, pendientes, aislación OGUC Zona 3, Art. 18 LGUC, suma alzada, cotizaciones paramétricas.
    * Cierre consultivo invitando al Diagnóstico Técnico en Terreno en Cal.com (`https://cal.com/cuatropuntas.com/visita-tecnica`).
    * Formateador estricto de WhatsApp (1 asterisco para negrita, sin dobles asteriscos ni HTML).
    * Fallback determinista en ausencia de `GEMINI_API_KEY`.

- [x] **T04: Implementación de Webhooks Serverless y Siembra en Cotizador**
  - Implementar `api/webhooks/whatsapp.js`:
    * Handler GET para verificación de token Meta.
    * Handler POST con extracción de datos, comprobación de `canBotReply`, silencio IA en visitas agendadas / no registrados, y despacho consultivo en leads activos.
  - Implementar `api/webhooks/calcom.js`:
    * Handler POST para `BOOKING_CREATED`.
    * Transición de estado a `VISITA_AGENDADA`.
    * Mensaje de confirmación al cliente con el teléfono del Director Técnico terminado en 2027 (`+56 9 7909 2027`).
    * Alerta interna al Director Técnico.
  - Integrar siembra en `api/quote.js`:
    * Llamada a `setLeadState` con datos del prospecto al completar cotización.
  - Asegurar retrocompatibilidad en `api/whatsapp.js` y `api/cal-webhook.js`.

- [x] **T05: Verificación Integral TDD y Cero Regresiones**
  - Ejecutar `tests/conversational-advisor.spec.js` para certificar la fase verde.
  - Ejecutar suite global `npx playwright test`.
  - Confirmar 136 tests en verde (129 preexistentes + 7 nuevos, cero regresiones).
  - Actualizar estados en los artefactos de la spec.
