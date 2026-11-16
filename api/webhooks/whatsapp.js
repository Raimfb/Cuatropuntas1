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
const { classifyIntent, routeAndGenerateReply } = require('../../lib/intent-router');
const { generateAIWhatsAppResponse } = require('../whatsapp');

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
                        const contacts = value?.contacts || [];
                        const messages = value?.messages || [];

                        for (const messageObj of messages) {
                            const from = messageObj.from || '';
                            const userText = messageObj.text?.body?.trim() || messageObj.caption?.trim() || '';

                            if (!from || !userText) continue;

                            const contactObj = contacts.find(c => c.wa_id === from) || contacts[0];
                            const profileName = (contactObj?.profile?.name || '').trim();
                            const firstName = profileName ? profileName.split(' ')[0] : '';

                            console.log(`📩 [WHATSAPP WEBHOOK] Mensaje entrante de ${from}: "${userText}"`);

                            // 0. Hidratación bilateral desde Redis/KV en entorno serverless
                            await leadsState.hydrateLeadState(from);

                            // 1. COMANDO BACKDOOR / QA: reset o #reset
                            if (classifyIntent(userText) === 'RESET_QA') {
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
                            let existingLead = leadsState.getLeadState(from);
                            let isFirstColdTurn = false;

                            if (!existingLead) {
                                // Lead nuevo o expirado: registrar en EN_CONVERSACION con hasQuoted = false
                                isFirstColdTurn = true;
                                existingLead = leadsState.setLeadState(from, {
                                    phone: from,
                                    name: profileName || '',
                                    estado: 'EN_CONVERSACION',
                                    hasQuoted: false
                                });
                            } else {
                                // Preservar estado hasQuoted explícito (nunca ascender a consultor sin cotización real)
                                existingLead = leadsState.updateLeadState(from, 'EN_CONVERSACION', {
                                    hasQuoted: Boolean(
                                        existingLead.hasQuoted ||
                                        (existingLead.areaNum && Number(existingLead.areaNum) > 0) ||
                                        existingLead.minUF ||
                                        existingLead.tipo
                                    )
                                });
                            }

                            // 4. Enrutar según estado real del lead (hasQuoted: true -> Consultor Cal.com; false -> SDR hacia #cotizador / #guias-dom)
                            let replyText = '';
                            const hasQuoted = Boolean(existingLead && existingLead.hasQuoted);

                            if (!hasQuoted && isFirstColdTurn && classifyIntent(userText) === 'SALUDO_INICIAL') {
                                const sdrGreeting = `¡Hola${firstName ? ` ${firstName}` : ''}! Bienvenido(a) a *Constructora Cuatropuntas*.

Nos especializamos en construcción de casas nuevas llave en mano, segundos pisos, ampliaciones, quinchos de alto estándar y remodelaciones en toda la Región Metropolitana.

Para entregarte una estimación técnica y de costos precisa según los metros cuadrados, comuna y características de tu proyecto, te invito a generar tu presupuesto preliminar en nuestro cotizador web oficial:
👉 https://www.cuatropuntas.com/#cotizador

Al cotizar, recibirás de inmediato tu estimación en UF con Ficha Técnica en PDF, y nuestro equipo de arquitectura tomará contacto para evaluar tu terreno y coordinar la visita técnica.`;
                                replyText = agentConsultor.formatWhatsAppMarkdown
                                    ? agentConsultor.formatWhatsAppMarkdown(sdrGreeting)
                                    : sdrGreeting;
                            } else {
                                const routed = await routeAndGenerateReply({
                                    channel: 'whatsapp',
                                    userText,
                                    from,
                                    profileName,
                                    firstName,
                                    leadData: existingLead,
                                    generateLLM: ({ ragContext, quoteResult, leadData: currentLead }) =>
                                        generateAIWhatsAppResponse(userText, profileName, firstName, from, {
                                            ragContext,
                                            quoteResult,
                                            leadData: currentLead
                                        })
                                });
                                replyText = routed.reply;
                            }

                            leadsState.appendConversationTurn(from, 'user', userText);
                            leadsState.appendConversationTurn(from, 'assistant', replyText);
                            await leadsState.flushLeadState(from);

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
