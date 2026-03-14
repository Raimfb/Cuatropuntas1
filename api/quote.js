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
        const { tipo, sistema, area, pisos, terminaciones, comuna, nombre, email, telefono } = req.body;

        if (!tipo || !sistema || !area || !pisos || !terminaciones || !comuna || !nombre || !email || !telefono) {
            return res.status(400).json({ error: 'Faltan campos obligatorios en el formulario.' });
        }

        // --- LÓGICA DE PRECIOS CUATROPUNTAS ---
        // Paso 1: Base de 15 UF / m2 (estándar sólido básico)
        let valorBaseM2 = 15.0;

        // Paso 2: Materialidad
        let multMaterial = 1.0;       // 100% Sólido (Albañilería)
        if (sistema === 'Mixto')    multMaterial = 0.90; // Tarifa ponderada (blended rate)
        if (sistema === 'SIP')      multMaterial = 0.87; // SIP Panel / Covintec
        if (sistema === 'Metalcon') multMaterial = 0.82; // 100% Ligero

        // Paso 3: Terminaciones
        let multTerminaciones = 1.0;
        if (terminaciones === 'Estandar') multTerminaciones = 1.15;
        if (terminaciones === 'Premium') multTerminaciones = 1.40;

        // Costo M2 Ajustado
        let costoM2 = valorBaseM2 * multMaterial * multTerminaciones;

        // Paso 4: Mult Piso y Escala
        let penalizaciones = 0;
        if (pisos >= 2) penalizaciones += 0.08;
        if (area < 40) penalizaciones += 0.12;
        
        // Paso 5: Logística Comuna
        let logística = 0;
        if (comuna === 'Oriente' || comuna === 'Periferia') logística = 0.05;

        costoM2 = costoM2 * (1 + penalizaciones + logística);

        // Subtotal y Total neto estimado
        const totalEstimado = costoM2 * area;

        // Paso 6: Rango de Precios
        const minUF_raw = Math.round(totalEstimado * 0.95);
        const maxUF_raw = Math.round(totalEstimado * 1.08);

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
           .text(`Proyecto: ${tipo} en sector ${comuna}`);
        doc.moveDown(1.5);

        doc.fontSize(14).fillColor('#1a202c').text('1. Resumen de Requerimientos');
        doc.fontSize(12).fillColor('#4a5568')
           .text(`• Superficie estimada: ${area} m²`)
           .text(`• Pisos: ${pisos}`)
           .text(`• Sistema Constructivo: ${sistema}`)
           .text(`• Nivel de Terminaciones: ${terminaciones}`);
        doc.moveDown(1.5);

        doc.fontSize(14).fillColor('#1a202c').text('2. Estimación Comercial (Neto + Gastos Generales)');
        doc.fontSize(12).fillColor('#4a5568')
           .text('En base a los parámetros proporcionados y los valores actuales de mercado (T.C.U MINVU / Rendimientos Constructivos), el valor estimado referencial para construir tu proyecto se encuentra en el siguiente rango:');
        doc.moveDown(1);
        
        doc.fontSize(18).fillColor('#c05621').text(`${minUF} UF  -  ${maxUF} UF (+ IVA)`, { align: 'center', stroke: true });
        doc.moveDown(1.5);

        doc.fontSize(14).fillColor('#1a202c').text('3. Disclaimer Legal Importante');
        doc.fontSize(10).fillColor('#718096')
           .text('Este documento constituye una estimación paramétrica comercial (Clase 5). NO es una oferta vinculante ni un presupuesto definitivo de construcción. Para emitir un presupuesto final y exacto, se requiere obligatoriamente una visita técnica a terreno para evaluar la mecánica de suelos, las condiciones topográficas, el empalme de servicios y accesibilidad.', { align: 'justify' });
        doc.moveDown(2);

        doc.fontSize(14).fillColor('#1a202c').text('Siguiente Paso:');
        doc.fontSize(12).fillColor('#4a5568').text('Para agendar tu visita a terreno gratuita y formalizar este presupuesto, responde a este correo o escríbenos a nuestro WhatsApp.');

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
                <p>Adjunto encontrarás la estimación comercial para tu proyecto de <strong>${tipo} (${area} m²)</strong> calculada por nuestro sistema según la información que nos entregaste.</p>
                <p>El rango de inversión estimado es de <strong>${minUF} a ${maxUF} UF</strong> (+ IVA).</p>
                <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #c05621; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>¿Listo para el siguiente paso?</strong></p>
                    <p style="margin: 5px 0 0 0;">Para darte un precio final cerrado y exacto, necesitamos hacer una visita técnica y ver el terreno.</p>
                </div>
                <p>Puedes responder a este correo o hablarnos por WhatsApp al <a href="https://wa.me/56994998748">+56 9 9499 8748</a> para agendar la visita.</p>
                <p>Un saludo cordial,<br><strong>Equipo Cuatropuntas</strong></p>
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
            subject: `🚀 NUEVO LEAD + COTIZACIÓN: ${nombre} (${area} m²)`,
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Nuevo cliente ha cotizado en la web</h2>
                <p>El sistema automático acaba de enviarle una cotización de <strong>${minUF} a ${maxUF} UF</strong> al siguiente contacto:</p>
                <ul>
                    <li><strong>Nombre:</strong> ${nombre}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Teléfono:</strong> ${telefono}</li>
                    <li><strong>Comuna:</strong> ${comuna}</li>
                    <li><strong>Proyecto:</strong> ${tipo} de ${area} m², ${pisos} piso(s), calidad ${terminaciones}, material ${sistema}.</li>
                </ul>
                <p>¡Contáctalo por WhatsApp si no agenda visita en 24hs!</p>
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

        // Send both emails
        await Promise.all([
            transporter.sendMail(mailToClient),
            transporter.sendMail(mailToAdmin)
        ]);

        res.status(200).json({ success: true, message: 'Cotización generada y enviada correctamente' });

    } catch (error) {
        console.error('Error generando o enviando cotización:', error);
        res.status(500).json({ error: 'Error interno en el servidor de cotizaciones' });
    }
};
