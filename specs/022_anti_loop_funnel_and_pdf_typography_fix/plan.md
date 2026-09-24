# Plan Técnico: Spec 022 - Auditoría Anti-Loop de WhatsApp y Corrección Tipográfica en Presupuesto PDF

**Feature ID:** `022_anti_loop_funnel_and_pdf_typography_fix`  
**Estado:** PROPOSED  

---

## 1. Arquitectura de Cambios

### 1.1. `api/quote.js`

1. **Saneamiento Anti-Loop en `generatePdfBuffer`:**
   - Línea 372: Reemplazar `Cliente: ${nombre}   |   Email: ${email}   |   Teléfono: ${telefono}` por `Cliente: ${nombre}   |   Email: ${email}   |   Santiago de Chile`.
   - Línea 484: Reemplazar `Consultas directas a contacto@cuatropuntas.com o WhatsApp +56 9 2738 4075` por `Consultas y coordinación directa a contacto@cuatropuntas.com`.
   - Línea 511: Reemplazar `Constructora Cuatropuntas SpA · Santiago de Chile · www.cuatropuntas.com · +56 9 2738 4075 · Documento técnico referencial conforme a Ley 21.305 y LGUC.` por `Constructora Cuatropuntas SpA · Santiago de Chile · www.cuatropuntas.com · contacto@cuatropuntas.com · Documento técnico referencial conforme a Ley 21.305 y LGUC.`.
   - Limpieza de variables huérfanas: remover `clientWhatsappUrl`.
   - Mensaje de error SMTP (Línea 827): actualizar copy a `error: 'Error en el servidor de correo. Por favor escríbenos a contacto@cuatropuntas.com o intenta nuevamente más tarde.'`.

2. **Corrección de Solapamiento Tipográfico en Sección 3:**
   - Redefinir `sec3Bullets`:
     ```javascript
     const sec3Bullets = [
         '• Contrato a Suma Alzada: Presupuesto cerrado e inalterable sobre el 100% de las partidas acordadas: total certeza sin cobros sorpresa.',
         '• Garantía Legal Art. 18 LGUC: Respaldo contractual de 10 años en estructura soportante, 5 años en instalaciones y 3 años en terminaciones.',
         isRemodelacion
             ? '• Protocolo ante Preexistencias: Inspección de redes previas. Si surgen vicios ocultos, se emite informe técnico y presupuesto aprobado por el mandante.'
             : '• Protocolo ante Preexistencias: Ante imprevistos ocultos en terreno (suelo o asbesto), se emite informe técnico y presupuesto aprobado por el mandante.'
     ];
     ```
   - Bucle dinámico con cálculo de altura real:
     ```javascript
     for (const bullet of sec3Bullets) {
         doc.text(bullet, 45, curY, { width: 522, lineGap: 1.5 });
         curY += doc.heightOfString(bullet, { width: 522, lineGap: 1.5 }) + 3;
     }
     ```
   - Renumerar Sección 5: `doc.text('5. Siguiente Paso — Visita Técnica en Terreno', 45, sec5Top);`.

### 1.2. `public/quote-wizard.js`

- Actualizar leyenda del input `#qTelefono` (Línea 340):
  `<span class="text-xs text-gray-500 mt-1 block">Ingresa tu número móvil chileno (+56 9) para coordinar la visita técnica a terreno.</span>`.

---

## 2. Plan de Pruebas Unitarias y de Integración (`tests/quote-high-ticket-presentation.spec.js`)

1. **Aserción Anti-Loop Estricta:**
   - Validar que el texto extraído del PDF (`fullText`) no contenga `wa.me`, `whatsapp` ni números telefónicos con regex `/(?:\+?56\s*9|\b\d{8,9}\b)/`.
   - Validar que `emailData.html` no contenga `wa.me`, `whatsapp` ni números telefónicos.
2. **Validación de 1 Página Letter:**
   - Verificar las 4 tipologías: Casa Nueva, Ampliación, Quincho (con notas de alcance) y Remodelación (con múltiples recintos y notas de alcance).
3. **Muestra en Disco Local:**
   - Generar `scratch/sample_ficha_tecnica_fixed.pdf` mediante un script de prueba para certificar visualmente la holgura y ausencia de solapamiento.
