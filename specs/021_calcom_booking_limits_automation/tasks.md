# Desglose de Tareas: Spec 021 - Automatización y Blindaje de Parámetros Operativos en Cal.com
**Feature ID:** `021_calcom_booking_limits_automation`  
**Estado:** COMPLETED  

---

## Tareas de Implementación TDD

- [x] **T01: Crear suite automatizada TDD `tests/calcom-config.spec.js` (Fase Roja)**
  - Diseñar tests unitarios y de integración para el script de configuración:
    * Existencia física del script `scripts/configure-calcom-event.js`.
    * Exportación de funciones modulares: `loadConfig`, `buildEventPayload`, `calculateDiff`, `syncCalcomEvent`.
    * Validación de `buildEventPayload()`: debe retornar `minimumBookingNotice: 1440`, `beforeEventBuffer: 45`, `afterEventBuffer: 45`, `bookingWindow: { type: 'calendarDays', value: 14, rolling: true }`.
    * Validación de manejo de credenciales: ante `CAL_API_KEY` ausente, retorno controlado con mensaje preventivo y código 0.
    * Validación de `--dry-run`: simulación completa de diff sin despachar mutaciones de red.
    * Validación de idempotencia: si los parámetros ya coinciden, no despachar `PATCH`.
  - *Comando de verificación:* `npx playwright test tests/calcom-config.spec.js` (certificar fallo controlado / fase roja).

- [x] **T02: Implementar el Script de Sincronización y Gobierno (`scripts/configure-calcom-event.js`)**
  - Implementar la carga segura de variables de entorno mediante `dotenv` (priorizando `.env.local` y `.env`).
  - Implementar lógica modular:
    * `loadConfig(env, args)`: lectura de argumentos CLI y clave API.
    * `buildEventPayload()`: constructor del payload canónico para Cal.com v2.
    * `calculateDiff()`: comparador determinista entre configuración remota y objetivo.
    * `syncCalcomEvent()`: orquestador con llamadas a la API v2 (`GET /v2/event-types` y `PATCH /v2/event-types/{id}`).
  - Añadir soporte para ejecución directa por CLI con banderas `--dry-run`, `--slug=visita-tecnica`, `--username=cuatropuntas.com`.
  - Registrar script en `package.json`: `"calcom:sync": "node scripts/configure-calcom-event.js"`.
  - *Comando de verificación:* `node -c scripts/configure-calcom-event.js` y `npx playwright test tests/calcom-config.spec.js` (certificar fase verde en tests).

- [x] **T03: Ejecución de Simulación Dry-Run y Verificación de Diff en Vivo**
  - Ejecutar `node scripts/configure-calcom-event.js --dry-run` contra la cuenta en vivo usando la clave de entorno.
  - Verificar que el script detecta el evento `visita-tecnica` (ID `6800545`) e imprime el diff esperado:
    * `minimumBookingNotice`: `120` $\to$ `1440` (+22 horas de protección).
    * `beforeEventBuffer`: `90` $\to$ `45`.
    * `afterEventBuffer`: `90` $\to$ `45`.
    * `bookingWindow`: `{ disabled: true }` $\to$ `{ type: 'calendarDays', value: 14, rolling: true }`.
  - Certificar que no se alteró la API remota durante el dry-run.

- [x] **T04: Ejecución Quirúrgica de Sincronización Real y Comprobación Idempotente**
  - Ejecutar `node scripts/configure-calcom-event.js` para aplicar los parámetros en producción.
  - Verificar respuesta HTTP 200 OK y confirmación de actualización en la API de Cal.com.
  - Ejecutar inmediatamente una segunda corrida para comprobar que la lógica reporta idempotencia (cero cambios pendientes).

- [x] **T05: Certificación de Cero Regresiones, Seguridad de Git y Cierre Documental**
  - Ejecutar la suite completa de pruebas: `npx playwright test` (122 existentes + nueva suite al 100% en verde).
  - Verificar `git status` para asegurar que ningún secreto, token o archivo temporal quedó sin ignorar.
  - Actualizar `specs/021_calcom_booking_limits_automation/tasks.md` y `spec.md` al estado final `IMPLEMENTED`.
