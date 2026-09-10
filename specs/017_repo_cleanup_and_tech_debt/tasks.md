# Desglose de Tareas: Spec 017 - Purga de Código Muerto, Deuda Técnica e Higiene del Repositorio
**Feature ID:** `017_repo_cleanup_and_tech_debt`  
**Estado:** COMPLETED  

---

## Tareas Atómicas de Implementación

- [x] **T01: Aislamiento Determinista de `public/sitemap.xml` en Suite de Blog**
  - Actualizar `tests/blog-automation.spec.js` y `tests/blog-image-generation.spec.js` para respaldar el contenido textual de `public/sitemap.xml` en `beforeAll`/test start.
  - Restaurar dicho respaldo en memoria durante `afterAll`/`finally` asegurando igualdad binaria y de saltos de línea.
  - Ejecutar `npx playwright test tests/blog-automation.spec.js` y certificar que `git status` reporta 0 diffs en `public/sitemap.xml`.
  - *Comando de verificación:* `npx playwright test tests/blog-automation.spec.js; git status -s`

- [x] **T02: Limpieza Quirúrgica Backend en `api/quote.js`**
  - Mover `const { isBotSubmission } = require('./_botGuard');` al encabezado del archivo (top-level scope).
  - Purgar la desestructuración de las 7 variables no utilizadas (`baseUFm2`, `multiplicador`, `factorComuna`, `factorPermisos`, `costoM2Final`, `minUF_raw`, `maxUF_raw`) dentro de `quoteHandler`.
  - Validar sintaxis con `node -c api/quote.js`.
  - Ejecutar tests unitarios y de integración del motor de cotización.
  - *Comando de verificación:* `node -c api/quote.js; npx playwright test tests/quote-engine.spec.js`

- [x] **T03: Limpieza Quirúrgica Frontend (`quote-wizard.js`, `navigation.js` y Servicios HTML)**
  - En `public/quote-wizard.js`:
    - Eliminar la constante no utilizada `SISTEMAS_DEFAULT` (Líneas 25-30).
    - Eliminar lectura huérfana de `data-sistemas` en `initQuoteWizard()`.
    - Inyectar guarda de idempotencia `quoteForm.dataset.wizardReady = 'true'` en `initQuoteWizard()`.
  - En `public/navigation.js`:
    - Eliminar la función redundante `autoFillFromQueryParams()` y su escuchador en `DOMContentLoaded`.
  - En `public/servicios/remodelaciones.html` y `public/servicios/quinchos.html`:
    - Remover atributo residual `data-sistemas="Metalcon,Albanileria"` del contenedor `#quote-wizard-container`.
  - Validar sintaxis con `node -c public/quote-wizard.js; node -c public/navigation.js`.
  - Ejecutar suites del wizard.
  - *Comando de verificación:* `npx playwright test tests/quote-wizard.spec.js tests/polymorphic-wizard.spec.js`

- [x] **T04: Higiene CSS DOM: Purga de Regla Muerta `.hp-field`**
  - Remover la regla `.hp-field { ... }` de los bloques `<style>` en las 7 páginas HTML:
    - `public/index.html`
    - `public/precios.html`
    - `public/subsidio-minvu-sitio-propio.html`
    - `public/servicios/casas-nuevas.html`
    - `public/servicios/segundos-pisos.html`
    - `public/servicios/remodelaciones.html`
    - `public/servicios/quinchos.html`
  - Ejecutar verificación grep para comprobar 0 ocurrencias de `hp-field` en `public/`.
  - Ejecutar suite de integridad DOM.
  - *Comando de verificación:* `npx playwright test tests/verify.spec.js`

- [x] **T05: Higiene de Archivos y Árbol Git**
  - Crear directorio `scripts/legacy/` y trasladar los 5 scripts `.bat` (`arreglar_logo.bat`, `configurar_identidad.bat`, `importar_logo.bat`, `organizar_archivos.bat`, `subir_a_github.bat`) con `git mv`.
  - Remover del control de versiones los archivos de escaneo y diagnósticos temporales: `git rm final_scan_result.json new_scan_result.json diagnose.js test_key.js scratch/lighthouse_result.json`.
  - Eliminar del sistema de archivos local el volcado huérfano `scan_result.json` y los temporales en `scratch/`.
  - Certificar la limpieza del directorio raíz.
  - *Comando de verificación:* `git status`

- [x] **T06: Verificación Integral Global (103 Tests Verdes & Git Clean)**
  - Ejecutar la suite completa de Playwright: `npx playwright test`.
  - Confirmar 103 de 103 tests pasando sin fallos ni flakiness.
  - Confirmar árbol de trabajo 100% limpio en Git.
  - *Comando de verificación:* `npx playwright test; git status`
