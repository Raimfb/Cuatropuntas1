# Especificación de Requerimientos: Spec 022 - Auditoría Anti-Loop de WhatsApp y Corrección Tipográfica en Presupuesto PDF

**Feature ID:** `022_anti_loop_funnel_and_pdf_typography_fix`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** COMPLETED  

---

## 1. Resumen Ejecutivo y Diagnóstico

### 1.1. Erradicación de Bucles de WhatsApp (Funnel Post-Cotización)
En el ciclo de conversión post-cotización, cuando un usuario solicita un presupuesto en la web, recibe una estimación y un entregable formal (correo + PDF). Si en estos puntos de contacto se le ofrece un enlace o número de WhatsApp hacia el canal de prospección (+56 9 2738 4075), el usuario entra en un **bucle cerrado (loop de fricción)**:
1. El usuario cotiza en la web.
2. El PDF o correo le ofrece *"Consultas a WhatsApp"*.
3. El bot conversacional o el flujo automático de WhatsApp le responde derivándolo nuevamente al cotizador web (`https://www.cuatropuntas.com/#cotizador`).
4. El cliente se frustra por la circularidad de la interacción.

**Regla de Negocio Taxativa:**
El prospecto que ya cotizó debe avanzar hacia el siguiente hito natural: **agendar su Diagnóstico Técnico de Factibilidad en Terreno en Cal.com** (`https://cal.com/cuatropuntas.com/visita-tecnica`) o canalizar consultas asíncronas vía su correo electrónico (`contacto@cuatropuntas.com`). El teléfono personal y el canal de WhatsApp directo con el cliente solo se activan tras la visita a terreno.

**Excepción Operativa Intacta:**
La alerta interna al equipo comercial de Cuatropuntas (`mailToAdmin`) DEBE CONSERVAR el botón 1-Touch WhatsApp (`adminReplyWaUrl`) para que los directores de obra y comerciales puedan iniciar la conversación con el cliente en un solo clic.

---

### 1.2. Corrección de Solapamiento Tipográfico en PDF (Sección 3)
En la Ficha Técnica PDF generada por `api/quote.js`, las viñetas de la **Sección 3 ("Garantía y Seguridad Contractual")** presentan colisión visual y texto solapado (*text overlap*) en visores PDF de iOS, macOS y visores móviles.
- **Causa Raíz:** Saltos fijos de coordenada `Y` (`curY += 15`) que asumen que cada viñeta ocupa una sola línea. Al contener entre 150 y 200 caracteres, los párrafos quiebran en 2 líneas (~18 a 20 pt), provocando que la siguiente viñeta se imprima directamente sobre la segunda línea de la anterior.
- **Solución:**
  1. Implementar cálculo dinámico de espaciado vertical utilizando `doc.heightOfString(bullet, { width: 522, lineGap: 1.5 }) + 3`.
  2. Sintetizar el copy de las 3 viñetas para que sean compactas, directas y elegantes.
  3. Corregir la numeración secuencial de secciones (evitar duplicación de "Sección 4").
  4. Garantizar que el documento permanezca estrictamente en **1 sola página Letter** (altura útil $\le 702\ \text{pt}$) para las 4 tipologías de proyecto.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Ficha Técnica PDF (`api/quote.js`)

- **[EARS-022-01] Saneamiento Telefónico y Anti-Loop en el PDF:**  
  **Cuando** el sistema compile la Ficha Técnica PDF mediante `generatePdfBuffer()`:
  * El sistema **NO DEBE** incluir ningún número telefónico (`+56 9...`), icono ni enlace a WhatsApp en la cabecera, cuerpo o pie de página.
  * El bloque de datos del cliente en la cabecera **DEBE** omitir el teléfono personal y renderizar únicamente nombre, correo y ubicación institucional: `Cliente: ${nombre}   |   Email: ${email}   |   Santiago de Chile`.
  * La sección de llamado a la acción **DEBE** indicar: `Consultas y coordinación directa a contacto@cuatropuntas.com`.
  * El pie de página **DEBE** consignar únicamente los canales institucionales: `Constructora Cuatropuntas SpA · Santiago de Chile · www.cuatropuntas.com · contacto@cuatropuntas.com · Documento técnico referencial conforme a Ley 21.305 y LGUC.`.

- **[EARS-022-02] Espaciado Dinámico Vertical en Sección 3:**  
  **Cuando** se renderice la Sección 3 ("Garantía y Seguridad Contractual") en el PDF:
  * El sistema **DEBE** calcular el avance vertical `curY` de cada viñeta sumando dinámicamente `doc.heightOfString(bullet, { width: 522, lineGap: 1.5 }) + 3`.
  * Las viñetas **DEBEN** redactarse con copy sintetizado:
    1. *Contrato a Suma Alzada:* `• Contrato a Suma Alzada: Presupuesto cerrado e inalterable sobre el 100% de las partidas acordadas: total certeza sin cobros sorpresa.`
    2. *Garantía Legal Art. 18 LGUC:* `• Garantía Legal Art. 18 LGUC: Respaldo contractual de 10 años en estructura soportante, 5 años en instalaciones y 3 años en terminaciones.`
    3. *Protocolo ante Preexistencias:* En remodelaciones: `• Protocolo ante Preexistencias: Inspección de redes previas. Si surgen vicios ocultos, se emite informe técnico y presupuesto aprobado por el mandante.`; en obra exterior/nueva: `• Protocolo ante Preexistencias: Ante imprevistos ocultos en terreno (suelo o asbesto), se emite informe técnico y presupuesto aprobado por el mandante.`.

- **[EARS-022-03] Numeración Secuencial Corregida y Página Única Letter:**  
  **En todo el documento PDF:**
  * La sección final de agendamiento **DEBE** numerarse como **"5. Siguiente Paso — Visita Técnica en Terreno"** (eliminando la duplicidad con la Sección 4).
  * El documento generado **DEBE** mantenerse estrictamente en 1 sola página Letter ($612 \times 792\ \text{pt}$) para las 4 tipologías (Casas Nuevas, Segundos Pisos, Remodelaciones y Quinchos), incluso con notas de alcance condicionales activas.

---

### 2.2. Correo Transaccional al Cliente y Pantallas Web

- **[EARS-022-04] Correo Transaccional sin Enlaces de WhatsApp:**  
  **Cuando** se despache el correo al cliente (`mailToClient`):
  * El contenido HTML **NO DEBE** contener enlaces a `wa.me`, ni palabras clave de WhatsApp ni teléfonos móviles que induzcan al bucle.
  * El único llamado a la acción comercial **DEBE** ser el botón hacia Cal.com (`https://cal.com/cuatropuntas.com/visita-tecnica`).

- **[EARS-022-05] Copy del Paso 3 en Cotizador Web (`public/quote-wizard.js`):**  
  **En el Paso 3 del Wizard:**
  * La leyenda de ayuda bajo el input `#qTelefono` **DEBE** actualizarse a: `Ingresa tu número móvil chileno (+56 9) para coordinar la visita técnica a terreno.`, eliminando la mención de "recibir alertas y PDF por WhatsApp".

- **[EARS-022-06] Preservación de Alerta Comercial al Administrador:**  
  **En el correo de notificación interna (`mailToAdmin`):**
  * El sistema **DEBE** conservar íntegro el botón `ESCRIBIR A [NOMBRE] POR WHATSAPP` con el enlace `adminReplyWaUrl` (`https://wa.me/${formattedClientPhone}?text=...`) para que el equipo comercial contacte al cliente.

---

## 3. Criterios de Aceptación Técnicos

1. El texto extraído mediante FlateDecode del PDF de cliente NO contiene patrones de `wa.me`, `whatsapp` ni números telefónicos chilenos `+56 9...`.
2. El HTML de `generateEmailData` NO contiene enlaces a WhatsApp ni números de teléfono.
3. El PDF generado tiene `pageCount === 1` para las 4 tipologías.
4. Las líneas de la Sección 3 del PDF no se solapan (distancia vertical $\ge$ altura real del texto).
5. La suite completa `npx playwright test` pasa con 129+ tests en verde (cero regresiones).
