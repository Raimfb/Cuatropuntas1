/**
 * lib/agent-observability.js
 *
 * Capa 8: Logging estructurado JSON y buffer de trazas para observabilidad y Evals.
 */

const MAX_EVENT_BUFFER = 200;
const eventBuffer = [];

/**
 * Enmascara parcialmente identificadores sensibles (teléfono) en logs públicos.
 * @param {string} phoneOrId
 * @returns {string}
 */
function maskIdentifier(phoneOrId) {
    const raw = String(phoneOrId || 'anon');
    if (raw.length <= 4) return raw;
    return `${raw.slice(0, 4)}***${raw.slice(-3)}`;
}

/**
 * Registra un evento estructurado de turno conversacional en buffer y stdout JSON.
 * @param {Object} event
 * @returns {Object}
 */
function logAgentEvent(event = {}) {
    const entry = {
        service: 'cuatropuntas-concierge',
        timestamp: new Date().toISOString(),
        channel: event.channel || 'unknown',
        phoneOrId: maskIdentifier(event.phoneOrId),
        intent: event.intent || 'UNKNOWN',
        leadState: event.leadState || 'NEW',
        hasQuoted: Boolean(event.hasQuoted),
        latencyMs: Number.isFinite(event.latencyMs) ? Math.max(0, Math.round(event.latencyMs)) : 0,
        cacheHit: Boolean(event.cacheHit),
        ragArticlesUsed: Number(event.ragArticlesUsed || 0),
        parametricQuoteUsed: Boolean(event.parametricQuoteUsed),
        guardrailTriggered: Array.isArray(event.guardrailTriggered) ? event.guardrailTriggered : [],
        fallbackUsed: Boolean(event.fallbackUsed),
        model: event.model || null
    };

    eventBuffer.push(entry);
    if (eventBuffer.length > MAX_EVENT_BUFFER) {
        eventBuffer.shift();
    }

    if (process.env.SILENCE_AGENT_LOGS !== '1') {
        console.log(JSON.stringify(entry));
    }

    return entry;
}

/**
 * Retorna copia del buffer de eventos registrados.
 * @returns {Array<Object>}
 */
function getAgentEvents() {
    return [...eventBuffer];
}

/**
 * Limpia el buffer de eventos (utilizado en pruebas aisladas).
 */
function clearAgentEvents() {
    eventBuffer.length = 0;
}

module.exports = {
    logAgentEvent,
    getAgentEvents,
    clearAgentEvents
};
