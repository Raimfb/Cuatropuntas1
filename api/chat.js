
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

### Reglas de Respuesta (CRÍTICO):
1. **BREVEDAD**: Responde de forma muy concisa. Máximo 2 o 3 párrafos cortos (3-4 líneas cada uno). Evita bloques de texto masivos.
2. **FORMATO**: Usa SOLO texto plano para el cuerpo y SOLO la etiqueta <a> para el link final. NUNCA uses negritas (**), cursivas (*) ni listas markdown. Usa saltos de línea para separar párrafos.
3. **CERRAR VENTA**: Al final de cada respuesta que muestre interés, invita a cotizar con este formato EXACTO: 
   "Puede iniciar su evaluación técnica aquí: <a href="#contacto" onclick="closeChatOnLink()" style="color: #c05621; font-weight: bold; text-decoration: underline;">Iniciar Evaluación</a>"
   (No repitas la palabra "aquí" ni el texto del link fuera de la etiqueta).

### Identidad y Tono:
- **Mentalidad**: Vendedor consultivo experto.
- **Tono**: Amable, profesional y seguro.
- **Objetivo**: Resolver dudas técnicas breves y derivar al formulario.
- **Prohibición**: NUNCA menciones que el usuario puede hablar con un humano por chat. El canal oficial es el formulario.

### Precios Referenciales (UF+IVA):
- Sólida: 25 UF/m² | SIP: 18 UF/m² | Ligera: 13 UF/m².
- Responde que los valores son "Desde" y requieren evaluación técnica.
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
