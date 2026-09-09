# Desglose de Tareas: Spec 015 - Asistente Conversacional como SDR de Embudo y Derivación al Cotizador
**Feature ID:** `015_conversational_sdr_funnel`  
**Estado:** COMPLETED  

---

## Tareas de Implementación

- [x] **T01: Crear suite automatizada TDD `tests/conversational-sdr.spec.js` (Red Phase)**
  - Validar presencia de la regla SDR de 3 pasos en el prompt de `api/whatsapp.js` y `api/chat.js`.
  - Validar inclusión del protocolo de salida elegante (*Graceful Pivot*) con su tenor mandatario exacto ante correos y dudas no catalogadas.
  - Validar presencia del mapa canónico de URLs en ambos prompts.
  - Validar existencia y visibilidad del ancla `#cotizador` en `public/index.html`.
  - Validar preservación de políticas de Specs 011, 013 y 014.
  - *Comando de verificación:* `npx playwright test tests/conversational-sdr.spec.js` (Certificar fase roja controlada).

- [x] **T02: Implementar prompt SDR de embudo y Graceful Pivot en `api/whatsapp.js`**
  - Inyectar la regla de 3 pasos (Respuesta Concreta, Puente, CTA al Cotizador).
  - Añadir la instrucción de Graceful Pivot con el tenor literal para correos y consultas no catalogadas.
  - Inyectar el mapa de rutas canónicas en formato WhatsApp (URLs completas + negrita con un solo asterisco).
  - *Comando de verificación:* `node -c api/whatsapp.js`.

- [x] **T03: Implementar prompt SDR de embudo y Graceful Pivot en `api/chat.js`**
  - Inyectar la regla de 3 pasos (Respuesta Concreta, Puente, CTA al Cotizador).
  - Añadir la instrucción de Graceful Pivot idéntica.
  - Sincronizar el mapa de rutas canónicas.
  - *Comando de verificación:* `node -c api/chat.js`.

- [x] **T04: Incorporar ancla `#cotizador` en `public/index.html`**
  - Añadir el identificador `id="cotizador"` en la sección del cotizador para garantizar compatibilidad total con enlaces de blog, emails y derivaciones conversacionales.
  - Verificar ancla con Playwright.

- [x] **T05: Ejecutar suite de pruebas y certificación de no-regresión (Green Phase)**
  - Ejecutar `npx playwright test tests/conversational-sdr.spec.js` (100% pasando en verde).
  - Ejecutar suite global `npx playwright test` (garantizar 0 regresiones sobre los 93 tests existentes: 97/97 en verde).
  - Registrar commit y push en GitHub.

