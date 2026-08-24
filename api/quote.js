const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { isBotSubmission } = require('./_botGuard');
        const botCheck = isBotSubmission(req.body);

        if (botCheck.isBot) {
            console.log(`[BOT BLOCKED api/quote.js] Reason: ${botCheck.reason}. Name: ${req.body?.nombre}, Email: ${req.body?.email}`);
            // Responder con HTTP 200 para simular éxito y evitar que el bot reintente
            return res.status(200).json({ success: true, message: 'Cotización generada y enviada correctamente' });
        }

        const { tipo, sistema, area, pisos, terminaciones, comuna, nombre, email, telefono } = req.body;

        // 2. Validación de campos obligatorios
        if (!tipo || !sistema || area === undefined || pisos === undefined || !terminaciones || !comuna || !nombre || !email || !telefono) {
            return res.status(400).json({ error: 'Faltan campos obligatorios en el formulario.' });
        }

        // 3. Saneamiento y Límites Estrictos
        const areaNum = parseFloat(area);
        const pisosNum = parseInt(pisos);

        if (isNaN(areaNum) || areaNum < 10 || areaNum > 5000) {
            return res.status(400).json({ error: 'La superficie ingresada no es válida. Por favor ingresa un valor entre 10 y 5000 m².' });
        }

        if (isNaN(pisosNum) || pisosNum < 1 || pisosNum > 4) {
            return res.status(400).json({ error: 'El número de pisos debe estar entre 1 y 4.' });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email) || email.length > 100) {
            return res.status(400).json({ error: 'El formato de correo electrónico no es válido.' });
        }

        const calendarUrl = process.env.NEXT_PUBLIC_CALENDAR_URL || process.env.CALENDAR_URL || "https://cal.com/cuatropuntas.com/visita-tecnica";

        // Mapeo legible de comunas y sectores para presentación ejecutiva
        function getComunaLabel(comunaKey) {
            const map = {
                'Tier1': 'Sector Oriente (Vitacura, Las Condes, Lo Barnechea, Providencia, La Reina)',
                'Tier2': 'Sector Centro-Oriente / Residencial (Ñuñoa, Macul, La Florida, Peñalolén, San Miguel)',
                'Tier3': 'Sector Poniente / Sur / Norte (Maipú, Pudahuel, Puente Alto, San Bernardo, Santiago)',
                'Tier4': 'Sectores en Crecimiento RM (Renca, Lo Espejo, Cerro Navia, PAC, Lo Prado)',
                'Tier5': 'Zonas Rurales / Periferia RM (Colina/Chicureo, Lampa, Talagante, Buin, Paine)'
            };
            return map[comunaKey] || comunaKey || 'Región Metropolitana';
        }

        const comunaHuman = getComunaLabel(comuna);
        const firstName = (nombre || '').trim().split(' ')[0] || 'Cliente';

        // --- MATRIZ DE PRECIOS EXACTA PUBLICADA EN LA WEB CUATROPUNTAS (UF/m² NETAS +IVA) ---
        // Coincidencia 100% estricta con las tablas públicas de precios.html y index.html
        let baseUFm2 = 19; // Fallback general

        const isAmpliacion = tipo.toLowerCase().includes("segundo") || tipo.toLowerCase().includes("amplia");
        const isQuincho = tipo.toLowerCase().includes("quincho");
        const isRemodelacion = tipo.toLowerCase().includes("remodela");

        if (isQuincho) {
            if (sistema === 'Metalcon') baseUFm2 = 12;
            else if (sistema === 'SIP' || sistema === 'Covintec') baseUFm2 = 14;
            else baseUFm2 = 15; // Albañilería / Mixto
        } else if (isRemodelacion) {
            if (sistema === 'Metalcon') baseUFm2 = 11;
            else baseUFm2 = 13; // Albañilería / otros sistemas sólidos
        } else if (isAmpliacion || pisosNum >= 2) {
            if (sistema === 'Metalcon') baseUFm2 = 22;
            else if (sistema === 'SIP' || sistema === 'Covintec') baseUFm2 = 24;
            else if (sistema === 'Mixto') baseUFm2 = 25;
            else baseUFm2 = 27; // Albañilería sólida
        } else {
            // Casa Nueva (1 Piso)
            if (sistema === 'Metalcon') baseUFm2 = 19;
            else if (sistema === 'SIP' || sistema === 'Covintec') baseUFm2 = 21;
            else if (sistema === 'Mixto') baseUFm2 = 23;
            else baseUFm2 = 25; // Albañilería sólida
        }

        // Ajustes por escala y terminaciones
        let multiplicador = 1.0;
        if (areaNum < 40) multiplicador += 0.08; // Proyectos pequeños (costo fijo proporcional mayor)
        if (terminaciones === 'Premium') multiplicador += 0.10; // Terminaciones Premium (porcelanatos, termopanel)

        // Factor por Comuna / Logística en RM
        const tiers = {
            'Tier1': 1.05, // Sector Oriente (+5% estándar zona y accesos)
            'Tier2': 1.00, // Residencial (Base)
            'Tier3': 1.00, // Eje Central / Poniente (Base)
            'Tier4': 0.98, // En Crecimiento (-2%)
            'Tier5': 0.98  // Periferia / Rural (-2%)
        };
        const factorComuna = tiers[comuna] || 1.0;

        const costoM2Final = baseUFm2 * multiplicador * factorComuna;
        const totalEstimado = costoM2Final * areaNum;

        // Rango referencial: ±5% sobre el total estimado para dar un margen comercial realista
        const minUF_raw = Math.round(totalEstimado * 0.96);
        const maxUF_raw = Math.round(totalEstimado * 1.05);

        const formatter = new Intl.NumberFormat('es-CL');
        const minUF = formatter.format(minUF_raw);
        const maxUF = formatter.format(maxUF_raw);

        // Enlaces directos a WhatsApp para máxima conversión
        const cleanClientPhone = (telefono || '').replace(/\D/g, '');
        const formattedClientPhone = cleanClientPhone.startsWith('56') ? cleanClientPhone : (cleanClientPhone.length === 9 ? `56${cleanClientPhone}` : cleanClientPhone);
        
        const clientWaText = encodeURIComponent(`Hola Constructora Cuatropuntas, recibí mi cotización referencial para mi proyecto de ${tipo} (${areaNum} m²) y me gustaría coordinar detalles con un asesor técnico.`);
        const clientWhatsappUrl = `https://wa.me/56979092027?text=${clientWaText}`;

        const adminWaText = encodeURIComponent(`Hola ${firstName}, te escribo de Constructora Cuatropuntas respecto a tu solicitud de cotización para tu proyecto de ${tipo} (${areaNum} m²). ¿Te parece si coordinamos una sesión de asesoría técnica de 40 min para revisar los detalles de tu terreno y diseño?`);
        const adminReplyWaUrl = `https://wa.me/${formattedClientPhone}?text=${adminWaText}`;

        // --- GENERACIÓN DE PDF PROFESIONAL EN MEMORIA (PDFKit) ---
        const doc = new PDFDocument({ margin: 45, size: 'LETTER' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        const pdfPromise = new Promise((resolve) => {
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
        });

        // 1. Encabezado Institucional
        doc.rect(45, 45, 522, 4).fill('#c05621'); // Barra decorativa terracota

        // Marca y Subtítulo
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a365d').text('CONSTRUCTORA CUATROPUNTAS', 45, 58);
        doc.fontSize(9).font('Helvetica').fillColor('#718096').text('Arquitectura, Ingeniería & Construcción Habitacional  |  www.cuatropuntas.com', 45, 78);

        // Metadatos a la derecha
        const fechaEmision = new Date().toLocaleDateString('es-CL');
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#4a5568').text(`Fecha: ${fechaEmision}`, 400, 58, { width: 167, align: 'right' });
        doc.fontSize(8.5).font('Helvetica').fillColor('#718096').text('Validez referencia: 30 días', 400, 72, { width: 167, align: 'right' });

        // Línea divisoria
        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(45, 96).lineTo(567, 96).stroke();

        // 2. Título Principal y Datos del Cliente
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a202c').text('ESTIMACIÓN REFERENCIAL DE PROYECTO', 45, 108);
        doc.fontSize(9.5).font('Helvetica').fillColor('#4a5568')
           .text(`Cliente: ${nombre}   |   Email: ${email}   |   Teléfono: ${telefono}`, 45, 126);

        // 3. Ficha Resumen del Proyecto
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a202c').text('1. Parámetros Técnicos del Proyecto', 45, 148);

        const cardTop = 164;
        doc.roundedRect(45, cardTop, 522, 70, 4).fillAndStroke('#f8fafc', '#e2e8f0');
        
        doc.fillColor('#2d3748').fontSize(9).font('Helvetica');
        doc.text(`• Tipo de Obra: ${tipo}`, 60, cardTop + 10);
        doc.text(`• Sistema Constructivo: ${sistema}`, 60, cardTop + 24);
        doc.text(`• Superficie Estimada: ${areaNum} m² (${pisosNum} piso${pisosNum > 1 ? 's' : ''})`, 60, cardTop + 38);
        doc.text(`• Nivel Terminaciones: ${terminaciones}`, 60, cardTop + 52);

        doc.text(`• Sector / Ubicación: ${comunaHuman}`, 290, cardTop + 10, { width: 260 });
        doc.text('• Modalidad: Llave en Mano Integral', 290, cardTop + 38);
        doc.text('• Gestión Municipal: Asesoría Permisos DOM', 290, cardTop + 52);

        // 4. Inversión Estimada Referencial
        const sec2Top = cardTop + 82;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a202c').text('2. Estimación Económica Referencial (Sin IVA)', 45, sec2Top);
        doc.fontSize(9).font('Helvetica').fillColor('#4a5568')
           .text('Rango paramétrico preliminar calculado según m² y sistema constructivo seleccionado:', 45, sec2Top + 15);

        const priceBoxTop = sec2Top + 30;
        doc.roundedRect(45, priceBoxTop, 522, 44, 4).fillAndStroke('#fffaf5', '#fed7aa');
        doc.fillColor('#c05621').fontSize(16).font('Helvetica-Bold')
           .text(`${minUF} UF  —  ${maxUF} UF (sin IVA)`, 45, priceBoxTop + 10, { width: 522, align: 'center' });
        doc.fontSize(8).font('Helvetica').fillColor('#9c4221')
           .text('Presupuesto definitivo sujeto a evaluación en terreno y desarrollo de especialidades.', 45, priceBoxTop + 28, { width: 522, align: 'center' });

        // 5. Compromiso de Transparencia Técnica y Modelo Constructivo
        const sec3Top = priceBoxTop + 56;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a202c').text('3. Compromiso de Transparencia y Modelo Llave en Mano', 45, sec3Top);
        
        doc.fontSize(8.5).font('Helvetica').fillColor('#4a5568');
        let curY = sec3Top + 16;
        doc.text('• Contrato a Suma Alzada: El presupuesto de la propuesta definitiva es cerrado para todas las partidas, planos y especificaciones acordadas en el contrato.', 45, curY, { width: 522, lineGap: 2 });
        curY += 22;
        doc.text('• Protocolo ante Imprevistos y Vicios Ocultos: Si en la intervención se detectan preexistencias no visibles preliminarmente (ej. retiro normado de asbesto por empresas autorizadas, refuerzos de fundaciones o fallas en instalaciones preexistentes), nuestro equipo elabora un informe técnico y cotización complementaria con tu aprobación previa antes de ejecutar.', 45, curY, { width: 522, lineGap: 2 });
        curY += 32;
        doc.text('• Gestión Normativa Integral: Asesoramos y gestionamos la tramitación de Permiso de Edificación y Recepción Final ante la Dirección de Obras Municipales (DOM).', 45, curY, { width: 522, lineGap: 2 });

        // 6. Siguiente Paso — Sesión de Asesoría Técnica (40 Minutos)
        const sec4Top = curY + 22;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a202c').text('4. Siguiente Paso — Sesión de Asesoría Técnica y Viabilidad (40 min)', 45, sec4Top);
        doc.fontSize(9).font('Helvetica').fillColor('#4a5568')
           .text('Para aterrizar la distribución espacial, evaluar condiciones de terreno y estructurar tu proyecto definitivo con presupuesto cerrado, te invitamos a agendar una sesión técnica de 40 minutos.', 45, sec4Top + 15, { width: 522 });

        // Botón Interactivo Corregido y Centrado (Sin Emojis rotos)
        const btnX = 135;
        const btnY = sec4Top + 48;
        const btnWidth = 340;
        const btnHeight = 32;

        doc.roundedRect(btnX, btnY, btnWidth, btnHeight, 6).fill('#c05621');
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('AGENDAR ASESORÍA TÉCNICA (40 MIN) EN CAL.COM', btnX, btnY + 11, {
            width: btnWidth,
            align: 'center',
            link: calendarUrl,
            underline: false
        });

        const contactY = btnY + btnHeight + 12;
        doc.fontSize(8.5).font('Helvetica').fillColor('#718096')
           .text('O contáctanos directamente por WhatsApp al +56 9 7909 2027  |  contacto@cuatropuntas.com', 45, contactY, { width: 522, align: 'center' });

        // 7. Pie de Documento
        doc.fontSize(7.5).font('Helvetica').fillColor('#a0aec0')
           .text('Nota Legal: Este documento representa una estimación paramétrica referencial y no constituye un contrato vinculante. Constructora Cuatropuntas SpA · Santiago de Chile · www.cuatropuntas.com', 45, 715, { width: 522, align: 'center' });

        doc.end();

        const pdfBuffer = await pdfPromise;

        const faqPriceAnswer = isRemodelacion
            ? 'La tabla pública de referencia parte desde 11 UF/m² en Metalcon y 13 UF/m² en albañilería/sólido. El valor final se define al cuantificar las partidas de demolición, terminaciones e instalaciones específicas.'
            : isQuincho
                ? 'Para quinchos de alto estándar, la referencia parte desde 12 UF/m² en Metalcon y 15 UF/m² en albañilería en obra, según equipamiento, techumbre y terminaciones.'
                : (isAmpliacion || pisosNum >= 2)
                    ? 'Para segundos pisos y ampliaciones, la referencia parte desde 22 UF/m² en Metalcon, 24 UF/m² en panel SIP y 27 UF/m² en albañilería sólida, dependiendo del refuerzo de la estructura existente y terminaciones.'
                    : 'Para casas nuevas completas, la referencia parte desde 19 UF/m² en Metalcon, 21 UF/m² en panel SIP y 25 UF/m² en albañilería tradicional sólida.';

        const faqTimelineAnswer = isRemodelacion
            ? 'En remodelaciones, el plazo típico varía entre 1 y 3 meses tras coordinar partidas y materiales.'
            : 'Como referencia orientativa: una casa nueva de 50 a 100 m² toma entre 3 y 5 meses; una ampliación o segundo piso, entre 2 y 4 meses; y un quincho completo, entre 4 y 8 semanas.';

        const faqEmailHtml = `
            <div style="background-color:#fffaf5; border:1px solid #fed7aa; border-radius:8px; padding:18px; margin:24px 0; color:#4a5568; line-height:1.55;">
                <h3 style="margin:0 0 14px 0; color:#1a202c; font-size:16px;">Preguntas Frecuentes de Nuestros Clientes</h3>
                <p style="margin:0 0 12px 0; font-size:14px;"><strong>¿Cómo funciona la visita técnica en terreno?</strong><br>Coordinamos una inspección para evaluar deslindes, estado del suelo o vivienda existente, orientación solar y factibilidad ante la DOM.</p>
                <p style="margin:0 0 12px 0; font-size:14px;"><strong>¿Cómo se manejan los imprevistos en obra?</strong><br>Trabajamos con presupuestos cerrados a suma alzada sobre las partidas contratadas. Si surge un vicio oculto no visible al inicio (ej. necesidad de retiro de asbesto por norma o refuerzo de cimientos previos), se emite un informe técnico y cotización previa aprobada por ti.</p>
                <p style="margin:0 0 12px 0; font-size:14px;"><strong>¿Cuánto demora la obra?</strong><br>${faqTimelineAnswer}</p>
                <p style="margin:0; font-size:14px;"><strong>¿Trabajan con subsidio MINVU?</strong><br>Sí, ejecutamos obras de <strong>Construcción en Sitio Propio (DS1 y DS49)</strong> para beneficiarios con subsidio ya adjudicado y terreno propio.</p>
            </div>
        `;

        // --- CONFIGURACIÓN DE CORREOS (Nodemailer Zoho) ---
        const user = process.env.ZOHO_USER || 'contacto@cuatropuntas.com';
        const pass = process.env.ZOHO_PASS;

        if (!pass) {
            console.error('CRITICAL: ZOHO_PASS environment variable is missing.');
            return res.status(500).json({ error: 'Error de configuración del servidor. Falta ZOHO_PASS.' });
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true,
            auth: {
                user: user,
                pass: pass
            }
        });

        // 1. Enviar correo al CLIENTE con PDF adjunto y Copy de Alta Conversión
        const mailToClient = {
            from: `"Constructora Cuatropuntas" <${user}>`,
            to: email,
            subject: `📐 Tu estimación para ${tipo}: ${minUF} a ${maxUF} UF | Constructora Cuatropuntas`,
            html: `
            <div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: auto; padding: 24px; color: #2d3748; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
                <!-- Header -->
                <div style="text-align: center; border-bottom: 2px solid #c05621; padding-bottom: 16px; margin-bottom: 20px;">
                    <h1 style="color: #1a365d; margin: 0; font-size: 22px; letter-spacing: 0.5px;">CONSTRUCTORA CUATROPUNTAS</h1>
                    <p style="color: #c05621; font-weight: bold; margin: 4px 0 0 0; font-size: 13px;">Arquitectura, Ingeniería & Construcción Habitacional</p>
                </div>

                <!-- Saludo cálido y validación -->
                <p style="font-size: 16px; margin-bottom: 12px;">¡Hola, <strong>${firstName}</strong>!</p>
                <p style="font-size: 15px; line-height: 1.6; color: #4a5568; margin-top: 0;">
                    ¡Qué gran proyecto! Planificar tu <strong>${tipo} de ${areaNum} m²</strong> es un paso importante. En Cuatropuntas queremos acompañarte con total respaldo técnico, materiales normados y transparencia de costos desde el primer minuto.
                </p>

                <!-- Tarjeta Resumen Visual Inmediato -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #c05621; border-radius: 6px; padding: 18px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #1a202c; font-size: 16px;">📋 Ficha de Estimación Referencial</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #4a5568;">
                        <tr><td style="padding: 4px 0; width: 40%;"><strong>Proyecto:</strong></td><td>${tipo} (${areaNum} m² - ${pisosNum} piso${pisosNum > 1 ? 's' : ''})</td></tr>
                        <tr><td style="padding: 4px 0;"><strong>Sistema Constructivo:</strong></td><td>${sistema} (${terminaciones})</td></tr>
                        <tr><td style="padding: 4px 0;"><strong>Sector de la obra:</strong></td><td>${comunaHuman}</td></tr>
                        <tr>
                            <td style="padding: 8px 0 4px 0;"><strong>Inversión Estimada:</strong></td>
                            <td style="padding: 8px 0 4px 0;"><span style="color: #c05621; font-size: 18px; font-weight: bold;">${minUF} a ${maxUF} UF</span> <span style="font-size: 12px; color: #718096;">(sin IVA)</span></td>
                        </tr>
                    </table>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #718096;">
                        *Valores paramétricos calculados según m² y sistema seleccionado. Adjunto encontrarás el documento PDF oficial con el desglose técnico.
                    </p>
                </div>

                <!-- Explicación del Siguiente Paso (40 min) -->
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px; margin: 24px 0;">
                    <h3 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 16px;">¿Cómo pasamos de esta estimación a tu proyecto definitivo?</h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e40af;">
                        Para aterrizar tu distribución espacial, evaluar la viabilidad de tu terreno/vivienda y entregarte un <strong>presupuesto cerrado a suma alzada</strong>, te invitamos a una <strong>Sesión de Asesoría Técnica y Viabilidad de 40 minutos</strong> con nuestro equipo.
                    </p>
                </div>

                <!-- DOBLE LLAMADO A LA ACCIÓN (CAL.COM + WHATSAPP) -->
                <div style="text-align: center; margin: 28px 0 20px 0;">
                    <!-- Botón 1: Cal.com -->
                    <a href="${calendarUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #c05621; color: #ffffff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 12px;">
                        📅 Agendar Asesoría Técnica (40 min) en Cal.com
                    </a>
                    
                    <!-- Botón 2: WhatsApp -->
                    <div>
                        <a href="${clientWhatsappUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #25D366; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            💬 ¿Prefieres resolver dudas previas? Chatea por WhatsApp
                        </a>
                    </div>
                    <p style="font-size: 12px; color: #718096; margin-top: 10px;">Atención técnica directa de lunes a viernes de 09:00 a 18:30 hrs</p>
                </div>

                <!-- Pilares de Confianza y Transparencia Cuatropuntas -->
                <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin: 24px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #1a202c; font-size: 15px;">Nuestros Compromisos de Calidad y Transparencia:</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #4a5568; line-height: 1.6;">
                        <li><strong>Contratos a Suma Alzada:</strong> Precio garantizado y cerrado para todas las partidas acordadas en el proyecto definitivo.</li>
                        <li><strong>Transparencia ante Imprevistos:</strong> Si durante la obra surgen preexistencias o vicios ocultos (ej. retiro normado de asbesto por empresa autorizada o refuerzos estructurales), se presenta un informe técnico y cotización previa aprobada por ti.</li>
                        <li><strong>Gestión Integral DOM:</strong> Asesoría técnica en tramitación de Permisos de Edificación y Recepción Final.</li>
                    </ul>
                </div>

                ${faqEmailHtml}

                <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; margin-top: 24px; font-size: 14px; color: #4a5568;">
                    <p style="margin: 0 0 4px 0;">Un saludo cordial,</p>
                    <p style="margin: 0; font-weight: bold; color: #1a365d;">Equipo Técnico & Arquitectura</p>
                    <p style="margin: 0; color: #c05621;">Constructora Cuatropuntas SpA</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #718096;">Santiago de Chile · <a href="https://www.cuatropuntas.com" style="color: #c05621; text-decoration: none;">www.cuatropuntas.com</a> · +56 9 7909 2027</p>
                </div>
            </div>
            `,
            attachments: [
                {
                    filename: `Cotizacion_Cuatropuntas_${firstName}_${tipo.replace(/\s+/g, '_')}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        // 2. Enviar correo interno de AVISO PRIORITARIO a CUATROPUNTAS (Con Botón 1-Touch WhatsApp)
        const mailToAdmin = {
            from: `"Sitio Web Cuatropuntas" <${user}>`,
            to: 'contacto@cuatropuntas.com',
            subject: `🔥 NUEVA COTIZACIÓN WEB: ${nombre} (${tipo} ${areaNum}m² - ${minUF}-${maxUF} UF) - ${comunaHuman.split('(')[0].trim()}`,
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #ffffff; border: 2px solid #c05621; border-radius: 8px; max-width: 600px;">
                <h2 style="color: #c05621; margin-top: 0;">🚀 NUEVO CLIENTE HA COTIZADO EN LA WEB</h2>
                <p>El sistema automático ha emitido y enviado una estimación referencial de <strong>${minUF} a ${maxUF} UF</strong> al siguiente prospecto:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
                    <tr style="background-color: #f7fafc;"><td style="padding: 8px; font-weight: bold; width: 30%;">Nombre:</td><td style="padding: 8px;">${nombre}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td></tr>
                    <tr style="background-color: #f7fafc;"><td style="padding: 8px; font-weight: bold;">Teléfono:</td><td style="padding: 8px;"><a href="tel:${telefono}">${telefono}</a></td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Proyecto:</td><td style="padding: 8px;"><strong>${tipo}</strong> (${areaNum} m², ${pisosNum} piso${pisosNum > 1 ? 's' : ''}, ${sistema})</td></tr>
                    <tr style="background-color: #f7fafc;"><td style="padding: 8px; font-weight: bold;">Terminaciones:</td><td style="padding: 8px;">${terminaciones}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Ubicación:</td><td style="padding: 8px;">${comunaHuman}</td></tr>
                    <tr style="background-color: #f7fafc;"><td style="padding: 8px; font-weight: bold;">Rango UF:</td><td style="padding: 8px; color: #c05621; font-weight: bold;">${minUF} a ${maxUF} UF (sin IVA)</td></tr>
                </table>

                <!-- BOTÓN 1-TOUCH WHATSAPP PARA CONTACTO RÁPIDO DESDE EL CELULAR -->
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${adminReplyWaUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #25D366; color: #ffffff; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.15);">
                        📲 ESCRIBIR A ${firstName.toUpperCase()} POR WHATSAPP (1 TOQUE)
                    </a>
                    <p style="font-size: 12px; color: #718096; margin-top: 8px;">Abre WhatsApp con mensaje de saludo e invitación a reunión técnica pre-redactado</p>
                </div>
            </div>
            `,
            attachments: [
                {
                    filename: `Copia_Cotizacion_${nombre}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        // 3. Envío de correos concurrentes
        await Promise.all([
            transporter.sendMail(mailToClient),
            transporter.sendMail(mailToAdmin)
        ]);

        // 4. Intentar alerta WhatsApp al Administrador (+56 9 7909 2027) vía Meta Graph API (si token está disponible)
        try {
            const token = process.env.WHATSAPP_TOKEN;
            const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1221676334362871";
            if (token) {
                const adminPhone = "56979092027";
                const adminMsg = `🏗️ *NUEVA COTIZACIÓN WEB CUATROPUNTAS* 📐\n\n👤 *Cliente*: ${nombre}\n📞 *Teléfono*: ${telefono}\n📧 *Email*: ${email}\n📌 *Proyecto*: ${tipo} (${areaNum} m² - ${sistema})\n📍 *Sector*: ${comunaHuman.split('(')[0].trim()}\n💰 *Rango*: ${minUF} a ${maxUF} UF\n\n👉 *Contactar*: https://wa.me/${formattedClientPhone}`;
                
                await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: adminPhone,
                        type: "text",
                        text: { body: adminMsg }
                    })
                });
            }
        } catch (waErr) {
            console.log("Aviso WhatsApp opcional no despachado:", waErr.message);
        }

        res.status(200).json({ 
            success: true, 
            message: 'Cotización generada y enviada correctamente',
            calendarUrl: calendarUrl || null
        });

    } catch (error) {
        console.error('Error generando o enviando cotización:', error);
        res.status(500).json({ error: 'Error interno en el servidor de cotizaciones' });
    }
};
