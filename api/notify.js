const nodemailer = require('nodemailer');

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
            console.log(`[BOT BLOCKED api/notify.js] Reason: ${botCheck.reason}. Email: ${req.body?.email}`);
            return res.status(200).json({ success: true, message: 'Notificación procesada correctamente' });
        }

        const {
            lead_type = 'Particular Privado',
            nombre,
            email,
            telefono,
            comuna,
            terreno_propio = 'Sí',
            subsidio_adjudicado = 'N/A',
            area_estimada = 'No especificado',
            sistema_preferido = 'Metalcom / SIP / Albañilería',
            lead_magnet_url = 'https://www.cuatropuntas.com/subsidio-minvu-sitio-propio.html'
        } = req.body || {};

        // Validaciones mínimas
        if (!nombre || !email) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: nombre y email.' });
        }

        const user = process.env.ZOHO_USER || 'contacto@cuatropuntas.com';
        const pass = process.env.ZOHO_PASS;
        const adminEmail = process.env.ADMIN_EMAIL || 'contacto@cuatropuntas.com';

        const leadDataFormatted = `
📌 DATOS DEL LEAD CALIENTE (Meta WhatsApp Funnel)
------------------------------------------------
• Cliente: ${nombre}
• Email: ${email}
• Teléfono: ${telefono || 'No indicado'}
• Avatar: ${lead_type}
• Comuna RM: ${comuna || 'Por confirmar'}
• Terreno Propio: ${terreno_propio}
• Subsidio Adjudicado: ${subsidio_adjudicado}
• Superficie Estimada: ${area_estimada} m²
• Sistema Constructivo Preferido: ${sistema_preferido}
• Fecha de Captura: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
------------------------------------------------
`;

        console.log(leadDataFormatted);

        // Si existen credenciales de correo configuradas en Vercel
        if (pass) {
            const transporter = nodemailer.createTransport({
                host: 'smtp.zoho.com',
                port: 465,
                secure: true,
                auth: {
                    user: user,
                    pass: pass
                }
            });

            // 1. Email automático formal al CLIENTE con Lead Magnet en Video
            const mailToClient = {
                from: `"Constructora Cuatropuntas" <${user}>`,
                to: email,
                subject: `¡Bienvenido a Cuatropuntas, ${nombre.split(' ')[0]}! Tu proyecto ha sido recibido con éxito`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #1a365d; margin: 0; font-size: 24px;">CONSTRUCTORA CUATROPUNTAS</h1>
                        <p style="color: #c05621; font-weight: bold; margin-top: 4px;">Ingeniería & Construcción Habitacional</p>
                    </div>

                    <p style="font-size: 16px; color: #2d3748;">Hola <strong>${nombre}</strong>,</p>

                    <p style="font-size: 15px; color: #4a5568; line-height: 1.6;">
                        Hemos verificado con éxito los antecedentes técnicos de tu proyecto en sector <strong>${comuna || 'Región Metropolitana'}</strong>. Tu solicitud ha ingresado a nuestra lista prioritaria de factibilidad.
                    </p>

                    <div style="background-color: #f7fafc; border-left: 4px solid #c05621; padding: 16px; margin: 20px 0; border-radius: 4px;">
                        <h3 style="margin: 0 0 8px 0; color: #1a202c; font-size: 16px;">Resumen Ficha Técnica:</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px;">
                            <li><strong>Tipo de Proyecto:</strong> ${lead_type}</li>
                            <li><strong>Dominio Terreno:</strong> ${terreno_propio}</li>
                            <li><strong>Comuna:</strong> ${comuna || 'RM'}</li>
                            <li><strong>Superficie Referencial:</strong> ${area_estimada} m²</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 32px 0;">
                        <p style="font-size: 15px; color: #2d3748; font-weight: bold; margin-bottom: 12px;">🎥 Recurso Educativo Exclusivo (Lead Magnet):</p>
                        <a href="${lead_magnet_url}" target="_blank" rel="noopener noreferrer" style="background-color: #c05621; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            ▶️ Ver Guía en Video: Factibilidad & Precios Llave en Mano
                        </a>
                    </div>

                    <p style="font-size: 14px; color: #718096; line-height: 1.5;">
                        Un ejecutivo técnico senior de nuestro equipo te contactará directamente por teléfono o WhatsApp al <strong>${telefono || 'tu número registrado'}</strong> para agendar tu evaluación en terreno.
                    </p>

                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

                    <p style="font-size: 12px; color: #a0aec0; text-align: center;">
                        Constructora Cuatropuntas SpA · Santiago de Chile · <a href="https://www.cuatropuntas.com" style="color: #c05621; text-decoration: none;">www.cuatropuntas.com</a>
                    </p>
                </div>
                `
            };

            // 2. Email de ALERTA PRIORITARIA a la Bandeja Personal / Ejecutiva
            const mailToAdmin = {
                from: `"WhatsApp Meta Bot" <${user}>`,
                to: adminEmail,
                subject: `🔥 HOT LEAD META WHATSAPP: ${nombre} (${comuna || 'RM'} - ${lead_type})`,
                html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #fffaf0; border: 2px solid #dd6b20; border-radius: 8px;">
                    <h2 style="color: #c05621; margin-top: 0;">🔥 ALERTA DE LEAD CALIENTE (Meta WhatsApp)</h2>
                    <p>Un prospecto acaba de superar el funnel de filtrado estricto con los siguientes datos:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                        <tr style="background-color: #feebc8;"><td style="padding: 8px; font-weight: bold;">Nombre:</td><td style="padding: 8px;">${nombre}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td></tr>
                        <tr style="background-color: #feebc8;"><td style="padding: 8px; font-weight: bold;">Teléfono:</td><td style="padding: 8px;"><a href="https://wa.me/${(telefono || '').replace(/\D/g, '')}">${telefono}</a></td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Avatar:</td><td style="padding: 8px;">${lead_type}</td></tr>
                        <tr style="background-color: #feebc8;"><td style="padding: 8px; font-weight: bold;">Comuna RM:</td><td style="padding: 8px;">${comuna}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Terreno Propio:</td><td style="padding: 8px;">${terreno_propio}</td></tr>
                        <tr style="background-color: #feebc8;"><td style="padding: 8px; font-weight: bold;">Subsidio Adjudicado:</td><td style="padding: 8px;">${subsidio_adjudicado}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Superficie:</td><td style="padding: 8px;">${area_estimada} m²</td></tr>
                    </table>
                    <p style="margin-top: 20px; font-weight: bold; color: #2b6cb0;">👉 Realizar contacto humano dentro de las próximas 2 horas para maximizar la tasa de cierre.</p>
                </div>
                `
            };

            await Promise.all([
                transporter.sendMail(mailToClient),
                transporter.sendMail(mailToAdmin)
            ]);
        }

        return res.status(200).json({
            success: true,
            message: 'Notificación procesada y correos despachados correctamente.',
            lead_summary: {
                nombre,
                email,
                lead_type,
                comuna,
                status: 'QUALIFIED_HOT_LEAD'
            }
        });

    } catch (error) {
        console.error('Error procesando webhook notify:', error);
        return res.status(500).json({ error: 'Error interno al procesar la notificación.' });
    }
};
