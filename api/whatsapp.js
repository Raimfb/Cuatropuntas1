// Helper para enviar mensajes a través de Meta WhatsApp Cloud API
async function sendWhatsAppMessage(recipientNumber, textBody) {
    const token = process.env.WHATSAPP_TOKEN || "EAAUzVSuHpoUBSM28Xbe2cpwsThD6r8rdwxxiyQc6AEGNfVNgIZBegdORmqWJivsiYKF7p2YqcaEjRFRkF4AGaQFjTE7AFRvql2nSF8lCTAbqL4UxV9vExktwsmZABFm6ae2iGaAyDErqOTv3kVHeyR6LvU7NAwk0T2ZCBiLu1jqF1EPduJQZAeW9WUAeV9izkIcfcI7v8GmPX4KUhKodO9YWOMh99ZBfHSjl51b4ZC7WkuW7auqlXfkq0flT5RE1VM8PyLZCEldwOi1ZAj18H4IEFmZBMGTnsRwXA";
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1221676334362871";

    if (!token) {
        console.error("❌ ERROR: WHATSAPP_TOKEN no configurado");
        return false;
    }

    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    const cleanNumber = recipientNumber.replace(/[^0-9]/g, '');

    console.log(`📤 Enviando respuesta por Meta API a ${cleanNumber}...`);

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

// Clasificación Ultra Rápida y Robusta de Intención (0ms Serverless Ready)
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

    // Default fallback a Ruta 2
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
                        const messages = value?.messages || [];

                        for (const messageObj of messages) {
                            const from = messageObj.from || "";
                            const userText = messageObj.text?.body?.trim() || messageObj.caption?.trim() || "";

                            if (!from || !userText) continue;

                            console.log(`📩 Mensaje procesado de ${from}: "${userText}"`);

                            const intent = classifyIntent(userText);
                            let responseMsg = "";

                            if (intent === "SALUDO_INICIAL") {
                                // PASO 2: Bienvenida e indagación
                                responseMsg = `¡Hola! Qué gusto saludarte. Bienvenido a Cuatropuntas Constructora. 🏗️ Para ayudarte de la manera más rápida y precisa, cuéntame un poco: ¿Qué tipo de proyecto tienes en mente? (Por ejemplo: una construcción desde cero, ampliación, remodelación o si ya cuentas con un subsidio habitacional aprobado).`;
                            } else if (intent === "ROUTE_1") {
                                // Ruta 1: Subsidio Adjudicado
                                responseMsg = `¡Excelente! Felicitaciones por la adjudicación de tu beneficio. En Cuatropuntas nos especializamos en la ejecución de proyectos con subsidios aprobados en terreno propio. Para ingresar los datos técnicos de tu subsidio y revisar el estado de tu terreno, por favor completa este breve formulario oficial en nuestra web: https://www.cuatropuntas.com/subsidio-minvu-sitio-propio.html`;
                            } else if (intent === "ROUTE_2") {
                                // Ruta 2: Proyectos Particulares
                                responseMsg = `Estupendo, nos encanta dar vida a proyectos particulares a medida. Para que nuestro equipo de arquitectura evalúe la viabilidad de la obra y los metros cuadrados, ayúdanos rellenando tus datos de diseño aquí: https://www.cuatropuntas.com/precios`;
                            } else {
                                // Ruta 3: Descarte de Postulaciones
                                responseMsg = `Comprendo. Te aclaro que en Cuatropuntas no funcionamos como entidad patrocinante ni gestionamos postulaciones ante el Serviu; operamos puramente como constructora de las obras ya aprobadas. Te recomendamos revisar el portal oficial del MINVU para ver las fechas de postulación. ¡Mucho éxito!`;
                            }

                            await sendWhatsAppMessage(from, responseMsg);
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
