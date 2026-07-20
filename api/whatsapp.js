const { GoogleGenerativeAI } = require("@google/generative-ai");

// En memoria simple para tracking de estado por número (Vercel warm containers)
const userSessions = new Map();

// Helper para enviar mensajes a través de Meta WhatsApp Cloud API
async function sendWhatsAppMessage(recipientNumber, textBody) {
    const token = process.env.WHATSAPP_TOKEN || "EAAUzVSuHpoUBSM28Xbe2cpwsThD6r8rdwxxiyQc6AEGNfVNgIZBegdORmqWJivsiYKF7p2YqcaEjRFRkF4AGaQFjTE7AFRvql2nSF8lCTAbqL4UxV9vExktwsmZABFm6ae2iGaAyDErqOTv3kVHeyR6LvU7NAwk0T2ZCBiLu1jqF1EPduJQZAeW9WUAeV9izkIcfcI7v8GmPX4KUhKodO9YWOMh99ZBfHSjl51b4ZC7WkuW7auqlXfkq0flT5RE1VM8PyLZCEldwOi1ZAj18H4IEFmZBMGTnsRwXA";
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1221676334362871";

    if (!token) {
        console.error("❌ ERROR: WHATSAPP_TOKEN no configurado en entorno");
        return false;
    }

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
                to: recipientNumber,
                type: "text",
                text: { body: textBody }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("❌ Error enviando mensaje por Meta API:", data);
            return false;
        }

        console.log(`✅ Mensaje enviado exitosamente a ${recipientNumber}`);
        return true;
    } catch (err) {
        console.error("❌ Excepción al conectar con Meta Graph API:", err.message);
        return false;
    }
}

// Clasificación de Intención usando Gemini IA
async function classifyIntentWithAI(userMessage) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // Fallback básico con RegEx si no hay API Key de Gemini
        const textLower = userMessage.toLowerCase();
        if (textLower.includes("cómo postulo") || textLower.includes("como postular") || textLower.includes("ganarme un subsidio") || textLower.includes("obtener subsidio")) {
            return "ROUTE_3";
        }
        if (textLower.includes("subsidio") || textLower.includes("ds1") || textLower.includes("ds49") || textLower.includes("adjudicado")) {
            return "ROUTE_1";
        }
        return "ROUTE_2";
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
Eres un clasificador semántico para una constructora en Chile (Cuatropuntas).
Analiza el mensaje del usuario y clasifícalo en EXACTAMENTE una de las siguientes 3 categorías.
Devuelve ÚNICAMENTE el código de la categoría: RUTA_1, RUTA_2 o RUTA_3.

Categorías:
- RUTA_1: El usuario menciona que YA TIENE o YA SE GANÓ un subsidio adjudicado/vigente (DS1, DS49, subsidio estatal para terreno propio).
- RUTA_2: El usuario desea construir o remodelar un proyecto particular/privado en sitio propio (casa nueva, parcela, segundo piso, ampliación, quincho, remodelación sin subsidio).
- RUTA_3: El usuario pregunta sobre CÓMO POSTULAR, cómo obtener, ganarse o tramitar un subsidio desde cero con el Serviu/MINVU.

Mensaje del usuario: "${userMessage}"

Respuesta (solo escribe RUTA_1, RUTA_2 o RUTA_3):`;

        const result = await model.generateContent(prompt);
        const responseText = (await result.response.text()).trim();

        if (responseText.includes("RUTA_1")) return "ROUTE_1";
        if (responseText.includes("RUTA_3")) return "ROUTE_3";
        return "ROUTE_2";
    } catch (error) {
        console.warn("⚠️ Falló Gemini AI, usando fallback heurístico:", error.message);
        const textLower = userMessage.toLowerCase();
        if (textLower.includes("postular") || textLower.includes("ganarme")) return "ROUTE_3";
        if (textLower.includes("subsidio") || textLower.includes("ds1") || textLower.includes("ds49")) return "ROUTE_1";
        return "ROUTE_2";
    }
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
            }

            if (body && body.object === 'whatsapp_business_account') {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;
                const messageObj = value?.messages?.[0];

                if (messageObj && messageObj.type === 'text') {
                    const from = (messageObj.from || "").replace('+', '').trim(); // Número sin signo +
                    const userText = messageObj.text?.body?.trim() || "";

                    console.log(`📩 Mensaje recibido de ${from}: "${userText}"`);

                    const textLower = userText.toLowerCase();

                    // Detectar si es el primer mensaje / disparador
                    const isGreeting = textLower.includes("hola") || textLower.includes("cotizar") || textLower.includes("interesado") || !userSessions.has(from);

                    if (isGreeting && !userSessions.get(from)?.askedProject) {
                        // PASO 2: Primera interacción del Bot
                        const welcomeMsg = `¡Hola! Qué gusto saludarte. Bienvenido a Cuatropuntas Constructora. 🏗️ Para ayudarte de la manera más rápida y precisa, cuéntame un poco: ¿Qué tipo de proyecto tienes en mente? (Por ejemplo: una construcción desde cero, ampliación, remodelación o si ya cuentas con un subsidio habitacional aprobado).`;
                        
                        await sendWhatsAppMessage(from, welcomeMsg);
                        userSessions.set(from, { step: 'awaiting_project_type', askedProject: true, timestamp: Date.now() });
                    } else {
                        // PASO 3: Análisis y Enrutamiento con IA
                        const route = await classifyIntentWithAI(userText);
                        let responseMsg = "";

                        if (route === "ROUTE_1") {
                            // Ruta 1: Subsidio Adjudicado
                            responseMsg = `¡Excelente! Felicitaciones por la adjudicación de tu beneficio. En Cuatropuntas nos especializamos en la ejecución de proyectos con subsidios aprobados en terreno propio. Para ingresar los datos técnicos de tu subsidio y revisar el estado de tu terreno, por favor completa este breve formulario oficial en nuestra web: https://www.cuatropuntas.com/subsidio-minvu-sitio-propio.html`;
                        } else if (route === "ROUTE_2") {
                            // Ruta 2: Proyectos Particulares
                            responseMsg = `Estupendo, nos encanta dar vida a proyectos particulares a medida. Para que nuestro equipo de arquitectura evalúe la viabilidad de la obra y los metros cuadrados, ayúdanos rellenando tus datos de diseño aquí: https://www.cuatropuntas.com/precios`;
                        } else {
                            // Ruta 3: Descarte de Postulaciones
                            responseMsg = `Comprendo. Te aclaro que en Cuatropuntas no funcionamos como entidad patrocinante ni gestionamos postulaciones ante el Serviu; operamos puramente como constructora de las obras ya aprobadas. Te recomendamos revisar el portal oficial del MINVU para ver las fechas de postulación. ¡Mucho éxito!`;
                        }

                        await sendWhatsAppMessage(from, responseMsg);
                        // Limpiar sesión para permitir futuras consultas
                        userSessions.delete(from);
                    }
                }

                // Meta exige HTTP 200 OK de inmediato
                return res.status(200).send('EVENT_RECEIVED');
            }

            return res.status(404).send('Not Found');
        } catch (error) {
            console.error("❌ Error en Webhook WhatsApp:", error);
            return res.status(200).send('EVENT_RECEIVED'); // Responder 200 siempre a Meta
        }
    }

    return res.status(405).send('Method Not Allowed');
};
