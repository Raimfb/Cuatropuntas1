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
 * Eliminación remota en KV / Redis
 */
async function deleteRemoteKv(key) {
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!kvUrl || !kvToken) return;

    try {
        await fetch(`${kvUrl}/del/lead:${key}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${kvToken}`
            }
        });
    } catch (err) {
        console.warn('⚠️ [KV DEL WARNING] No se pudo eliminar en Redis remoto:', err.message);
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
        updatedAt: data.updatedAt || Date.now(),
        ...data
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

    // 1. Intentar normalizar como teléfono
    const normalizedPhone = normalizePhone(identifier);
    if (normalizedPhone && stateStore.has(normalizedPhone)) {
        const lead = stateStore.get(normalizedPhone);
        if (isLeadExpired(lead)) {
            stateStore.delete(normalizedPhone);
            deleteRemoteKv(normalizedPhone);
            return null;
        }
        return lead;
    }

    // 2. Búsqueda por email
    const idLower = String(identifier).trim().toLowerCase();
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
    deleteLeadState,
    findLeadByPhoneOrEmail,
    canBotReply,
    resetStateStore,
    TTL_14_DAYS_MS
};
