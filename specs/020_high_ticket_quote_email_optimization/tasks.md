# Desglose de Tareas: Spec 020 - Optimización High-Ticket de Presupuesto por Correo y Ficha Técnica PDF
**Feature ID:** `020_high_ticket_quote_email_optimization`  
**Estado:** COMPLETED  

---

## Tareas de Implementación TDD

- [x] **T01: Crear suite automatizada TDD `tests/quote-high-ticket-presentation.spec.js` (Red Phase)**
  - Validar generación de asunto dinámico:
    * Regex: `/^📐 Diagnóstico y Presupuesto Preliminar: .+ en .+ — Cuatropuntas$/`
  - Validar presencia de bloques High-Ticket en HTML del correo:
    * Presencia de `Art. 18 de la LGUC` (10 años estructura, 5 años instalaciones, 3 años terminaciones).
    * Presencia de `Contrato a Suma Alzada con Itemizado Detallado`.
    * Presencia de cláusula de capacidad operativa honesta (`cupos mensuales limitados de inicio de obra` / `máximo 3 a 4`).
    * Presencia de `Diagnóstico Técnico de Factibilidad en Terreno`.
    * Enlaces canónicos: `https://cal.com/cuatropuntas.com/visita-tecnica` y WhatsApp `56927384075`.
  - Validar generación de Ficha Técnica PDF en 1 sola página Letter:
    * Emisión para 4 tipologías: Casa Nueva (120 m²), Ampliación (45 m²), Quincho (25 m² con notas de alcance), Remodelación (cocina y baño con notas).
    * Certificar que el contador de páginas del PDF es exactamente 1 (`pageCount === 1`).
    * Validar que el PDF contiene el bloque de Garantías, la Metodología en 4 Pasos y la inyección vectorial de QR.
  - *Comando de verificación:* `npx playwright test tests/quote-high-ticket-presentation.spec.js` (certificar fallo controlado / fase roja).

- [x] **T02: Implementar Asunto Dinámico y Copywriting High-Ticket en Email (`api/quote.js`)**
  - Actualizar `mailToClient.subject` con el template dinámico:
    `📐 Diagnóstico y Presupuesto Preliminar: ${tipo} en ${cleanComuna} — Cuatropuntas`
  - Reestructurar el cuerpo HTML del correo al cliente:
    * Reencuadre de saludo inicial con enfoque de ingeniería habitacional.
    * Inserción del bloque "Cero Sobrecostos y Garantía Legal Art. 18 LGUC".
    * Inserción de cláusula honesta de cupos mensuales limitados de inicio de faena.
    * Reencuadre de la visita a "Diagnóstico Técnico de Factibilidad en Terreno".
    * Preservar los botones con enlace a Cal.com y WhatsApp oficial con copy de alta conversión.
  - *Comando de verificación:* `node -c api/quote.js`.

- [x] **T03: Reingeniería y Maquetación de la Ficha Técnica PDF en 1 Sola Página (`api/quote.js` & QR Vectorial)**
  - Implementar módulo generador de matriz QR vectorial liviano (`api/_qrMatrix.js`) en JavaScript puro sin dependencias externas.
  - Ajustar Y-Budget milimétrico en `api/quote.js`:
    * Sustituir textos legales defensivos por "3. Garantía y Seguridad Contractual" (Suma Alzada + Art. 18 LGUC + Protocolo de vicios ocultos).
    * Incorporar bloque horizontal compacto "4. Metodología de Ejecución en 4 Pasos" (Diagnóstico $\to$ Presupuesto $\to$ Contrato $\to$ Recepción DOM).
    * Diagramar sección inferior con botón de agendamiento y código QR vectorial para escaneo móvil.
    * Proteger alturas dinámicas para garantizar que ni en Quinchos ni en Remodelaciones desborde a página 2.
  - *Comando de verificación:* `node -c api/quote.js`.

- [x] **T04: Ejecución de Suites de Pruebas y Certificación de Cero Regresiones**
  - Ejecutar la nueva suite: `npx playwright test tests/quote-high-ticket-presentation.spec.js` (5 passed).
  - Ejecutar suite completa de regresión: `npx playwright test` (120 passed, 0 failed).
  - Validar compatibilidad específica con `tests/verify.spec.js:152` (`toContain('https://cal.com/cuatropuntas.com/visita-tecnica')`, `toContain('Agendar Visita Técnica a Terreno')`).

- [x] **T05: Documentación, Actualización de Estados y Walkthrough**
  - Actualizar `specs/020_high_ticket_quote_email_optimization/tasks.md` con tareas marcadas.
  - Actualizar `specs/020_high_ticket_quote_email_optimization/spec.md` a estado `IMPLEMENTED`.
  - Crear `walkthrough.md` documentando la comparativa visual y funcional.
