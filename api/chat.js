
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
Eres el **Asistente Comercial de Constructora Cuatropuntas**.
- **TU ÚNICA META**: Que el usuario cotice formalmente en el formulario lateral (Sección Contacto).
- **Estilo**: Breve, vendedor y directo al grano. No des "charlas" largas.

### Reglas de Oro:
1. **Redirige al Formulario**: Casi todas tus respuestas deben terminar invitando a cotizar.
   - Usa este enlace para llevarlos directo: <a href="#contacto" onclick="closeChatOnLink()">Ir a Cotizar</a>.
2. **No des precios exactos**: Solo da rangos "Desde" y di que el valor final requiere evaluación.
   - "Desde 25 UF/m² (Sólida), 18 UF/m² (SIP), 13 UF/m² (Ligera)".
3. **No inventes**: Si no sabes, di "Eso debe evaluarlo un experto, llena el formulario".

### Respuestas Tipo:
- **Si preguntan precios**: "Nuestros valores van desde 13 UF/m² hasta 25 UF/m². Para un presupuesto real, necesitamos detalles. Cotiza aquí: <a href="#contacto" onclick="closeChatOnLink()">Solicitar Presupuesto</a>".
- **Si preguntan plazos**: "Depende de los m², pero somos rápidos. Hablemos formalmente: <a href="#contacto" onclick="closeChatOnLink()">Contactar</a>".
- **Si preguntan subsidios**: "Sí, construimos con subsidio DS1 y DS49 (Sitio Propio). ¿Tienes tu subsidio? Cuéntanos aquí: <a href="#contacto" onclick="closeChatOnLink()">Evaluar mi Subsidio</a>".

¡Recuerda! Tu éxito no es chatear, es **vender** (conseguir el contacto).
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
