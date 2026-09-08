# Tasks Breakdown: 001 - Core Quote Engine
**Feature ID:** `001_core_quote_engine`  
**Estado:** COMPLETED  
**Regla Estricta:** No marcar ninguna tarea como completada sin su comando de verificación ejecutado con éxito.


---

## Fase 1: Pruebas Unitarias Primero (TDD / Red Phase)
- [x] **T01: Crear suite de pruebas unitarias para el motor de cotizaciones**
  - Archivo: `tests/quote-engine.spec.js`
  - Validar importación de `api/quote.js` y aserciones de cálculo paramétrico (100 m² Metalcom = 1900 UF, baño 4 m² = piso base 60-70 UF, validación de rangos 3 a 5000 m²).
  - *Comando de verificación:* `npx playwright test tests/quote-engine.spec.js` (Falla inicialmente por SyntaxError - Verificado).

---

## Fase 2: Corrección Quirúrgica y Desacoplamiento (Green Phase)
- [x] **T02: Reparar errores de sintaxis en `api/quote.js`**
  - Eliminar redeclaración de `const isAmpliacion` en línea 125.
  - Eliminar fragmento roto de operador ternario en línea 322.
  - *Comando de verificación:* `node -c api/quote.js` (Retorna código de salida 0 sin output de error - Verificado).

- [x] **T03: Desacoplar la función pura de cálculo `calculateQuote`**
  - Extraer la lógica de cálculo a una función pura exportable: `calculateQuote(params)`.
  - Garantizar retorno de métricas exactas: `baseUFm2`, `multiplicador`, `factorComuna`, `factorPermisos`, `costoM2Final`, `totalEstimado`, `minUF`, `maxUF`.
  - *Comando de verificación:* `npx playwright test tests/quote-engine.spec.js` (6 pruebas pasan al 100% en verde - Verificado).


---

## Fase 3: Persistencia Fail-Safe y Sanitización
- [x] **T04: Implementar persistencia de leads en Google Sheets**
  - Crear helper `persistLeadToGoogleSheets(leadData)` consumiendo `process.env.GOOGLE_SHEETS_WEBHOOK_URL`.
  - Configurar timeout de 3.5 segundos con `AbortController` para no retrasar la respuesta serverless.
  - Asegurar captura en bloque `try/catch` para que un error o timeout en Google Sheets no aborte la entrega del PDF al usuario.
  - *Comando de verificación:* `npx playwright test tests/quote-engine.spec.js` (Prueba de resiliencia y timeout validada - Verificado).

- [x] **T05: Sanitización de secretos y estandarización de canales**
  - Eliminar tokens de Meta hardcodeados en `api/whatsapp.js` y `api/cal-webhook.js`.
  - Crear `.env.example` con variables normalizadas (`WHATSAPP_TOKEN`, `CAL_WEBHOOK_SECRET`, etc.).
  - Reemplazar número obsoleto `+56 9 6348 2439` por oficial `+56 9 2738 4075` en `api/mcp.js` y `api/markdown.js`.
  - *Comando de verificación:* `node -c api/whatsapp.js; node -c api/cal-webhook.js; node -c api/markdown.js; node -c api/mcp.js` (Todos exit code 0 - Verificado).

---

## Fase 4: Integración Local y Suite Completa
- [x] **T06: Actualizar `local-dev-server.js` para desarrollo local**
  - Montar endpoint `app.post('/api/quote', quoteHandler)`.
  - Agregar `express` formalmente a `devDependencies` en `package.json`.
  - *Comando de verificación:* `node -c local-dev-server.js` (Exit code 0 - Verificado).


- [x] **T07: Ejecutar la suite completa de pruebas E2E e Integración**
  - Ejecutar todas las 24 pruebas de Playwright existentes más las nuevas unitarias.
  - Verificar que ningún test dependa de mocks falsificadores de salud.
  - *Comando de verificación:* `npx playwright test` (31/31 pruebas aprobadas - Verificado).

