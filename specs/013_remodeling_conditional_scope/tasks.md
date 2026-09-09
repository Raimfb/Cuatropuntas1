# Desglose de Tareas: Spec 013 - Lógica Condicional y Alcance Específico para Remodelaciones
**Feature ID:** `013_remodeling_conditional_scope`  
**Estado:** COMPLETED  

---

## Tareas de Implementación

- [x] **T01: Crear suite automatizada TDD `tests/remodeling-scope.spec.js` (Red Phase)**
  - Validar visibilidad condicional del input `#espacios-remodelar` al seleccionar "Remodelación" en `#qTipo`.
  - Validar ocultamiento y limpieza al seleccionar otros tipos de proyectos.
  - Validar cálculo cerrado para "Baño y cocina" ($185\text{ UF}$).
  - Validar cálculo cerrado para "Solo baño" ($75\text{ UF}$) y "Solo cocina" ($110\text{ UF}$).
  - Validar cálculo por $\text{m}^2$ para "Comedor y baño de 40 m²" ($440\text{ UF}$) e inyección de nota de baño básico.
  - *Comando de verificación:* `npx playwright test tests/remodeling-scope.spec.js` (Certificar fase roja).

- [x] **T02: Implementar análisis semántico y cálculo híbrido en `api/quote.js`**
  - Implementar función `analyzeRemodelingSpaces(espacios)`.
  - Modificar `calculateQuote` para aceptar `espacios` / `espacios_remodelar` y calcular partida fija en húmedos puros vs tarificación por $\text{m}^2$ en mixtos.
  - Anexar notas de alcance condicionales en el objeto retornado.
  - *Comando de verificación:* `node -c api/quote.js` (Código 0 exitoso).

- [x] **T03: Implementar campo dinámico y eventos en `public/quote-wizard.js`**
  - Agregar el contenedor `#espaciosRemodelarContainer` y el input `#espacios-remodelar` en el Paso 1.
  - Vincular escucha de eventos al cambiar `#qTipo` y en `initQuoteWizard()`.
  - Ajustar `calcularCon` y `prefillFromURL` para soportar `espacios`.
  - Inyectar `espacios_remodelar` en el payload JSON enviado al endpoint `/api/quote`.
  - *Comando de verificación:* `node -c public/quote-wizard.js` (Código 0 exitoso).

- [x] **T04: Sincronizar propagación en PDF, correo y Google Sheets en `api/quote.js`**
  - Incluir `espacios_remodelar` en el registro de Google Sheets (`persistLeadToGoogleSheets`).
  - Inyectar el bloque de notas de alcance técnico en el correo HTML para el prospecto y el administrador.
  - Añadir sección en el documento PDF generado con `pdfkit`.
  - *Comando de verificación:* `node -c api/quote.js` (Código 0 exitoso).

- [x] **T05: Ejecutar suite de pruebas y certificar regresiones (Green Phase)**
  - Ejecutar `npx playwright test tests/remodeling-scope.spec.js` (Todos pasando en verde).
  - Ejecutar la suite global `npx playwright test` para garantizar 0 regresiones sobre los 82 tests previos.
  - Registrar commit:
    `feat(spec-013): implementar logica condicional y alcance especifico para remodelaciones`
  - Realizar `git push origin main`.
