/**
 * lib/agent-consultor.js
 * 
 * Agente Asesor Consultivo de Ingeniería y Arquitectura para Constructora Cuatropuntas SpA.
 * Integra la API de Gemini con fallback determinista de alta fidelidad.
 * Rol: Ingeniero Civil / Arquitecto con criterio constructivo chileno y enfoque en habitabilidad.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Sanitiza y formatea texto para las restricciones de WhatsApp (solo 1 asterisco para negritas)
 * @param {string} text
 * @returns {string}
 */
function formatWhatsAppMarkdown(text) {
    if (!text) return "";
    let cleaned = text;

    // 1. Reemplazar dobles o triples asteriscos (**texto** o ***texto***) por 1 solo asterisco (*texto*)
    cleaned = cleaned.replace(/\*{2,}/g, '*');

    // 2. Limpiar asteriscos descolgados o impares por línea
    const lines = cleaned.split('\n');
    const fixedLines = lines.map(line => {
        const asteriskMatches = line.match(/\*/g) || [];
        if (asteriskMatches.length % 2 !== 0) {
            if (line.trim().endsWith('*')) {
                return line.trim().slice(0, -1);
            }
            return line + '*';
        }
        return line;
    });

    return fixedLines.join('\n');
}

/**
 * Generador de respuesta fallback consultiva en ausencia de credenciales de IA
 * @param {string} userMessage
 * @param {Object} leadData
 * @returns {string}
 */
function generateDeterministicConsultativeFallback(userMessage, leadData = {}) {
    const name = leadData.name ? leadData.name.split(' ')[0] : 'Estimado(a)';
    const tipo = leadData.tipo || 'tu proyecto';
    const area = leadData.areaNum ? `${leadData.areaNum} m²` : '';
    const comuna = leadData.comunaHuman ? ` en ${leadData.comunaHuman.split(',')[0].trim()}` : '';
    const sistema = leadData.sistema ? ` con ${leadData.sistema}` : '';

    const calLink = 'https://cal.com/cuatropuntas.com/visita-tecnica';
    const msgLower = (userMessage || '').toLowerCase();

    let technicalAdvice = 'Para garantizar la estabilidad y durabilidad de la obra, todo proyecto habitacional se diseña considerando mecánica de suelo, cálculo estructural de fundaciones y cumplimiento térmico según la OGUC.';

    if (msgLower.includes('radier') || msgLower.includes('pendiente') || msgLower.includes('suelo') || msgLower.includes('fundaci')) {
        technicalAdvice = 'En terrenos con pendiente o desniveles en la RM, la solución óptima suele combinar fundaciones escalonadas de hormigón armado o muretes de contención con radier afinado e impermeabilizado, garantizando drenaje de aguas lluvia y nivelación perfecta.';
    } else if (msgLower.includes('peso') || msgLower.includes('segundo piso') || msgLower.includes('losa') || msgLower.includes('estructura')) {
        technicalAdvice = 'Para segundos pisos y ampliaciones, privilegiamos sistemas ultralivianos en Metalcom estructural o Panel SIP, verificando previamente la capacidad de carga de los muros y cadenas del primer piso para evitar sobrecargas innecesarias.';
    } else if (msgLower.includes('quincho') || msgLower.includes('terraza')) {
        technicalAdvice = 'En quinchos y terrazas, la estructura base contempla techumbre con pendiente de evacuación, radier afinado y asador en obra revestido con ladrillos refractarios, dimensionando los tiros de campana para un tiraje óptimo de humos.';
    }

    const response = `Hola *${name}*, qué gusto saludarte respecto a tu cotización para *${tipo}*${area ? ` (${area})` : ''}${comuna}.

${technicalAdvice}

Cada terreno y propiedad tiene condiciones particulares de cota y resistencia. Para dimensionar con exactitud el trazado, niveles y partidas requeridas con presupuesto a suma alzada cerrado, te invito a agendar la *Evaluación Técnica de Factibilidad en Terreno*:
👉 ${calLink}

Con esa visita presencial, nuestro equipo técnico levanta los antecedentes exactos para tu propuesta definitiva.`;

    return formatWhatsAppMarkdown(response);
}

/**
 * Genera la respuesta del Agente Asesor Consultivo para el cliente
 * @param {string} userMessage
 * @param {Object} leadData
 * @returns {Promise<string>}
 */
async function generateConsultativeReply(userMessage, leadData = {}) {
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Fallback determinista si no hay clave de API
    if (!apiKey) {
        return generateDeterministicConsultativeFallback(userMessage, leadData);
    }

    const name = leadData.name || 'Cliente';
    const firstName = name.split(' ')[0];
    const tipo = leadData.tipo || 'Obra Habitacional';
    const area = leadData.areaNum ? `${leadData.areaNum} m²` : 'Superficie a definir';
    const comuna = leadData.comunaHuman || 'Región Metropolitana';
    const sistema = leadData.sistema || 'Metalcom Estructural / Mixto';
    const minUF = leadData.minUF || '';
    const maxUF = leadData.maxUF || '';

    const calLink = 'https://cal.com/cuatropuntas.com/visita-tecnica';

    const systemPrompt = `
Eres el *Ingeniero Civil / Arquitecto Asesor Consultivo* de Constructora Cuatropuntas SpA en Santiago de Chile. Estás respondiendo por WhatsApp a un cliente calificado que ya cotizó en nuestra web.

### ANTECEDENTES DEL PROYECTO DEL CLIENTE:
- Nombre: ${name} (dirígete a él como ${firstName})
- Proyecto cotizado: ${tipo} (${area})
- Ubicación: ${comuna}
- Sistema constructivo elegido: ${sistema}
${minUF && maxUF ? `- Rango referencial estimado: ${minUF} a ${maxUF} UF` : ''}

### TU ROL Y TONO:
1. *Tono*: Técnico, sereno, fundamentado, empático y de alto estándar ingenieril.
2. *Criterio Constructivo Chileno*:
   - Habla con solvencia sobre radieres, fundaciones corridas o escalonadas, poyos, contención en pendientes, aislación térmica según OGUC Zona 3 (techumbre U <= 0.38), sellos de humedad y expedientes para la DOM.
   - Enfatiza el valor del *Contrato a Suma Alzada* con itemizado cerrado (cero costos imprevistos) y respaldo legal conforme al *Art. 18 de la LGUC*.
   - Si es Quincho: recuerda que el alcance base contempla techumbre, radier afinado y parrilla refractaria en obra; empalmes sanitarios y muebles cerrados se cubican en terreno.
   - Si son Baños/Cocinas: son recintos técnicos de tarifa cerrada (65-95 UF baño, 90-160 UF cocina).
3. *Cierre Consultivo Obligatorio*:
   - Las consultas técnicas de suelo, niveles, muros existentes o factibilidad no se resuelven a ciegas en un chat. 
   - Invita siempre de forma natural y profesional al *Diagnóstico Técnico de Factibilidad en Terreno* con el enlace exacto: ${calLink}

### REGLAS DE FORMATO WHATSAPP:
- Usa *solo un asterisco* para aplicar negrita (*ejemplo*).
- Prohibido terminantemente usar dobles asteriscos (**ejemplo**).
- No uses etiquetas HTML.
- Respuestas directas, profesionales y de 3 a 5 párrafos concisos.
`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent(userMessage);
        const response = await result.response;
        const text = response.text();
        return formatWhatsAppMarkdown(text);
    } catch (err) {
        console.warn('⚠️ Error invocando Gemini AI en agent-consultor, activando fallback:', err.message);
        return generateDeterministicConsultativeFallback(userMessage, leadData);
    }
}

module.exports = {
    generateConsultativeReply,
    formatWhatsAppMarkdown,
    generateDeterministicConsultativeFallback
};
