# Task Breakdown: 010 - Cumplimiento Térmico OGUC, Estándar de Precios y Artículo Técnico

**Feature ID:** `010_oguc_thermal_compliance_and_blog`  
**Estado:** EJECUCIÓN COMPLETADA / LISTO PARA DESPLIEGUE  
**Metodología:** SDD (Spec-Driven Development) & TDD  

---

## Tareas de Implementación Quirúrgica

- [x] **Task 1: Creación de la Suite Automatizada TDD (`tests/normative-compliance.spec.js`)**
  - Diseñar pruebas para validar los 3 niveles de estándar térmico en `index.html` y `precios.html`.
  - Validar mención del Art. 4.1.10 OGUC y expediente DOM en servicios de `casas-nuevas.html` y `segundos-pisos.html`.
  - Validar existencia y marcado del nuevo post `normativa-aislacion-termica-oguc-santiago-precios.html`.
  - Validar parámetros técnicos en `AGENTS.md`.
  - *Comando de Verificación:* `npx playwright test tests/normative-compliance.spec.js` (Fase Red confirmada).

- [x] **Task 2: Actualización de Portada (`public/index.html`)**
  - Enriquecer bullets de *Casas Nuevas* y *Segundos Pisos* con Art. 4.1.10 OGUC (Zona 3 RM) y expediente DOM.
  - Añadir bloque comparativo de 3 Niveles de Desempeño Térmico (Base 19 UF, Confort 22-24 UF, Premium 26-29 UF) en sección `#precios`.
  - *Comando de Verificación:* Inspección visual y validación de diff.

- [x] **Task 3: Actualización de Página de Precios (`public/precios.html`)**
  - Añadir bloque explicativo de los 3 Niveles de Desempeño Térmico y clarificación de que el valor base de 19 UF/m² cumple la norma obligatoria para recepción DOM.
  - *Comando de Verificación:* Inspección de diff.

- [x] **Task 4: Actualización de Fichas de Servicios (`public/servicios/casas-nuevas.html` y `public/servicios/segundos-pisos.html`)**
  - Detallar en las fichas de Metalcom y SIP la barrera de vapor/humedad continua y el cumplimiento del Art. 4.1.10 OGUC.
  - *Comando de Verificación:* Inspección de diff.

- [x] **Task 5: Redacción del Borrador Markdown del Artículo Técnico**
  - Crear `content/drafts/normativa-aislacion-termica-oguc-santiago-precios.md` con Frontmatter YAML completo, FAQ estructurado, cálculo de transmitancias y tabla comparativa de inversión.
  - *Comando de Verificación:* Revisión de sintaxis Markdown y ausencia de números purgados.

- [x] **Task 6: Compilación y Publicación vía Pipeline Editorial**
  - Ejecutar `node scripts/publish-blog.js content/drafts/normativa-aislacion-termica-oguc-santiago-precios.md`.
  - Verificar generación de HTML en `public/blog/posts/` y actualización de `posts.json`, `blog/index.html` y `sitemap.xml`.
  - *Comando de Verificación:* Comprobar existencia física de `public/blog/posts/normativa-aislacion-termica-oguc-santiago-precios.html`.

- [x] **Task 7: Actualización del SSOT Editorial (`AGENTS.md`)**
  - Incorporar el ítem 7 en la Sección 3 con los parámetros técnicos de aislación térmica OGUC Zona 3 RM ($U \le 0.38\ \text{W/m}^2\text{K}$, $R_{100} \ge 260$, Ley 21.305, 3 niveles de terminación térmica).
  - *Comando de Verificación:* `git diff AGENTS.md`.

- [x] **Task 8: Certificación de la Suite Normativa (Fase Green)**
  - Ejecutar `npx playwright test tests/normative-compliance.spec.js`.
  - *Comando de Verificación:* 100% de tests aprobados en `tests/normative-compliance.spec.js`.

- [x] **Task 9: Validación de Regresión Global del Proyecto**
  - Ejecutar la suite completa Playwright (`npx playwright test`).
  - *Comando de Verificación:* Mínimo 76/76 tests aprobados con 0 fallos (77/77 aprobados).

- [x] **Task 10: Despliegue a Producción**
  - Registrar commit: `feat(spec-010): implementar cumplimiento termico oguc 4.1.10, estandar de precios y articulo tecnico`.
  - Push a `origin main` para trigger de despliegue en Vercel.
  - *Comando de Verificación:* Salida de `git push origin main`.
