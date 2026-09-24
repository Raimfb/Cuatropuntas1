/**
 * lib/meta-client.js
 * 
 * Cliente de Meta WhatsApp Cloud API con Modo Mock y Resiliencia Automática.
 * Si WHATSAPP_TOKEN no está definido, conmuta automáticamente a modo Mock en memoria,
 * permitiendo ejecutar la suite de pruebas unitarias y de integración sin dependencias externas.
 */

const sentMessagesHistory = [];

/**
 * Envía un mensaje de texto por WhatsApp a través de Meta Cloud API o Mock en memoria
 * @param {string} recipientNumber
 * @param {string} textBody
 * @param {string|null} incomingPhoneId
 * @returns {Promise<{success: boolean, mocked?: boolean, data?: any, error?: string}>}
 */
async function sendWhatsAppMessage(recipientNumber, textBody, incomingPhoneId = null) {
    const cleanNumber = String(recipientNumber || '').replace(/\D/g, '');
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = incomingPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID || '1221676334362871';

    // 1. MODO MOCK AUTOMÁTICO (Tests o ausencia de credenciales)
    if (!token || token === 'mock' || token === 'test') {
        const mockRecord = {
            to: cleanNumber,
            text: textBody,
            phoneId: phoneId,
            timestamp: Date.now()
        };
        sentMessagesHistory.push(mockRecord);
        return { success: true, mocked: true, messageId: `mock_msg_${Date.now()}` };
    }

    // 2. MODO PRODUCCIÓN: Envío real vía Meta Graph API v20.0
    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;

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
            console.error('❌ Error devuelto por Meta Graph API:', JSON.stringify(data));
            return { success: false, error: data };
        }

        return { success: true, data };
    } catch (err) {
        console.error('❌ Excepción conectando a Meta Graph API:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Retorna los mensajes enviados registrados en memoria durante tests
 * @returns {Array}
 */
function getSentMessages() {
    return [...sentMessagesHistory];
}

/**
 * Limpia el registro de mensajes enviados en memoria
 */
function clearSentMessages() {
    sentMessagesHistory.length = 0;
}

module.exports = {
    sendWhatsAppMessage,
    getSentMessages,
    clearSentMessages
};
