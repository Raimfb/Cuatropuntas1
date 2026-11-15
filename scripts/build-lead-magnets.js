const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { generateQrMatrix } = require('../api/_qrMatrix');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'guias');

const COLORS = {
    navy: '#1a365d',
    dark: '#1a202c',
    terra: '#c05621',
    terraLight: '#fffaf5',
    terraBorder: '#fed7aa',
    slateLight: '#f8fafc',
    border: '#cbd5e1',
    text: '#2d3748',
    muted: '#4a5568',
    subtle: '#718096',
    dangerBg: '#fff5f5',
    dangerBorder: '#feb2b2',
    dangerText: '#9b2c2c',
    white: '#ffffff'
};

const LINKS = {
    calendar: 'https://cal.com/cuatropuntas.com/visita-tecnica',
    cotizador: 'https://www.cuatropuntas.com/#contacto',
    whatsapp: 'https://wa.me/56927384075',
    website: 'https://www.cuatropuntas.com'
};

/**
 * Crea un PDFDocument LETTER (612x792 pt) con márgenes de 45 pt.
 */
function createLetterDoc(meta) {
    const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 40, bottom: 24, left: 45, right: 45 },
        bufferPages: true,
        info: {
            Title: meta.title,
            Author: 'Constructora Cuatropuntas SpA',
            Subject: meta.subject,
            Keywords: meta.keywords,
            Creator: 'Constructora Cuatropuntas SpA (cuatropuntas.com)'
        }
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    const bufferPromise = new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
    });

    return { doc, bufferPromise };
}

/**
 * Dibuja el encabezado institucional superior homologado con el cotizador Cuatropuntas.
 */
function drawPageHeader(doc, badgeLabel, pageNumber, totalPages) {
    doc.rect(45, 36, 522, 4).fill(COLORS.terra);

    doc.fontSize(15).font('Helvetica-Bold').fillColor(COLORS.navy)
        .text('CONSTRUCTORA CUATROPUNTAS SpA', 45, 48);
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.subtle)
        .text('Arquitectura, Ingeniería & Construcción Habitacional  |  Región Metropolitana, Chile', 45, 66);

    doc.roundedRect(408, 46, 159, 26, 4).fill(COLORS.slateLight);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.terra)
        .text(badgeLabel, 412, 51, { width: 151, align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor(COLORS.muted)
        .text(`Página ${pageNumber} de ${totalPages}  |  Edición 2026`, 412, 61, { width: 151, align: 'center' });

    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(45, 80).lineTo(567, 80).stroke();
}

/**
 * Dibuja el pie de página institucional fijo en todas las páginas.
 */
function drawPageFooter(doc) {
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(45, 734).lineTo(567, 734).stroke();
    doc.fontSize(7).font('Helvetica').fillColor(COLORS.subtle)
        .text(
            'Constructora Cuatropuntas SpA · www.cuatropuntas.com · contacto@cuatropuntas.com · WhatsApp +56 9 2738 4075 · Documento técnico referencial RM.',
            45,
            742,
            { width: 522, align: 'center', link: LINKS.website, lineBreak: false }
        );
}

/**
 * Dibuja un encabezado de sección numerado.
 */
function drawSectionTitle(doc, y, title, subtitle) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.navy).text(title, 45, y, { width: 522 });
    let nextY = y + doc.heightOfString(title, { width: 522 }) + 2;
    if (subtitle) {
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.muted).text(subtitle, 45, nextY, { width: 522 });
        nextY += doc.heightOfString(subtitle, { width: 522 }) + 6;
    } else {
        nextY += 4;
    }
    return nextY;
}

/**
 * Dibuja el bloque de conversión final con QR vectorial hacia Cal.com, enlace al Cotizador y WhatsApp.
 */
function drawQrConversionBox(doc, y, ctaTitle, ctaDesc) {
    const titleW = 396;
    const titleH = doc.fontSize(9.6).font('Helvetica-Bold').heightOfString(ctaTitle, { width: titleW });
    const descY = y + 10 + titleH + 3;
    const boxH = Math.max(88, (descY - y) + 52);
    doc.roundedRect(45, y, 522, boxH, 6).fillAndStroke(COLORS.slateLight, COLORS.border);

    // Franja lateral izquierda terracota
    doc.rect(45, y, 5, boxH).fill(COLORS.terra);

    // Columna de texto y botones
    doc.fontSize(9.6).font('Helvetica-Bold').fillColor(COLORS.navy)
        .text(ctaTitle, 58, y + 10, { width: titleW });
    doc.fontSize(7.8).font('Helvetica').fillColor(COLORS.text)
        .text(ctaDesc, 58, descY, { width: titleW, lineGap: 1.4 });

    // Botón 1: Visita Técnica Cal.com
    const btnY = y + boxH - 30;
    doc.roundedRect(58, btnY, 160, 22, 4).fill(COLORS.terra);
    doc.fontSize(7.6).font('Helvetica-Bold').fillColor(COLORS.white)
        .text('Agendar Visita Técnica a Terreno', 58, btnY + 7, { width: 160, align: 'center' });
    doc.link(58, btnY, 160, 22, LINKS.calendar);

    // Botón 2: Cotizador Paramétrico
    doc.roundedRect(225, btnY, 114, 22, 4).fillAndStroke(COLORS.white, COLORS.navy);
    doc.fontSize(7.6).font('Helvetica-Bold').fillColor(COLORS.navy)
        .text('Ir al Cotizador Web', 225, btnY + 7, { width: 114, align: 'center' });
    doc.link(225, btnY, 114, 22, LINKS.cotizador);

    // Texto contacto WhatsApp (una sola línea limpia sin solapar QR)
    doc.fontSize(7.4).font('Helvetica-Bold').fillColor(COLORS.muted)
        .text('WhatsApp: +56 9 2738 4075', 347, btnY + 7, { width: 138, align: 'left', link: LINKS.whatsapp, lineBreak: false });

    // QR Vectorial derecha
    const qrSize = 58;
    const qrX = 496;
    const qrY = y + 9;
    const qrMatrix = generateQrMatrix(LINKS.calendar);
    const moduleCount = qrMatrix.length;
    const cellSize = qrSize / moduleCount;

    doc.save();
    doc.fillColor(COLORS.navy);
    for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
            if (qrMatrix[r][c]) {
                doc.rect(qrX + c * cellSize, qrY + r * cellSize, cellSize, cellSize).fill();
            }
        }
    }
    doc.restore();
    doc.link(qrX, qrY, qrSize, qrSize, LINKS.calendar);

    doc.fontSize(6.3).font('Helvetica-Bold').fillColor(COLORS.subtle)
        .text('Escanear cita DOM', qrX - 8, qrY + qrSize + 4, { width: qrSize + 16, align: 'center' });

    return y + boxH;
}

/**
 * Genera el PDF 1: Guía Práctica del Permiso de Edificación en la RM (2 páginas exactas).
 */
async function buildPermisoEdificacionPdf(outputPath) {
    const { doc, bufferPromise } = createLetterDoc({
        title: 'Guía Práctica del Permiso de Edificación en la RM | Constructora Cuatropuntas',
        subject: 'Los 4 hitos legales DOM, pre-factibilidades en parcelas RM y alcance constructivo OGUC',
        keywords: 'Permiso de Edificación, DOM Santiago, OGUC, Obra Menor Art 5.1.4, SEREMI Salud, Art 55 LGUC, Cuatropuntas'
    });

    // ==================== PÁGINA 1 ====================
    drawPageHeader(doc, 'GUÍA TÉCNICA DOM · N° 1', 1, 2);

    // Banner Título
    doc.roundedRect(45, 90, 522, 68, 6).fill(COLORS.navy);
    doc.fontSize(15).font('Helvetica-Bold').fillColor(COLORS.white)
        .text('Guía Práctica del Permiso de Edificación en la RM', 60, 102, { width: 492 });
    doc.fontSize(9.5).font('Helvetica').fillColor('#fbd38d')
        .text('Cómo evitar multas, paralizaciones municipales y sobrecostos ocultos antes de excavar.', 60, 123, { width: 492 });
    doc.fontSize(7.8).font('Helvetica').fillColor('#cbd5e1')
        .text('Aplicable a Casas Nuevas, Ampliaciones y Segundos Pisos en la Región Metropolitana bajo LGUC y OGUC.', 60, 139, { width: 492 });

    // Sección 1: Los 4 Hitos Legales en la DOM
    let y = drawSectionTitle(
        doc,
        172,
        '1. Los 4 Hitos Legales ante la Dirección de Obras Municipales (DOM)',
        'Iniciar faenas sin Permiso de Edificación aprobado expone al propietario a paralización de obra y multas del Juzgado de Policía Local.'
    );

    const hitos = [
        {
            num: 'HITO 1',
            title: 'Certificado de Informaciones Previas (CIP) y Cabida Normativa',
            desc: 'Documento base emitido por la municipalidad que fija las reglas de tu predio según el PRC/PRMS: coeficiente de constructibilidad, ocupación de suelo, altura máxima, rasantes, antejardín, adosamientos admisibles y afectación a utilidad pública.'
        },
        {
            num: 'HITO 2',
            title: 'Armado e Ingreso del Expediente Técnico MINVU (Arquitectura + Cálculo + Térmica)',
            desc: 'Carpeta firmada por Arquitecto e Ingeniero Civil Calculista: planos completos, especificaciones técnicas, cálculo sísmico (NCh433 / NCh432) y acreditación térmica obligatoria para Zona 3 RM (Art. 4.1.10 OGUC & Ley 21.305): techumbre U <= 0.38 W/m²K (R100 >= 260), aislación perimetral y barrera de vapor continua.'
        },
        {
            num: 'HITO 3',
            title: 'Revisión DOM (30 Días Hábiles) y Subsanación de Acta de Observaciones',
            desc: 'La DOM dispone de un plazo legal de 30 días hábiles para revisar el expediente (reducible a 15 días hábiles con Revisor Independiente). Si emite Acta de Observaciones, el patrocinante cuenta con un máximo de 60 días para subsanarlas y evitar el rechazo o caducidad.'
        },
        {
            num: 'HITO 4',
            title: 'Pago de Derechos (1,5% Tabla MINVU), Aviso de Inicio de Obras y Letrero',
            desc: 'Aprobado el expediente, se gira el 1,5% del presupuesto oficial calculado con la Tabla de Costos Unitarios del MINVU (para Obra Nueva). Con el permiso retirado, se presenta el Aviso de Inicio de Obras, se abre el Libro de Obras y se instala el letrero reglamentario antes de excavar.'
        }
    ];

    for (const h of hitos) {
        const descH = doc.heightOfString(h.desc, { width: 446, lineGap: 1.4 });
        const cardH = Math.max(54, descH + 26);
        doc.roundedRect(45, y, 522, cardH, 5).fillAndStroke(COLORS.slateLight, '#e2e8f0');

        doc.roundedRect(53, y + 10, 50, 18, 3).fill(COLORS.terra);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.white)
            .text(h.num, 53, y + 15, { width: 50, align: 'center' });

        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.dark)
            .text(h.title, 112, y + 9, { width: 446 });
        doc.fontSize(7.8).font('Helvetica').fillColor(COLORS.text)
            .text(h.desc, 112, y + 22, { width: 446, lineGap: 1.4 });

        y += cardH + 7;
    }

    // Sección 2: Diferenciación por Alcance
    y = drawSectionTitle(
        doc,
        y + 4,
        '2. Diferenciación por Alcance: ¿Qué Permiso Necesita Tu Proyecto?',
        'Confundir el régimen legal genera reparos en DOM o presupuestos mal dimensionados.'
    );

    const alcances = [
        {
            title: 'Permiso de Edificación Completo',
            tag: 'Obra Nueva / >100 m²',
            text: 'Obligatorio en casas nuevas y ampliaciones mayores a 100 m² o con alteración de estructura principal. Exige expediente completo, cálculo sísmico y 1,5% de derechos municipales.'
        },
        {
            title: 'Permiso de Obra Menor (Art. 5.1.4 OGUC)',
            tag: 'Ampliación <= 100 m²',
            text: 'Tramitación simplificada aplicable a ampliaciones habitacionales de hasta 100 m² edificados acumulados que no comprometan elementos soportantes principales ni superen rasantes.'
        },
        {
            title: 'Remodelación Interior / Mantención',
            tag: 'Sin permiso DOM',
            text: 'Cambios de terminaciones, tabiques no estructurales o recintos interiores sin ampliar m² ni alterar fachada/estructura. Requiere inspección técnica de redes y certificación SEC si interviene gas/luz.'
        }
    ];

    const colW = 168.5;
    const colGap = 8;
    const alcanceBoxH = 118;
    alcances.forEach((item, idx) => {
        const bx = 45 + idx * (colW + colGap);
        doc.roundedRect(bx, y, colW, alcanceBoxH, 5).fillAndStroke(COLORS.white, COLORS.border);
        doc.rect(bx, y, colW, 20).fill(idx === 1 ? COLORS.terra : COLORS.navy);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.white)
            .text(item.tag, bx + 6, y + 6, { width: colW - 12, align: 'center' });
        doc.fontSize(8.2).font('Helvetica-Bold').fillColor(COLORS.dark)
            .text(item.title, bx + 8, y + 26, { width: colW - 16 });
        doc.fontSize(7.4).font('Helvetica').fillColor(COLORS.muted)
            .text(item.text, bx + 8, y + 48, { width: colW - 16, lineGap: 1.4 });
    });

    drawPageFooter(doc);

    // ==================== PÁGINA 2 ====================
    doc.addPage({ size: 'LETTER', margins: { top: 40, bottom: 24, left: 45, right: 45 } });
    drawPageHeader(doc, 'GUÍA TÉCNICA DOM · N° 1', 2, 2);

    // Sección 3: Pre-factibilidades Críticas en Parcelas RM
    let y2 = drawSectionTitle(
        doc,
        92,
        '3. Pre-factibilidades Críticas en Parcelas y Sectores Periurbanos de la RM',
        'Antes de comprar terreno o proyectar en Pirque, Chicureo/Colina, Buin, Paine, Talagante, Peñaflor, Isla de Maipo, Lampa, Curacaví o Melipilla, verifica estas 3 habilitaciones previas:'
    );

    const prefactibilidades = [
        {
            title: 'Resolución Sanitaria SEREMI de Salud RM (Alcantarillado y Agua Particular)',
            text: 'En terrenos sin red pública de alcantarillado, la DOM exige proyecto sanitario particular aprobado por la SEREMI de Salud (fosa séptica con drenes de infiltración o planta de tratamiento + pozo absorbente), junto con prueba de absorción de suelo.'
        },
        {
            title: 'Certificado de Factibilidad de Agua Potable Rural (APR) o Concesionaria',
            text: 'Todo permiso exige acreditar suministro continuo mediante certificado vigente de APR local, Aguas Andinas / SMAPA, o acreditación legal de derechos de aprovechamiento y potabilidad cuando exista noria o pozo profundo.'
        },
        {
            title: 'Informes SAG y SEREMI MINVU — Art. 55 LGUC (Suelo Rural / Parcelas de Agrado)',
            text: 'En predios fuera del límite urbano (ej. parcelas D.L. 3.516), la autorización para construir vivienda o segunda casa puede requerir Informe Favorable para la Construcción (IFC) ante SAG y SEREMI de Vivienda antes del ingreso en la DOM.'
        }
    ];

    for (const pf of prefactibilidades) {
        const textH = doc.heightOfString(pf.text, { width: 492, lineGap: 1.4 });
        const boxH = textH + 28;
        doc.roundedRect(45, y2, 522, boxH, 5).fillAndStroke(COLORS.terraLight, COLORS.terraBorder);
        doc.fontSize(8.8).font('Helvetica-Bold').fillColor(COLORS.terra)
            .text(`• ${pf.title}`, 57, y2 + 8, { width: 498 });
        doc.fontSize(7.8).font('Helvetica').fillColor(COLORS.text)
            .text(pf.text, 57, y2 + 21, { width: 498, lineGap: 1.4 });
        y2 += boxH + 7;
    }

    // Sección 4: Enfoque Cuatropuntas — Suma Alzada, Etapas DOM y Anillos Logísticos RM
    y2 = drawSectionTitle(
        doc,
        y2 + 6,
        '4. Cómo Cuatropuntas Absorbe Arquitectura, Cálculo y Gestión DOM a Suma Alzada',
        'El expediente técnico y la obra quedan coordinados bajo un único responsable técnico y presupuesto cerrado.'
    );

    // Bloque comparativo 3 columnas por etapa de planos
    const etapas = [
        {
            title: 'Etapa Idea (Desde Cero)',
            badge: '+8% sobre base',
            text: 'Asumimos diseño de arquitectura, ingeniería de cálculo y confección del expediente técnico completo listo para tramitación DOM (Casas Nuevas y Ampliaciones).'
        },
        {
            title: 'Con Planos Listos',
            badge: '-3% descuento técnico',
            text: 'Si ya cuentas con planos de arquitectura definidos, nuestro equipo desarrolla el cálculo estructural y coordina la tramitación municipal ante la DOM.'
        },
        {
            title: 'Permiso Listo / Arq. Propio',
            badge: '-6% descuento técnico',
            text: 'Con Permiso DOM aprobado o arquitecto patrocinante externo, aplicamos descuento técnico para enfocarnos 100% en la ejecución limpia a Suma Alzada.'
        }
    ];

    const eH = 88;
    etapas.forEach((et, idx) => {
        const ex = 45 + idx * (colW + colGap);
        doc.roundedRect(ex, y2, colW, eH, 5).fillAndStroke(COLORS.slateLight, COLORS.border);
        doc.fontSize(8.2).font('Helvetica-Bold').fillColor(COLORS.navy)
            .text(et.title, ex + 8, y2 + 8, { width: colW - 16 });
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.terra)
            .text(et.badge, ex + 8, y2 + 20, { width: colW - 16 });
        doc.fontSize(7.2).font('Helvetica').fillColor(COLORS.muted)
            .text(et.text, ex + 8, y2 + 33, { width: colW - 16, lineGap: 1.3 });
    });

    y2 += eH + 10;

    // Caja Matriz SSOT + 5 Anillos RM + Suma Alzada
    const ssotH = 122;
    doc.roundedRect(45, y2, 522, ssotH, 6).fillAndStroke(COLORS.white, COLORS.navy);
    doc.rect(45, y2, 522, 22).fill(COLORS.navy);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLORS.white)
        .text('Matriz Oficial Cuatropuntas (Valores Netos +IVA · Contrato Cerrado a Suma Alzada)', 55, y2 + 7, { width: 502 });

    const matrixLines = [
        '• Casas Nuevas (1 Piso): Metalcom desde 19 UF/m²  |  Panel SIP desde 21 UF/m²  |  Albañilería desde 25 UF/m².',
        '• Segundos Pisos y Ampliaciones: Metalcom desde 22 UF/m²  |  Panel SIP desde 24 UF/m²  |  Albañilería desde 27 UF/m².',
        '• Calibración Territorial (5 Anillos Logísticos RM sobre Base Anillo 1):',
        '   - Anillo 1 (Puente Alto, La Florida y Santiago Urbano): 0% (Base)   |   Anillo 2 (Pirque): +2%',
        '   - Anillo 3 (Buin, Paine, Calera de Tango, Talagante, Peñaflor, Isla de Maipo, El Monte, Padre Hurtado, Melipilla, Curacaví, Lampa, Tiltil): +8%',
        '   - Anillo 4 (Chicureo, Colina, Piedra Roja, Chamisero): +18%   |   Anillo 5 (Las Condes, Vitacura, Lo Barnechea, La Reina, Providencia): +22%',
        '• Nota de Alcance: Derechos municipales (1,5% tabla MINVU) y empalmes se transparentan por separado al costo real del servicio.'
    ];

    let my = y2 + 28;
    doc.fontSize(7.4).font('Helvetica').fillColor(COLORS.text);
    for (const line of matrixLines) {
        doc.text(line, 55, my, { width: 502 });
        my += doc.heightOfString(line, { width: 502 }) + 2.5;
    }

    y2 += ssotH + 12;

    // Bloque QR y CTA final
    drawQrConversionBox(
        doc,
        y2,
        '¿Listo para evaluar la factibilidad DOM de tu terreno o ampliación?',
        'Calcula tu estimación paramétrica preliminar por comuna en el cotizador oficial o agenda una visita técnica en terreno con nuestro equipo.'
    );

    drawPageFooter(doc);
    const pageCount = doc.bufferedPageRange().count;
    doc.end();

    const buffer = await bufferPromise;
    fs.writeFileSync(outputPath, buffer);
    return { path: outputPath, bytes: buffer.length, pages: pageCount };
}

/**
 * Genera el PDF 2: Checklist Oficial de Recepción Final Municipal DOM (2 páginas exactas).
 */
async function buildChecklistRecepcionPdf(outputPath) {
    const { doc, bufferPromise } = createLetterDoc({
        title: 'Checklist Oficial de Recepción Final Municipal (DOM) | Constructora Cuatropuntas',
        subject: 'Ruta en 6 pasos, certificados SEC TE1/TC6, errores fatales de inspección e impacto en bancos y seguros',
        keywords: 'Recepción Final DOM, SEC TE1, SEC TC6, Art 5.2.6, Libro de Obras Art 1.2.9, Art 5.8.3 OGUC, CBR, Cuatropuntas'
    });

    // ==================== PÁGINA 1 ====================
    drawPageHeader(doc, 'CHECKLIST DOM · N° 2', 1, 2);

    // Banner Título
    doc.roundedRect(45, 90, 522, 68, 6).fill(COLORS.navy);
    doc.fontSize(15).font('Helvetica-Bold').fillColor(COLORS.white)
        .text('Checklist Oficial de Recepción Final Municipal (DOM)', 60, 102, { width: 492 });
    doc.fontSize(9.5).font('Helvetica').fillColor('#fbd38d')
        .text('Cómo aprobar la inspección municipal a la primera y habilitar tu propiedad para bancos y seguros.', 60, 123, { width: 492 });
    doc.fontSize(7.8).font('Helvetica').fillColor('#cbd5e1')
        .text('Guía verificable paso a paso para viviendas nuevas, segundos pisos y ampliaciones en la Región Metropolitana.', 60, 139, { width: 492 });

    // Sección 1: Ruta Completa en 6 Pasos
    let y = drawSectionTitle(
        doc,
        172,
        '1. Ruta Completa en 6 Pasos y Certificados Obligatorios',
        'Ninguna edificación se considera legalmente terminada ni habitable sin reunir esta carpeta antes de solicitar inspección en terreno.'
    );

    const steps = [
        {
            paso: 'Paso 1 · Certificado Eléctrico SEC TE1',
            desc: 'Declaración de instalación interior inscrita en la Superintendencia de Electricidad y Combustibles por instalador autorizado Clase A o B, coincidente con los circuitos y potencia ejecutados en tablero.'
        },
        {
            paso: 'Paso 2 · Certificado de Gas SEC TC6 (Sello Verde)',
            desc: 'Certificación de redes interiores de gas, artefactos (calefont, caldera, cocina), ductos de evacuación de gases y rejillas de ventilación reglamentarias ante la SEC.'
        },
        {
            paso: 'Paso 3 · Recepción de Agua Potable y Alcantarillado',
            desc: 'Certificado de dotación e instalaciones emitido por Aguas Andinas / SMAPA / APR correspondiente, o Resolución de Recepción Definitiva de la SEREMI de Salud RM para fosa séptica y agua particular en parcelas.'
        },
        {
            paso: 'Paso 4 · Certificado de Número Municipal y Rol SII',
            desc: 'Asignación formal de numeración domiciliaria en el municipio (cuando corresponda a obra nueva) y tramitación de actualización de superficie edificada / avalúo (Rol) ante el Servicio de Impuestos Internos.'
        },
        {
            paso: 'Paso 5 · Expediente Profesional de Término de Obra (OGUC)',
            desc: 'Tres documentos críticos: (a) Informe del Arquitecto (Art. 5.2.6 OGUC) acreditando fiel cumplimiento del permiso aprobado; (b) Libro de Obras completo y foliado (Art. 1.2.9 OGUC); y (c) Informe de Medidas de Gestión y Control de Calidad del Constructor (Art. 5.8.3 OGUC) con patente profesional vigente.'
        },
        {
            paso: 'Paso 6 · Inspección DOM en Terreno, Certificado Definitivo e Inscripción CBR',
            desc: 'Revisión presencial del inspector municipal DOM contrastando obra vs. planos aprobados. Emitido el Certificado de Recepción Definitiva, se archiva e inscribe en el Conservador de Bienes Raíces (CBR) y se libera el Rol actualizado.'
        }
    ];

    for (const s of steps) {
        const descH = doc.heightOfString(s.desc, { width: 472, lineGap: 1.4 });
        const boxH = Math.max(54, descH + 26);
        doc.roundedRect(45, y, 522, boxH, 5).fillAndStroke(COLORS.slateLight, '#e2e8f0');

        // Casilla vectorial verificable [ ]
        doc.roundedRect(57, y + 12, 16, 16, 3).lineWidth(1.5).strokeColor(COLORS.terra).fillAndStroke(COLORS.white, COLORS.terra);

        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.navy)
            .text(s.paso, 83, y + 9, { width: 472 });
        doc.fontSize(7.8).font('Helvetica').fillColor(COLORS.text)
            .text(s.desc, 83, y + 22, { width: 472, lineGap: 1.4 });

        y += boxH + 7;
    }

    drawPageFooter(doc);

    // ==================== PÁGINA 2 ====================
    doc.addPage({ size: 'LETTER', margins: { top: 40, bottom: 24, left: 45, right: 45 } });
    drawPageHeader(doc, 'CHECKLIST DOM · N° 2', 2, 2);

    // Sección 2: Los 3 Errores Fatales
    let y2 = drawSectionTitle(
        doc,
        92,
        '2. Los 3 Errores Fatales que Provocan Rechazo Inmediato en Terreno',
        'Evita perder meses en reaperturas de faena o regularizaciones costosas evitando estas faltas críticas:'
    );

    const errores = [
        {
            num: 'ERROR 1',
            title: 'Modificar vanos, ventanas, distanciamientos o agregar m² sin Modificación de Proyecto',
            text: 'Abrir o correr una ventana hacia un medianero sin respetar el distanciamiento mínimo OGUC, techar una terraza/logia o alterar la superficie proyectada respecto del plano timbrado provoca rechazo inmediato del inspector DOM y obliga a tramitar modificación antes de recepcionar.'
        },
        {
            num: 'ERROR 2',
            title: 'Construir con contratistas informales sin Constructor con patente municipal vigente',
            text: 'Por ley, un maestro o contratista sin título profesional habilitante ni patente vigente al día no puede firmar el Libro de Obras (Art. 1.2.9) ni suscribir el Informe de Calidad del Art. 5.8.3 OGUC. Sin esas firmas legales, la carpeta de Recepción Final queda bloqueada en mesón.'
        },
        {
            num: 'ERROR 3',
            title: 'Omitir exigencias térmicas de Zona 3 RM y cortafuegos en adosamientos',
            text: 'No acreditar el espesor/densidad de aislación exigido por el Art. 4.1.10 OGUC, descuidar resistencia al fuego F-60/F-120 en muros adosados a deslinde o instalar artefactos a gas sin ventilación conforme a SEC TC6 detiene la emisión del certificado definitivo.'
        }
    ];

    for (const err of errores) {
        const textH = doc.heightOfString(err.text, { width: 432, lineGap: 1.4 });
        const boxH = Math.max(54, textH + 26);
        doc.roundedRect(45, y2, 522, boxH, 5).fillAndStroke(COLORS.dangerBg, COLORS.dangerBorder);

        doc.roundedRect(53, y2 + 10, 56, 18, 3).fill(COLORS.dangerText);
        doc.fontSize(7.2).font('Helvetica-Bold').fillColor(COLORS.white)
            .text(err.num, 53, y2 + 15, { width: 56, align: 'center' });

        doc.fontSize(8.8).font('Helvetica-Bold').fillColor(COLORS.dangerText)
            .text(err.title, 118, y2 + 9, { width: 440 });
        doc.fontSize(7.7).font('Helvetica').fillColor(COLORS.text)
            .text(err.text, 118, y2 + 22, { width: 440, lineGap: 1.4 });

        y2 += boxH + 7;
    }

    // Sección 3: Impacto Patrimonial de No Tener Recepción Final
    y2 = drawSectionTitle(
        doc,
        y2 + 6,
        '3. Impacto Patrimonial de Construir o Ampliar sin Recepción Final',
        'Construir sin recepción municipal convierte una inversión de decenas de millones en activo irregular:'
    );

    const impactos = [
        {
            title: 'Bloqueo de Tasación Bancaria e Hipotecaria',
            text: 'Los bancos e instituciones financieras tasan en $0 los metros cuadrados sin Recepción Final DOM, impidiendo aprobar créditos hipotecarios, refinanciamientos o compraventas financiadas al futuro comprador.'
        },
        {
            title: 'Exclusión en Seguros de Incendio y Sismo',
            text: 'Ante un siniestro eléctrico o terremoto, las pólizas pueden objetar o rechazar la indemnización de construcciones que carecen de recepción municipal y certificación SEC TE1/TC6 acreditada.'
        },
        {
            title: 'Trabas en Empalmes Definitivos y Obras Futuras',
            text: 'Las empresas eléctricas y sanitarias exigen respaldo de permisos para empalmes definitivos, y la DOM bloquea nuevas ampliaciones o patentes mientras existan obras previas sin regularizar.'
        }
    ];

    const impW = 168.5;
    const impH = 104;
    impactos.forEach((imp, idx) => {
        const ix = 45 + idx * (impW + 8);
        doc.roundedRect(ix, y2, impW, impH, 5).fillAndStroke(COLORS.slateLight, COLORS.border);
        doc.rect(ix, y2, impW, 4).fill(COLORS.navy);
        doc.fontSize(8.2).font('Helvetica-Bold').fillColor(COLORS.navy)
            .text(imp.title, ix + 8, y2 + 11, { width: impW - 16 });
        doc.fontSize(7.4).font('Helvetica').fillColor(COLORS.muted)
            .text(imp.text, ix + 8, y2 + 34, { width: impW - 16, lineGap: 1.35 });
    });

    y2 += impH + 10;

    // Caja Respaldo Cuatropuntas + Art. 18 LGUC
    const resH = 74;
    doc.roundedRect(45, y2, 522, resH, 6).fillAndStroke(COLORS.terraLight, COLORS.terraBorder);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.navy)
        .text('4. Respaldo Contractual Cuatropuntas: Carpeta Lista para DOM + Art. 18 LGUC', 56, y2 + 9, { width: 500 });
    doc.fontSize(7.6).font('Helvetica').fillColor(COLORS.text)
        .text(
            '• Expediente técnico integral de término de obra: entregamos Libro de Obras (Art. 1.2.9), Informe del Arquitecto (Art. 5.2.6), Informe de Calidad del Constructor (Art. 5.8.3) y certificaciones SEC TE1/TC6 para tramitación de Recepción Final en la DOM.\n' +
            '• Contrato a Suma Alzada con Garantía Legal Art. 18 LGUC: 10 años en estructura soportante, 5 años en instalaciones y 3 años en terminaciones.',
            56,
            y2 + 23,
            { width: 500, lineGap: 1.8 }
        );

    y2 += resH + 10;

    // Bloque QR y CTA final
    drawQrConversionBox(
        doc,
        y2,
        '¿Necesitas construir con expediente listo para Recepción Final o regularizar tu proyecto?',
        'Cotiza tu proyecto llave en mano en nuestra web o agenda una visita técnica en terreno para evaluar estructura, normativa DOM y presupuesto cerrado.'
    );

    drawPageFooter(doc);
    const pageCount = doc.bufferedPageRange().count;
    doc.end();

    const buffer = await bufferPromise;
    fs.writeFileSync(outputPath, buffer);
    return { path: outputPath, bytes: buffer.length, pages: pageCount };
}

/**
 * Compila ambos Lead Magnets PDF en public/guias/.
 */
async function buildLeadMagnets(targetDir = OUTPUT_DIR) {
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const guia1Path = path.join(targetDir, 'guia-permiso-edificacion-rm.pdf');
    const guia2Path = path.join(targetDir, 'checklist-recepcion-final-dom.pdf');

    const res1 = await buildPermisoEdificacionPdf(guia1Path);
    const res2 = await buildChecklistRecepcionPdf(guia2Path);

    return {
        guiaPermiso: res1,
        checklistRecepcion: res2
    };
}

if (require.main === module) {
    buildLeadMagnets()
        .then((res) => {
            console.log(`✅ [LEAD MAGNETS] PDF 1 generado: ${res.guiaPermiso.path} (${res.guiaPermiso.pages} páginas, ${res.guiaPermiso.bytes} bytes)`);
            console.log(`✅ [LEAD MAGNETS] PDF 2 generado: ${res.checklistRecepcion.path} (${res.checklistRecepcion.pages} páginas, ${res.checklistRecepcion.bytes} bytes)`);
            process.exit(0);
        })
        .catch((err) => {
            console.error(`❌ [LEAD MAGNETS ERROR]: ${err.message}`);
            process.exit(1);
        });
}

module.exports = {
    buildLeadMagnets,
    buildPermisoEdificacionPdf,
    buildChecklistRecepcionPdf,
    OUTPUT_DIR
};
