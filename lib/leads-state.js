/**
 * lib/leads-state.js
 * 
 * Máquina de Estados y Almacén de Persistencia para Leads de Cuatropuntas SpA.
 * Ciclo de estados determinista: COTIZADO ➔ EN_CONVERSACION ➔ VISITA_AGENDADA
 * 
 * Soporta almacenamiento en memoria (Map) para tests y ejecución local,
 * con sincronización REST asíncrona hacia Vercel KV / Upstash Redis si las variables de entorno están presentes.
 */

const stateStore = new Map();

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
 * Sincronización asíncrona con KV / Redis si está configurado en producción
 */
async function syncRemoteKv(key, value) {
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!kvUrl || !kvToken) return;

    try {
        await fetch(`${kvUrl}/set/lead:${key}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${kvToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(value)
        });
    } catch (err) {
        console.warn('⚠️ [KV SYNC WARNING] No se pudo persistir en Redis remoto:', err.message);
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
    const stateObj = {
        phone: normalized,
        name: data.name || existing.name || '',
        email: data.email || existing.email || '',
        estado: data.estado || 'COTIZADO',
        tipo: data.tipo || existing.tipo || '',
        areaNum: data.areaNum !== undefined ? data.areaNum : (existing.areaNum || 0),
        comunaHuman: data.comunaHuman || existing.comunaHuman || '',
        sistema: data.sistema || existing.sistema || '',
        minUF: data.minUF !== undefined ? data.minUF : (existing.minUF || 0),
        maxUF: data.maxUF !== undefined ? data.maxUF : (existing.maxUF || 0),
        permisos: data.permisos || existing.permisos || '',
        bookingId: data.bookingId || existing.bookingId || null,
        createdAt: existing.createdAt || Date.now(),
        updatedAt: Date.now(),
        ...data
    };

    stateStore.set(normalized, stateObj);
    syncRemoteKv(normalized, stateObj);
    return stateObj;
}

/**
 * Obtiene el registro de un lead por teléfono
 * @param {string} phone
 * @returns {Object|null}
 */
function getLeadState(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    return stateStore.get(normalized) || null;
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
    if (!lead) {
        // Si no existía, inicializarlo con el nuevo estado
        return setLeadState(normalized, { estado: newState, ...patchData });
    }

    lead.estado = newState;
    lead.updatedAt = Date.now();
    Object.assign(lead, patchData);

    stateStore.set(normalized, lead);
    syncRemoteKv(normalized, lead);
    return lead;
}

/**
 * Busca un lead por teléfono o por email
 * @param {string} identifier (teléfono o correo electrónico)
 * @returns {Object|null}
 */
function findLeadByPhoneOrEmail(identifier) {
    if (!identifier) return null;

    // 1. Intentar normalizar como teléfono
    const normalizedPhone = normalizePhone(identifier);
    if (normalizedPhone && stateStore.has(normalizedPhone)) {
        return stateStore.get(normalizedPhone);
    }

    // 2. Búsqueda por email
    const idLower = String(identifier).trim().toLowerCase();
    for (const lead of stateStore.values()) {
        if (lead.email && lead.email.toLowerCase() === idLower) {
            return lead;
        }
    }

    return null;
}

/**
 * Regla de negocio: determina si el bot IA puede responder a un número
 * Retorna true ÚNICAMENTE si el lead está en 'COTIZADO' o 'EN_CONVERSACION'.
 * Retorna false si no está registrado o si ya está en 'VISITA_AGENDADA' (silencio IA).
 * @param {string} phone
 * @returns {boolean}
 */
function canBotReply(phone) {
    const lead = getLeadState(phone);
    if (!lead) return false;
    if (lead.estado === 'VISITA_AGENDADA') return false;
    if (lead.estado === 'COTIZADO' || lead.estado === 'EN_CONVERSACION') return true;
    return false;
}

/**
 * Limpia el almacén en memoria (utilizado para pruebas aisladas)
 */
function resetStateStore() {
    stateStore.clear();
}

module.exports = {
    normalizePhone,
    setLeadState,
    getLeadState,
    updateLeadState,
    findLeadByPhoneOrEmail,
    canBotReply,
    resetStateStore
};
