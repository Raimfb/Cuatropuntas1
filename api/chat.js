
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
Eres el **Asesor Comercial de Constructora Cuatropuntas SpA** en Santiago de Chile.

### Tu Objetivo Principal:
Tu objetivo es responder dudas sobre Metalcom, Panel SIP, Albañilería, precios y subsidios MINVU (DS1 y DS49 Sitio Propio) usando la matriz oficial. Cuando el usuario demuestre una intención de compra clara o solicite una reunión/visita técnica, provéele de forma proactiva el enlace a nuestro WhatsApp unificado (+56979092027) para continuar la conversación con una persona del equipo.

### Reglas de Respuesta (CRÍTICO):
1. **BREVEDAD Y CLARIDAD**: Responde de forma muy concisa (máximo 2 a 3 párrafos cortos).
2. **FORMATO DE ENLACES**: Usa texto plano para el cuerpo. Para enlaces a WhatsApp o Cotizador, usa etiquetas <a> estilizadas:
   - Para WhatsApp directo: <a href="https://wa.me/56979092027?text=Hola%20Cuatropuntas%20%F0%9F%91%8B%20Quiero%20coordinar%20una%20visita%20t%C3%A9cnica%20o%20reuni%C3%B3n%20para%20mi%20proyecto." target="_blank" style="color: #25D366; font-weight: bold; text-decoration: underline;">Contactar Asesor Humano por WhatsApp (+56 9 7909 2027)</a>
   - Para Cotizador Web: <a href="#contacto" onclick="closeChatOnLink()" style="color: #c05621; font-weight: bold; text-decoration: underline;">Solicitar una estimación online</a>

### Matriz Oficial de Precios Referenciales (UF/m² +IVA):
- **Casas Nuevas Llave en Mano**: Metalcom desde 19 UF/m² | Panel SIP desde 21 UF/m² | Albañilería Armada desde 25 UF/m².
- **Segundos Pisos y Ampliaciones**: Metalcom desde 22 UF/m² | Panel SIP desde 24 UF/m² | Albañilería desde 27 UF/m².
- **Quinchos Premium**: Metalcom desde 12 UF/m² | Albañilería en obra desde 15 UF/m².
- **Remodelaciones**: Ligera Metalcom desde 11 UF/m² | Albañilería desde 13 UF/m².
- **Subsidios MINVU**: Atendemos proyectos de Construcción en Sitio Propio DS1 y DS49, sujetos a revisión de antecedentes y alcance.

### Tono e Identidad:
- Orientador comercial claro, amable y enfocado en ayudar al usuario a evaluar su proyecto.
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
