# Task Breakdown: 011 - Simplificación Comercial y Desescalada de Tecnicismos Térmicos

**Feature ID:** `011_commercial_copy_simplification`  
**Estado:** COMPLETADO / IMPLEMENTADO  
**Metodología:** SDD (Spec-Driven Development) & TDD  

---

## Tareas de Implementación Quirúrgica

- [x] **Task 1: Actualización del Contrato de Pruebas TDD (`tests/normative-compliance.spec.js`)**
  - Refactorizar las aserciones de `T01.1` para verificar los 3 niveles de confort y recepción municipal en `index.html` y `precios.html` sin exigir la cadena rígida "4.1.10".
  - Refactorizar las aserciones de `T01.2` para verificar aislación climática para Santiago y carpeta técnica DOM en `casas-nuevas.html` y `segundos-pisos.html`.
  - Preservar intactas las aserciones de rigor técnico de `T01.3` (TechArticle, U <= 0.38, R100 >= 260 en blog) y `T01.4` (SSOT en AGENTS.md).
  - *Comando de Verificación:* `npx playwright test tests/normative-compliance.spec.js` (Fase Roja controlada sobre los nuevos copys esperados).

- [x] **Task 2: Simplificación Comercial en Portada (`public/index.html`)**
  - Reemplazar bullets técnicos en Servicio 1 (Casas Nuevas) y Servicio 2 (Segundos Pisos) por beneficios de habitabilidad y recepción municipal.
  - Actualizar el bloque de 3 Niveles en `#precios` sustituyendo coeficientes ($U$, $R_{100}$) por lenguaje orientado al cliente.
  - *Comando de Verificación:* Validación visual de diff con `git diff public/index.html`.

- [x] **Task 3: Simplificación Comercial en Catálogo de Precios (`public/precios.html`)**
  - Actualizar la sección `#niveles-termicos` reflejando los beneficios de habitabilidad, ahorro y confort acústico para cada nivel.
  - *Comando de Verificación:* Validación de diff con `git diff public/precios.html`.

- [x] **Task 4: Simplificación Comercial en Fichas de Servicios (`public/servicios/casas-nuevas.html` y `public/servicios/segundos-pisos.html`)**
  - Modificar descripciones de Metalcom y SIP para resaltar protección contra humedad y confort interior.
  - Actualizar el paso 4 de ambos servicios destacando la carpeta técnica integral para recepción municipal DOM.
  - *Comando de Verificación:* Validación de diff con `git diff public/servicios/`.

- [x] **Task 5: Armonización de Directrices en SSOT (`AGENTS.md`)**
  - Incorporar en la Sección 3 la pauta de redacción comercial: los parámetros de ingeniería respaldan los proyectos, pero la capa web de venta comunica beneficios de habitabilidad y recepción municipal.
  - *Comando de Verificación:* `git diff AGENTS.md`.

- [x] **Task 6: Certificación de la Suite Normativa Refactorizada (Fase Green)**
  - Ejecutar `npx playwright test tests/normative-compliance.spec.js`.
  - *Comando de Verificación:* 4/4 pruebas pasando en verde.

- [x] **Task 7: Validación de Regresión Global del Proyecto**
  - Ejecutar la suite completa Playwright (`npx playwright test`).
  - *Comando de Verificación:* Mínimo 77/77 pruebas aprobadas con 0 fallos.

- [x] **Task 8: Despliegue a Producción**
  - Registrar commit: `feat(spec-011): simplificar copy comercial desescalando tecnicismos a beneficios de habitabilidad`.
  - Ejecutar `git push origin main` para disparar el build y despliegue automático en Vercel.
  - *Comando de Verificación:* Salida exitosa de `git push origin main`.
