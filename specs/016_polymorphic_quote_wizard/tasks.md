# Desglose de Tareas: Spec 016 - Formulario Dinámico y Polimórfico por Tipología de Proyecto
**Feature ID:** `016_polymorphic_quote_wizard`  
**Estado:** COMPLETED  

---

## Tareas de Implementación

- [x] **T01: Crear suite automatizada TDD `tests/polymorphic-wizard.spec.js` (Red Phase)**
  - Validar existencia de `#qSistemaContainer` y `#qSistemaLabel`.
  - Validar mutación reactiva al cambiar `#qTipo` a `Remodelacion` (ocultamiento de `#qSistemaContainer`, desactivación de required, asignación de `'Metalcon'`, visibilidad de `#espaciosRemodelarContainer`, avance a Paso 2 sin errores).
  - Validar mutación a `Ampliacion` (label "Estructura Liviana de Sobreelevación", solo opciones Metalcom Liviano y Panel SIP, exclusión de albañilería pesada).
  - Validar mutación a `Quincho` (label "Estructura y Techumbre del Cobertizo", opciones Madera Tratada 12 UF y Acero/Fierro 15 UF con values `Metalcon` y `Albanileria`).
  - Validar mutación a `Casa Nueva` (label "Sistema Constructivo", 3 opciones completas).
  - Validar carga inicial polimórfica en `servicios/remodelaciones.html` y `servicios/quinchos.html`.
  - *Comando de verificación:* `npx playwright test tests/polymorphic-wizard.spec.js` (Certificar fase roja controlada).

- [x] **T02: Implementar estructura polimórfica en `public/quote-wizard.js`**
  - Añadir `#qSistemaContainer`, `#qSistemaLabel` y `#qAreaHelpText` en `createWizardHTML`.
  - Definir el diccionario declarativo `CONFIG_POR_TIPO` con las 4 tipologías.
  - Implementar función central `syncPolymorphicStep1(tipoVal)` para orquestar la mutación del DOM.
  - Conectar `syncPolymorphicStep1` al evento `change` de `#qTipo`, al flujo de `initQuoteWizard()`, `prefillFromURL()` y `calcularCon()`.
  - *Comando de verificación:* `node -c public/quote-wizard.js`.

- [x] **T03: Ejecutar suite de la feature `tests/polymorphic-wizard.spec.js` (Green Phase)**
  - Ejecutar `npx playwright test tests/polymorphic-wizard.spec.js` y certificar que todos los casos pasen en verde (6/6 tests pasando).

- [x] **T04: Verificación Integral de No-Regresión**
  - Ejecutar la suite global `npx playwright test` (garantizar 100% de éxito: 103/103 tests en verde).

- [x] **T05: Documentación y Despliegue a Producción**
  - Actualizar `tasks.md`, `spec.md` y `plan.md` a estado `COMPLETED` / `IMPLEMENTED`.
  - Generar `walkthrough.md`.
  - Registrar commit en git y push a `origin/main`.
