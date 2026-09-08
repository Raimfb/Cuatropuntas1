# Tasks Breakdown: 002 - Modular Quote Wizard
**Feature ID:** `002_modular_quote_wizard`  
**Estado:** COMPLETED  
**Regla Estricta:** No marcar ninguna tarea como completada sin su comando de verificación ejecutado con éxito.

---

## Fase 1: Pruebas Unitarias de Frontend Primero (TDD / Red Phase)
- [x] **T01: Crear suite de pruebas de integración para el Wizard (`tests/quote-wizard.spec.js`)**
  - Archivo: `tests/quote-wizard.spec.js`
  - Validar montaje de IDs, validación de pasos (bloqueo por m² < 3 o vacío), normalización de teléfono chileno, pre-llenado de parámetros de URL (`?nombre=...&telefono=...`), puente con `calcularCon` y manejo de error/éxito en `POST /api/quote`.
  - *Comando de verificación:* `npx playwright test tests/quote-wizard.spec.js` (Fase Roja confirmada inicialmente; Fase Verde con 8/8 tests pasando).

---

## Fase 2: Implementación del Módulo Central (Green Phase)
- [x] **T02: Implementar el módulo `public/quote-wizard.js`**
  - Desarrollar la plantilla HTML completa respetando el 100% de los IDs del contrato DOM.
  - Implementar auto-montaje sobre `#quote-wizard-container` leyendo atributos de configuración `data-default-tipo`, `data-default-sistema`, `data-tipos`, `data-sistemas`, `data-placeholder-area`.
  - Implementar la máquina de estados de pasos con transiciones de opacidad y actualización de `#progressBar`, `#stepIndicatorProg` y `#stepIndicatorTitle`.
  - Implementar lógica anti-bot (generación de timestamp `_ts`, token de seguridad y lectura de honeypots).
  - Exportar funciones globales `window.nextStep`, `window.prevStep`, `window.calcularCon` y `window.QuoteWizard`.
  - *Comando de verificación:* `node -c public/quote-wizard.js` (Código de salida 0).

- [x] **T03: Implementar validaciones de UX, formateo chileno y URL Pre-fill**
  - Implementar máscara y normalizador de teléfonos chilenos en `qTelefono` (formato visible `+56 9 XXXX XXXX` y validación de 9 dígitos móviles).
  - Implementar parser de parámetros URL en `DOMContentLoaded` para pre-poblar campos (`nombre`, `telefono`, `email`, `tipo`, `sistema`, `area`, `comuna`).
  - Implementar estados de carga en `#quoteSubmitBtn` ("Generando Cotización...") y manejo determinista de mensajes de error en `#quoteStatus`.
  - *Comando de verificación:* `npx playwright test tests/quote-wizard.spec.js` (Todas las 8 pruebas del wizard pasan en verde).

---

## Fase 3: Higiene de Canales y WebMCP
- [x] **T04: Purgar teléfono de pruebas `56963482439` en frontend**
  - Actualizar script WebMCP en `public/index.html`: corregir teléfono a `+56 9 2738 4075` y matriz de precios a 19/21/25 UF.
  - Actualizar `public/auth.md`: reemplazar enlace a WhatsApp oficial `https://wa.me/56927384075`.
  - *Comando de verificación:* `git grep "63482439" public/` (0 coincidencias).

---

## Fase 4: Refactorización Quirúrgica DRY de Vistas HTML
- [x] **T05: Refactorizar páginas raíz (`index.html`, `precios.html`, `subsidio-minvu-sitio-propio.html`)**
  - Reemplazar formulario estático duplicado y script inline de cotización por `<div id="quote-wizard-container" ...>` y `<script src="./quote-wizard.js" defer></script>`.
  - Mantener intacto el contenido semántico y SEO de cada página.
  - *Comando de verificación:* `npx playwright test tests/verify.spec.js` (Pruebas de index.html, precios.html y subsidio pasan sin errores).

- [x] **T06: Refactorizar páginas de servicios (`casas-nuevas.html`, `quinchos.html`, `remodelaciones.html`, `segundos-pisos.html`)**
  - Reemplazar formulario estático y script inline en las 4 landings de `public/servicios/` configurando sus `data-default-tipo` y `data-sistemas` correspondientes.
  - Incluir el script con ruta relativa estándar `<script src="../quote-wizard.js" defer></script>`.
  - *Comando de verificación:* `npx playwright test tests/verify.spec.js` (Prueba de remodelación 4 m² y servicios pasa con 22/22 en verde).

---

## Fase 5: Verificación Integral y Certificación Final
- [x] **T07: Ejecución de la suite completa de pruebas E2E e Integración**
  - Ejecutar todas las pruebas del repositorio: unitarias de backend (`tests/quote-engine.spec.js`), integración de frontend (`tests/quote-wizard.spec.js`) y regresión E2E (`tests/verify.spec.js`, `tests/agent-readiness.spec.js`).
  - Confirmar ausencia total de advertencias o errores en terminal.
  - *Comando de verificación:* `npx playwright test` (39/39 pruebas pasando en verde, 100% de éxito).
