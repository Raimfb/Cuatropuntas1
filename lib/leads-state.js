/**
 * lib/leads-state.js
 * 
 * Máquina de Estados y Almacén de Persistencia para Leads de Cuatropuntas SpA.
 * Ciclo de estados determinista: COTIZADO ➔ EN_CONVERSACION ➔ VISITA_AGENDADA
 * 
 * Soporta almacenamiento en memoria (Map) para tests y ejecución local,
 * con TTL de 14 días y sincronización REST asíncrona hacia Vercel KV / Upstash Redis si las variables de entorno están presentes.
 */

const stateStore = new Map();
const TTL_14_DAYS_MS = 14 * 24 * 60 * 60 * 1000; // 14 días de inactividad
const TTL_14_DAYS_SEC = Math.floor(TTL_14_DAYS_MS / 1000);
const MAX_CONVERSATION_TURNS = 6;

/**
 * Obtiene credenciales KV / Upstash Redis si están configuradas
 * @returns {{ kvUrl: string, kvToken: string } | null}
 */
function getKvCredentials() {
    const rawUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const rawToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!rawUrl || !rawToken) return null;
    return {
        kvUrl: String(rawUrl).replace(/\/+$/, ''),
        kvToken: String(rawToken).trim()
    };
}

/**
 * Normaliza números telefónicos chilenos al estándar E.164 (569XXXXXXXX)
 * @param {string} rawPhone
 * @returns {string}
 */
function normalizePhone(rawPhone) {
    if (!rawPhone) return '';
    const digits = String(rawPhone).replace(/\D/g, '');
    if (digits.startsWith('569') && digits.length === 11) {
        return digits;
    }
    if (digits.startsWith('9') && digits.length === 9) {
        return `56${digits}`;
    }
    if (digits.startsWith('56') && digits.length === 11) {
        return digits;
    }
    return digits;
}

/**
 * Comprueba si un lead ha superado el tiempo máximo de vida (14 días sin actividad)
 * @param {Object} lead
 * @returns {boolean}
 */
function isLeadExpired(lead) {
    if (!lead || !lead.updatedAt) return false;
    return (Date.now() - lead.updatedAt) > TTL_14_DAYS_MS;
}

/**
 * Sincronización asíncrona con KV / Redis si está configurado en producción (con TTL 14 días)
 * @param {string} key
 * @param {Object} value
 * @returns {Promise<boolean>}
 */
async function syncRemoteKv(key, value) {
    const creds = getKvCredentials();
    if (!creds || !key) return false;

    try {
        const resp = await fetch(`${creds.kvUrl}/set/lead:${key}?EX=${TTL_14_DAYS_SEC}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${creds.kvToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(value)
        });
        if (!resp.ok) {
            console.warn(`⚠️ [KV SYNC WARNING] HTTP ${resp.status} al persistir en Redis remoto.`);
            return false;
        }
        return true;
    } catch (err) {
        console.warn('⚠️ [KV SYNC WARNING] No se pudo persistir en Redis remoto:', err.message);
        return false;
    }
}

/**
 * Lectura remota desde KV / Upstash Redis
 * @param {string} key
 * @returns {Promise<Object|null>}
 */
async function fetchRemoteKv(key) {
    const creds = getKvCredentials();
    if (!creds || !key) return null;

    try {
        const resp = await fetch(`${creds.kvUrl}/get/lead:${key}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${creds.kvToken}`
            }
        });
        if (!resp.ok) return null;

        const data = await resp.json();
        let raw = data && Object.prototype.hasOwnProperty.call(data, 'result') ? data.result : data;
        if (!raw) return null;

        if (typeof raw === 'string') {
            try {
                raw = JSON.parse(raw);
            } catch (e) {
                return null;
            }
        }
        if (typeof raw === 'string') {
            try {
                raw = JSON.parse(raw);
            } catch (e) {
                return null;
            }
        }
        if (!raw || typeof raw !== 'object') return null;

        if (isLeadExpired(raw)) {
            deleteRemoteKv(key);
            return null;
        }

        return raw;
    } catch (err) {
        console.warn('⚠️ [KV FETCH WARNING] No se pudo leer desde Redis remoto:', err.message);
        return null;
    }
}

/**
 * Eliminación remota en KV / Redis
 */
async function deleteRemoteKv(key) {
    const creds = getKvCredentials();
    if (!creds || !key) return false;

    try {
        await fetch(`${creds.kvUrl}/del/lead:${key}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${creds.kvToken}`
            }
        });
        return true;
    } catch (err) {
        console.warn('⚠️ [KV DEL WARNING] No se pudo eliminar en Redis remoto:', err.message);
        return false;
    }
}

/**
 * Establece o sobrescribe el estado de un lead
 * @param {string} phone
 * @param {Object} data
 * @returns {Object} LeadState guardado
 */
function setLeadState(phone, data = {}) {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;

    const existing = stateStore.get(normalized) || {};
    const inferredQuoted = Boolean(
        data.hasQuoted !== undefined
            ? data.hasQuoted
            : (
                existing.hasQuoted ||
                Boolean(data.tipo) ||
                (data.areaNum !== undefined && Number(data.areaNum) > 0) ||
                Boolean(data.minUF) ||
                data.estado === 'COTIZADO' ||
                existing.estado === 'COTIZADO' ||
                (!data.estado && !existing.estado)
            )
    );

    const baseHistory = Array.isArray(data.conversationHistory)
        ? data.conversationHistory
        : (Array.isArray(existing.conversationHistory) ? existing.conversationHistory : []);

    const stateObj = {
        phone: normalized,
        name: data.name || existing.name || '',
        email: data.email || existing.email || '',
        estado: data.estado || 'COTIZADO',
        tipo: data.tipo || existing.tipo || '',
        areaNum: data.areaNum !== undefined ? data.areaNum : (existing.areaNum || 0),
        comunaHuman: data.comunaHuman || existing.comunaHuman || '',
        sistema: data.sistema || existing.sistema || '',
        sistemaComercial: data.sistemaComercial || existing.sistemaComercial || '',
        proyectoResumen: data.proyectoResumen || existing.proyectoResumen || '',
        minUF: data.minUF !== undefined ? data.minUF : (existing.minUF || 0),
        maxUF: data.maxUF !== undefined ? data.maxUF : (existing.maxUF || 0),
        permisos: data.permisos || existing.permisos || '',
        bookingId: data.bookingId || existing.bookingId || null,
        createdAt: existing.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        ...data,
        hasQuoted: inferredQuoted,
        conversationHistory: baseHistory.slice(-MAX_CONVERSATION_TURNS)
    };

    stateStore.set(normalized, stateObj);
    syncRemoteKv(normalized, stateObj);
    return stateObj;
}

/**
 * Obtiene el registro de un lead por teléfono, aplicando TTL de 14 días
 * @param {string} phone
 * @returns {Object|null}
 */
function getLeadState(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;

    const lead = stateStore.get(normalized);
    if (!lead) return null;

    // Expiración automática a 14 días
    if (isLeadExpired(lead)) {
        stateStore.delete(normalized);
        deleteRemoteKv(normalized);
        return null;
    }

    return lead;
}

/**
 * Actualiza el estado y campos adicionales de un lead
 * @param {string} phone
 * @param {string} newState ('COTIZADO' | 'EN_CONVERSACION' | 'VISITA_AGENDADA')
 * @param {Object} patchData
 * @returns {Object|null}
 */
function updateLeadState(phone, newState, patchData = {}) {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;

    let lead = stateStore.get(normalized);
    if (!lead || isLeadExpired(lead)) {
        // Si no existía o expiró, inicializarlo con el nuevo estado
        return setLeadState(normalized, { estado: newState, ...patchData });
    }

    lead.estado = newState;
    lead.updatedAt = patchData.updatedAt || Date.now();
    Object.assign(lead, patchData);

    if (patchData.hasQuoted !== undefined) {
        lead.hasQuoted = Boolean(patchData.hasQuoted);
    } else {
        lead.hasQuoted = Boolean(
            lead.hasQuoted ||
            newState === 'COTIZADO' ||
            Boolean(lead.tipo) ||
            (lead.areaNum && Number(lead.areaNum) > 0) ||
            Boolean(lead.minUF)
        );
    }

    if (!Array.isArray(lead.conversationHistory)) {
        lead.conversationHistory = [];
    } else if (lead.conversationHistory.length > MAX_CONVERSATION_TURNS) {
        lead.conversationHistory = lead.conversationHistory.slice(-MAX_CONVERSATION_TURNS);
    }

    stateStore.set(normalized, lead);
    syncRemoteKv(normalized, lead);
    return lead;
}

/**
 * Elimina el estado de un lead (comando Reset o limpieza de QA)
 * @param {string} phone
 * @returns {boolean}
 */
function deleteLeadState(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return false;

    const existed = stateStore.delete(normalized);
    deleteRemoteKv(normalized);
    return existed;
}

/**
 * Busca un lead por teléfono o por email (aplicando TTL)
 * @param {string} identifier (teléfono o correo electrónico)
 * @returns {Object|null}
 */
function findLeadByPhoneOrEmail(identifier) {
    if (!identifier) return null;
    const rawStr = String(identifier).trim();
    const idLower = rawStr.toLowerCase();

    // 1. Si es correo electrónico, priorizar clave directa email:<correo>
    if (idLower.includes('@')) {
        const emailKey = `email:${idLower}`;
        if (stateStore.has(emailKey)) {
            const emailLead = stateStore.get(emailKey);
            if (isLeadExpired(emailLead)) {
                stateStore.delete(emailKey);
                deleteRemoteKv(emailKey);
                return null;
            }
            return emailLead;
        }
    }

    // 2. Intentar normalizar como teléfono
    const normalizedPhone = !idLower.includes('@') ? normalizePhone(rawStr) : '';
    if (normalizedPhone && stateStore.has(normalizedPhone)) {
        const lead = stateStore.get(normalizedPhone);
        if (isLeadExpired(lead)) {
            stateStore.delete(normalizedPhone);
            deleteRemoteKv(normalizedPhone);
            return null;
        }
        return lead;
    }

    // 3. Búsqueda transversal por campo email
    for (const [key, lead] of stateStore.entries()) {
        if (lead.email && lead.email.toLowerCase() === idLower) {
            if (isLeadExpired(lead)) {
                stateStore.delete(key);
                deleteRemoteKv(key);
                return null;
            }
            return lead;
        }
    }

    return null;
}

/**
 * Normaliza un correo electrónico en minúsculas y sin espacios.
 * @param {string} rawEmail
 * @returns {string}
 */
function normalizeEmail(rawEmail) {
    if (!rawEmail) return '';
    return String(rawEmail).trim().toLowerCase();
}

/**
 * Registra o actualiza un lead capturado vía Email-Gate de Guías Técnicas DOM.
 * Usa clave `email:<correo>` en memoria/KV y conserva trazabilidad segmentada.
 * @param {string} email
 * @param {Object} data
 * @returns {Object|null}
 */
function _buildAndStoreEmailLead(email, data = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !normalizedEmail.includes('@')) return null;

    const storageKey = `email:${normalizedEmail}`;
    const existing = stateStore.get(storageKey) || {};
    const existingList = Array.isArray(existing.guiasDescargadas) ? existing.guiasDescargadas : [];
    const incomingGuia = data.guia ? String(data.guia).trim() : '';
    const guiasDescargadas = incomingGuia && !existingList.includes(incomingGuia)
        ? [...existingList, incomingGuia]
        : (existingList.length > 0 ? existingList : (incomingGuia ? [incomingGuia] : []));

    const now = Date.now();
    const stateObj = {
        ...existing,
        ...data,
        email: normalizedEmail,
        name: data.name || data.nombre || existing.name || '',
        estado: data.estado || existing.estado || 'LEAD_GUIA_DOM',
        segmento: data.segmento || existing.segmento || 'EMAIL_MARKETING_DOM',
        guia: incomingGuia || existing.guia || '',
        guiasDescargadas,
        sourcePage: data.sourcePage || existing.sourcePage || '/',
        timestamp: data.timestamp || new Date(now).toISOString(),
        createdAt: existing.createdAt || now,
        updatedAt: data.updatedAt || now
    };

    stateStore.set(storageKey, stateObj);
    return { storageKey, stateObj };
}

/**
 * Registra o actualiza un lead capturado vía Email-Gate de Guías Técnicas DOM.
 * @param {string} email
 * @param {Object} data
 * @returns {Object|null}
 */
function setEmailLeadState(email, data = {}) {
    const saved = _buildAndStoreEmailLead(email, data);
    if (!saved) return null;
    syncRemoteKv(saved.storageKey, saved.stateObj);
    return saved.stateObj;
}

/**
 * Versión asíncrona para endpoints serverless: garantiza flush único al KV remoto antes de responder HTTP.
 * @param {string} email
 * @param {Object} data
 * @returns {Promise<Object|null>}
 */
async function persistEmailLead(email, data = {}) {
    const saved = _buildAndStoreEmailLead(email, data);
    if (!saved) return null;
    await syncRemoteKv(saved.storageKey, saved.stateObj);
    return saved.stateObj;
}

/**
 * Regla de negocio: determina si el bot IA puede responder a un número.
 * - Ya NO retorna false para números no registrados (permite atender leads fríos como SDR inicial).
 * - Solo retorna false si el lead existe y su estado es estrictamente 'VISITA_AGENDADA'.
 * @param {string} phone
 * @returns {boolean}
 */
function canBotReply(phone) {
    const lead = getLeadState(phone);
    if (!lead) return true; // Lead no registrado o expirado -> SÍ responde (SDR / Calificador inicial)
    if (lead.estado === 'VISITA_AGENDADA') return false; // Solo silencio si la visita ya está agendada
    return true; // COTIZADO o EN_CONVERSACION
}

/**
 * Agrega un turno de conversación al historial acotado del lead (máx. 6 turnos).
 * @param {string} phone
 * @param {string} role ('user' | 'assistant')
 * @param {string} text
 * @param {Object} meta
 * @returns {Array}
 */
function appendConversationTurn(phone, role, text, meta = {}) {
    const normalized = normalizePhone(phone);
    if (!normalized) return [];

    let lead = getLeadState(normalized);
    if (!lead) {
        lead = setLeadState(normalized, {
            phone: normalized,
            estado: 'EN_CONVERSACION',
            hasQuoted: false
        });
    }

    const history = Array.isArray(lead.conversationHistory) ? [...lead.conversationHistory] : [];
    history.push({
        role: String(role || 'user'),
        text: String(text || '').slice(0, 500),
        timestamp: Date.now(),
        ...meta
    });

    lead.conversationHistory = history.slice(-MAX_CONVERSATION_TURNS);
    lead.updatedAt = Date.now();
    stateStore.set(normalized, lead);
    syncRemoteKv(normalized, lead);
    return lead.conversationHistory;
}

/**
 * Hidrata el estado de un lead desde KV/Redis remoto si no está en la memoria de la instancia serverless.
 * @param {string} identifier (teléfono o correo electrónico)
 * @returns {Promise<Object|null>}
 */
async function hydrateLeadState(identifier) {
    if (!identifier) return null;

    const local = findLeadByPhoneOrEmail(identifier);
    if (local) return local;

    const rawStr = String(identifier).trim();
    const isEmail = rawStr.includes('@');
    const storageKey = isEmail ? `email:${normalizeEmail(rawStr)}` : normalizePhone(rawStr);
    if (!storageKey) return null;

    const remoteLead = await fetchRemoteKv(storageKey);
    if (!remoteLead) return null;

    if (!isEmail && !remoteLead.phone) {
        remoteLead.phone = storageKey;
    }
    if (!Array.isArray(remoteLead.conversationHistory)) {
        remoteLead.conversationHistory = [];
    } else if (remoteLead.conversationHistory.length > MAX_CONVERSATION_TURNS) {
        remoteLead.conversationHistory = remoteLead.conversationHistory.slice(-MAX_CONVERSATION_TURNS);
    }

    stateStore.set(storageKey, remoteLead);
    return remoteLead;
}

/**
 * Garantiza flush explícito del lead hacia KV/Redis antes de responder en entornos serverless.
 * @param {string} identifier (teléfono o correo electrónico)
 * @returns {Promise<boolean>}
 */
async function flushLeadState(identifier) {
    if (!identifier) return false;
    const rawStr = String(identifier).trim();
    const storageKey = rawStr.includes('@') ? `email:${normalizeEmail(rawStr)}` : normalizePhone(rawStr);
    if (!storageKey) return false;

    const lead = stateStore.get(storageKey);
    if (!lead) return false;
    return await syncRemoteKv(storageKey, lead);
}

/**
 * Limpia el almacén en memoria (utilizado para pruebas aisladas)
 */
function resetStateStore() {
    stateStore.clear();
}

module.exports = {
    normalizePhone,
    normalizeEmail,
    setLeadState,
    setEmailLeadState,
    persistEmailLead,
    getLeadState,
    updateLeadState,
    deleteLeadState,
    findLeadByPhoneOrEmail,
    canBotReply,
    appendConversationTurn,
    hydrateLeadState,
    flushLeadState,
    fetchRemoteKv,
    resetStateStore,
    TTL_14_DAYS_MS,
    MAX_CONVERSATION_TURNS
};
