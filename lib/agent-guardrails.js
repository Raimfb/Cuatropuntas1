/**
 * lib/agent-guardrails.js
 *
 * Capa 5 (Guardrails de Entrada/Salida) y Capa 6 (Caché LRU + Memoización de Modelo).
 * - Validación de longitud, rate-limiting y detección anti-prompt-injection.
 * - Sanitización post-generación contra fugas territoriales, promesas DOM prohibidas,
 *   teléfonos obsoletos o no autorizados y formato estricto WhatsApp (* simple).
 * - Caché LRU en memoria (TTL 30 min) y resolución memoizada de modelo Gemini sin fetch por turno.
 */

const GRACEFUL_PIVOT_REPLY = "Para revisar en detalle lo que conversaste o recibiste por correo y aplicar las condiciones exactas a tu proyecto, te invito a generar tu presupuesto preliminar en nuestro cotizador: https://www.cuatropuntas.com/#cotizador. Con esos datos, nuestro equipo técnico y de ventas toma tu requerimiento de inmediato para coordinar la visita a terreno.";

const MAX_INPUT_LENGTH = 800;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 25;
const CACHE_MAX_ENTRIES = 100;
const CACHE_TTL_MS = 30 * 60 * 1000;
const MODEL_CACHE_TTL_MS = 60 * 60 * 1000;

const rateLimitStore = new Map();
const replyCache = new Map();

let memoizedModel = {
    name: null,
    expiresAt: 0
};

const PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i,
    /ignora\s+(?:todas\s+)?(?:las|tus)\s+instrucciones/i,
    /olvida\s+(?:todas\s+)?tus\s+reglas/i,
    /(?:system\s+prompt|developer\s+prompt|prompt\s+del\s+sistema|instrucciones\s+internas)/i,
    /(?:reveal|muestra|dime|imprime)\s+(?:your|tu|el)\s+prompt/i,
    /(?:dime|revela|muestra|cu[aá]les\s+son)\s+(?:los\s+)?(?:5\s+)?anillos|factor(?:es)?\s+(?:de\s+cada\s+comuna|territorial(?:es)?)/i,
    /\bjailbreak\b|\bDAN\b|modo\s+desarrollador/i
];

const TERRITORIAL_LEAK_REGEX = /(?:5\s*)?anillos?\s*log[ií]sticos?(?:\s*rm)?|anillo\s*[1-5]|5\s*anillos|base\s*anillo|cord[oó]n\s*lejano|(?:\+|x1\.)(?:22|18|02)%?/gi;

/**
 * Formatea negritas para WhatsApp usando estrictamente un solo asterisco (*texto*).
 * @param {string} text
 * @returns {string}
 */
function formatWhatsAppMarkdown(text) {
    if (!text) return '';
    let cleaned = String(text);

    cleaned = cleaned.replace(/\*{2,}/g, '*');

    const lines = cleaned.split('\n');
    const fixedLines = lines.map((line) => {
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
 * Valida y sanitiza el mensaje entrante antes de invocar router o LLM.
 * @param {string} rawText
 * @param {string} clientId
 * @returns {{ allowed: boolean, sanitizedText?: string, reason?: string, statusCode?: number, safeFallbackReply?: string }}
 */
function validateAgentInput(rawText, clientId = 'anon') {
    if (typeof rawText !== 'string') {
        return {
            allowed: false,
            reason: 'INVALID_INPUT_TYPE',
            statusCode: 400
        };
    }

    const cleaned = rawText
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) {
        return {
            allowed: false,
            reason: 'EMPTY_INPUT',
            statusCode: 400
        };
    }

    const sanitizedText = cleaned.slice(0, MAX_INPUT_LENGTH);

    // Rate limiting por ventana móvil de 60s
    const key = String(clientId || 'anon');
    const now = Date.now();
    const recent = (rateLimitStore.get(key) || []).filter((ts) => (now - ts) < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
        rateLimitStore.set(key, recent);
        return {
            allowed: false,
            reason: 'RATE_LIMIT_EXCEEDED',
            statusCode: 429,
            safeFallbackReply: 'Hemos recibido varias consultas seguidas. Para darte atención inmediata sin esperas, genera tu presupuesto preliminar en nuestro cotizador oficial: https://www.cuatropuntas.com/#cotizador'
        };
    }
    recent.push(now);
    rateLimitStore.set(key, recent);

    // Detección anti-prompt-injection y extracción de reglas internas
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
        if (pattern.test(sanitizedText)) {
            return {
                allowed: false,
                reason: 'PROMPT_INJECTION_BLOCKED',
                statusCode: 200,
                safeFallbackReply: GRACEFUL_PIVOT_REPLY
            };
        }
    }

    return {
        allowed: true,
        sanitizedText
    };
}

/**
 * Audita y sanitiza la respuesta antes de entregarla al cliente.
 * @param {string} replyText
 * @param {{ channel?: 'whatsapp'|'web', allowDirectorPhone?: boolean }} options
 * @returns {{ text: string, triggered: Array<string> }}
 */
function inspectOutputGuardrails(replyText, options = {}) {
    const channel = options.channel || 'whatsapp';
    const allowDirectorPhone = Boolean(options.allowDirectorPhone);
    const triggered = [];

    let text = String(replyText || '');

    if (/6348[\s-]?2439/.test(text)) {
        triggered.push('PURGED_PHONE_REDACTED');
        text = text.replace(/(?:\+?56\s*9\s*)?6348[\s-]?2439/g, '+56 9 2738 4075');
    }

    if (!allowDirectorPhone && /7909[\s-]?2027/.test(text)) {
        triggered.push('DIRECTOR_PHONE_REDACTED');
        text = text.replace(/(?:\+?56\s*9\s*)?7909[\s-]?2027/g, '+56 9 2738 4075');
    }

    if (TERRITORIAL_LEAK_REGEX.test(text)) {
        triggered.push('TERRITORIAL_LEAK_REDACTED');
        TERRITORIAL_LEAK_REGEX.lastIndex = 0;
        text = text.replace(TERRITORIAL_LEAK_REGEX, 'condiciones de terreno, valor de suelo y ubicación en la RM');
    }

    if (/aprobaci[oó]n\s+(?:municipal\s+)?garantizada|garantizamos\s+(?:la\s+)?aprobaci[oó]n/i.test(text)) {
        triggered.push('DOM_PROMISE_BLOCKED');
        text = text
            .replace(/aprobaci[oó]n\s+(?:municipal\s+)?garantizada/gi, 'gestión técnica conforme a normativa DOM')
            .replace(/garantizamos\s+(?:la\s+)?aprobaci[oó]n/gi, 'gestionamos el expediente conforme a normativa DOM');
    }

    if (/sin\s+interrumpir\s+la\s+habitabilidad/i.test(text)) {
        triggered.push('HABITABILITY_OVERPROMISE_BLOCKED');
        text = text.replace(/sin\s+interrumpir\s+la\s+habitabilidad/gi, 'planificado para minimizar el impacto en tu rutina diaria');
    }

    if (channel === 'whatsapp') {
        if (/<a\s+[^>]*href=/i.test(text)) {
            triggered.push('HTML_STRIPPED_FOR_WHATSAPP');
            text = text.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)');
        }
        if (/\*{2,}/.test(text)) {
            triggered.push('DOUBLE_ASTERISK_NORMALIZED');
        }
        text = formatWhatsAppMarkdown(text);
    }

    return { text, triggered };
}

/**
 * Versión directa que retorna únicamente el texto sanitizado.
 * @param {string} replyText
 * @param {{ channel?: 'whatsapp'|'web', allowDirectorPhone?: boolean }} options
 * @returns {string}
 */
function enforceOutputGuardrails(replyText, options = {}) {
    return inspectOutputGuardrails(replyText, options).text;
}

/**
 * Resuelve y memoiza el modelo Gemini sin disparar fetch a /v1beta/models por cada mensaje.
 * @returns {string}
 */
function resolveGeminiModelName() {
    const now = Date.now();
    if (memoizedModel.name && now < memoizedModel.expiresAt) {
        return memoizedModel.name;
    }
    const configured = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim().replace(/^models\//, '');
    memoizedModel = {
        name: configured,
        expiresAt: now + MODEL_CACHE_TTL_MS
    };
    return memoizedModel.name;
}

/**
 * Normaliza la clave del caché LRU de respuestas frecuentes.
 */
function buildCacheKey(channel, scopeKey, text) {
    const normalized = String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return `${channel || 'web'}:${scopeKey || 'default'}:${normalized}`;
}

/**
 * Consulta la caché LRU en memoria (TTL 30 min).
 * @param {string} channel
 * @param {string} scopeKey
 * @param {string} text
 * @returns {string|null}
 */
function getCachedReply(channel, scopeKey, text) {
    const key = buildCacheKey(channel, scopeKey, text);
    const entry = replyCache.get(key);
    if (!entry) return null;

    if ((Date.now() - entry.createdAt) > CACHE_TTL_MS) {
        replyCache.delete(key);
        return null;
    }

    // Refrescar orden LRU
    replyCache.delete(key);
    replyCache.set(key, entry);
    return entry.reply;
}

/**
 * Almacena una respuesta en la caché LRU en memoria.
 * @param {string} channel
 * @param {string} scopeKey
 * @param {string} text
 * @param {string} reply
 */
function setCachedReply(channel, scopeKey, text, reply) {
    if (!reply || !text) return;
    const key = buildCacheKey(channel, scopeKey, text);
    if (replyCache.has(key)) {
        replyCache.delete(key);
    } else if (replyCache.size >= CACHE_MAX_ENTRIES) {
        const oldestKey = replyCache.keys().next().value;
        if (oldestKey !== undefined) {
            replyCache.delete(oldestKey);
        }
    }
    replyCache.set(key, {
        reply,
        createdAt: Date.now()
    });
}

/**
 * Reinicia cachés y rate-limit en memoria (para pruebas aisladas).
 */
function resetGuardrailsState() {
    rateLimitStore.clear();
    replyCache.clear();
    memoizedModel = { name: null, expiresAt: 0 };
}

module.exports = {
    GRACEFUL_PIVOT_REPLY,
    MAX_INPUT_LENGTH,
    RATE_LIMIT_MAX_REQUESTS,
    CACHE_TTL_MS,
    formatWhatsAppMarkdown,
    validateAgentInput,
    inspectOutputGuardrails,
    enforceOutputGuardrails,
    resolveGeminiModelName,
    getCachedReply,
    setCachedReply,
    resetGuardrailsState
};
