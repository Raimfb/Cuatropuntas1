/**
 * api/webhooks/calcom.js
 * 
 * Webhook Oficial de Cal.com para Constructora Cuatropuntas SpA.
 * Procesa el evento BOOKING_CREATED, transiciona el estado del lead a VISITA_AGENDADA
 * (silenciando la IA), entrega el contacto del Director Técnico (+56 9 7909 2027)
 * y emite una alerta interna prioritaria.
 */

const crypto = require('crypto');
const leadsState = require('../../lib/leads-state');
const metaClient = require('../../lib/meta-client');

/**
 * Valida la firma HMAC sha256 de Cal.com si el secreto está configurado
 */
function verifyCalSignature(req, secret) {
    if (!secret) return true;
    const signature = req.headers ? req.headers['x-cal-signature-256'] : null;
    if (!signature) return false;

    try {
        const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const expectedSignature = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (e) {
        return false;
    }
}

module.exports = async (req, res) => {
    // Cabeceras CORS
    if (res.setHeader) {
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-cal-signature-256');
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.status(200).send('Cal.com Webhook Endpoint Active');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Verificación de firma criptográfica
    const calSecret = process.env.CAL_WEBHOOK_SECRET;
    if (calSecret && !verifyCalSignature(req, calSecret)) {
        console.error('❌ [CALCOM WEBHOOK] Firma HMAC inválida');
        return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        } else if (Buffer.isBuffer(body)) {
            try { body = JSON.parse(body.toString('utf-8')); } catch (e) {}
        }

        const triggerEvent = body.triggerEvent || body.type;
        const payload = body.payload || body;

        console.log(`📩 [CALCOM WEBHOOK] Evento recibido: ${triggerEvent}`);

        if (triggerEvent === 'BOOKING_CREATED' || triggerEvent === 'booking.created') {
            const title = payload.title || 'Evaluación Técnica de Factibilidad en Terreno';
            const startTime = payload.startTime ? new Date(payload.startTime) : new Date();

            const formattedDate = startTime.toLocaleString('es-CL', {
                timeZone: 'America/Santiago',
                dateStyle: 'full',
                timeStyle: 'short'
            });

            const attendees = payload.attendees || [];
            const primaryAttendee = attendees[0] || {};
            const clientName = primaryAttendee.name || payload.name || 'Cliente';
            const clientEmail = primaryAttendee.email || payload.email || '';

            const responses = payload.responses || {};
            const rawClientPhone = responses.phone || responses.telefono || primaryAttendee.phoneNumber || '';
            const normalizedPhone = leadsState.normalizePhone(rawClientPhone);

            // 1. Localizar y transicionar el lead en la Máquina de Estados
            const targetPhone = normalizedPhone || clientPhone;
            let existingLead = leadsState.findLeadByPhoneOrEmail(targetPhone || clientEmail);

            if (existingLead) {
                leadsState.updateLeadState(existingLead.phone, 'VISITA_AGENDADA', {
                    bookingTitle: title,
                    bookingDate: formattedDate,
                    bookingId: payload.uid || payload.id || null
                });
                console.log(`✅ [CALCOM WEBHOOK] Lead ${existingLead.phone} transicionado a VISITA_AGENDADA (IA Silenciada)`);
            } else if (targetPhone) {
                leadsState.setLeadState(targetPhone, {
                    name: clientName,
                    email: clientEmail,
                    estado: 'VISITA_AGENDADA',
                    bookingTitle: title,
                    bookingDate: formattedDate
                });
                console.log(`✅ [CALCOM WEBHOOK] Nuevo lead ${targetPhone} registrado en VISITA_AGENDADA (IA Silenciada)`);
            }

            // 2. Enviar Confirmación por WhatsApp al Cliente Formalizando al Director Técnico (+56 9 7909 2027)
            const recipientPhone = normalizedPhone || (existingLead ? existingLead.phone : null);
            if (recipientPhone) {
                const clientMessage = `Estimado(a) *${clientName}*,

Confirmamos que tu cita para "*${title}*" con Constructora Cuatropuntas ha sido agendada para el *${formattedDate}*.

Para coordinar detalles de acceso, portones o la llegada a tu propiedad el día de la visita, te dejamos el número directo de nuestro *Director Técnico*:
📞 *+56 9 7909 2027*

A partir de este momento, nuestro equipo humano toma el control directo de tu requerimiento. ¡Saludos cordiales!`;

                await metaClient.sendWhatsAppMessage(recipientPhone, clientMessage);
            }

            // 3. Enviar Alerta Interna al Director Técnico (+56 9 7909 2027)
            const adminPhone = '56979092027';
            const adminMessage = `*NUEVA REUNIÓN AGENDADA EN CAL.COM*

*Cliente*: ${clientName}
*Teléfono*: ${recipientPhone || 'No registrado'}
*Email*: ${clientEmail || 'No registrado'}
*Fecha y Hora*: ${formattedDate}
*Motivo*: ${title}
*Proyecto*: ${existingLead ? `${existingLead.tipo} (${existingLead.areaNum} m²)` : 'No asociado a cotización web preexistente'}

El asistente IA ha sido silenciado para este cliente y se le entregó tu número de contacto directo.`;

            await metaClient.sendWhatsAppMessage(adminPhone, adminMessage);

            return res.status(200).json({ success: true, message: 'Visita agendada, contacto entregado y bot silenciado' });
        }

        return res.status(200).json({ success: true, message: 'Evento recibido sin acción requerida' });
    } catch (error) {
        console.error('❌ [CALCOM WEBHOOK] Error procesando evento:', error);
        return res.status(500).json({ error: 'Error procesando webhook de Cal.com' });
    }
};
