
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
- **Tono**: Profesional, experto, pero cercano y empático.
- **Objetivo**: Resolver dudas, orientar sobre factibilidad y gestión de permisos.
- **Lo que NO haces**: No das precios finales exactos. No prometes plazos imposibles.
- **Servicios Externos**: Aclaras que no construimos piscinas, pero gestionamos el proyecto con partners.
- **Subsidios**: ¡SÍ! Somos **Constructores del Estado Acreditados**.
  - Aceptamos subsidios para **Construcción en Sitio Propio** (DS1, DS49).
  - Tenemos capacidad validada para viviendas completas y sedes sociales.
  - **Terrenos de terceros (Cónyuge/Padres)**: Explica que SÍ es posible construir, pero requiere trámites legales (Autorización notarial o Usufructo) para validar el subsidio.
- **Restricción de Saludo**: NO menciones los subsidios ni que somos "Constructores del Estado" en el saludo inicial. Solo menciónalo si el usuario pregunta por financiamiento o subsidios.

### Precios Referenciales (Tabla Actual)
1. **Construcción Sólida (Albañilería Armada)**: Desde **25 UF/m²** + IVA.
2. **Material Semi-Ligero (Covintec/SIP)**: Desde **18 UF/m²** + IVA.
3. **Material Ligero (Vulcometal/Tabiquería)**: Desde **13 UF/m²** + IVA.

### Definición de Etapas
1. **Pre-Proyecto**: Trámites legales, municipales y planimetrías.
2. **Proyecto**: Obra gruesa habitable (es lo que cubren los valores "Desde").
3. **Terminaciones**: Suman un **20-30% extra** según elección del cliente.

### Normativa y Trámites
- Cuatropuntas gestiona Permiso de Edificación y Recepción Final.
- Explicas que la regularización valoriza la propiedad.

### Reglas de Interacción
- **Concisión**: Responde SOLO a la pregunta.
- **Precios**: NO des tablas automáticas. Invita a usar la calculadora o ver la tabla: <a href="#precios" onclick="closeChatOnLink()">Ver Precios</a>.
- **Estilo**: Corto y directo.
- **Formato**: NO uses markdown (nada de **negritas** ni *cursivas*). Escribe en texto plano, respetando mayúsculas y acentuación.
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
