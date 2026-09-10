# Especificación de Requerimientos: Spec 017 - Purga de Código Muerto, Deuda Técnica e Higiene del Repositorio
**Feature ID:** `017_repo_cleanup_and_tech_debt`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Diagnóstico Técnico

Tras la culminación exitosa y despliegue de las Specs 011 a 016, el sistema cuenta con 103 tests automatizados en estado verde. No obstante, la auditoría estática y de ciclo de vida ejecutada reveló acumulación de deuda técnica, artefactos residuales y comportamientos colaterales en la suite de pruebas:

1. **Inestabilidad del Árbol Git (`public/sitemap.xml`):** El test de integración `tests/blog-automation.spec.js` (caso `T01.4`) compila un artículo de prueba que muta `public/sitemap.xml` con saltos de línea LF (`\n`). El teardown de limpieza utiliza un regex que deja un salto de línea residual antes de `</urlset>`. En entornos Windows con `core.autocrlf = true`, esto genera que `public/sitemap.xml` figure modificado en Git tras cada ejecución de pruebas.
2. **Deuda Técnica en Backend (`api/quote.js`):** El módulo importa dinámicamente `_botGuard` dentro de `quoteHandler` en lugar del encabezado, y desestructura 7 variables numéricas de `calculateQuote` que jamás son leídas ni consumidas por la lógica del handler o la respuesta HTTP.
3. **Código Muerto en Frontend (`public/quote-wizard.js` y `public/navigation.js`):** `quote-wizard.js` retiene la constante global no referenciada `SISTEMAS_DEFAULT` y la lectura inútil de `data-sistemas` (obsoleta tras la arquitectura polimórfica de la Spec 016). Carece además de guarda de idempotencia contra reinicializaciones. Paralelamente, `navigation.js` mantiene una función `autoFillFromQueryParams()` obsoleta que entra en conflicto con `prefillFromURL()`.
4. **Residuos de Estilo en el DOM:** Siete páginas HTML declaran una regla de estilo `.hp-field` que nunca se aplica sobre ningún elemento, dado que los campos honeypot se inyectan dinámicamente con estilos en línea.
5. **Basura en la Raíz del Repositorio:** Existen dumps JSON de escaneo (`final_scan_result.json`, `new_scan_result.json`), scripts de diagnóstico puntual (`diagnose.js`, `test_key.js`) y archivos `.bat` de inicialización del proyecto dispersos en la raíz.

---

## 2. Requerimientos Funcionales y de Higiene en Notación EARS

### 2.1. Aislamiento y Determinismo en Tests (Sitemap Isolation)

- **[EARS-017-R01] Determinismo y Preservación de `public/sitemap.xml`:**  
  **CUANDO** la suite de pruebas del blog (`tests/blog-automation.spec.js`) se ejecute:  
  * El arnés de prueba **DEBE** respaldar en memoria el contenido textual exacto de `public/sitemap.xml` en el hook `beforeAll`.  
  * En el hook `afterAll`, el arnés **DEBE** restaurar dicho respaldo íntegramente en el disco.  
  * Tras completarse los tests, `git status` **DEBE** reportar el árbol de trabajo limpio sin modificaciones detectadas en `public/sitemap.xml`.

---

### 2.2. Limpieza Quirúrgica Backend (`api/quote.js`)

- **[EARS-017-R02] Higiene y Optimización en `api/quote.js`:**  
  * El módulo **DEBE** importar `isBotSubmission` en el nivel superior (`top-level scope`) junto a `nodemailer` y `pdfkit`.  
  * El manejador `quoteHandler` **DEBE** purgar la desestructuración de las 7 variables no consumidas (`baseUFm2`, `multiplicador`, `factorComuna`, `factorPermisos`, `costoM2Final`, `minUF_raw`, `maxUF_raw`), desestructurando exclusivamente las propiedades requeridas para el flujo transaccional y la respuesta JSON.  
  * La función pura `calculateQuote` **DEBE** mantener intacto su contrato de salida para asegurar plena compatibilidad con los tests unitarios de `tests/quote-engine.spec.js`.

---

### 2.3. Limpieza Quirúrgica Frontend (`public/quote-wizard.js` y `public/navigation.js`)

- **[EARS-017-R03] Purgado de Huérfanos e Idempotencia en Cotizador:**  
  * `public/quote-wizard.js` **DEBE** eliminar la constante huérfana `SISTEMAS_DEFAULT` (Líneas 25-30).  
  * `public/quote-wizard.js` **DEBE** eliminar el bloque de lectura de `data-sistemas` en `initQuoteWizard()`.  
  * `initQuoteWizard()` **DEBE** incorporar una guarda de idempotencia (`quoteForm.dataset.wizardReady`) que impida adjuntar múltiples escuchadores de eventos `change` y `submit` si la función es invocada más de una vez.  
  * `public/navigation.js` **DEBE** eliminar la función `autoFillFromQueryParams()` y su registro en `DOMContentLoaded`, consolidando el prellenado de URL exclusivamente en `prefillFromURL()` de `quote-wizard.js`.  
  * Los archivos `public/servicios/remodelaciones.html` y `public/servicios/quinchos.html` **DEBEN** remover el atributo residual `data-sistemas="Metalcon,Albanileria"`.

---

### 2.4. Higiene de Estilos y Clases CSS

- **[EARS-017-R04] Eliminación de Clase CSS Huérfana `.hp-field`:**  
  * Las 7 páginas del sitio que contienen el bloque `<style>` con `.hp-field` (`index.html`, `precios.html`, `subsidio-minvu-sitio-propio.html`, `servicios/casas-nuevas.html`, `servicios/segundos-pisos.html`, `servicios/remodelaciones.html`, `servicios/quinchos.html`) **DEBEN** purgar dicha regla CSS no utilizada sin alterar el resto de los estilos del bloque.

---

### 2.5. Higiene del Repositorio y Árbol de Archivos

- **[EARS-017-R05] Reorganización y Purga de Archivos Residuales:**  
  * Los 5 scripts de inicialización por lotes (`arreglar_logo.bat`, `configurar_identidad.bat`, `importar_logo.bat`, `organizar_archivos.bat`, `subir_a_github.bat`) **DEBEN** ser trasladados al directorio `scripts/legacy/`.  
  * Los archivos de volcado JSON obsoletos en la raíz (`final_scan_result.json`, `new_scan_result.json`) **DEBEN** ser eliminados del control de versiones mediante `git rm`.  
  * El archivo de volcado local no versionado `scan_result.json` **DEBE** ser eliminado del sistema de archivos.  
  * Los scripts de depuración en la raíz (`diagnose.js`, `test_key.js`) **DEBEN** ser eliminados del control de versiones mediante `git rm`.  
  * Los archivos temporales huérfanos en el directorio `scratch/` (`lighthouse_result.json`, `verify.spec.js`, `verify_site.js`) **DEBEN** ser eliminados del sistema de archivos.

---

### 2.6. Garantía de Cero Regresión

- **[EARS-017-R06] Verificación Integral de No Regresión:**  
  * Tras ejecutar la totalidad de las intervenciones de limpieza, la suite completa de 103 tests automatizados de Playwright (`npx playwright test`) **DEBE** pasar con 100% de éxito (código de salida 0).  
  * El comando `node -c` **DEBE** validar la sintaxis de todos los archivos `.js` modificados.  
  * `git status` **DEBE** certificar un árbol de trabajo limpio sin modificaciones indeseadas ni archivos temporales sueltos.

---

## 3. Criterios de Aceptación Técnicos

1. `npx playwright test tests/blog-automation.spec.js` finaliza con 7/7 pasados y `git status` reporta 0 modificaciones sobre `public/sitemap.xml`.
2. `node -c api/quote.js` y `node -c public/quote-wizard.js` pasan sin errores.
3. Búsqueda grep de `SISTEMAS_DEFAULT` en el repositorio retorna 0 coincidencias.
4. Búsqueda grep de `hp-field` en el directorio `public/` retorna 0 coincidencias.
5. Los archivos `final_scan_result.json`, `new_scan_result.json`, `diagnose.js`, `test_key.js` ya no existen en `git ls-files`.
6. La suite completa `npx playwright test` ejecuta y valida los 103 tests en verde.
