/**
 * lib/agent-consultor.js
 * 
 * Agente Asesor Consultivo de Ingeniería y Arquitectura para Constructora Cuatropuntas SpA.
 * Integra la API de Gemini con fallback determinista de alta fidelidad.
 * Rol: Ingeniero Civil / Arquitecto con criterio constructivo chileno y enfoque en habitabilidad.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
    formatWhatsAppMarkdown,
    enforceOutputGuardrails,
    resolveGeminiModelName
} = require("./agent-guardrails");
const { retrieveRelevantContext } = require("./knowledge-retriever");

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
    const sistemaNombre = leadData.sistemaComercial || leadData.sistema || '';
    const sistema = sistemaNombre ? ` con ${sistemaNombre}` : '';

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

    const response = `Hola *${name}*, qué gusto saludarte respecto a tu cotización para *${tipo}*${area ? ` (${area})` : ''}${sistema}${comuna}.

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
 * @param {Object} options
 * @returns {Promise<string>}
 */
async function generateConsultativeReply(userMessage, leadData = {}, options = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    const allowDirectorPhone = leadData?.estado === 'VISITA_AGENDADA';

    // 1. Fallback determinista si no hay clave de API
    if (!apiKey) {
        const deterministic = generateDeterministicConsultativeFallback(userMessage, leadData);
        return enforceOutputGuardrails(deterministic, { channel: 'whatsapp', allowDirectorPhone });
    }

    const name = leadData.name || 'Cliente';
    const firstName = name.split(' ')[0];
    const tipo = leadData.tipo || 'Obra Habitacional';
    const area = leadData.areaNum ? `${leadData.areaNum} m²` : 'Superficie a definir';
    const comuna = leadData.comunaHuman || 'Región Metropolitana';
    const sistema = leadData.sistemaComercial || leadData.sistema || 'Metalcom Estructural / Mixto';
    const minUF = leadData.minUF || '';
    const maxUF = leadData.maxUF || '';

    const calLink = 'https://cal.com/cuatropuntas.com/visita-tecnica';
    const ragContext = options.ragContext || retrieveRelevantContext(userMessage);
    const historyTurns = Array.isArray(leadData.conversationHistory) ? leadData.conversationHistory.slice(-4) : [];
    const historyBlock = historyTurns.length > 0
        ? `\n### HISTORIAL RECIENTE:\n${historyTurns.map(t => `- ${t.role}: ${t.text}`).join('\n')}`
        : '';
    const ragBlock = ragContext && ragContext.promptContext
        ? `\n### CONTEXTO TÉCNICO Y GUÍAS RELACIONADAS:\n${ragContext.promptContext}`
        : '';

    const systemPrompt = `
Eres el *Ingeniero Civil / Arquitecto Asesor Consultivo* de Constructora Cuatropuntas SpA en Santiago de Chile. Estás respondiendo por WhatsApp a un cliente calificado que ya cotizó en nuestra web.

### ANTECEDENTES DEL PROYECTO DEL CLIENTE:
- Nombre: ${name} (dirígete a él como ${firstName})
- Proyecto cotizado: ${leadData.proyectoResumen || `${tipo} (${area})`}
- Ubicación: ${comuna}
- Sistema constructivo elegido: ${sistema}
${minUF && maxUF ? `- Rango referencial estimado: ${minUF} a ${maxUF} UF` : ''}
${historyBlock}
${ragBlock}

### TU ROL Y TONO:
1. *Tono*: Técnico, sereno, fundamentado, empático y de alto estándar ingenieril.
2. *Criterio Constructivo Chileno y Matriz SSOT (Valores Netos +IVA)*:
   - *Tarifas Base Referenciales Netas (+IVA)*: Casas Nuevas (Metalcom desde 19 UF/m², Panel SIP desde 21 UF/m², Albañilería desde 25 UF/m²); Segundos Pisos/Ampliaciones (22 / 24 / 27 UF/m²); Quinchos y Terrazas (12 / 14 / 15 UF/m²); Remodelaciones Integrales >25 m² (11 / 13 UF/m²); Baño Completo (65-95 UF +IVA); Cocina Integral (90-160 UF +IVA).
   - Habla con solvencia sobre radieres, fundaciones corridas o escalonadas, poyos, contención en pendientes, aislación térmica según OGUC Zona 3 (techumbre U <= 0.38), sellos de humedad y expedientes para la DOM.
   - Enfatiza el valor del *Contrato a Suma Alzada* con itemizado cerrado (cero costos imprevistos) y respaldo legal conforme al *Art. 18 de la LGUC*.
   - *Criterios de Estimación de Presupuesto (Netos +IVA)*: Si el cliente consulta por qué varía el valor referencial del presupuesto, explica con prudencia y claridad que los valores son estimativos y se calculan según el tipo de obra, tipo de terreno, valor de suelo y lejanía de la urbe de Santiago (lo cual se revisa personalmente en la visita técnica en terreno), además de los factores de baja escala (<40 m²: +8%) y etapa de arquitectura y gestión DOM (*+8% desde cero / etapa Idea* o -3% con planos en Casa Nueva y Ampliación: cubren el ciclo completo desde el Permiso de Edificación hasta el *Certificado de Recepción Final Definitiva* únicamente sobre obras ejecutadas por Cuatropuntas, excluyendo obras anexas no contratadas como quinchos, piscinas, ampliaciones o paisajismo/exteriores de terceros y preexistencias sin regularizar, con derechos 1,5% MINVU y empalmes aparte al costo real; -6% con permiso aprobado o arquitecto propio aplica solo ejecución con carpeta técnica del constructor). *PROHIBIDO mencionar anillos logísticos, porcentajes territoriales internos o comparaciones entre comunas.*
   - Si es Quincho: recuerda que el cliente cotizó ${sistema}; el alcance base contempla techumbre, radier afinado y parrilla refractaria en obra; empalmes sanitarios y muebles cerrados se cubican en terreno.
   - Si son Baños/Cocinas: son recintos técnicos de tarifa cerrada (65-95 UF +IVA baño, 90-160 UF +IVA cocina).
   - Si consulta por documentación o trámites municipales, puedes compartir nuestras *Guías Técnicas DOM gratuitas en PDF*: https://www.cuatropuntas.com/#guias-dom
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
            model: resolveGeminiModelName(),
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent(userMessage);
        const response = await result.response;
        const text = response.text();
        return enforceOutputGuardrails(text, { channel: 'whatsapp', allowDirectorPhone });
    } catch (err) {
        console.warn('⚠️ Error invocando Gemini AI en agent-consultor, activando fallback:', err.message);
        const deterministic = generateDeterministicConsultativeFallback(userMessage, leadData);
        return enforceOutputGuardrails(deterministic, { channel: 'whatsapp', allowDirectorPhone });
    }
}

module.exports = {
    generateConsultativeReply,
    formatWhatsAppMarkdown,
    generateDeterministicConsultativeFallback
};
