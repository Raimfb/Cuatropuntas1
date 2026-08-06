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

        const calendarUrl = process.env.NEXT_PUBLIC_CALENDAR_URL || process.env.CALENDAR_URL || "https://cal.com/cuatropuntas";

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
            if (sistema === 'Metalcon') baseUFm2 = 8;
            else if (sistema === 'SIP' || sistema === 'Covintec') baseUFm2 = 10;
            else baseUFm2 = 12; // Albañilería / Mixto
        } else if (isAmpliacion || pisosNum >= 2) {
            if (sistema === 'Metalcon') baseUFm2 = 22;
            else if (sistema === 'SIP' || sistema === 'Covintec') baseUFm2 = 24;
            else if (sistema === 'Mixto') baseUFm2 = 25;
            else baseUFm2 = 27; // Albañilería 100% Sólido
        } else {
            // Casa Nueva (1 Piso)
            if (sistema === 'Metalcon') baseUFm2 = 19;
            else if (sistema === 'SIP' || sistema === 'Covintec') baseUFm2 = 21;
            else if (sistema === 'Mixto') baseUFm2 = 23;
            else baseUFm2 = 25; // Albañilería 100% Sólido
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

        // --- GENERACIÓN DE PDF EN MEMORIA ---
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        const pdfPromise = new Promise((resolve) => {
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
        });

        // Contenido del PDF
        doc.fontSize(20).fillColor('#c05621').text('CONSTRUCTORA CUATROPUNTAS', { align: 'center' });
        doc.fontSize(10).fillColor('#718096').text('www.cuatropuntas.com', { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(16).fillColor('#1a202c').text('ESTIMACIÓN REFERENCIAL DE PROYECTO', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#4a5568')
           .text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`)
           .text(`Preparado para: ${nombre}`)
           .text(`Proyecto: ${tipo}`);
        doc.moveDown(1.5);

        doc.fontSize(14).fillColor('#1a202c').text('1. Resumen del Proyecto');
        doc.fontSize(12).fillColor('#4a5568')
           .text(`• Tipo: ${tipo}`)
           .text(`• Sistema Constructivo: ${sistema}`)
           .text(`• Superficie estimada: ${areaNum} m²`)
           .text(`• Pisos: ${pisosNum}`)
           .text(`• Sector de la obra: ${comuna}`);
        doc.moveDown(1.5);

        doc.fontSize(14).fillColor('#1a202c').text('2. Estimación Referencial (Estructura Habitable, Sin IVA)');
        doc.fontSize(12).fillColor('#4a5568')
           .text('Este rango cubre la obra hasta entrega habitable llave en mano, con terminaciones seleccionadas según el sistema constructivo elegido. Modificaciones especiales o paisajismo se cotizan de forma personalizada.');
        doc.moveDown(1);
        
        doc.fontSize(18).fillColor('#c05621').text(`${minUF} UF  —  ${maxUF} UF (sin IVA)`, { align: 'center', stroke: true });
        doc.moveDown(1.5);

        doc.fontSize(14).fillColor('#1a202c').text('3. Disclaimer Legal Importante');
        doc.fontSize(10).fillColor('#718096')
           .text('Este documento constituye una estimación paramétrica comercial. NO es una oferta vinculante ni un presupuesto definitivo de construcción. Para emitir un presupuesto final y exacto, se requiere una reunión y evaluación presencial con nuestro equipo de arquitectura.', { align: 'justify' });
        doc.moveDown(2);

        doc.fontSize(14).fillColor('#1a202c').text('4. Siguiente Paso — Agenda tu Reunión / Visita');
        doc.fontSize(11).fillColor('#4a5568').text('Para formalizar este presupuesto, agendemos una evaluación o reunión técnica en nuestro calendario o respondiendo directamente a este correo.');
        doc.moveDown(0.8);
        
        doc.rect(doc.x, doc.y, 220, 25).fill('#c05621');
        doc.fillColor('#ffffff').fontSize(10).text('AGENDAR EN CAL.COM AHORA', doc.x + 25, doc.y - 17, {
            link: calendarUrl,
            underline: false
        });
        doc.moveDown(1.5);

        doc.end();

        const pdfBuffer = await pdfPromise;

        // --- ENVÍO DE CORREOS ---
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

        // 1. Enviar correo al CLIENTE con PDF adjunto
        const mailToClient = {
            from: `"Sitio Web Cuatropuntas" <${user}>`,
            to: email,
            subject: `Tu Cotización de Proyecto: ${tipo} (${minUF} - ${maxUF} UF)`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
                <h2 style="color: #c05621;">¡Hola, ${nombre}!</h2>
                <p>Adjunto encontrarás la estimación comercial para tu proyecto de <strong>${tipo} (${areaNum} m²)</strong> calculada por nuestro sistema según la información que nos entregaste.</p>
                <p>El rango de inversión referencial es de <strong>${minUF} a ${maxUF} UF (sin IVA)</strong>.<br>Este valor considera la entrega habitable llave en mano con el sistema constructivo elegido.</p>
                <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #c05621; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>¿Listo para dar el siguiente paso?</strong></p>
                    <p style="margin: 5px 0 0 0;">Para coordinar una reunión de evaluación o revisión de proyecto, agende directamente en nuestro calendario en línea o responda a este correo.</p>
                </div>
                <div style="text-align:center; margin: 30px 0;">
                    <a href="${calendarUrl}" target="_blank" rel="noopener noreferrer" style="background-color:#c05621; color:#ffffff; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px; display:inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">📅 Agendar Reunión en Cal.com</a>
                    <p style="font-size:12px; color:#718096; margin-top:10px;">Selecciona la fecha y hora que mejor te acomode</p>
                </div>
                <p>Un saludo cordial,<br><strong>Equipo Constructora Cuatropuntas</strong></p>
            </div>
            `,
            attachments: [
                {
                    filename: `Cotizacion_Cuatropuntas_${nombre.split(' ')[0]}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        // 2. Enviar correo interno de AVISO a CUATROPUNTAS
        const mailToAdmin = {
            from: `"Sitio Web Cuatropuntas" <${user}>`,
            to: 'contacto@cuatropuntas.com',
            subject: `🚀 NUEVO LEAD + COTIZACIÓN: ${nombre} (${areaNum} m²)`,
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Nuevo cliente ha cotizado en la web</h2>
                <p>El sistema automático acaba de enviarle una cotización de <strong>${minUF} a ${maxUF} UF</strong> al siguiente contacto:</p>
                <ul>
                    <li><strong>Nombre:</strong> ${nombre}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Teléfono:</strong> ${telefono}</li>
                    <li><strong>Comuna:</strong> ${comuna}</li>
                    <li><strong>Proyecto:</strong> ${tipo} de ${areaNum} m², ${pisosNum} piso(s), calidad ${terminaciones}, material ${sistema}.</li>
                </ul>
                <p>¡Contáctalo por WhatsApp al ${telefono} para agendar reunión o visita a terreno!</p>
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

        await Promise.all([
            transporter.sendMail(mailToClient),
            transporter.sendMail(mailToAdmin)
        ]);

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
