# Plan Técnico de Arquitectura: Spec 020 - Optimización High-Ticket de Presupuesto por Correo y Ficha Técnica PDF
**Feature ID:** `020_high_ticket_quote_email_optimization`  
**Estado:** APPROVED  

---

## 1. Arquitectura del Correo Transaccional HTML (`api/quote.js`)

El correo transaccional dirigido al prospecto evoluciona desde un formato de resumen contable pasivo a un **instrumento de venta de alto valor (High-Ticket B2C)**, diseñado para generar autoridad técnica, mitigar miedos de sobrecostos y acelerar el agendamiento directo en Cal.com.

### 1.1. Estructura de Secciones del Email

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Header Institucional (Logo + Terracota Line #c05621)    │
├─────────────────────────────────────────────────────────────┤
│ 2. Saludo Personalizado & Reencuadre de Proyecto            │
│    "Estimado(a) {Nombre}, planificar tu {Tipo} de {m²}..."  │
├─────────────────────────────────────────────────────────────┤
│ 3. Tarjeta de Diagnóstico & Inversión Paramétrica           │
│    • Datos de obra, sistema constructivo, sector y DOM      │
│    • Destacado: {minUF} a {maxUF} UF (sin IVA)              │
├─────────────────────────────────────────────────────────────┤
│ 4. Alcance Técnico Específico (Condicional Quinchos/Remod.) │
├─────────────────────────────────────────────────────────────┤
│ 5. Bloque "Cero Sobrecostos y Garantía Legal Art. 18 LGUC"  │
│    • Contrato a Suma Alzada (Itemizado cerrado)             │
│    • 10 años estructura / 5 años inst. / 3 años terminac.   │
│    • Protocolo de Vicios Ocultos pre-aprobado               │
├─────────────────────────────────────────────────────────────┤
│ 6. Cláusula Honesta de Capacidad Operativa                  │
│    • Cupos mensuales limitados de inicio de obra (superv.)  │
├─────────────────────────────────────────────────────────────┤
│ 7. Reencuadre de la Visita a Terreno                        │
│    "Diagnóstico Técnico de Factibilidad en Terreno"         │
├─────────────────────────────────────────────────────────────┤
│ 8. Doble CTA Sincronizado                                   │
│    [ Botón 1: Agendar Diagnóstico en Terreno (Cal.com) ]    │
│    [ Botón 2: Consultar por WhatsApp (+56 9 2738 4075) ]    │
├─────────────────────────────────────────────────────────────┤
│ 9. Preguntas Frecuentes (FAQ) & Footer Institucional        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2. Matriz de Copywriting High-Ticket: Miedos vs Argumentación Técnica

| Miedo Común del Autopromotor | Copy Pasivo Anterior | Copy High-Ticket Optimizado (Spec 020) |
| :--- | :--- | :--- |
| **Miedo a sobrecostos imprevistos** | "Contratos a Suma Alzada: Precio garantizado y cerrado." | *"Contrato a Suma Alzada con Itemizado Detallado: Tu presupuesto es cerrado e inalterable sobre el 100% de las partidas y planos contratados. Sin cobros imprevistos ni sorpresas de última hora."* |
| **Miedo a fallas constructivas / informalidad** | Sin mención explícita a la ley de garantías. | *"Garantía Legal Art. 18 LGUC: Respaldo legal exhaustivo de 10 años en estructura soportante, 5 años en instalaciones y redes, y 3 años en terminaciones superficiales."* |
| **Miedo a que la visita sea una venta agresiva** | "Agendar Visita Técnica a Terreno" | *"Diagnóstico Técnico de Factibilidad en Terreno: No es una visita comercial genérica. Un arquitecto o ingeniero civil evalúa cotas, deslindes, estado de muros o suelos, empalmes y viabilidad municipal para cerrar tu presupuesto definitivo."* |
| **Sensación de masividad / constructora desatendida** | Sin mención de capacidad. | *"Supervisión Directa y Capacidad Limitada: Para garantizar presencia permanente de nuestros directores de obra y estricto control de calidad, limitamos a un máximo de 3 a 4 inicios de obra simultáneos por mes."* |

---

## 2. Maquetación y Presupuesto Vertical (Y-Budget) de la Ficha Técnica PDF

El documento PDF generado con `pdfkit` debe mantenerse **estrictamente en 1 sola página Letter** ($612 \times 792\ \text{pt}$, márgenes de $45\ \text{pt}$, altura utilizable máxima $702\ \text{pt}$).

### 2.1. Desglose Milimétrico de Coordenadas Verticales (Y-Coordinates)

```text
 Y=45 pt  ┌──────────────────────────────────────────────────────────┐
          │ Barra terracota (4 pt) + Header Institucional             │
 Y=96 pt  ├──────────────────────────────────────────────────────────┤
          │ Título del Informe y Ficha del Cliente (Cliente, Tel, Mail)│
 Y=136 pt ├──────────────────────────────────────────────────────────┤
          │ 1. Parámetros Técnicos del Proyecto (Tarjeta gris tenue) │
 Y=218 pt ├──────────────────────────────────────────────────────────┤
          │ 2. Estimación Económica Referencial (Caja destacada UF)   │
 Y=276 pt ├──────────────────────────────────────────────────────────┤
          │ 3. Garantía y Seguridad Contractual (Art. 18 LGUC)        │
          │    • Suma Alzada • 10/5/3 Años LGUC • Vicios Ocultos      │
 Y=365 pt ├──────────────────────────────────────────────────────────┤
          │ 4. Metodología Cuatropuntas en 4 Pasos (Grid 4 columnas)  │
          │    [1.Diagnóstico] [2.Presupuesto] [3.Contrato] [4.DOM]  │
 Y=445 pt ├──────────────────────────────────────────────────────────┤
          │ [Condicional] Alcance Técnico (Quinchos o Remodelación)   │
          │ (Si no aplica, se redistribuye el aire vertical a CTA)   │
 Y=530 pt ├──────────────────────────────────────────────────────────┤
          │ 5. Diagnóstico en Terreno & Agendamiento Oficial          │
          │    ┌────────────────────────┬─────────────────────────┐  │
          │    │ Botón Clickable Cal.com│ Código QR Vectorial     │  │
          │    │ + Explicación técnica  │ (Scan con smartphone)   │  │
          │    └────────────────────────┴─────────────────────────┘  │
 Y=720 pt ├──────────────────────────────────────────────────────────┤
          │ Línea divisoria y Pie de Página Institucional (738 pt)   │
 Y=747 pt └──────────────────────────────────────────────────────────┘
```

### 2.2. Diseño de la Infografía: Metodología en 4 Pasos

Para no consumir espacio vertical excesivo, los 4 pasos se diagraman horizontalmente en una hilera de **4 tarjetas adyacentes** de $123\ \text{pt}$ de ancho cada una (separación $10\ \text{pt}$):

1. **Caja 1: 1. Diagnóstico**  
   *Levantamiento en terreno: cotas, deslindes, suelo y factibilidad DOM.*
2. **Caja 2: 2. Presupuesto**  
   *Itemizado detallado a suma alzada con cubicaciones definitivas.*
3. **Caja 3: 3. Contrato**  
   *Firma notarial con plazos garantizados y respaldo Art. 18 LGUC.*
4. **Caja 4: 4. Recepción**  
   *Entrega llave en mano de carpeta municipal DOM y obra conforme.*

---

## 3. Arquitectura del Código QR Vectorial en PDFKit

Para cumplir con la directriz de **alta nitidez vectorial sin dependencias pesadas**:

### 3.1. Generación de la Matriz QR
Se integra un generador de matriz QR en un módulo auxiliar liviano (`api/_qrMatrix.js` o librería QR minimalista de matriz) que transforma el enlace canónico `https://cal.com/cuatropuntas.com/visita-tecnica` en una matriz booleana $N \times N$ (típicamente $29 \times 29$ módulos con corrección de error 'M').

### 3.2. Renderizado Vectorial Nativo
En lugar de rasterizar imágenes PNG en disco o codificar buffers Base64 pesados:
```javascript
function drawVectorQr(doc, x, y, size, qrMatrix) {
    const moduleCount = qrMatrix.length;
    const cellSize = size / moduleCount;
    doc.save();
    doc.fillColor('#1a365d'); // Azul institucional Cuatropuntas
    for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
            if (qrMatrix[r][c]) {
                doc.rect(x + c * cellSize, y + r * cellSize, cellSize, cellSize).fill();
            }
        }
    }
    doc.restore();
}
```
**Ventajas Clave:**
- Cero artefactos o bordes borrosos al imprimir en cualquier resolución.
- Agrega menos de $2\ \text{KB}$ al tamaño total del archivo PDF.
- Escaneo infalible por cámaras de iOS y Android.

---

## 4. Preservación del Ecosistema y Cero Regresiones

1. **Canales Oficiales (SSOT):**
   - Cal.com: `https://cal.com/cuatropuntas.com/visita-tecnica` (verificado contra `AGENTS.md` y `tests/verify.spec.js:154`).
   - WhatsApp Captura: `+56 9 2738 4075` (`56927384075`).
   - WhatsApp Admin: `+56 9 7909 2027` (`56979092027`).
2. **Aserciones en `tests/verify.spec.js:152`:**
   - La prueba existente exige que `api/quote.js` contenga `https://cal.com/cuatropuntas.com/visita-tecnica`, `Agendar Visita Técnica a Terreno` y no contenga `Agendar Asesoría Técnica`.
   - Se asegura que tanto el botón como los textos del PDF satisfagan esta aserción para no romper ninguno de los 115 tests actuales.
3. **Persistencia en Google Sheets:**
   - El payload y llamada a `persistLeadToGoogleSheets(...)` se ejecutan antes de cualquier renderizado de correo.

---

## 5. Estrategia de Testing TDD (`tests/quote-high-ticket-presentation.spec.js`)

Se creará una nueva suite de pruebas cubriendo:
1. **Asunto Dinámico:** Validación del patrón `📐 Diagnóstico y Presupuesto Preliminar: {tipo} en {comuna} — Cuatropuntas`.
2. **Copys High-Ticket en Email:** Verificación de presencia de "Art. 18 LGUC", "10 años", "Suma Alzada", "Diagnóstico Técnico de Factibilidad", y "cupos mensuales".
3. **Estructura de Ficha PDF:** Verificación de que el buffer generado corresponde a 1 sola página Carta para las 4 tipologías (Casa Nueva, Ampliación, Quincho con notas, Remodelación con notas).
4. **Verificación de Enlaces e Interactividad:** Presencia de la anotación de enlace a Cal.com y estructura de módulos vectoriales del código QR.
