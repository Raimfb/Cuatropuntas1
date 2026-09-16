# Especificación de Requerimientos: Spec 020 - Optimización High-Ticket de Presupuesto por Correo y Ficha Técnica PDF
**Feature ID:** `020_high_ticket_quote_email_optimization`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Diagnóstico Comercial

El cotizador paramétrico y la lógica de cálculo del backend de Constructora Cuatropuntas SpA se encuentran totalmente validados y cubiertos por 115 tests automatizados. Sin embargo, el entregable transaccional que recibe el cliente tras completar el formulario web —compuesto por el correo electrónico de notificación y la Ficha Técnica PDF adjunta— opera actualmente como un comprobante pasivo/contable, desaprovechando el momento de mayor interés y temperatura comercial del lead.

### Oportunidad de Optimización High-Ticket B2C:
1. **Asunto del Correo:** Actualmente utiliza un formato plano (`Estimación para {tipo}: {min} a {max} UF | Constructora Cuatropuntas`). Debe evolucionar a un asunto dinámico, personalizado con emoji de precisión técnica, tipo de proyecto y comuna (`📐 Diagnóstico y Presupuesto Preliminar: {tipo} en {comuna} — Cuatropuntas`), elevando sustancialmente el Open Rate en clientes residenciales premium.
2. **Copywriting de Conversión:** Reemplazar el lenguaje meramente descriptivo por una narrativa de ingeniería residencial que desactive los tres grandes temores del cliente autopromotor:
   - **Miedo a sobrecostos imprevistos:** Explicar el blindaje de **Contrato a Suma Alzada** con itemizado cerrado.
   - **Miedo a la informalidad constructiva:** Destacar el respaldo normativo y la **Garantía Legal del Art. 18 de la LGUC** (10 años en estructura, 5 años en instalaciones, 3 años en terminaciones).
   - **Miedo a la improvisación en faena:** Reencuadrar la visita técnica no como un trámite comercial, sino como un **Diagnóstico Técnico de Factibilidad en Terreno** (revisión de deslindes, cotas, muros, empalmes y congelamiento de precio).
   - **Capacidad Operativa Honesta:** Transmitir exclusividad técnica mediante cupos mensuales limitados de inicio de obra para garantizar supervisión estricta y control de calidad directo de directores de obra.
3. **Ficha Técnica PDF en 1 Sola Página Carta (Letter):**
   - Eliminar advertencias defensivas y sustituirlas por el bloque de "Garantía y Seguridad Contractual".
   - Incorporar infografía compacta: **Metodología Cuatropuntas en 4 Pasos** (1. Diagnóstico de Terreno $\to$ 2. Presupuesto Definitivo $\to$ 3. Contrato Suma Alzada $\to$ 4. Recepción Conforme DOM).
   - Incorporar un **Código QR Vectorial** de alta definición junto al botón clickable interactivo que apunte a la agenda oficial de Cal.com (`https://cal.com/cuatropuntas.com/visita-tecnica`), facilitando la conversión tanto en lectura digital en escritorio como en documentos impresos o reenviados por WhatsApp familiar.
4. **Cero Regresiones Técnicas y Matemáticas:**
   - La lógica del motor de cálculo `calculateQuote`, factores comunales, normalización de datos y persistencia en Google Sheets (`persistLeadToGoogleSheets`) se mantienen intactos.
   - Mantener el 100% de la suite de 115 tests en verde.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Optimización del Correo Transaccional al Cliente (`api/quote.js`)

- **[EARS-020-01] Asunto Dinámico y Personalizado de Alta Apertura:**  
  **Cuando** el sistema procese exitosamente una cotización web para un prospecto,  
  el sistema **DEBE** generar el asunto del correo al cliente (`mailToClient.subject`) con el siguiente patrón dinámico exacto:  
  `📐 Diagnóstico y Presupuesto Preliminar: {tipo} en {comuna} — Cuatropuntas`  
  donde `{tipo}` corresponde al tipo de proyecto (ej. "Casa Nueva", "Ampliación", "Quincho / Terraza", "Remodelación") y `{comuna}` a la comuna seleccionada limpia (ej. "Las Condes", "Colina", "La Florida").

- **[EARS-020-02] Narrativa High-Ticket y Bloque "Cero Sobrecostos":**  
  **Cuando** se renderice el cuerpo HTML del correo al cliente,  
  el sistema **DEBE** estructurar el contenido en los siguientes bloques de confianza técnica:
  1. *Saludo y Diagnóstico:* Saludo personalizado con el primer nombre del prospecto (`${firstName}`) y validación de su proyecto de `${areaNum} m²` en `${comunaHuman}`.
  2. *Presentación del Rango de Inversión:* Caja destacada con el rango en UF `${minUF} a ${maxUF} UF` (sin IVA) e indicación de que el documento PDF adjunto contiene el diagnóstico técnico formal.
  3. *Bloque "Cero Sobrecostos y Garantía Legal":* Explicación taxativa del **Contrato a Suma Alzada** (precio cerrado sin partidas ocultas) y el respaldo del **Art. 18 de la Ley General de Urbanismo y Construcciones (LGUC)**:
     - 10 años en estructura soportante.
     - 5 años en elementos constructivos e instalaciones.
     - 3 años en terminaciones y acabados.
  4. *Reencuadre de la Visita Técnica:* Presentación de la visita como un **Diagnóstico Técnico de Factibilidad en Terreno**, donde ingenieros y arquitectos auditan deslindes, cotas, tipo de suelo o muros preexistentes, empalmes y viabilidad ante la DOM para emitir el presupuesto definitivo y congelar el valor de la obra.
  5. *Cláusula Honesta de Capacidad Operativa:* Declaración transparente de cupos mensuales limitados de inicio de obra (máximo 3 a 4 inicios simultáneos por mes) para garantizar supervisión técnica permanente y cumplimiento riguroso de la carta Gantt.

- **[EARS-020-03] Doble Llamado a la Acción Sincronizado (Cal.com + WhatsApp Oficial):**  
  **Cuando** el usuario visualice la sección de llamado a la acción del correo,  
  el sistema **DEBE** renderizar:
  1. **Botón Principal:** Acción prioritaria orientada al agendamiento online con enlace directo a `https://cal.com/cuatropuntas.com/visita-tecnica` y texto destacado *"Agendar Diagnóstico Técnico en Terreno"*.
  2. **Vía Secundaria:** Botón / enlace de contacto rápido vía WhatsApp al canal oficial de prospección `+56 9 2738 4075` (`https://wa.me/56927384075?text=...`) con texto prellenado contextualizado al proyecto del cliente.
  3. **Horario de Atención:** Mensaje informativo de coordinación de visitas de Lunes a Viernes de 09:00 a 18:30 hrs.

---

### 2.2. Reingeniería y Maquetación de la Ficha Técnica PDF

- **[EARS-020-04] Restricción Estricta de 1 Sola Página Carta (Letter):**  
  **Mientras** se genere el documento PDF en memoria mediante `pdfkit`,  
  el sistema **DEBE** confinar todos los elementos gráficos, cajas de datos, textos e infografías dentro de los límites verticales de una única página Letter ($612 \times 792\ \text{pt}$, márgenes de $45\ \text{pt}$, altura útil máxima de $702\ \text{pt}$).  
  Queda terminantemente prohibido que el documento desborde a una segunda página bajo cualquier combinación de parámetros (incluso en proyectos con notas de alcance de quinchos o recintos múltiples de remodelación).

- **[EARS-020-05] Bloque "Garantía y Seguridad Contractual" en Reemplazo de Disclaimers Pasivos:**  
  **En lugar de** advertencias legales defensivas o ambiguas,  
  el sistema **DEBE** maquetar en el PDF un bloque institucional de alta confianza titulado **"3. Garantía y Seguridad Contractual"** con tres directrices técnicas:
  1. *Contrato a Suma Alzada:* Presupuesto cerrado e inalterable para el 100% de las partidas y planos aprobados en el contrato de construcción.
  2. *Garantías Legales Art. 18 LGUC:* Respaldo contractual con 10 años en estructura, 5 años en instalaciones y 3 años en terminaciones.
  3. *Protocolo Transparente ante Preexistencias:* Procedimiento técnico formal ante vicios ocultos no visibles preliminarmente (informe técnico pericial y presupuesto complementario previo con aprobación del mandante antes de intervenir).

- **[EARS-020-06] Infografía Compacta "Metodología Cuatropuntas en 4 Pasos":**  
  **En el cuerpo del PDF**, el sistema **DEBE** incluir un bloque visual horizontal o modular titulado **"4. Metodología de Ejecución en 4 Pasos"** que sintetice el recorrido de la obra:
  1. *Paso 1: Diagnóstico en Terreno* (Levantamiento de cotas, deslindes, suelo y factibilidad DOM).
  2. *Paso 2: Presupuesto Definitivo* (Itemizado detallado a suma alzada con cubicaciones exactas).
  3. *Paso 3: Contrato y Garantía Legal* (Firma notarial con plazos garantizados y respaldo Art. 18 LGUC).
  4. *Paso 4: Recepción Conforme DOM* (Entrega llave en mano de carpeta municipal y obra terminada).

- **[EARS-020-07] Botón Interactivo y Código QR Vectorial para Agendamiento Cal.com:**  
  **En la sección final de conversión del PDF**, el sistema **DEBE** renderizar:
  1. **Botón Clickable Nativo:** Rectángulo institucional terracota `#c05621` con anotación PDF `doc.link(...)` apuntando a `https://cal.com/cuatropuntas.com/visita-tecnica`.
  2. **Código QR Vectorial:** Matriz QR generada directamente en vectores (módulos rectangulares precisos sin compresión raster ni artefactos pixelados) que codifique la URL oficial de agendamiento `https://cal.com/cuatropuntas.com/visita-tecnica`, permitiendo el escaneo instantáneo con la cámara del celular desde la hoja impresa o en pantalla.
  3. **Instrucción de Acción:** Texto explicativo invitando a escanear el código QR con el smartphone o hacer clic en el botón.

---

### 2.3. Preservación y Cero Regresiones

- **[EARS-020-08] Invariabilidad del Motor de Cálculo y Reglas de Negocio:**  
  El sistema **DEBE** mantener intactas las funciones `calculateQuote`, `analyzeRemodelingSpaces`, las matrices de precios (UF/m² y recintos húmedos), los factores de descuento DOM y los multiplicadores de terminaciones definidos en `api/quote.js`.

- **[EARS-020-09] Continuidad de Notificaciones Administrativas y Persistencia:**  
  El sistema **DEBE** seguir ejecutando concurrentemente:
  1. Persistencia preventiva y fail-safe en Google Sheets (`persistLeadToGoogleSheets`).
  2. Despacho del correo de alerta comercial interna con botón 1-Touch WhatsApp a `contacto@cuatropuntas.com`.
  3. Disparo de webhook / mensaje WhatsApp Graph API al teléfono de cierre comercial `+56 9 7909 2027` si el token está activo.

- **[EARS-020-10] Verificación Automatizada y Preservación de Suite Global:**  
  El sistema **DEBE** contar con una suite de pruebas automatizada `tests/quote-high-ticket-presentation.spec.js` que certifique:
  - Generación del nuevo formato dinámico de subject del correo al cliente.
  - Inclusión de los copys high-ticket (Art. 18 LGUC, Contrato a Suma Alzada, cupos mensuales limitados, Diagnóstico Técnico).
  - Enlace oficial canónico a Cal.com (`https://cal.com/cuatropuntas.com/visita-tecnica`) y WhatsApp oficial (`+56 9 2738 4075`).
  - Generación de un PDF de 1 sola página exacta sin desborde (`pageCount === 1`).
  - Presencia del código QR vectorial y los 4 pasos metodológicos en el PDF.
  - Aprobación del 100% de los 115 tests existentes sin roturas ni desajustes.

---

## 3. Criterios de Aceptación Técnicos

| ID | Criterio de Aceptación | Método de Validación |
| :--- | :--- | :--- |
| **AC-01** | El asunto del correo al cliente contiene emoji `📐`, "Diagnóstico y Presupuesto Preliminar", el tipo de obra y la comuna. | Test automatizado en `tests/quote-high-ticket-presentation.spec.js`. |
| **AC-02** | El correo contiene el desglose de garantías del Art. 18 LGUC (10 años, 5 años, 3 años) y mención a Suma Alzada. | Test unitario / regex sobre HTML generado. |
| **AC-03** | El correo contiene el enlace oficial `https://cal.com/cuatropuntas.com/visita-tecnica` y WhatsApp `56927384075`. | Aserción estricta en suite de tests. |
| **AC-04** | El PDF generado en memoria tiene estrictamente 1 página Letter para todas las tipologías (incluyendo Quinchos y Remodelaciones). | Inspección de buffers con `pdf-parse` o contador de páginas en buffer PDFKit. |
| **AC-05** | El PDF incorpora el bloque de Garantías (Art. 18 LGUC), la Metodología en 4 Pasos y un QR vectorial legible. | Verificación de streams y tests de no-regresión. |
| **AC-06** | Todos los 115 tests existentes de la suite Playwright pasan al 100% (`115 passed`). | Ejecución de `npx playwright test`. |
| **AC-07** | `node -c api/quote.js` compila limpiamente sin errores sintácticos. | Ejecución de `node -c api/quote.js`. |
