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
        const { tipo, sistema, area, pisos, terminaciones, comuna, nombre, email, telefono, website_url } = req.body;

        // 1. Honeypot check: Si 'website_url' está presente, es un bot.
        // Respondemos 200 OK para que el bot crea que tuvo éxito, pero no procesamos nada.
        if (website_url) {
            console.log('Bot detected via Honeypot. Aborting silently.');
            return res.status(200).json({ success: true, message: 'Cotización generada y enviada correctamente' });
        }

        // 2. Validación de campos obligatorios
        if (!tipo || !sistema || area === undefined || pisos === undefined || !terminaciones || !comuna || !nombre || !email || !telefono) {
            return res.status(400).json({ error: 'Faltan campos obligatorios en el formulario.' });
        }

        // 3. Saneamiento y Límites Estrictos
        const areaNum = parseFloat(area);
        const pisosNum = parseInt(pisos);

        // Validar m2 (Límite comercial sensato: 10m2 a 5000m2)
        if (isNaN(areaNum) || areaNum < 10 || areaNum > 5000) {
            return res.status(400).json({ error: 'La superficie ingresada no es válida. Por favor ingresa un valor entre 10 y 5000 m².' });
        }

        // Validar pisos (1 a 4 máximo)
        if (isNaN(pisosNum) || pisosNum < 1 || pisosNum > 4) {
            return res.status(400).json({ error: 'El número de pisos debe estar entre 1 y 4.' });
        }

        // Validar Email (Regex robusta)
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email) || email.length > 100) {
            return res.status(400).json({ error: 'El formato de correo electrónico no es válido.' });
        }

        // Variable de entorno: URL del calendario Cal.com (NEXT_PUBLIC_CALENDAR_URL en Vercel)
        const calendarUrl = process.env.NEXT_PUBLIC_CALENDAR_URL || process.env.CALENDAR_URL || null;

        // --- LÓGICA DE PRECIOS CUATROPUNTAS ---
        // Precios base publicados en la página (sin IVA), por sistema constructivo
        const preciosBase = {
            'Albanileria': 27,  // Construcción Sólida (Albañilería)
            'Mixto':       23,  // Mixto (ponderado entre Sólido y SIP)
            'Covintec':    21,  // Covintec (estructura tridimensional estucada)
            'SIP':         20,  // Panel SIP (núcleo EPS y OSB)
            'Metalcon':    15   // Material Ligero (Metalcon / Vulcometal)
        };

        const costoM2Base = preciosBase[sistema] || 20;

        // Ajuste por escala: proyectos pequeños tienen mayor costo relativo
        let penalizaciones = 0;
        if (pisos >= 2) penalizaciones += 0.08;   // Segundo piso: escaleras, losa, refuerzos
        if (area < 40)  penalizaciones += 0.12;   // Escala pequeña: costos fijos se distribuyen en menos m²

        // Logística y ajuste socio-económico según Tier de la comuna
        let factorComuna = 1.0;
        const tiers = {
            'Tier1': 1.10, // Sector Oriente: Vitacura, Las Condes, etc (+10% por logística y estándares zona)
            'Tier2': 1.05, // Residencial: Ñuñoa, Macul, La Florida, etc (+5%)
            'Tier3': 1.00, // Eje Central / Poniente: Santiago, Maipú, etc (Base)
            'Tier4': 0.97, // En Crecimiento: Renca, La Pintana, etc (-3%)
            'Tier5': 0.95  // Rural / Periferia: Colina, Lampa, etc (-5% ajuste de escala/operación)
        };
        factorComuna = tiers[comuna] || 1.0;

        const costoM2Final = costoM2Base * (1 + penalizaciones) * factorComuna;
        const totalEstimado = costoM2Final * area;

        // Rango referencial: ±8% sobre el total estimado
        const minUF_raw = Math.round(totalEstimado * 0.97);
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

        doc.fontSize(14).fillColor('#1a202c').text('1. Resumen del Proyecto');
        doc.fontSize(12).fillColor('#4a5568')
           .text(`• Tipo: ${tipo}`)
           .text(`• Sistema Constructivo: ${sistema}`)
           .text(`• Superficie estimada: ${area} m²`)
           .text(`• Pisos: ${pisos}`)
           .text(`• Sector de la obra: ${comuna}`);
        doc.moveDown(1.5);

        doc.fontSize(14).fillColor('#1a202c').text('2. Estimación Referencial (Estructura Habitable, Sin IVA)');
        doc.fontSize(12).fillColor('#4a5568')
           .text('Este rango cubre la obra gruesa hasta entrega habitable, con terminaciones estándar (cerámico, pintura interior, puertas y ventanas estándar). Variaciones en terminaciones, instalaciones especiales o paisajismo se cotizan de forma personalizada.');
        doc.moveDown(1);
        
        doc.fontSize(18).fillColor('#c05621').text(`${minUF} UF  —  ${maxUF} UF (sin IVA)`, { align: 'center', stroke: true });
        doc.moveDown(1.5);

        doc.fontSize(14).fillColor('#1a202c').text('3. Disclaimer Legal Importante');
        doc.fontSize(10).fillColor('#718096')
           .text('Este documento constituye una estimación paramétrica comercial (Clase 5). NO es una oferta vinculante ni un presupuesto definitivo de construcción. Para emitir un presupuesto final y exacto, se requiere obligatoriamente una visita técnica a terreno para evaluar la mecánica de suelos, las condiciones topográficas, el empalme de servicios y accesibilidad.', { align: 'justify' });
        doc.moveDown(2);

        doc.fontSize(14).fillColor('#1a202c').text('4. Siguiente Paso \u2014 Agenda tu Visita a Terreno');
        if (calendarUrl) {
            doc.fontSize(11).fillColor('#4a5568').text('Para formalizar este presupuesto, necesitamos realizar una visita t\u00e9cnica gratuita al terreno.');
            doc.moveDown(0.8);
            
            // Simular un bot\u00f3n en el PDF
            doc.rect(doc.x, doc.y, 180, 25).fill('#c05621');
            doc.fillColor('#ffffff').fontSize(10).text('AGENDAR MI VISITA AHORA', doc.x + 30, doc.y - 17, {
                link: calendarUrl,
                underline: false
            });
            doc.moveDown(1.5);
        } else {
            doc.fontSize(12).fillColor('#4a5568').text('Para agendar tu visita t\u00e9cnica gratuita, responde a este correo o escr\u00edbenos al WhatsApp.');
        }

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
                <p>El rango de inversión referencial es de <strong>${minUF} a ${maxUF} UF (sin IVA)</strong>.<br>Este valor considera la estructura habitable con terminaciones estándar según el sistema constructivo que elegiste.</p>
                <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #c05621; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>¿Listo para el siguiente paso?</strong></p>
                    <p style="margin: 5px 0 0 0;">Para darte un precio final cerrado y exacto, necesitamos hacer una visita técnica y ver el terreno.</p>
                </div>
                ${calendarUrl 
                    ? `<div style="text-align:center; margin: 30px 0;">
                        <a href="${calendarUrl}" target="_blank" rel="noopener noreferrer" style="background-color:#c05621; color:#ffffff; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px; display:inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">📅 Agendar Mi Visita Ahora</a>
                        <p style="font-size:12px; color:#718096; margin-top:10px;">Lunes a Viernes 11:00\u201319:00 \u00b7 Sábados hasta las 16:00</p>
                       </div>` 
                    : `<p>Puedes responder a este correo o hablarnos por WhatsApp al <a href="https://wa.me/56994998748">+56 9 9499 8748</a> para agendar la visita.</p>`
                }
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
