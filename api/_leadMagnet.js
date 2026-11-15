const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { validateName, validateEmail } = require('./_botGuard');
const { persistEmailLead, normalizeEmail } = require('../lib/leads-state');

const GUIDES = {
    'permiso-edificacion': {
        id: 'permiso-edificacion',
        filename: 'guia-permiso-edificacion-rm.pdf',
        downloadUrl: '/guias/guia-permiso-edificacion-rm.pdf',
        title: 'Guía Práctica del Permiso de Edificación en la RM',
        filePath: path.join(__dirname, '..', 'public', 'guias', 'guia-permiso-edificacion-rm.pdf')
    },
    'recepcion-final': {
        id: 'recepcion-final',
        filename: 'checklist-recepcion-final-dom.pdf',
        downloadUrl: '/guias/checklist-recepcion-final-dom.pdf',
        title: 'Checklist Oficial de Recepción Final Municipal (DOM)',
        filePath: path.join(__dirname, '..', 'public', 'guias', 'checklist-recepcion-final-dom.pdf')
    }
};

const GUIDE_ALIASES = {
    'permiso-edificacion': 'permiso-edificacion',
    'guia-permiso-edificacion-rm': 'permiso-edificacion',
    'recepcion-final': 'recepcion-final',
    'checklist-recepcion-final-dom': 'recepcion-final'
};

function sanitizeText(str, maxLen = 120) {
    return String(str || '')
        .replace(/[\r\n<>]/g, ' ')
        .trim()
        .slice(0, maxLen);
}

/**
 * Envía el respaldo de la guía PDF por Zoho SMTP (fail-safe si falta ZOHO_PASS o falla la red).
 */
async function sendGuideBackupEmail({ nombre, email, guideInfo, sourcePage }) {
    const zohoPass = process.env.ZOHO_PASS;
    if (!zohoPass || process.env.SKIP_LEAD_MAGNET_EMAIL === '1' || process.env.NODE_ENV === 'test') {
        return false;
    }

    const zohoUser = process.env.ZOHO_USER || 'contacto@cuatropuntas.com';
    const transporter = nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 465,
        secure: true,
        auth: {
            user: zohoUser,
            pass: zohoPass
        }
    });

    const attachments = fs.existsSync(guideInfo.filePath)
        ? [{ filename: guideInfo.filename, path: guideInfo.filePath, contentType: 'application/pdf' }]
        : [];

    const firstName = nombre.split(' ')[0] || nombre;
    const htmlUser = `
        <div style="font-family: Arial, sans-serif; color: #1a202c; max-width: 600px; margin: 0 auto; line-height: 1.55;">
            <div style="background: #1a365d; color: #ffffff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
                <p style="margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #fbd38d;">Constructora Cuatropuntas SpA</p>
                <h2 style="margin: 6px 0 0; font-size: 20px;">Aquí tienes tu guía técnica DOM en PDF</h2>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; background: #ffffff;">
                <p>Hola <strong>${firstName}</strong>,</p>
                <p>Tal como solicitaste en nuestro sitio web, adjuntamos tu copia en PDF de <strong>${guideInfo.title}</strong>.</p>
                <p style="margin: 18px 0;">
                    <a href="https://www.cuatropuntas.com${guideInfo.downloadUrl}" style="display: inline-block; background: #c05621; color: #ffffff; text-decoration: none; padding: 11px 18px; border-radius: 6px; font-weight: bold;">Descargar PDF nuevamente</a>
                </p>
                <p style="font-size: 14px; color: #4a5568;">¿Ya tienes terreno o proyecto definido en la Región Metropolitana? Calcula un presupuesto preliminar por comuna o agenda una visita técnica en terreno:</p>
                <ul style="font-size: 14px; color: #2d3748;">
                    <li><strong>Cotizador Oficial:</strong> <a href="https://www.cuatropuntas.com/#contacto">www.cuatropuntas.com/#contacto</a></li>
                    <li><strong>Visita Técnica en Terreno:</strong> <a href="https://cal.com/cuatropuntas.com/visita-tecnica">cal.com/cuatropuntas.com/visita-tecnica</a></li>
                    <li><strong>WhatsApp:</strong> <a href="https://wa.me/56927384075">+56 9 2738 4075</a></li>
                </ul>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Constructora Cuatropuntas SpA" <${zohoUser}>`,
            to: email,
            bcc: zohoUser,
            replyTo: zohoUser,
            subject: `Tu Guía PDF DOM: ${guideInfo.title} | Cuatropuntas`,
            html: htmlUser,
            attachments
        });

        await transporter.sendMail({
            from: `"Alerta Lead Magnet DOM" <${zohoUser}>`,
            to: zohoUser,
            subject: `[Lead Email-Gate DOM] ${nombre} descargó ${guideInfo.filename}`,
            text: `Nuevo lead capturado por descarga de guía PDF:\n\nNombre: ${nombre}\nEmail: ${email}\nGuía: ${guideInfo.title} (${guideInfo.id})\nPágina origen: ${sourcePage}\nFecha: ${new Date().toISOString()}`
        });

        return true;
    } catch (err) {
        console.warn('⚠️ [LEAD MAGNET EMAIL WARNING] No se pudo enviar correo SMTP:', err.message);
        return false;
    }
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch {
            return res.status(400).json({ ok: false, error: 'Payload JSON inválido.' });
        }
    }
    body = body && typeof body === 'object' ? body : {};

    // Filtro Honeypot silencioso contra bots automatizados
    if (body.website_url || body._hp_check) {
        return res.status(400).json({ ok: false, error: 'Solicitud inválida.' });
    }

    const nombre = sanitizeText(body.nombre || body.name || '', 80);
    const email = normalizeEmail(body.email || '');
    const rawGuia = String(body.guia || '').trim().toLowerCase();
    const canonicalGuia = GUIDE_ALIASES[rawGuia];
    const sourcePage = sanitizeText(body.sourcePage || '/', 160) || '/';

    if (!nombre) {
        return res.status(400).json({ ok: false, error: 'Ingresa tu nombre completo.' });
    }
    const nameError = validateName(nombre);
    if (nameError) {
        return res.status(400).json({ ok: false, error: `Nombre inválido: ${nameError}` });
    }

    if (!email) {
        return res.status(400).json({ ok: false, error: 'Ingresa tu correo electrónico.' });
    }
    const emailError = validateEmail(email);
    if (emailError) {
        return res.status(400).json({ ok: false, error: `Correo electrónico inválido: ${emailError}` });
    }

    const guideInfo = canonicalGuia ? GUIDES[canonicalGuia] : null;
    if (!guideInfo) {
        return res.status(400).json({ ok: false, error: 'Guía solicitada no válida.' });
    }

    const lead = await persistEmailLead(email, {
        nombre,
        name: nombre,
        email,
        guia: canonicalGuia,
        estado: 'LEAD_GUIA_DOM',
        segmento: 'EMAIL_MARKETING_DOM',
        sourcePage,
        timestamp: new Date().toISOString()
    });

    const emailSent = await sendGuideBackupEmail({
        nombre,
        email,
        guideInfo,
        sourcePage
    });

    return res.status(200).json({
        ok: true,
        guia: canonicalGuia,
        title: guideInfo.title,
        filename: guideInfo.filename,
        downloadUrl: guideInfo.downloadUrl,
        leadState: lead ? lead.estado : 'LEAD_GUIA_DOM',
        guiasDescargadas: lead ? lead.guiasDescargadas : [canonicalGuia],
        emailSent
    });
};
