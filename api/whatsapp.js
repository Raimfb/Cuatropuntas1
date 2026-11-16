const { GoogleGenerativeAI } = require("@google/generative-ai");
const leadsState = require("../lib/leads-state");
const { classifyIntent, routeAndGenerateReply } = require("../lib/intent-router");
const {
    formatWhatsAppMarkdown,
    enforceOutputGuardrails,
    resolveGeminiModelName
} = require("../lib/agent-guardrails");

// Helper para enviar mensajes a través de Meta WhatsApp Cloud API
async function sendWhatsAppMessage(recipientNumber, textBody, incomingPhoneId = null) {
    const token = process.env.WHATSAPP_TOKEN;
    // Usar dinámicamente el ID del número al que el cliente le escribió, o la variable de entorno
    const phoneId = incomingPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
        console.error("❌ ERROR: WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurado");
        return false;
    }


    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    const cleanNumber = recipientNumber.replace(/[^0-9]/g, '');

    console.log(`📤 Enviando respuesta por Meta API a ${cleanNumber} usando Phone ID ${phoneId}...`);

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
            console.error("❌ Error devuelto por Meta Graph API:", JSON.stringify(data));
            return false;
        }

        console.log(`✅ Mensaje enviado exitosamente a ${cleanNumber}`);
        return true;
    } catch (err) {
        console.error("❌ Excepción conectando a Meta Graph API:", err.message);
        return false;
    }
}

// Generador Inteligente de Respuestas con Gemini AI para WhatsApp
async function generateAIWhatsAppResponse(userText, profileName, firstName, from, extraContext = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const clientNameStr = firstName 
        ? `El cliente se llama ${firstName} (nombre completo en WhatsApp: "${profileName}"). Dirígete a él llamándolo por su nombre de pila (${firstName}).` 
        : "No conocemos el nombre de pila del cliente, salúdalo con un ¡Hola! cálido y profesional.";

    const validModelName = resolveGeminiModelName();
    const ragBlock = extraContext?.ragContext?.promptContext
        ? `\n### CONTEXTO DINÁMICO DE CONOCIMIENTO (BLOG Y GUÍAS DOM):\n${extraContext.ragContext.promptContext}`
        : "";
    const quoteBlock = extraContext?.quoteResult?.calculated
        ? `\n### ESTIMACIÓN PARAMÉTRICA PRELIMINAR (NETA +IVA):\n- Proyecto: ${extraContext.quoteResult.proyectoResumen}\n- Ubicación: ${extraContext.quoteResult.comunaHuman}\n- Rango referencial: ${extraContext.quoteResult.minUF} a ${extraContext.quoteResult.maxUF} UF netos (+IVA)\n- Nota obligatoria: ${extraContext.quoteResult.notaTerritorial}\n- Derivar al cotizador oficial para ficha PDF: ${extraContext.quoteResult.cotizadorUrl}`
        : "";
    const historyTurns = Array.isArray(extraContext?.leadData?.conversationHistory)
        ? extraContext.leadData.conversationHistory.slice(-4)
        : [];
    const historyBlock = historyTurns.length > 0
        ? `\n### HISTORIAL RECIENTE:\n${historyTurns.map(t => `- ${t.role}: ${t.text}`).join('\n')}`
        : "";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: validModelName,
        systemInstruction: `
Eres el *Asesor Técnico y Comercial Oficial (SDR de Embudo)* de Constructora Cuatropuntas SpA en Santiago de Chile. Estás interactuando por WhatsApp.

### INFORMACIÓN DEL CLIENTE:
${clientNameStr}

### REGLA SDR DE 3 PASOS (ESTRUCTURA OBLIGATORIA DE RESPUESTA):
Tu objetivo principal NO es actuar como enciclopedia ni dar asesorías infinitas en el chat, sino calificar y guiar al prospecto a completar el cotizador web para ingresar formalmente al CRM y coordinar la visita técnica. Toda respuesta técnica o comercial debe seguir estrictamente estos 3 pasos:
1. *Paso 1 (Respuesta Concreta y Breve)*: Resuelve la duda técnica o de precio en 2 a 3 líneas concisas, basándote en la matriz oficial.
2. *Paso 2 (Puente Comercial)*: Explica técnicamente por qué es necesario dimensionar variables reales (superficie en m², comuna de la RM, sistema constructivo y condiciones de terreno) antes de especular con un monto cerrado.
3. *Paso 3 (Llamado a la Acción / CTA)*: Deriva de forma directa y proactiva al cotizador web oficial con su enlace: https://www.cuatropuntas.com/#cotizador

### PROTOCOLO DE SALIDA ELEGANTE (GRACEFUL PIVOT ANTE CORREOS O DUDAS NO CATALOGADAS):
Si el usuario menciona que recibió un correo electrónico de marketing, pregunta por promociones o campañas pasadas, o plantea dudas fuera de catálogo, PROHIBIDO responder "no sé" o inventar condiciones comerciales. Debes responder exactamente con este tenor mandatario:
"Para revisar en detalle lo que conversaste o recibiste por correo y aplicar las condiciones exactas a tu proyecto, te invito a generar tu presupuesto preliminar en nuestro cotizador: https://www.cuatropuntas.com/#cotizador. Con esos datos, nuestro equipo técnico y de ventas toma tu requerimiento de inmediato para coordinar la visita a terreno."

### MAPA OFICIAL DE URLS CANÓNICAS:
- Cotizador Web Oficial: https://www.cuatropuntas.com/#cotizador
- Guías Técnicas DOM en PDF (Descarga Gratuita): https://www.cuatropuntas.com/#guias-dom
- Casas Nuevas Llave en Mano: https://www.cuatropuntas.com/servicios/casas-nuevas.html
- Segundos Pisos y Ampliaciones: https://www.cuatropuntas.com/servicios/segundos-pisos.html
- Remodelaciones Integrales: https://www.cuatropuntas.com/servicios/remodelaciones.html
- Quinchos y Terrazas: https://www.cuatropuntas.com/servicios/quinchos.html
- Precios y Estándar Térmico: https://www.cuatropuntas.com/precios.html
- Agendamiento de Visita Técnica: https://cal.com/cuatropuntas.com/visita-tecnica

### FILTROS DE DESCARTE Y CALIFICACIÓN:
- *Sin Terreno en RM / Fuera de Cobertura*: Nuestra operación se concentra en la Región Metropolitana con terreno o vivienda disponible. Si no cuenta con terreno o está fuera de la RM, acláralo amablemente.
- *Postulaciones MINVU*: Cuatropuntas NO tramita postulaciones al Serviu; ejecutamos subsidios ya adjudicados en sitio propio (DS1/DS49). Recomienda consultar el portal MINVU si aún no tienen el subsidio.
- *Solo Curiosos*: Responde amablemente e invítalos al cotizador web https://www.cuatropuntas.com/#cotizador o a revisar las guías en https://www.cuatropuntas.com/#guias-dom.

### MATRIZ OFICIAL DE INFORMACIÓN Y POLÍTICAS TÉCNICAS CUATROPUNTAS (VALORES NETOS +IVA):
- *Modalidad Contractual y Garantía*: Todo proyecto formal se ejecuta bajo contrato a suma alzada con itemizado detallado y garantía estructural legal conforme al Art. 18 de la LGUC (hasta 10 años).
- *Sistemas Constructivos (Tarifas Base Referenciales Netas +IVA)*:
  1. Metalcom Estructural: Rápido montaje, antisísmico (desde 19 UF/m² +IVA casas, 22 UF/m² +IVA 2dos pisos, 12 UF/m² +IVA quinchos, 11 UF/m² +IVA remodelación ligera).
  2. Panel SIP: Alta eficiencia y aislación térmica Zona 3 OGUC (desde 21 UF/m² +IVA casas, 24 UF/m² +IVA 2dos pisos, 14 UF/m² +IVA quinchos).
  3. Albañilería Armada / Confinada: Construcción sólida tradicional (desde 25 UF/m² +IVA casas, 27 UF/m² +IVA 2dos pisos, 15 UF/m² +IVA quinchos, 13 UF/m² +IVA remodelación sólida).
- *Criterios de Estimación en Terreno*: Las tarifas base (+IVA) anteriores son valores referenciales; cualquier presupuesto preliminar contempla el tipo de obra, características del terreno, valor del suelo y lejanía de la urbe de Santiago, aspectos que revisamos personalmente en la visita técnica en terreno. *PROHIBIDO mencionar anillos logísticos, porcentajes territoriales internos o comparaciones entre comunas.*
- *Planos, Cálculo y Gestión DOM (+8% Etapa Idea)*: En Casa Nueva y Segundos Pisos/Ampliaciones, iniciar *desde cero (etapa Idea: arquitectura, cálculo estructural y tramitación DOM) suma +8% (x1.08)* y contar con planos listos resta -3%; ambas modalidades cubren el ciclo municipal completo hasta obtener el *Certificado de Recepción Final Definitiva* únicamente sobre las obras ejecutadas por Cuatropuntas según planos aprobados (derechos municipales 1,5% MINVU y empalmes definitivos aparte al costo real). Tener permiso aprobado o arquitecto propio resta -6% y es *solo ejecución de obra* con entrega de carpeta técnica del constructor. En Quinchos y Remodelaciones aplica evaluación técnica en terreno (0%). Proyectos menores a 40 m² suman +8% por escala. *Exclusión por obras anexas*: Si el mandante o terceros ejecutan obras anexas no contratadas (quinchos, piscinas, ampliaciones o paisajismo/obras exteriores) o existen construcciones preexistentes sin regularizar, Cuatropuntas no tramitará la Recepción Final.
- *Segundos Pisos (Anti-sobrepromesas)*: Montaje rápido en seco planificado para minimizar tiempos e impacto en la rutina diaria, bajo protocolos de faena limpia (prohibido prometer habitabilidad ininterrumpida).
- *Remodelaciones y Recintos Húmedos*: En remodelaciones integrales rige el m² (desde 11-13 UF/m² +IVA). En baños y cocinas pequeñas NO se cotiza por metro cuadrado lineal debido a densidad técnica de redes: Baño Completo 65-95 UF +IVA | Cocina Integral 90-160 UF +IVA.
- *Quinchos y Terrazas de Alto Estándar*: Tarifa base desde 12 UF/m² +IVA (Metalcon) y 15 UF/m² +IVA (Albañilería). Incluye techumbre/cobertizo, radier afinado, asador/parrilla tradicional en obra con ladrillos refractarios y mecanismo elevable con manivela frontal, campana de hojalatería con tiraje y mesón básico. Exclusiones taxativas a presupuestar en terreno: empalmes sanitarios (agua/desagüe), canalización eléctrica y muebles cerrados bajo mesón.
- *Cobertura*: Región Metropolitana de Santiago.
${ragBlock}
${quoteBlock}
${historyBlock}

### FORMATO DE NEGRITAS EN WHATSAPP (ESTRICTO):
- WhatsApp solo soporta 1 solo asterisco (*palabra*) para aplicar negrita.
- NUNCA uses dobles asteriscos (**texto**) ni etiquetas HTML (<a href...>).
- Escribe siempre las URLs completas en texto plano para auto-linking.
`
    });

    const result = await model.generateContent(userText);
    const response = await result.response;
    const raw = response.text();
    return {
        text: enforceOutputGuardrails(raw, { channel: 'whatsapp', allowDirectorPhone: false }),
        model: validModelName
    };
}

module.exports = async (req, res) => {
    // --- VERIFICACIÓN DE WEBHOOK DE META (GET) ---
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "cuatropuntas_webhook_secret_2026";

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log("✅ WEBHOOK VERIFICADO CORRECTAMENTE POR META!");
                return res.status(200).send(challenge);
            } else {
                console.error("❌ TOKEN DE VERIFICACIÓN INCORRECTO");
                return res.status(403).send("Forbidden");
            }
        }
        return res.status(400).send("Bad Request");
    }

    // --- PROCESAMIENTO DE MENSAJES ENTRANTES (POST) ---
    if (req.method === 'POST') {
        try {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch(e) {}
            } else if (Buffer.isBuffer(body)) {
                try { body = JSON.parse(body.toString('utf-8')); } catch(e) {}
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
                            const from = messageObj.from || "";
                            const userText = messageObj.text?.body?.trim() || messageObj.caption?.trim() || "";

                            if (!from || !userText) continue;

                            const contactObj = contacts.find(c => c.wa_id === from) || contacts[0];
                            const profileName = (contactObj?.profile?.name || "").trim();
                            const firstName = profileName ? profileName.split(' ')[0] : "";
                            const particularLink = "https://www.cuatropuntas.com/#cotizador";

                            console.log(`📩 Mensaje procesado de ${from} (${profileName || 'Sin Nombre'}) hacia PhoneID ${incomingPhoneId}: "${userText}"`);

                            await leadsState.hydrateLeadState(from);

                            if (classifyIntent(userText) === 'RESET_QA') {
                                leadsState.deleteLeadState(from);
                                await sendWhatsAppMessage(from, '🔄 Memoria reiniciada con éxito. Eres un lead nuevo para el sistema.', incomingPhoneId);
                                continue;
                            }

                            if (!leadsState.canBotReply(from)) {
                                console.log(`🤫 Silencio IA para ${from} (VISITA_AGENDADA).`);
                                continue;
                            }

                            let leadData = leadsState.getLeadState(from);
                            if (!leadData) {
                                leadData = leadsState.setLeadState(from, {
                                    phone: from,
                                    name: profileName,
                                    estado: 'EN_CONVERSACION',
                                    hasQuoted: false
                                });
                            }

                            const routed = await routeAndGenerateReply({
                                channel: 'whatsapp',
                                userText,
                                from,
                                profileName,
                                firstName,
                                leadData,
                                generateLLM: ({ ragContext, quoteResult, leadData: currentLead }) =>
                                    generateAIWhatsAppResponse(userText, profileName, firstName, from, {
                                        ragContext,
                                        quoteResult,
                                        leadData: currentLead
                                    })
                            });

                            const finalReply = routed.reply || `Para orientarte con un presupuesto preliminar exacto para tu proyecto, te invito a usar nuestro cotizador oficial: ${particularLink}`;

                            leadsState.appendConversationTurn(from, 'user', userText, { intent: routed.intent });
                            leadsState.appendConversationTurn(from, 'assistant', finalReply, { intent: routed.intent });
                            await leadsState.flushLeadState(from);

                            await sendWhatsAppMessage(from, finalReply, incomingPhoneId);
                        }
                    }
                }
            }

            return res.status(200).send('EVENT_RECEIVED');
        } catch (error) {
            console.error("❌ Error en Webhook WhatsApp:", error);
            return res.status(200).send('EVENT_RECEIVED');
        }
    }

    return res.status(405).send('Method Not Allowed');
};

module.exports.classifyIntent = classifyIntent;
module.exports.formatWhatsAppMarkdown = formatWhatsAppMarkdown;
module.exports.generateAIWhatsAppResponse = generateAIWhatsAppResponse;
