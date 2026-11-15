# Spec 033: Dos Guías Técnicas Descargables en PDF (Lead Magnets DOM — Permiso de Edificación y Recepción Final)

- **Estado:** `IMPLEMENTED`
- **Metodología:** SDD (Specification-Driven Development)
- **Alcance:** Generador reproducible de PDFs ([scripts/build-lead-magnets.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/scripts/build-lead-magnets.js)), entregables estáticos en `public/guias/`, endpoint Email-Gate (`POST /api/lead-magnet` enrutado por [vercel.json](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/vercel.json) hacia [api/contact.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/contact.js) + [api/_leadMagnet.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/_leadMagnet.js) manteniendo el máximo de 12 Serverless Functions en Vercel Hobby), persistencia de leads segmentados ([lib/leads-state.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/lib/leads-state.js)), modal web reutilizable ([public/lead-magnet-modal.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/lead-magnet-modal.js)), integración en páginas web ([index.html](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/index.html), [precios.html](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/precios.html), [casas-nuevas.html](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/servicios/casas-nuevas.html), [segundos-pisos.html](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/servicios/segundos-pisos.html)), catálogos AI ([llms.txt](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/llms.txt), [llms-full.txt](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/llms-full.txt), [api/markdown.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/markdown.js)) y suite TDD ([spec-033-lead-magnets-pdf.spec.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/tests/spec-033-lead-magnets-pdf.spec.js)).

---

## 1. Hallazgos de Auditoría (Solo Lectura)

### 1.1. Infraestructura PDF y Despliegue Existente
- **Librería PDF nativa del repositorio:** El proyecto ya cuenta con **`pdfkit` (`^0.17.2`)** en [package.json#L13](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/package.json#L13) y el generador vectorial de códigos QR sin dependencias en [api/_qrMatrix.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/_qrMatrix.js). Actualmente se usan juntos en `generatePdfBuffer()` dentro de [api/quote.js#L442-L665](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/quote.js#L442-L665) para adjuntar PDFs de cotización en memoria.
- **Servicio estático en Vercel:** Según [vercel.json#L69](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/vercel.json#L69), la regla de reescritura para negociación Markdown excluye explícitamente archivos con extensión (`.*\\..*`). Por tanto, los archivos en `public/guias/*.pdf` se sirven directamente desde el CDN de Vercel sin invocar funciones serverless ni requerir binarios pesados (Puppeteer/Chromium) en tiempo de ejecución.
- **Estado actual de `public/guias/`:** El directorio aún no existe (`Test-Path "public/guias"` = `False`).

### 1.2. Flujos de Captación de Leads y Puntos Estratégicos de Integración
- **Captación principal:** [api/quote.js#L1066-L1129](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/quote.js#L1066-L1129) centraliza el cotizador paramétrico con envío de PDF personalizado por correo, registro en Google Sheets, siembra de estado `COTIZADO` en [lib/leads-state.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/lib/leads-state.js) y alerta WhatsApp al contacto comercial (`56979092027`). [api/contact.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/contact.js) gestiona el contacto general por SMTP Zoho.
- **Decisión de arquitectura:**
  1. **Generación estática reproducible (`scripts/build-lead-magnets.js`):** Genera offline y bajo control de versiones dos PDFs editoriales (`public/guias/guia-permiso-edificacion-rm.pdf` y `public/guias/checklist-recepcion-final-dom.pdf`) usando `pdfkit` + `api/_qrMatrix.js`, reutilizables para descarga directa web y envío 1-click por WhatsApp/correo comercial.
  2. **Flujo Email-Gate Segmentado para Email Marketing (`api/_leadMagnet.js` vía `api/contact.js` + `vercel.json` + `public/lead-magnet-modal.js` + `lib/leads-state.js`):** Al pulsar cualquier botón `[data-lead-magnet]` (`permiso-edificacion` o `recepcion-final`), el sitio abre un modal solicitando **Nombre** y **Correo Electrónico**, envía a `/api/lead-magnet` (enrutado sin crear función extra sobre el tope de 12 funciones Hobby de Vercel), registra al prospecto en Redis/KV con etiqueta `LEAD_GUIA_DOM`, envía copia PDF por SMTP Zoho cuando está configurado y libera la descarga inmediata del PDF con CTA hacia el cotizador (`#contacto`).

---

## 2. Alcance de Contenido Técnico y Comercial de Ambos PDFs

### 2.1. PDF 1: `public/guias/guia-permiso-edificacion-rm.pdf`
*Título:* **Guía Práctica del Permiso de Edificación en la RM — Cómo evitar multas, paralizaciones y sobrecostos antes de excavar**

1. **Los 4 Hitos Legales en la DOM (antes de excavar):**
   - **Hito 1 — Certificado de Informaciones Previas (CIP):** Revisión de normativa del Plan Regulador Comunal/Metropolitano (PRMS), coeficientes de constructibilidad y ocupación de suelo, rasantes, antejardines, adosamientos, alturas máximas y afectaciones a utilidad pública.
   - **Hito 2 — Expediente Técnico MINVU (Arquitectura + Cálculo + Térmica):** Planos completos patrocinados por Arquitecto, memoria de cálculo estructural firmada por Ingeniero Civil Calculista (NCh433 diseño sísmico / NCh432 viento) y acreditación térmica obligatoria para Zona 3 RM (Art. 4.1.10 OGUC y Ley 21.305: techumbre $U \le 0.38\ \text{W/m}^2\text{K}$ / $R_{100} \ge 260$, aislación perimetral y barrera de vapor continua).
   - **Hito 3 — Revisión DOM y Subsanación de Observaciones:** Plazo legal de revisión DOM de **30 días hábiles** (reducible a **15 días hábiles** con informe favorable de Revisor Independiente) y emisión de **Acta de Observaciones** con plazo legal máximo de **60 días** para subsanar antes de caducidad de solicitud.
   - **Hito 4 — Giro de Derechos Municipales (1,5%), Inicio de Obras y Letrero:** Pago del **1,5% del presupuesto oficial** calculado según la Tabla de Costos Unitarios del MINVU (para Obra Nueva / Ampliación), Aviso de Inicio de Obras, apertura del Libro de Obras y colocación del letrero reglamentario visible en terreno antes de iniciar excavaciones.
2. **Pre-factibilidades Críticas en Parcelas y Sectores Periurbanos de la RM** *(Pirque, Chicureo/Colina, Buin, Paine, Talagante, Peñaflor, Isla de Maipo, Lampa, Curacaví, Melipilla)*:
   - **Resolución Sanitaria SEREMI de Salud RM:** Aprobación obligatoria de proyectos particulares de agua potable y alcantarillado (fosa séptica con drenes de infiltración o planta de tratamiento + pozo absorbente / pruebas de absorción).
   - **Factibilidad Hídrica (APR / Concesionaria):** Certificado vigente de Agua Potable Rural (APR), Aguas Andinas, SMAPA o acreditación de derechos de aprovechamiento de agua según sector.
   - **Informes SAG / SEREMI MINVU (Art. 55 LGUC):** Informe Favorable para la Construcción (IFC / cambio de uso de suelo rural cuando corresponda fuera del límite urbano o subdivisiones prediales rústicas D.L. 3.516).
3. **Diferenciación por Alcance Constructivo:**
   - **Permiso de Edificación Completo (Obra Nueva / Ampliación Mayor):** Toda vivienda nueva y ampliaciones que superen el límite de Obra Menor o intervengan estructura soportante principal.
   - **Permiso de Obra Menor (Art. 5.1.4 OGUC):** Ampliaciones de viviendas existentes hasta **100 m²** edificados acumulados conforme a normativa especial OGUC sin alterar la estabilidad estructural principal de la casa base.
   - **Obras de Mantención / Remodelación Interior:** Intervenciones interiores que no alteran elementos estructurales, superficie edificada, deslindes ni destino (sin requerir permiso de edificación, aunque sujetas a certificación SEC/sanitaria si modifican redes).
4. **Enfoque Cuatropuntas (Suma Alzada + Anillos Logísticos RM):**
   - **Etapa Desde Cero (`Idea`: `+8%`):** Cuatropuntas coordina arquitectura, cálculo estructural y la confección e ingreso del expediente técnico completo listo para tramitación DOM en Casas Nuevas y Ampliaciones.
   - **Descuentos técnicos por avance:** `-3%` si el mandante aporta planos de arquitectura listos (falta cálculo y gestión DOM); `-6%` si presenta Permiso DOM Aprobado o Arquitecto propio a cargo de la DOM (solo ejecución).
   - **Matriz SSOT y 5 Anillos RM (Valores netos +IVA sobre base Anillo 1):** Casas Nuevas desde 19/21/25 UF/m²; Segundos Pisos desde 22/24/27 UF/m². Anillo 1 Puente Alto/La Florida/Santiago Urbano (`0%`), Anillo 2 Pirque (`+2%`), Anillo 3 Cordón Lejano RM (`+8%`), Anillo 4 Chicureo/Colina (`+18%`), Anillo 5 Sector Oriente (`+22%`), bajo contrato formal a **Suma Alzada**.

### 2.2. PDF 2: `public/guias/checklist-recepcion-final-dom.pdf`
*Título:* **Checklist Oficial de Recepción Final Municipal — Cómo aprobar la inspección DOM a la primera y habilitar tu propiedad para bancos y seguros**

1. **Ruta Completa en 6 Pasos y Certificados Obligatorios:**
   - **Paso 1 — Certificación Eléctrica SEC TE1:** Declaración de instalación interior inscrita ante la Superintendencia de Electricidad y Combustibles por instalador autorizado Clase A/B.
   - **Paso 2 — Certificación de Gas SEC TC6 (Sello Verde):** Certificación reglamentaria de redes interiores de gas, artefactos, ductos de evacuación y ventilaciones obligatorias.
   - **Paso 3 — Recepción de Agua Potable y Alcantarillado:** Certificado de dotación/empalme emitido por la empresa sanitaria, APR o **Resolución de Recepción Definitiva SEREMI de Salud RM** (para fosas y sistemas particulares en parcelas).
   - **Paso 4 — Certificado de Número Municipal y Rol SII:** Asignación oficial de numeración domiciliaria (si aplica a obra nueva) y trámite de modificación/actualización de avalúo y Rol ante el Servicio de Impuestos Internos.
   - **Paso 5 — Expediente de Término de Obra (Art. 5.2.6, Art. 1.2.9 y Art. 5.8.3 OGUC):**
     - Informe del Arquitecto (**Art. 5.2.6 OGUC**) declarando que las obras fueron ejecutadas conforme al permiso aprobado.
     - **Libro de Obras completo y foliado (Art. 1.2.9 OGUC)** con anotaciones de hitos estructurales, instalaciones y visitas profesionales.
     - **Informe de Medidas de Gestión y Control de Calidad del Constructor (Art. 5.8.3 OGUC)** respaldado por profesional competente con patente municipal al día.
   - **Paso 6 — Inspección DOM, Certificado Definitivo e Inscripción CBR:** Verificación presencial del inspector DOM en obra, emisión del Certificado de Recepción Definitiva de Obras de Edificación e inscripción/archivo en el Conservador de Bienes Raíces (CBR).
2. **Los 3 Errores Fatales que Provocan Rechazo en Terreno:**
   - **Error Fatal 1 — Modificar vanos, distanciamientos o m² en obra sin Modificación de Proyecto:** Abrir o desplazar ventanas hacia medianeros sin distancia legal, techar terrazas/logias o cambiar la geometría respecto a los planos aprobados provoca acta de rechazo inmediato en la visita DOM.
   - **Error Fatal 2 — Construir con contratistas informales sin patente ni firma habilitante:** Si el ejecutor carece de título habilitante (Constructor Civil / Ingeniero Constructor) y patente municipal vigente, no puede suscribir legalmente el Libro de Obras ni el Informe de Calidad del Art. 5.8.3 OGUC, bloqueando la carpeta final.
   - **Error Fatal 3 — Incumplir exigencias térmicas y cortafuegos (Zona 3 RM):** Omitir soluciones acreditadas de techumbre/muros (Art. 4.1.10 OGUC), muros cortafuegos F-60/F-120 en adosamientos o rejillas/shafts exigidos por SEC.
3. **Impacto Patrimonial de Construir sin Recepción Final:**
   - **Bloqueo de tasación bancaria e hipotecaria:** La superficie sin recepción municipal se castiga o se tasa en $0 para créditos hipotecarios, refinanciamientos y compraventas con financiamiento bancario.
   - **Exclusión en pólizas de seguro (Incendio y Sismo):** Las aseguradoras pueden rechazar o reducir indemnizaciones ante siniestros si la edificación no cuenta con recepción municipal ni cumplimiento de norma sísmica/eléctrica acreditada.
   - **Trabas de empalmes y patentes:** Dificultades para regularizar empalmes definitivos de electricidad/agua o tramitar futuras ampliaciones y patentes municipales.
4. **Respaldo Cuatropuntas y Siguiente Paso:**
   - Entrega de expediente técnico completo para tramitación de Recepción Final ante la DOM, respaldo legal según el **Art. 18 de la LGUC** (10 años en estructura, 5 años en instalaciones, 3 años en terminaciones), QR directo a `https://cal.com/cuatropuntas.com/visita-tecnica`, enlace a `https://www.cuatropuntas.com/#contacto` y WhatsApp oficial `+56 9 2738 4075`.

---

## 3. Requisitos Funcionales (Notación EARS)

- **REQ-033-01 (Generador Reproducible en Node.js):**  
  *Cuando* se ejecute `node scripts/build-lead-magnets.js`, *el script deberá generar* mediante `pdfkit` y `api/_qrMatrix.js` ambos archivos PDF válidos en `public/guias/guia-permiso-edificacion-rm.pdf` y `public/guias/checklist-recepcion-final-dom.pdf` de forma determinista e idempotente (exportando además la función `buildLeadMagnets()` para pruebas automatizadas).
- **REQ-033-02 (Fidelidad Técnica y Estructural del PDF 1):**  
  *El archivo* `public/guias/guia-permiso-edificacion-rm.pdf` *deberá contener* exactamente 2 páginas tamaño `LETTER`, cabecera PDF válida (`%PDF-1.`), los 4 hitos DOM, las pre-factibilidades en parcelas RM (SEREMI de Salud, APR/sanitaria, SAG Art. 55 LGUC), la diferenciación Permiso Completo vs. Obra Menor Art. 5.1.4 OGUC vs. Remodelación Interior, los porcentajes oficiales (`+8%` Idea, `-3%` planos, `-6%` permiso aprobado/arquitecto propio), QR a Cal.com, enlace a `/#contacto` y WhatsApp `+56 9 2738 4075`, con cero presencia del número prohibido `63482439`.
- **REQ-033-03 (Fidelidad Técnica y Estructural del PDF 2):**  
  *El archivo* `public/guias/checklist-recepcion-final-dom.pdf` *deberá contener* exactamente 2 páginas tamaño `LETTER`, cabecera PDF válida (`%PDF-1.`), la ruta en 6 pasos y certificados obligatorios (SEC TE1, SEC TC6, sanitario/SEREMI, Rol SII, Art. 5.2.6, Art. 1.2.9, Art. 5.8.3 y CBR), los 3 errores fatales de rechazo, el impacto patrimonial (bancos, seguros de incendio/sismo y empalmes), garantía Art. 18 LGUC, QR a Cal.com, enlace a `/#contacto` y WhatsApp `+56 9 2738 4075`, con cero presencia del número prohibido `63482439`.
- **REQ-033-04 (Flujo Email-Gate Backend y Persistencia Segmentada):**  
  *Cuando* `POST /api/lead-magnet` (reescrito en `vercel.json` hacia `api/contact.js?action=lead-magnet` -> `api/_leadMagnet.js`) reciba `{ nombre, email, guia, sourcePage }`, *el endpoint deberá* validar nombre (>=2 caracteres), formato de email válido y guía permitida (`permiso-edificacion` o `recepcion-final`), registrar el contacto en `lib/leads-state.js` (memoria + Redis/KV si está configurado) con estado/etiqueta `LEAD_GUIA_DOM`, guía descargada, timestamp y `sourcePage`, intentar enviar correo de respaldo con el PDF adjunto vía Zoho SMTP si `ZOHO_PASS` está disponible (de forma *fail-safe*) y responder HTTP `200` con `{ ok: true, downloadUrl }`.
- **REQ-033-05 (Modal Email-Gate e Integración en Páginas Web):**  
  *Las páginas* `public/index.html`, `public/precios.html`, `public/servicios/casas-nuevas.html` y `public/servicios/segundos-pisos.html` *deberán incluir* tarjetas visibles para ambas guías con botones `data-lead-magnet="permiso-edificacion"` y `data-lead-magnet="recepcion-final"` conectados a `public/lead-magnet-modal.js`, abriendo `#leadMagnetModal` con campos Nombre y Correo Electrónico, aviso de privacidad, botón *"Desbloquear y Descargar PDF"* y descarga automática tras `POST /api/lead-magnet`, más CTA complementario hacia `#contacto`.
- **REQ-033-06 (Sincronización de Catálogos AI y Regla Anti-Sobrepromesas):**  
  *Los catálogos* `public/llms.txt`, `public/llms-full.txt` y `api/markdown.js` *deberán referenciar* ambos PDFs bajo `/guias/*.pdf` manteniendo intactos `<meta name="description">`, JSON-LD existente y el estricto cumplimiento de la Regla Anti-Sobrepromesas (expediente/carpeta técnica completa lista para tramitación y recepción municipal en la DOM, sin prometer aprobaciones automáticas).
- **REQ-033-07 (Verificación TDD T033.1 a T033.6 y No-Regresión):**  
  *El archivo* `tests/spec-033-lead-magnets-pdf.spec.js` *deberá validar* `buildLeadMagnets()`, integridad y extracción de texto real de ambos PDFs, ausencia del teléfono prohibido `63482439`, validación `400`/`200` + persistencia `LEAD_GUIA_DOM` en `api/_leadMagnet.js` y delegación vía `api/contact.js`, apertura y envío del modal `#leadMagnetModal` en desktop/móvil liberando el PDF en las 4 páginas, y sincronización en `llms.txt` / `llms-full.txt` / `api/markdown.js`.
