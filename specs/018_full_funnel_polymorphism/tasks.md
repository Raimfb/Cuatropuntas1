# Desglose de Tareas: Spec 018 - Polimorfismo Integral del Paso 2 y Sincronización del Funnel
**Feature ID:** `018_full_funnel_polymorphism`  
**Estado:** COMPLETED  

---

## Tareas de Implementación

- [x] **T01: Crear suite automatizada TDD `tests/full-funnel.spec.js` (Red Phase)**
  - Validar sincronización de superficie en Paso 1:
    * `Remodelacion`: Mínimo 3 m² y `#espacios-remodelar` obligatorio (alerta si está vacío).
    * `Casa Nueva`, `Ampliacion`, `Quincho`: Mínimo 10 m² (alerta si es menor a 10 m²).
  - Validar Paso 2 polimórfico en `Remodelacion`:
    * `#qPisosContainer` y `#qPermisosContainer` ocultos (`hidden` / `display: none`) y sin atributo `required`.
    * `#qTerminacionesLabel` como *"Nivel de Terminaciones de Interiores"* con opciones adaptadas (`Estandar` vs `Premium`).
    * `#qComuna` visible y obligatoria.
    * Avance fluido a Paso 3 sin alertas de campos ocultos.
  - Validar Paso 2 polimórfico en `Quincho`:
    * `#qPisosContainer` y `#qPermisosContainer` ocultos y sin `required`.
    * `#qTerminacionesLabel` como *"Nivel de Terminaciones y Pavimentos"* con opciones adaptadas.
    * Avance a Paso 3 y visualización de tarjeta resumen `#step3QuinchoResumen`.
  - Validar Paso 2 polimórfico en `Ampliacion`:
    * `#qPisosContainer` visible con `#qPisosLabel` como *"Ubicación de la Obra"*.
    * Opciones: Primer Piso vs Segundo Piso (Sobreelevación).
    * Permisos DOM y terminaciones habitacionales visibles y obligatorios.
  - Validar Paso 2 en `Casa Nueva`:
    * 4 preguntas habitacionales completas.
  - Validar integridad de payload a `/api/quote`:
    * Proyectos de Remodelación y Quincho envían `pisos: 1`, `permisos: 'Idea'`, `comuna`, `terminaciones` y reciben `HTTP 200`.
  - *Comando de verificación:* `npx playwright test tests/full-funnel.spec.js` (certificar fase roja controlada).

- [x] **T02: Estructurar Contenedores Semánticos y Diccionario en `public/quote-wizard.js`**
  - Añadir en template HTML del Paso 2: `#qPisosContainer`, `#qPisosLabel`, `#qTerminacionesContainer`, `#qTerminacionesLabel`, `#qComunaContainer`, `#qComunaLabel`, `#qPermisosContainer`, `#qPermisosLabel`.
  - Ampliar `CONFIG_POR_TIPO` con las propiedades de Paso 2 para las 4 tipologías (`showPisos`, `pisosLabel`, `pisosOptions`, `defaultPisos`, `terminacionesLabel`, `terminacionesOptions`, `defaultTerminaciones`, `showPermisos`, `defaultPermisos`, `minArea`).
  - *Comando de verificación:* `node -c public/quote-wizard.js`.

- [x] **T03: Implementar `syncPolymorphicStep2(tipoVal)` y Lógica de Navegación**
  - Crear función `syncPolymorphicStep2(tipoVal)` para alternar visibilidad, required, repoblar selects y asignar fallbacks.
  - Vincular en `syncPolymorphicStep1` o invocarla concurrentemente en el listener de `#qTipo` y en `initQuoteWizard()`.
  - Actualizar `nextStep(2)` para validar `minArea` y obligatoriedad de `#espacios-remodelar` en Remodelación.
  - Actualizar `nextStep(3)` para validar solo campos visibles y evitar bloqueos por campos ocultos.
  - Garantizar fallbacks en `bindSubmitHandler`.
  - *Comando de verificación:* `node -c public/quote-wizard.js`.

- [x] **T04: Ejecutar Suite TDD y Validación de No-Regresión**
  - Ejecutar `npx playwright test tests/full-funnel.spec.js` (pasar de rojo a verde, 100% aprobado).
  - Ejecutar `npx playwright test` (garantizar los 103 tests existentes + nuevos en verde: 109/109).

- [x] **T05: Documentación y Walkthrough**
  - Actualizar `specs/018_full_funnel_polymorphism/tasks.md` con todos los checkboxes completados.
  - Actualizar `specs/018_full_funnel_polymorphism/spec.md` a estado `IMPLEMENTED`.
  - Generar `walkthrough.md`.

- [x] **T06: Higiene Git y Push a Producción**
  - Verificar `git status -s` limpio.
  - Commit: `feat(spec-018): polimorfismo integral de paso 2 y sincronizacion de validaciones de funnel`.
  - Push a `origin/main`.
