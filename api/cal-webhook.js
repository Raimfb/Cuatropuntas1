// Helper para enviar mensajes de WhatsApp vía Meta Graph API
async function sendWhatsAppAlert(recipientNumber, textBody) {
    const token = process.env.WHATSAPP_TOKEN || "EAAUzVSuHpoUBSEBulsLUwIarFJ2cbVYOK55khaTUUdZAR8MClTADrZCuqbtvR4jrqU5eXoIPAfVQuBngNpbFPcEpwUVXOowN739ALW3swwLciCH7yWwsrQcOc9S7cgL1rJ73x74n5GmebXguoD8PVWhV1mBPala99XSTUu5vj6c4tknalggt4gtpCSwQZDZD";
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1221676334362871";

    if (!token) {
        console.error("❌ ERROR: WHATSAPP_TOKEN no configurado");
        return false;
    }

    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    const cleanNumber = recipientNumber.replace(/[^0-9]/g, '');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanNumber,
                type: "text",
                text: { body: textBody }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("❌ Error enviando WhatsApp alert:", JSON.stringify(data));
            return false;
        }

        console.log(`✅ Alerta de agendamiento enviada a ${cleanNumber}`);
        return true;
    } catch (err) {
        console.error("❌ Excepción al enviar alerta:", err.message);
        return false;
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.status(200).send('Cal.com Webhook Endpoint Active');
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch(e) {}
        } else if (Buffer.isBuffer(body)) {
            try { body = JSON.parse(body.toString('utf-8')); } catch(e) {}
        }

        const triggerEvent = body.triggerEvent || body.type;
        const payload = body.payload || body;

        console.log(`📩 Cal.com Webhook Recibido - Evento: ${triggerEvent}`);

        if (triggerEvent === 'BOOKING_CREATED' || triggerEvent === 'booking.created') {
            const title = payload.title || "Reunión de Proyecto / Visita Técnica";
            const startTime = payload.startTime ? new Date(payload.startTime) : new Date();

            // Formato de fecha en huso horario de Chile (America/Santiago)
            const formattedDate = startTime.toLocaleString('es-CL', {
                timeZone: 'America/Santiago',
                dateStyle: 'full',
                timeStyle: 'short'
            });

            // Extraer datos del cliente (attendees)
            const attendees = payload.attendees || [];
            const primaryAttendee = attendees[0] || {};
            const clientName = primaryAttendee.name || payload.name || "Cliente Lead";
            const clientEmail = primaryAttendee.email || payload.email || "No especificado";
            
            // Extraer teléfono desde responses o campos personalizados
            const responses = payload.responses || {};
            let clientPhone = responses.phone || responses.telefono || primaryAttendee.phoneNumber || "No registrado";

            // 1. ALERTA INSTANTÁNEA AL ADMINISTRADOR (+56 9 7909 2027)
            const adminPhone = "56979092027";
            const adminMessage = `🚨 *¡NUEVA REUNIÓN AGENDADA EN CAL.COM!* 📅

👤 *Cliente*: ${clientName}
📞 *Teléfono*: ${clientPhone}
📧 *Email*: ${clientEmail}
🕒 *Fecha y Hora*: ${formattedDate}
📌 *Motivo*: ${title}

💡 *Recordatorios*: El sistema enviará recordatorio por WhatsApp 2 días (o 4 horas) antes al cliente para confirmación.`;

            await sendWhatsAppAlert(adminPhone, adminMessage);

            // 2. CONFIRMACIÓN INSTANTÁNEA AL CLIENTE (Si hay teléfono válido)
            if (clientPhone && clientPhone !== "No registrado") {
                const clientMessage = `¡Hola ${clientName}! 🏗️

Confirmamos que tu cita para **${title}** ha sido agendada con éxito para el **${formattedDate}**.

 Te enviaremos un recordatorio por este mismo medio para confirmar tu asistencia. ¡Nos vemos pronto!`;
                await sendWhatsAppAlert(clientPhone, clientMessage);
            }

            return res.status(200).json({ success: true, message: 'Alerta enviada correctamente' });
        }

        return res.status(200).json({ success: true, message: 'Evento recibido' });
    } catch (error) {
        console.error("❌ Error procesando Cal.com Webhook:", error);
        return res.status(500).json({ error: 'Error interno de servidor' });
    }
};
