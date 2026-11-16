/**
 * lib/intent-router.js
 *
 * Capa 7: Router Unificado de Intenciones y Orquestador Conversacional (SDR Setter vs Consultor).
 * - Corrige falsos positivos en clasificación de subsidios y consultas generales.
 * - Mantiene a los leads fríos (!hasQuoted) estrictamente en flujo SDR hacia #cotizador o #guias-dom,
 *   evitando derivar prematuramente a Cal.com aunque el lead esté en estado EN_CONVERSACION.
 * - Integra Mini-RAG local (Capa 2), Tool paramétrica segura (Capa 3), Guardrails & Caché (Capas 5-6)
 *   y Observabilidad JSON (Capa 8).
 */

const {
    GRACEFUL_PIVOT_REPLY,
    validateAgentInput,
    inspectOutputGuardrails,
    getCachedReply,
    setCachedReply
} = require('./agent-guardrails');
const {
    retrieveRelevantContext,
    executeParametricQuoteTool,
    GUIAS_PORTAL_URL,
    COTIZADOR_URL
} = require('./knowledge-retriever');
const { logAgentEvent } = require('./agent-observability');

function normalizeForRouting(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * Clasifica la intención del mensaje del usuario de forma determinista y sin falsos positivos.
 * @param {string} userMessage
 * @returns {'RESET_QA'|'GRACEFUL_PIVOT'|'ROUTE_3'|'ROUTE_1'|'FUERA_DE_RM_O_SIN_TERRENO'|'GUIA_DOM_LEAD_MAGNET'|'SALUDO_INICIAL'|'ROUTE_2'}
 */
function classifyIntent(userMessage) {
    const raw = String(userMessage || '').trim();
    const lower = raw.toLowerCase();
    const norm = normalizeForRouting(raw);

    if (!norm) return 'SALUDO_INICIAL';

    // 1. Comando QA / Reset
    if (lower === 'reset' || lower === '#reset') {
        return 'RESET_QA';
    }

    // 2. Graceful Pivot ante correos promocionales o campañas pasadas
    if (
        /(?:recibi|me\s+llego|me\s+enviaron|vi)\s+(?:un\s+)?(?:correo|email|mail)/i.test(norm) ||
        /correo\s+promocional|campana\s+pasada|promocion\s+pasada|descuento\s+(?:que\s+me\s+mandaron|por\s+correo)/i.test(norm)
    ) {
        return 'GRACEFUL_PIVOT';
    }

    // 3. Subsidios: distinguir postulación (ROUTE_3), adjudicado (ROUTE_1) y negación ("no tengo subsidio, particular")
    const isSubsidioKeyword = /\b(subsidio|serviu|minvu|ds1|ds49|libreta|postul)\b/.test(norm);
    const isAskingToApply =
        /(?:como|quiero|ayud\w*|donde|puedo)\s+(?:para\s+)?(?:postular|postulo|ganarme|obtener)\b/.test(norm) ||
        /\bpostulacion\b/.test(norm) ||
        /\bme\s+falta\s+la\s+libreta\b/.test(norm) ||
        /\bcomo\s+postul(?:o|ar)\b/.test(norm) ||
        /\bquiero\s+postular\b/.test(norm) ||
        /\bganarme\s+un\s+subsidio\b/.test(norm) ||
        /\bobtener\s+(?:un\s+)?subsidio\b/.test(norm);

    if (isAskingToApply && (isSubsidioKeyword || /\bcomo\s+postul(?:o|ar)\b/.test(norm))) {
        return 'ROUTE_3';
    }

    const deniesSubsidio =
        /\bno\s+tengo\s+subsidio\b/.test(norm) ||
        /\bsin\s+subsidio\b/.test(norm) ||
        /\bno\s+cuento\s+con\s+subsidio\b/.test(norm) ||
        /\bno\s+postulo\b/.test(norm);

    const hasAdjudicatedKeywords =
        !deniesSubsidio &&
        !isAskingToApply &&
        (/\b(subsidio|ds1|ds49)\b/.test(norm) ||
            /\b(subsidio\s+adjudicado|tengo\s+subsidio|me\s+gane\s+el\s+subsidio|gane\s+(?:un\s+)?subsidio)\b/.test(norm));

    if (hasAdjudicatedKeywords) {
        return 'ROUTE_1';
    }

    // 4. Descarte por ubicación fuera de RM o ausencia de terreno
    const isOutsideRM = /\b(valparaiso|vina\s+del\s+mar|concon|concepcion|temuco|antofagasta|la\s+serena|coquimbo|rancagua|machali|talca|curico|linares|puerto\s+montt|puerto\s+varas|osorno|chillan|iquique|arica|valdivia|chiloe|castro|quinta\s+region|octava\s+region|sexta\s+region|septima\s+region|fuera\s+de\s+santiago|fuera\s+de\s+la\s+rm|otra\s+region)\b/.test(norm);
    const hasNoLand = /\bno\s+tengo\s+terreno\b|\bsin\s+terreno\b|\baun\s+no\s+(?:compro|tengo)\s+(?:el\s+)?terreno\b|\bbusco\s+terreno\b|\btodavia\s+no\s+tengo\s+sitio\b/.test(norm);

    if (isOutsideRM || hasNoLand) {
        return 'FUERA_DE_RM_O_SIN_TERRENO';
    }

    // 5. Lead Magnets / Guías DOM
    const asksForGuideOrDomDocs =
        (/\b(guia|checklist|requisitos|papeles|documentos|descargar|pdf|tramite|regulariz)\b/.test(norm) &&
            /\b(dom|permiso|edificacion|recepcion|municipal|carpeta)\b/.test(norm)) ||
        /\bguias-dom\b/.test(norm) ||
        /\bguia\s+pdf\b/.test(norm);

    if (asksForGuideOrDomDocs) {
        return 'GUIA_DOM_LEAD_MAGNET';
    }

    // 6. Saludo inicial puro (sin mención de proyecto)
    const hasProjectSignal = /\b(casa|piso|ampli|remodel|quincho|bano|cocina|m2|metros|precio|valor|uf|cotiz|metalcom|sip|albanileria|construir)\b/.test(norm);
    if (!hasProjectSignal && (/^(?:hola|buenas(?:\s+tardes|\s+noches|\s+dias)?|buenos\s+dias|que\s+tal|saludos)[!.,\\\s]*$/i.test(norm) || norm === 'hola\\')) {
        return 'SALUDO_INICIAL';
    }

    // 7. Proyecto Particular / Consulta General de Construcción
    return 'ROUTE_2';
}

/**
 * Construye respuesta SDR determinista (3 pasos) enriquecida con RAG y cálculo paramétrico.
 */
function buildDeterministicSdrReply({
    intent,
    userText,
    firstName = '',
    profileName = '',
    from = '',
    channel = 'whatsapp',
    ragContext = null,
    quoteResult = null
}) {
    const greetingName = firstName ? `, ${firstName}` : '';
    const nameQuery = profileName && from
        ? `?name=${encodeURIComponent(profileName)}&phone=${encodeURIComponent(from)}`
        : (from ? `?phone=${encodeURIComponent(from)}` : '');
    const subsidioLink = `https://www.cuatropuntas.com/subsidio-minvu-sitio-propio${nameQuery}`;

    if (intent === 'GRACEFUL_PIVOT') {
        return GRACEFUL_PIVOT_REPLY;
    }

    if (intent === 'ROUTE_3') {
        return `Comprendo${greetingName}. En Constructora Cuatropuntas *no gestionamos postulaciones iniciales al Serviu* ni actuamos como entidad patrocinante; ejecutamos obras habitacionales con subsidio DS1 o DS49 *ya adjudicado* y terreno propio en la Región Metropolitana.\n\nTe recomendamos revisar las fechas y requisitos vigentes en el portal oficial del MINVU. Si más adelante ya cuentas con tu certificado adjudicado, puedes evaluar tu proyecto aquí: ${COTIZADOR_URL}`;
    }

    if (intent === 'ROUTE_1') {
        return `¡Excelente${greetingName}! En Cuatropuntas ejecutamos proyectos de *Construcción en Sitio Propio (DS1 y DS49)* para beneficiarios con subsidio ya adjudicado y terreno propio inscrito en la Región Metropolitana.\n\nPara revisar la viabilidad técnica según tu tramo y características del terreno, completa tus antecedentes en nuestro portal oficial: ${subsidioLink} o en el cotizador: ${COTIZADOR_URL}`;
    }

    if (intent === 'FUERA_DE_RM_O_SIN_TERRENO') {
        return `Gracias por escribirnos${greetingName}. Actualmente nuestra operación constructiva se concentra exclusivamente en la *Región Metropolitana de Santiago* para propietarios que ya cuentan con terreno o vivienda habilitada para intervenir.\n\nCuando dispongas de tu propiedad o terreno definido en la RM, podrás dimensionar tu presupuesto preliminar por m² y comuna directamente en nuestro cotizador oficial: ${COTIZADOR_URL}`;
    }

    if (intent === 'GUIA_DOM_LEAD_MAGNET') {
        const extraArticle = ragContext?.articles?.[0]
            ? `\n\nTambién te puede servir nuestra guía técnica: ${ragContext.articles[0].title} (${ragContext.articles[0].url})`
            : '';
        return `Hola${greetingName}. En Cuatropuntas disponemos de nuestras *Guías Técnicas DOM gratuitas en PDF* (Guía Práctica del Permiso de Edificación en la RM y Checklist de Recepción Final Definitiva), donde detallamos documentos, plazos y errores habituales ante la municipalidad.\n\nDescárgalas directamente aquí: ${GUIAS_PORTAL_URL}\nY cuando quieras dimensionar los costos de diseño, cálculo, gestión DOM completa hasta Recepción Final Definitiva y obra a suma alzada, usa nuestro cotizador oficial: ${COTIZADOR_URL}${extraArticle}`;
    }

    if (intent === 'SALUDO_INICIAL') {
        const hello = firstName ? `¡Hola ${firstName}!` : '¡Hola!';
        return `${hello} Bienvenido(a) a *Constructora Cuatropuntas* en la Región Metropolitana. Construimos casas nuevas llave en mano (desde 19 UF/m² +IVA), segundos pisos y ampliaciones (desde 22 UF/m² +IVA), quinchos (desde 12 UF/m² +IVA) y remodelaciones integrales.\n\nPara entregarte una estimación acorde a los m², comuna de la RM y etapa de planos/DOM de tu proyecto, genera tu presupuesto preliminar en nuestro cotizador web oficial:\n${COTIZADOR_URL}`;
    }

    // ROUTE_2: Proyecto Particular / Cotización con cálculo paramétrico opcional
    let paso1 = 'Trabajamos proyectos llave en mano bajo *contrato a suma alzada* (valores netos +IVA): Casas Nuevas desde 19 UF/m², Segundos Pisos/Ampliaciones desde 22 UF/m², Quinchos desde 12 UF/m² y Remodelaciones desde 11 UF/m² (baños 65-95 UF y cocinas 90-160 UF).';
    if (quoteResult && quoteResult.calculated) {
        paso1 = `Para una referencia preliminar de *${quoteResult.proyectoResumen}* en *${quoteResult.comunaHuman}*, el rango estimado parte entre *${quoteResult.minUF} y ${quoteResult.maxUF} UF netos (+IVA)*. ${quoteResult.notaTerritorial}`;
    } else if (/bano|baño|cocina/i.test(userText)) {
        paso1 = 'Los baños completos (65 a 95 UF +IVA) y cocinas integrales (90 a 160 UF +IVA) no se cotizan por m² lineal debido a la alta densidad de redes sanitarias, impermeabilización y terminaciones técnicas.';
    } else if (/quincho|terraza/i.test(userText)) {
        paso1 = 'Nuestros quinchos y terrazas parten desde 12 UF/m² +IVA (Metalcom) y 15 UF/m² +IVA (Albañilería), incluyendo techumbre, radier afinado, parrilla refractaria con manivela, campana y mesón base (redes sanitarias, eléctricas y muebles cerrados se cubican en terreno).';
    }

    const paso2 = 'El valor definitivo a suma alzada requiere dimensionar con precisión los metros cuadrados, sistema constructivo, condiciones del suelo/terreno, sector de la RM y el estado de planimetría/DOM.';
    const paso3 = `Ingresa tus datos en nuestro cotizador web oficial para recibir tu Ficha Técnica en PDF al instante: ${COTIZADOR_URL}`;

    const articleHint = ragContext?.articles?.[0]
        ? `\n\nRecurso técnico relacionado: ${ragContext.articles[0].url}`
        : '';

    const raw = `${paso1}\n\n${paso2}\n\n${paso3}${articleHint}`;
    return channel === 'web'
        ? raw.replace(/\*([^*]+)\*/g, '**$1**')
        : raw;
}

/**
 * Orquestador completo (Router + RAG + Tool + Caché + LLM + Guardrails + Observabilidad).
 */
async function routeAndGenerateReply({
    channel = 'whatsapp',
    userText = '',
    from = 'anon',
    profileName = '',
    firstName = '',
    leadData = null,
    generateLLM = null
} = {}) {
    const startMs = Date.now();
    const validation = validateAgentInput(userText, from);

    if (!validation.allowed) {
        logAgentEvent({
            channel,
            phoneOrId: from,
            intent: validation.reason,
            leadState: leadData?.estado || 'NEW',
            hasQuoted: Boolean(leadData?.hasQuoted),
            latencyMs: Date.now() - startMs,
            guardrailTriggered: [validation.reason],
            fallbackUsed: true
        });
        return {
            reply: validation.safeFallbackReply || GRACEFUL_PIVOT_REPLY,
            intent: validation.reason,
            blocked: true,
            statusCode: validation.statusCode || 200,
            hasQuoted: Boolean(leadData?.hasQuoted)
        };
    }

    const cleanInput = validation.sanitizedText;
    const intent = classifyIntent(cleanInput);
    const hasQuoted = Boolean(
        leadData && (
            leadData.hasQuoted === true ||
            (leadData.areaNum && Number(leadData.areaNum) > 0) ||
            leadData.minUF ||
            leadData.estado === 'COTIZADO'
        )
    );

    const ragContext = retrieveRelevantContext(cleanInput);
    const quoteResult = (!hasQuoted && (intent === 'ROUTE_2' || intent === 'GUIA_DOM_LEAD_MAGNET'))
        ? executeParametricQuoteTool(cleanInput)
        : { calculated: false };

    let rawReply = '';
    let cacheHit = false;
    let fallbackUsed = false;
    let modelUsed = null;

    // 1. Lead ya cotizado -> Agente Consultor Post-Cotización (cierre Cal.com)
    if (hasQuoted && intent !== 'GRACEFUL_PIVOT' && intent !== 'RESET_QA') {
        const agentConsultor = require('./agent-consultor');
        rawReply = await agentConsultor.generateConsultativeReply(cleanInput, leadData, { ragContext });
        modelUsed = 'agent-consultor';
    } else if (intent === 'GRACEFUL_PIVOT' || intent === 'ROUTE_3' || intent === 'FUERA_DE_RM_O_SIN_TERRENO') {
        // 2. Rutas deterministas de estricto cumplimiento comercial (cero riesgo de alucinación)
        rawReply = buildDeterministicSdrReply({
            intent,
            userText: cleanInput,
            firstName,
            profileName,
            from,
            channel,
            ragContext,
            quoteResult
        });
        fallbackUsed = true;
    } else {
        // 3. Lead frío / Web Chat SDR: revisar caché LRU cuando no depende de personalización o cálculo específico
        const canUseCache = !firstName && !quoteResult.calculated && (!leadData || !leadData.conversationHistory?.length);
        const cached = canUseCache ? getCachedReply(channel, intent, cleanInput) : null;

        if (cached) {
            rawReply = cached;
            cacheHit = true;
        } else if (typeof generateLLM === 'function') {
            try {
                const llmRes = await generateLLM({
                    userText: cleanInput,
                    intent,
                    ragContext,
                    quoteResult,
                    leadData
                });
                if (llmRes && typeof llmRes === 'object') {
                    rawReply = llmRes.text || '';
                    modelUsed = llmRes.model || null;
                } else {
                    rawReply = String(llmRes || '');
                }
            } catch (err) {
                console.warn(`⚠️ [INTENT ROUTER] Falló LLM en canal ${channel}, activando SDR determinista:`, err.message);
            }
        }

        if (!rawReply) {
            rawReply = buildDeterministicSdrReply({
                intent,
                userText: cleanInput,
                firstName,
                profileName,
                from,
                channel,
                ragContext,
                quoteResult
            });
            fallbackUsed = true;
        } else if (canUseCache) {
            setCachedReply(channel, intent, cleanInput, rawReply);
        }
    }

    const guarded = inspectOutputGuardrails(rawReply, {
        channel,
        allowDirectorPhone: leadData?.estado === 'VISITA_AGENDADA'
    });

    logAgentEvent({
        channel,
        phoneOrId: from,
        intent,
        leadState: leadData?.estado || 'NEW',
        hasQuoted,
        latencyMs: Date.now() - startMs,
        cacheHit,
        ragArticlesUsed: ragContext.articles.length,
        parametricQuoteUsed: Boolean(quoteResult.calculated),
        guardrailTriggered: guarded.triggered,
        fallbackUsed,
        model: modelUsed
    });

    return {
        reply: guarded.text,
        intent,
        blocked: false,
        statusCode: 200,
        hasQuoted,
        cacheHit,
        ragContext,
        quoteResult,
        guardrailTriggered: guarded.triggered
    };
}

module.exports = {
    classifyIntent,
    buildDeterministicSdrReply,
    routeAndGenerateReply,
    normalizeForRouting
};
