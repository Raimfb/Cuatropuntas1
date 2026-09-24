# Desglose de Tareas: Spec 022 - Auditoría Anti-Loop de WhatsApp y Corrección Tipográfica en Presupuesto PDF

**Feature ID:** `022_anti_loop_funnel_and_pdf_typography_fix`  
**Estado:** COMPLETED  

---

## Tareas de Implementación

- [x] **T01: Actualizar pruebas en `tests/quote-high-ticket-presentation.spec.js` (TDD Red Phase)**
  - Añadir aserción anti-loop estricta sobre el PDF extraído: prohibido `wa.me`, `whatsapp` y números telefónicos.
  - Añadir aserción anti-loop estricta sobre el HTML del correo al cliente: prohibido `wa.me`, `whatsapp` y números telefónicos.
  - Validar estricto `pageCount === 1` para las 4 tipologías.
  - Verificar que el test falle antes de aplicar las correcciones (Red Phase).

- [x] **T02: Sanear PDF y eliminar bucle de WhatsApp en `api/quote.js`**
  - Eliminar teléfono del cliente en cabecera (reemplazar por `Santiago de Chile`).
  - Eliminar mención de WhatsApp en Sección 5 del PDF.
  - Eliminar teléfono en pie de página del PDF.
  - Eliminar variable huérfana `clientWhatsappUrl`.
  - Actualizar mensaje de error en servidor SMTP.

- [x] **T03: Corregir solapamiento tipográfico en Sección 3 del PDF (`api/quote.js`)**
  - Implementar cálculo de espaciado dinámico vertical con `doc.heightOfString(...) + 3`.
  - Sintetizar copy de las 3 viñetas para garantizar ajuste perfecto en 1 página Letter.
  - Corregir numeración de sección final a `4. Siguiente Paso` (homologada con suite de verificación).

- [x] **T04: Actualizar copy de Paso 3 en `public/quote-wizard.js`**
  - Cambiar leyenda de `#qTelefono` a coordinación de visita técnica, erradicando la promesa de alertas por WhatsApp.

- [x] **T05: Generar muestra PDF en `scratch/sample_ficha_tecnica_fixed.pdf` y verificar TDD**
  - Generar PDF en disco para certificar legibilidad e interlineado limpio.
  - Ejecutar `tests/quote-high-ticket-presentation.spec.js` (Green Phase).

- [x] **T06: Verificación de Regresión Global y Despliegue**
  - Ejecutar `npx playwright test` (129+ tests en verde).
  - Actualizar estado en `specs/022_anti_loop_funnel_and_pdf_typography_fix/`.
  - Commit y push a `origin/main`.
