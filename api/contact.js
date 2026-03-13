const nodemailer = require('nodemailer');

export default async function handler(req, res) {
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
        const { name, phone, type, commune, details } = req.body;

        if (!name || !phone || !type || !commune || !details) {
            return res.status(400).json({ error: 'Faltan campos obligatorios.' });
        }

        const user = process.env.ZOHO_USER || 'contacto@cuatropuntas.com'; // El correo desde donde se envia (ej: admin@ o contacto@)
        const pass = process.env.ZOHO_PASS;

        if (!pass) {
            console.error('CRITICAL: ZOHO_PASS environment variable is missing.');
            return res.status(500).json({ error: 'Error de configuración del servidor. Falta ZOHO_PASS.' });
        }

        // Configurar NodeMailer con Zoho Mail
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: user,
                pass: pass
            }
        });

        const mailOptions = {
            from: `"Sitio Web Cuatropuntas" <${user}>`,
            to: 'contacto@cuatropuntas.com',
            subject: `Nueva Cotización Web: ${type} en ${commune}`,
            text: `
Has recibido una nueva solicitud de cotización desde Cuatropuntas.com

-------------------------------------
Detalles del Cliente
-------------------------------------
Nombre: ${name}
Celular: ${phone}
Comuna: ${commune}

-------------------------------------
Información del Proyecto
-------------------------------------
Tipo: ${type}
Detalles adicionales:
${details}

-------------------------------------
Asistente Virtual Cuatropuntas
            `,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #c05621; border-bottom: 2px solid #1a202c; padding-bottom: 10px;">Nueva Solicitud Cotización Web</h2>
                
                <h3 style="color: #1a202c; margin-top: 20px;">Detalles del Cliente</h3>
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Teléfono:</strong> <a href="tel:${phone}">${phone}</a></p>
                <p><strong>Comuna:</strong> ${commune}</p>
                
                <h3 style="color: #1a202c; margin-top: 20px;">Información del Proyecto</h3>
                <p><strong>Tipo de Proyecto:</strong> ${type}</p>
                <p><strong>Detalles adicionales:</strong></p>
                <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #c05621; border-radius: 4px;">
                    ${details.replace(/\n/g, '<br>')}
                </div>
                
                <p style="margin-top: 30px; font-size: 12px; color: #718096; border-top: 1px solid #eee; padding-top: 10px;">
                    Notificación automática enviada desde cuatropuntas.com
                </p>
            </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);

        res.status(200).json({ success: true, message: 'Correo enviado correctamente' });
    } catch (error) {
        console.error('Error enviando correo:', error);
        res.status(500).json({ error: 'Error interno enviando el correo' });
    }
}
