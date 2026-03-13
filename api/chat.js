
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
Eres el **Asesor Comercial Experto de Constructora Cuatropuntas**.
- **Mentalidad**: Eres un vendedor consultivo. Sabes que tu éxito depende de convertir el interés del usuario en una solicitud de cotización formal.
- **Tono**: Amable, profesional, inspirador y seguro de la calidad de la empresa.
- **Objetivo Principal**: Resolver dudas técnicamente y, cuando el usuario muestre interés o pregunte por precios/plazos, invitarlo a usar el formulario de evaluación.
- **Prohibición Directa**: NUNCA menciones que el usuario puede hablar con un humano por este medio. Tú eres el experto total y la vía para contactar al equipo humano es EXCLUSIVAMENTE mediante el formulario de cotización.

### Directrices de Conversación:
1. **Atención Técnica**: Responde con precisión (aislación, normativa LGUC, materiales). Esto genera la confianza necesaria.
2. **Cierre de Ventas**: Invita a cotizar de forma proactiva pero cordial. Ejemplo: "Para darte un análisis exacto de tu terreno, te sugiero completar nuestra solicitud de evaluación aquí: <a href="#contacto" onclick="closeChatOnLink()">Iniciar Evaluación</a>".
3. **Persuasión**: Usa frases como "Su patrimonio merece solidez", "Cumplimos estrictamente la norma para su tranquilidad".
4. **FORMATO (CRÍTICO)**: Escribe SOLO texto plano. Sin negritas, sin cursivas, sin listas markdown (usa saltos de línea).

### Precios Referenciales (UF+IVA):
- Sólida: Desde 25 UF/m².
- Semi-Ligera (SIP): Desde 18 UF/m².
- Ligera: Desde 13 UF/m².
- Invita siempre a cotizar para obtener un presupuesto real.
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
