# Desglose de Tareas: Spec 014 - Delimitación de Alcance Técnico y Transparencia para Quinchos
**Feature ID:** `014_quincho_technical_scope`  
**Estado:** COMPLETED  

---

## Tareas de Implementación

- [x] **T01: Crear suite automatizada TDD `tests/quincho-scope.spec.js` (Red Phase)**
  - Validar inyección de `notasAlcance` en `calculateQuote` para quinchos con tenor mandatario de inclusiones y exclusiones.
  - Validar respuesta JSON de `/api/quote` conteniendo `notasAlcance`.
  - Validar renderizado de la tarjeta `#step3QuinchoResumen` en el Paso 3 de `public/quote-wizard.js`.
  - Validar ocultamiento de `#step3QuinchoResumen` al seleccionar otro tipo de obra.
  - Validar saneamiento de textos en `public/servicios/quinchos.html`.
  - *Comando de verificación:* `npx playwright test tests/quincho-scope.spec.js` (Certificar fase roja controlada).

- [x] **T02: Incorporar cláusulas de alcance en `api/quote.js`**
  - Actualizar `calculateQuote` para que `isQuincho` pueble `notasAlcance` con las 2 notas técnicas oficiales.
  - Ajustar asunto y plantilla HTML de correo para reflejar `Quincho / Terraza` en la cabecera de alcance técnico.
  - Verificar renderizado limpio en el PDF de `pdfkit`.
  - *Comando de verificación:* `node -c api/quote.js`.

- [x] **T03: Implementar tarjeta de alcance en Paso 3 de `public/quote-wizard.js`**
  - Añadir el contenedor `#step3QuinchoResumen` en el template HTML del wizard.
  - Implementar la lógica condicional en `nextStep(3)` para mostrar/ocultar el resumen según `qTipo === 'Quincho'`.
  - *Comando de verificación:* `node -c public/quote-wizard.js`.

- [x] **T04: Saneamiento comercial en `public/servicios/quinchos.html` y registro en `AGENTS.md`**
  - Corregir meta description, Open Graph y JSON-LD eliminando la promesa de instalaciones y muebles incluidos.
  - Reestructurar sección "Equipamiento e Instalaciones" distinguiendo equipamiento base vs adicionales a cubicar en terreno.
  - Registrar en `AGENTS.md` (Sección 3) la política oficial de alcance para quinchos.

- [x] **T05: Ejecutar suite de pruebas y certificación de no-regresión (Green Phase)**
  - Ejecutar `npx playwright test tests/quincho-scope.spec.js` (100% pasando en verde).
  - Ejecutar suite global `npx playwright test` (garantizar 0 regresiones sobre los 88 tests existentes: 93/93 pasando).
