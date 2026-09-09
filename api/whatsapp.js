const { GoogleGenerativeAI } = require("@google/generative-ai");

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

// Sanitizador y Formateador Estricto para WhatsApp (1 solo asterisco para negrita)
function formatWhatsAppMarkdown(text) {
    if (!text) return "";
    let cleaned = text;

    // 1. Reemplazar dobles o múltiples asteriscos (**texto** o ***texto***) por 1 solo asterisco (*texto*)
    cleaned = cleaned.replace(/\*{2,}/g, '*');

    // 2. Limpiar asteriscos impares/huérfanos por línea para evitar texto roto en WhatsApp
    const lines = cleaned.split('\n');
    const fixedLines = lines.map(line => {
        const asteriskMatches = line.match(/\*/g) || [];
        if (asteriskMatches.length % 2 !== 0) {
            // Si la línea termina en asterisco descolgado, removerlo
            if (line.trim().endsWith('*')) {
                return line.trim().slice(0, -1);
            }
            // Si hay un asterisco abierto sin cerrar, cerrarlo al final de la línea
            return line + '*';
        }
        return line;
    });

    return fixedLines.join('\n');
}

// Generador Inteligente de Respuestas con Gemini AI para WhatsApp
async function generateAIWhatsAppResponse(userText, profileName, firstName, from) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const nameQuery = profileName 
        ? `?name=${encodeURIComponent(profileName)}&phone=${encodeURIComponent(from)}` 
        : `?phone=${encodeURIComponent(from)}`;
    const particularLink = `https://www.cuatropuntas.com/precios${nameQuery}`;
    const subsidioLink = `https://www.cuatropuntas.com/subsidio-minvu-sitio-propio.html${nameQuery}`;
    const clientNameStr = firstName 
        ? `El cliente se llama ${firstName} (nombre completo en WhatsApp: "${profileName}"). Dirígete a él llamándolo por su nombre de pila (${firstName}).` 
        : "No conocemos el nombre de pila del cliente, salúdalo con un ¡Hola! cálido y profesional.";

    let validModelName = "gemini-1.5-flash";
    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const listResp = await fetch(listUrl);
        const listData = await listResp.json();
        if (listData && listData.models) {
            const viableModel = listData.models.find(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes("generateContent") &&
                (m.name.includes("flash") || m.name.includes("pro"))
            );
            if (viableModel) {
                validModelName = viableModel.name.replace("models/", "");
            }
        }
    } catch (e) {}

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
- Casas Nuevas Llave en Mano: https://www.cuatropuntas.com/servicios/casas-nuevas.html
- Segundos Pisos y Ampliaciones: https://www.cuatropuntas.com/servicios/segundos-pisos.html
- Remodelaciones Integrales: https://www.cuatropuntas.com/servicios/remodelaciones.html
- Quinchos y Terrazas: https://www.cuatropuntas.com/servicios/quinchos.html
- Precios y Estándar Térmico: https://www.cuatropuntas.com/precios.html
- Agendamiento de Visita Técnica: https://cal.com/cuatropuntas.com/visita-tecnica

### FILTROS DE DESCARTE Y CALIFICACIÓN:
- *Sin Terreno en RM / Fuera de Cobertura*: Nuestra operación se concentra en la Región Metropolitana con terreno o vivienda disponible. Si no cuenta con terreno o está fuera de la RM, acláralo amablemente.
- *Postulaciones MINVU*: Cuatropuntas NO tramita postulaciones al Serviu; ejecutamos subsidios ya adjudicados en sitio propio (DS1/DS49). Recomienda consultar el portal MINVU si aún no tienen el subsidio.
- *Solo Curiosos*: Responde amablemente e invítalos al cotizador web https://www.cuatropuntas.com/#cotizador o a revisar el blog.

### MATRIZ OFICIAL DE INFORMACIÓN Y POLÍTICAS TÉCNICAS CUATROPUNTAS:
- *Modalidad Contractual y Garantía*: Todo proyecto formal se ejecuta bajo contrato a suma alzada con itemizado detallado y garantía estructural legal conforme al Art. 18 de la LGUC (hasta 10 años).
- *Sistemas Constructivos*:
  1. Metalcon Estructural: Rápido montaje, antisísmico (desde 19 UF/m² casas, 22 UF/m² 2dos pisos, 12 UF/m² quinchos, 11 UF/m² remodelación ligera).
  2. Panel SIP: Alta eficiencia y aislación térmica Zona 3 OGUC (desde 21 UF/m² casas, 24 UF/m² 2dos pisos).
  3. Albañilería Armada / Confinada: Construcción sólida tradicional (desde 25 UF/m² casas, 27 UF/m² 2dos pisos, 15 UF/m² quinchos, 13 UF/m² remodelación sólida).
- *Segundos Pisos (Anti-sobrepromesas)*: Montaje rápido en seco planificado para minimizar tiempos e impacto en la rutina diaria, bajo protocolos de faena limpia (prohibido prometer habitabilidad ininterrumpida).
- *Remodelaciones y Recintos Húmedos*: En remodelaciones integrales rige el m² (desde 11-13 UF/m²). En baños y cocinas pequeñas NO se cotiza por metro cuadrado lineal debido a densidad técnica de redes: Baño Completo 65-95 UF | Cocina Integral 90-160 UF.
- *Quinchos y Terrazas de Alto Estándar*: Tarifa base desde 12 UF/m² (Metalcon) y 15 UF/m² (Albañilería). Incluye techumbre/cobertizo, radier afinado, asador/parrilla tradicional en obra con ladrillos refractarios y mecanismo elevable con manivela frontal, campana de hojalatería con tiraje y mesón básico. Exclusiones taxativas a presupuestar en terreno: empalmes sanitarios (agua/desagüe), canalización eléctrica y muebles cerrados bajo mesón.
- *Cobertura*: Región Metropolitana de Santiago.

### FORMATO DE NEGRITAS EN WHATSAPP (ESTRICTO):
- WhatsApp solo soporta 1 solo asterisco (*palabra*) para aplicar negrita.
- NUNCA uses dobles asteriscos (**texto**) ni etiquetas HTML (<a href...>).
- Escribe siempre las URLs completas en texto plano para auto-linking.
`
    });

    const result = await model.generateContent(userText);
    const response = await result.response;
    return formatWhatsAppMarkdown(response.text());
}

// Clasificación Ultra Rápida de Intención
function classifyIntent(userMessage) {
    const textLower = (userMessage || "").toLowerCase().trim();

    // 1. Descarte de Postulaciones (Prioridad Alta)
    if (
        textLower.includes("como postulo") || 
        textLower.includes("cómo postulo") || 
        textLower.includes("como postular") || 
        textLower.includes("cómo postular") || 
        textLower.includes("ganarme un subsidio") || 
        textLower.includes("obtener subsidio") || 
        textLower.includes("postulacion") || 
        textLower.includes("postulación") ||
        textLower.includes("quiero saber como")
    ) {
        return "ROUTE_3";
    }

    // 2. Ruta 1: Subsidio Adjudicado
    if (
        textLower.includes("subsidio") || 
        textLower.includes("ds1") || 
        textLower.includes("ds49") || 
        textLower.includes("adjudicado") || 
        textLower.includes("gane") || 
        textLower.includes("gané") || 
        textLower.includes("tengo subsidio")
    ) {
        return "ROUTE_1";
    }

    // 3. Ruta 2: Proyectos Particulares
    if (
        textLower.includes("segundo piso") || 
        textLower.includes("casa nueva") || 
        textLower.includes("parcela") || 
        textLower.includes("ampliar") || 
        textLower.includes("ampliacion") || 
        textLower.includes("ampliación") || 
        textLower.includes("remodelar") || 
        textLower.includes("remodelacion") || 
        textLower.includes("remodelación") || 
        textLower.includes("quincho") || 
        textLower.includes("construir") ||
        textLower.includes("proyecto")
    ) {
        return "ROUTE_2";
    }

    // 4. Saludo Inicial
    if (
        textLower === "hola" || 
        textLower === "hola\\" || 
        textLower.includes("buenas") || 
        textLower.includes("cotizar") || 
        textLower.includes("interesado")
    ) {
        return "SALUDO_INICIAL";
    }

    return "ROUTE_2";
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
                        // Extraer dinámicamente el ID del número telefónico al que le escribieron
                        const incomingPhoneId = value?.metadata?.phone_number_id || null;
                        const contacts = value?.contacts || [];
                        const messages = value?.messages || [];

                        for (const messageObj of messages) {
                            const from = messageObj.from || "";
                            const userText = messageObj.text?.body?.trim() || messageObj.caption?.trim() || "";

                            if (!from || !userText) continue;

                            // Extraer nombre de perfil de WhatsApp del cliente
                            const contactObj = contacts.find(c => c.wa_id === from) || contacts[0];
                            const profileName = (contactObj?.profile?.name || "").trim();
                            const firstName = profileName ? profileName.split(' ')[0] : "";
                            const nameGreeting = firstName ? `, ${firstName}` : "";
                            const nameQuery = profileName 
                                ? `?name=${encodeURIComponent(profileName)}&phone=${encodeURIComponent(from)}` 
                                : `?phone=${encodeURIComponent(from)}`;
                            const particularLink = `https://www.cuatropuntas.com/precios${nameQuery}`;
                            const subsidioLink = `https://www.cuatropuntas.com/subsidio-minvu-sitio-propio.html${nameQuery}`;

                            console.log(`📩 Mensaje procesado de ${from} (${profileName || 'Sin Nombre'}) hacia PhoneID ${incomingPhoneId}: "${userText}"`);

                            let responseMsg = "";

                            // 1. Intentar generar respuesta inteligente con Gemini AI
                            try {
                                responseMsg = await generateAIWhatsAppResponse(userText, profileName, firstName, from);
                            } catch (aiErr) {
                                console.error("⚠️ Error intentando responder con Gemini AI:", aiErr.message);
                            }

                            // 2. Fallback a respuestas estáticas por intenciones si Gemini no genera respuesta
                            if (!responseMsg) {
                                console.log("ℹ️ Usando respuesta fallback por intenciones...");
                                const intent = classifyIntent(userText);

                                if (intent === "SALUDO_INICIAL") {
                                    responseMsg = firstName
                                        ? `Hola ${firstName}, bienvenido a Cuatropuntas Constructora. Para orientarte de la mejor forma, cuéntame: ¿qué tipo de proyecto tienes en mente? (Por ejemplo: construcción de casa nueva, segundo piso o ampliación, quincho, remodelación o proyecto con subsidio en terreno propio).`
                                        : `Hola, bienvenido a Cuatropuntas Constructora. Para orientarte de la mejor forma, cuéntame: ¿qué tipo de proyecto tienes en mente? (Por ejemplo: construcción de casa nueva, segundo piso o ampliación, quincho, remodelación o proyecto con subsidio en terreno propio).`;
                                } else if (intent === "ROUTE_1") {
                                    responseMsg = `¡Excelente${nameGreeting}! Felicitaciones por la adjudicación de tu beneficio. En Cuatropuntas nos especializamos en la ejecución de proyectos con subsidios aprobados en terreno propio. Para ingresar los datos técnicos de tu subsidio y revisar el estado de tu terreno, por favor completa este breve formulario oficial en nuestra web: ${subsidioLink}`;
                                } else if (intent === "ROUTE_2") {
                                    responseMsg = `Estupendo${nameGreeting}, nos encanta dar vida a proyectos particulares a medida. Para que nuestro equipo de arquitectura evalúe la viabilidad de la obra y los metros cuadrados, ayúdanos rellenando tus datos de diseño aquí: ${particularLink}`;
                                } else {
                                    responseMsg = `Comprendo${nameGreeting}. Te aclaro que en Cuatropuntas no funcionamos como entidad patrocinante ni gestionamos postulaciones ante el Serviu; operamos puramente como constructora de las obras ya aprobadas. Te recomendamos revisar el portal oficial del MINVU para ver las fechas de postulación. ¡Mucho éxito!`;
                                }
                            }

                            // Enviar respuesta usando dinámicamente el PhoneID oficial que recibió la solicitud
                            await sendWhatsAppMessage(from, responseMsg, incomingPhoneId);
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
