/**
 * api/webhooks/whatsapp.js
 * 
 * Webhook Oficial de Meta WhatsApp Cloud API para Constructora Cuatropuntas SpA.
 * Integra la Máquina de Estados de Leads (lib/leads-state.js), el Agente Asesor Consultivo
 * (lib/agent-consultor.js) y el Cliente Meta Resiliente (lib/meta-client.js).
 * 
 * Soporta:
 * - Comando backdoor / QA: "reset" o "#reset" para borrar memoria de lead.
 * - Embudo WhatsApp-First: Atención a leads nuevos/fríos con invitación al cotizador web.
 * - Silencio IA estricto en VISITA_AGENDADA.
 */

const leadsState = require('../../lib/leads-state');
const metaClient = require('../../lib/meta-client');
const agentConsultor = require('../../lib/agent-consultor');

module.exports = async (req, res) => {
    // 1. HANDSHAKE DE VERIFICACIÓN DE META (GET)
    if (req.method === 'GET') {
        const query = req.query || {};
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];

        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'cuatropuntas_webhook_secret_2026';

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('✅ [WHATSAPP WEBHOOK] Handshake verificado exitosamente por Meta');
                return res.status(200).send(challenge);
            } else {
                console.error('❌ [WHATSAPP WEBHOOK] Token de verificación inválido');
                return res.status(403).send('Forbidden');
            }
        }
        return res.status(400).send('Bad Request');
    }

    // 2. PROCESAMIENTO DE MENSAJES ENTRANTES (POST)
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) {}
            } else if (Buffer.isBuffer(body)) {
                try { body = JSON.parse(body.toString('utf-8')); } catch (e) {}
            }

            if (body && body.entry && Array.isArray(body.entry)) {
                for (const entry of body.entry) {
                    const changes = entry.changes || [];
                    for (const change of changes) {
                        const value = change.value;
                        const incomingPhoneId = value?.metadata?.phone_number_id || null;
                        const messages = value?.messages || [];

                        for (const messageObj of messages) {
                            const from = messageObj.from || '';
                            const userText = messageObj.text?.body?.trim() || messageObj.caption?.trim() || '';

                            if (!from || !userText) continue;

                            console.log(`📩 [WHATSAPP WEBHOOK] Mensaje entrante de ${from}: "${userText}"`);

                            // 1. COMANDO BACKDOOR / QA: reset o #reset
                            const cleanCommand = userText.toLowerCase().trim();
                            if (cleanCommand === 'reset' || cleanCommand === '#reset') {
                                leadsState.deleteLeadState(from);
                                console.log(`🔄 [WHATSAPP WEBHOOK] Memoria reiniciada para lead ${from}`);
                                const resetMsg = '🔄 Memoria reiniciada con éxito. Eres un lead nuevo para el sistema.';
                                await metaClient.sendWhatsAppMessage(from, resetMsg, incomingPhoneId);
                                continue;
                            }

                            // 2. REGLA DE NEGOCIO: Silencio IA estricto si ya tiene visita agendada
                            if (!leadsState.canBotReply(from)) {
                                console.log(`🤫 [WHATSAPP WEBHOOK] Silencio IA para ${from} (VISITA_AGENDADA). Atiende operador humano.`);
                                continue;
                            }

                            // 3. Revisar si es lead existente o lead nuevo / expirado
                            const existingLead = leadsState.getLeadState(from);

                            if (!existingLead) {
                                // Lead nuevo o expirado: registrar como EN_CONVERSACION y responder como SDR/Calificador inicial
                                leadsState.setLeadState(from, {
                                    phone: from,
                                    estado: 'EN_CONVERSACION'
                                });

                                const sdrReply = `¡Hola! Bienvenido(a) a *Constructora Cuatropuntas*.

Nos especializamos en construcción de casas nuevas llave en mano, segundos pisos, ampliaciones, quinchos de alto estándar y remodelaciones en toda la Región Metropolitana.

Para entregarte una estimación técnica y de costos precisa según los metros cuadrados, comuna y características de tu proyecto, te invito a generar tu presupuesto preliminar en nuestro cotizador web oficial:
👉 https://www.cuatropuntas.com

Al cotizar, recibirás de inmediato tu estimación en UF con Ficha Técnica en PDF, y nuestro equipo de arquitectura tomará contacto para evaluar tu terreno y coordinar la visita técnica.`;

                                const formattedSdr = agentConsultor.formatWhatsAppMarkdown 
                                    ? agentConsultor.formatWhatsAppMarkdown(sdrReply) 
                                    : sdrReply;

                                await metaClient.sendWhatsAppMessage(from, formattedSdr, incomingPhoneId);
                                continue;
                            }

                            // 4. Lead activo con cotización previa (COTIZADO o EN_CONVERSACION)
                            leadsState.updateLeadState(from, 'EN_CONVERSACION');
                            const leadData = leadsState.getLeadState(from) || {};

                            const replyText = await agentConsultor.generateConsultativeReply(userText, leadData);
                            await metaClient.sendWhatsAppMessage(from, replyText, incomingPhoneId);
                        }
                    }
                }
            }

            return res.status(200).send('EVENT_RECEIVED');
        } catch (error) {
            console.error('❌ [WHATSAPP WEBHOOK] Error procesando payload:', error);
            return res.status(200).send('EVENT_RECEIVED');
        }
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    return res.status(405).send('Method Not Allowed');
};
