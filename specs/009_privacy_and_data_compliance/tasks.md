# Task Breakdown: 009 - Privacy Policy & Personal Data Compliance
**Feature ID:** `009_privacy_and_data_compliance`  
**Estado:** COMPLETED & CERTIFIED (72/72 TESTS PASSING)  
**Metodología:** SDD (Spec-Driven Development / TDD)

---

## Tareas de Implementación Quirúrgica

- [x] **Task 1: Creación del Test Automatizado (`tests/privacy-compliance.spec.js`)**
  - Implementar test de existencia física y contenido ARCO en `public/privacidad.html`.
  - Implementar test de presencia de micro-copy con enlace a `/privacidad` en Paso 3 de `quote-wizard.js`.
  - Implementar test de enlace a `/privacidad` en checkbox comercial de `blog-comments.js`.
  - Implementar test de enlace en footer de `index.html`.
  - *Comando de Verificación:* `npx playwright test tests/privacy-compliance.spec.js` (Fase Red confirmada).

- [x] **Task 2: Creación de la Página Canónica `public/privacidad.html`**
  - Desarrollar el documento HTML5 completo con Navbar oficial, estilos Tailwind, estructura legal completa (Responsable, Ley 19.628, Datos Recopilados, Finalidades, Seguridad/HTTPS, Derechos ARCO con procedimiento por email, Footer).
  - Validar inclusión del botón flotante de WhatsApp oficial y banner de cookies.
  - *Comando de Verificación:* Inspección de sintaxis y renderizado sin errores en consola.

- [x] **Task 3: Inserción de Micro-copy en Cotizador (`public/quote-wizard.js`)**
  - Agregar leyenda de consentimiento informado en `#step3` antes de los botones de envío:
    *"Al solicitar tu presupuesto, aceptas el tratamiento de tus datos para coordinar el contacto técnico conforme a nuestra Política de Privacidad."* (con enlace a `/privacidad`).
  - *Comando de Verificación:* `node -c public/quote-wizard.js` (código 0) y validación de diff.

- [x] **Task 4: Actualización de Vínculo en Comentarios del Blog (`public/blog-comments.js`)**
  - Modificar el label del checkbox `#comment-marketing-consent` para vincular explícitamente a `/privacidad`.
  - *Comando de Verificación:* `node -c public/blog-comments.js` (código 0) y validación de diff.

- [x] **Task 5: Actualización de Footers en `public/index.html` y `scripts/publish-blog.js`**
  - Actualizar el enlace en el pie de página de `public/index.html` para apuntar a `/privacidad`.
  - Actualizar la plantilla canónica de generación en `scripts/publish-blog.js` para incluir el enlace a `/privacidad`.
  - *Comando de Verificación:* `git diff public/index.html scripts/publish-blog.js`.

- [x] **Task 6: Certificación de la Suite de Cumplimiento (Fase Green)**
  - Ejecutar `npx playwright test tests/privacy-compliance.spec.js`.
  - *Comando de Verificación:* 100% de tests aprobados en `tests/privacy-compliance.spec.js` (4/4 passed).

- [x] **Task 7: Validación de Regresión Global del Proyecto**
  - Ejecutar la suite completa de Playwright (`npx playwright test`).
  - *Comando de Verificación:* 72/72 tests aprobados con 0 fallos.

- [ ] **Task 8: Despliegue a Producción**
  - Registrar commit: `feat(spec-009): politica de privacidad canonica y cumplimiento normativo ley 19.628`.
  - Push a `origin main` para trigger de despliegue en Vercel.
  - *Comando de Verificación:* Salida de `git push origin main`.
