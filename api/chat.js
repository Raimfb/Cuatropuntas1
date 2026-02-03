
const { GoogleGenerativeAI } = require("@google/generative-ai");
// Necesitamos 'node-fetch' si node es viejo, pero en node 18+ fetch es nativo.
// Asumiremos node 18+ o que el usuario instala node-fetch.
// Mejor usamos la propia SDK o https puro si podemos, pero un fetch simple es lo mas robusto.

module.exports = async (req, res) => {
    // CORS Setup
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { message } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('API Key no configurada');
        }

        // --- AUTO-DESCUBRIMIENTO DE MODELO ---
        // Consultamos la API REST directamente para ver qué modelos tiene PERMISO esta clave.
        let validModelName = "gemini-1.5-flash"; // Default backup

        try {
            console.log("🔍 Auto-descubriendo modelos disponibles...");
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const listResp = await fetch(listUrl);
            const listData = await listResp.json();

            if (listData && listData.models) {
                // Buscamos modelos que soporten 'generateContent'
                const viableModel = listData.models.find(m =>
                    m.supportedGenerationMethods &&
                    m.supportedGenerationMethods.includes("generateContent") &&
                    (m.name.includes("flash") || m.name.includes("pro")) // Preferencia
                );

                if (viableModel) {
                    // La API devuelve "models/gemini-1.5-flash", a veces el SDK quiere solo "gemini-1.5-flash"
                    // Pero el SDK moderno acepta "models/..." también.
                    validModelName = viableModel.name.replace("models/", "");
                    console.log(`✅ Modelo seleccionado: ${validModelName}`);
                }
            }
        } catch (discoveryError) {
            console.warn("⚠️ Falló el auto-descubrimiento, usando default:", discoveryError.message);
        }

        // --- INICIA CHAT ---
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: validModelName,
            systemInstruction: `
Eres el **Asesor Técnico y Comercial de Constructora Cuatropuntas**.
- **Mentalidad**: Eres servicial y experto. Tu prioridad es **aclarar dudas** para generar confianza.
- **Venta Suave**: No presiones. Sugiere cotizar solo cuando sea natural (ej: preguntan precios exactos, disponibilidad o detalles de un proyecto).
- **Estilo**: Amable, profesional y conciso.

### Reglas de Conversación:
1. **Responde Primero**: Si preguntan "¿Qué materiales usan?", responde técnicamente. No digas "cotiza para saber".
2. **Momento del Link**: Usa el enlace de cotización SOLO si:
   - Preguntan precios ("¿Cuánto cuesta?").
   - Preguntan plazos o factibilidad ("¿Pueden construir en tal comuna?").
   - La conversación ya lleva un par de interacciones y quieres cerrar.
   - Link: <a href="#contacto" onclick="closeChatOnLink()">Solicitar Evaluación</a>.
3. **Precios Referenciales (UF+IVA)**:
   - Sólida: Desde 25 UF/m².
   - Semi-Ligera (SIP): Desde 18 UF/m².
   - Ligera: Desde 13 UF/m².
   - *Siempre aclara que son valores "Desde" referenciales.*

### Ejemplos:
- **Usuario**: "¿Qué aislación usan?"
- **Tú**: "Usamos EIFS para envolvente térmica y lana mineral de alta densidad en tabiques. Cumplimos norma térmica actual." (Sin link forzado).

- **Usuario**: "¿Cuánto sale una casa de 50m2?"
- **Tú**: "En material ligero partiría desde unas 650 UF + IVA aprox. Sin embargo, para darte un valor real necesitamos ver el terreno. ¿Te gustaría una evaluación formal? <a href="#contacto" onclick="closeChatOnLink()">Cotizar Aquí</a>."

`
        });

        const result = await model.generateContent(message);
        const response = await result.response;
        res.status(200).json({ reply: response.text() });

    } catch (error) {
        console.error('Error final chat:', error);
        res.status(500).json({ error: 'Error procesando solicitud', details: error.message });
    }
};
