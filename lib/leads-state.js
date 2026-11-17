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
const unsubStore = new Map();
const nurturingStore = new Map();
const lockStore = new Map();
const TTL_14_DAYS_MS = 14 * 24 * 60 * 60 * 1000; // 14 días de inactividad
const TTL_14_DAYS_SEC = Math.floor(TTL_14_DAYS_MS / 1000);
const TTL_UNSUB_180_DAYS_MS = 180 * 24 * 60 * 60 * 1000;
const TTL_UNSUB_180_DAYS_SEC = Math.floor(TTL_UNSUB_180_DAYS_MS / 1000);
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
 * Parsea payloads JSON simples o doblemente serializados desde Upstash/KV
 * @param {any} raw
 * @returns {Object|null}
 */
function parseKvObject(raw) {
    if (!raw) return null;
    let val = raw;
    for (let i = 0; i < 2 && typeof val === 'string'; i++) {
        try {
            val = JSON.parse(val);
        } catch {
            return null;
        }
    }
    return (val && typeof val === 'object') ? val : null;
}

/**
 * Ejecuta un comando Upstash Redis REST en formato array JSON (POST /)
 * @param {Array<string|number>} args
 * @returns {Promise<{ ok: boolean, result: any }>}
 */
async function kvCommand(args) {
    const creds = getKvCredentials();
    if (!creds || !Array.isArray(args) || args.length === 0) {
        return { ok: false, result: null };
    }

    try {
        const resp = await fetch(creds.kvUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${creds.kvToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(args)
        });
        if (!resp.ok) {
            return { ok: false, result: null };
        }
        const data = await resp.json();
        return {
            ok: true,
            result: data && Object.prototype.hasOwnProperty.call(data, 'result') ? data.result : data
        };
    } catch (err) {
        console.warn('⚠️ [KV COMMAND WARNING] Error ejecutando comando Redis REST:', err.message);
        return { ok: false, result: null };
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
        const raw = data && Object.prototype.hasOwnProperty.call(data, 'result') ? data.result : data;
        const parsed = parseKvObject(raw);
        if (!parsed) return null;

        if (isLeadExpired(parsed)) {
            deleteRemoteKv(key);
            return null;
        }

        return parsed;
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
        estado: data.estado || existing.estado || 'COTIZADO',
        tipo: data.tipo || existing.tipo || '',
        areaNum: data.areaNum !== undefined ? data.areaNum : (existing.areaNum || 0),
        comunaHuman: data.comunaHuman || existing.comunaHuman || '',
        sistema: data.sistema || existing.sistema || '',
        sistemaComercial: data.sistemaComercial || existing.sistemaComercial || '',
        proyectoResumen: data.proyectoResumen || existing.proyectoResumen || '',
        minUF: data.minUF !== undefined ? data.minUF : (existing.minUF || 0),
        maxUF: data.maxUF !== undefined ? data.maxUF : (existing.maxUF || 0),
        permisos: data.permisos || existing.permisos || '',
        permisosKey: data.permisosKey || existing.permisosKey || '',
        quotedAt: data.quotedAt !== undefined ? data.quotedAt : (existing.quotedAt || null),
        initialEmailSent: data.initialEmailSent !== undefined ? data.initialEmailSent : existing.initialEmailSent,
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
        hasQuoted: data.hasQuoted !== undefined ? Boolean(data.hasQuoted) : Boolean(existing.hasQuoted),
        sourcePage: data.sourcePage || existing.sourcePage || '/',
        timestamp: data.timestamp || existing.timestamp || new Date(now).toISOString(),
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
 * @param {{ bypassCache?: boolean }} options
 * @returns {Promise<Object|null>}
 */
async function hydrateLeadState(identifier, options = {}) {
    if (!identifier) return null;
    const bypassCache = Boolean(options && options.bypassCache);

    if (!bypassCache || !getKvCredentials()) {
        const local = findLeadByPhoneOrEmail(identifier);
        if (local) return local;
        if (!getKvCredentials()) return null;
    }

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
 * Sincroniza un registro existente `lead:email:<email>` cuando el usuario cotiza o agenda por teléfono.
 * @param {string} email
 * @param {Object} patchData
 * @returns {Promise<Object|null>}
 */
async function syncEmailLeadByEmail(email, patchData = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !normalizedEmail.includes('@')) return null;

    const storageKey = `email:${normalizedEmail}`;
    await hydrateLeadState(normalizedEmail, { bypassCache: true });

    const existing = stateStore.get(storageKey);
    if (!existing) return null;

    const updated = {
        ...existing,
        ...patchData,
        email: normalizedEmail,
        updatedAt: patchData.updatedAt || Date.now()
    };

    stateStore.set(storageKey, updated);
    await syncRemoteKv(storageKey, updated);
    return updated;
}

/**
 * Escanea todos los registros activos `lead:*` (SCAN + MGET por lote) o desde memoria en pruebas.
 * @returns {Promise<Array<{ key: string, data: Object }>>}
 */
async function scanAllLeadRecords() {
    const creds = getKvCredentials();
    if (!creds) {
        const records = [];
        for (const [k, v] of stateStore.entries()) {
            if (!v || isLeadExpired(v)) continue;
            records.push({ key: `lead:${k}`, data: v });
        }
        return records;
    }

    const keys = [];
    const seenKeys = new Set();
    let cursor = '0';
    let iterations = 0;

    do {
        const scanRes = await kvCommand(['SCAN', cursor, 'MATCH', 'lead:*', 'COUNT', '100']);
        if (!scanRes.ok || !Array.isArray(scanRes.result)) break;

        cursor = String(scanRes.result[0] || '0');
        const batchKeys = Array.isArray(scanRes.result[1]) ? scanRes.result[1] : [];
        for (const k of batchKeys) {
            if (typeof k === 'string' && !k.startsWith('lead:unsub:') && !seenKeys.has(k)) {
                seenKeys.add(k);
                keys.push(k);
            }
        }
        iterations += 1;
    } while (cursor !== '0' && iterations < 50);

    const records = [];
    for (let i = 0; i < keys.length; i += 100) {
        const chunk = keys.slice(i, i + 100);
        const mgetRes = await kvCommand(['MGET', ...chunk]);
        if (!mgetRes.ok || !Array.isArray(mgetRes.result)) continue;

        for (let idx = 0; idx < chunk.length; idx++) {
            const parsed = parseKvObject(mgetRes.result[idx]);
            if (!parsed || isLeadExpired(parsed)) continue;
            records.push({ key: chunk[idx], data: parsed });
        }
    }

    return records;
}

/**
 * Consulta en lote si los correos tienen baja voluntaria (`unsub:<email>`).
 * @param {Array<string>} emails
 * @returns {Promise<Map<string, boolean>>}
 */
async function getUnsubMap(emails = []) {
    const normalizedList = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
    const result = new Map();
    if (normalizedList.length === 0) return result;

    const creds = getKvCredentials();
    if (!creds) {
        for (const em of normalizedList) {
            const entry = unsubStore.get(em);
            result.set(em, Boolean(entry && entry.unsubscribed));
        }
        return result;
    }

    for (let i = 0; i < normalizedList.length; i += 100) {
        const chunk = normalizedList.slice(i, i + 100);
        const mgetRes = await kvCommand(['MGET', ...chunk.map(e => `unsub:${e}`)]);
        for (let idx = 0; idx < chunk.length; idx++) {
            const em = chunk[idx];
            const parsed = mgetRes.ok && Array.isArray(mgetRes.result)
                ? parseKvObject(mgetRes.result[idx])
                : null;
            result.set(em, Boolean(parsed && parsed.unsubscribed));
        }
    }

    return result;
}

async function isUnsubscribed(email) {
    const norm = normalizeEmail(email);
    if (!norm) return false;
    const map = await getUnsubMap([norm]);
    return Boolean(map.get(norm));
}

async function markUnsubscribed(email) {
    const norm = normalizeEmail(email);
    if (!norm || !norm.includes('@')) return false;

    const payload = {
        unsubscribed: true,
        email: norm,
        timestamp: Date.now()
    };
    unsubStore.set(norm, payload);

    if (getKvCredentials()) {
        await kvCommand(['SET', `unsub:${norm}`, JSON.stringify(payload), 'EX', TTL_UNSUB_180_DAYS_SEC]);
    }
    return true;
}

/**
 * Consulta en lote el estado de envíos de nurturing (`nurturing:<email>`, fuera de `lead:*`).
 * @param {Array<string>} emails
 * @returns {Promise<Map<string, Object>>}
 */
async function getNurturingStatesMap(emails = []) {
    const normalizedList = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
    const result = new Map();
    if (normalizedList.length === 0) return result;

    const creds = getKvCredentials();
    if (!creds) {
        for (const em of normalizedList) {
            if (nurturingStore.has(em)) {
                result.set(em, nurturingStore.get(em));
            }
        }
        return result;
    }

    for (let i = 0; i < normalizedList.length; i += 100) {
        const chunk = normalizedList.slice(i, i + 100);
        const mgetRes = await kvCommand(['MGET', ...chunk.map(e => `nurturing:${e}`)]);
        for (let idx = 0; idx < chunk.length; idx++) {
            const parsed = mgetRes.ok && Array.isArray(mgetRes.result)
                ? parseKvObject(mgetRes.result[idx])
                : null;
            if (parsed) {
                result.set(chunk[idx], parsed);
            }
        }
    }

    return result;
}

async function saveNurturingState(email, stateObj = {}) {
    const norm = normalizeEmail(email);
    if (!norm || !norm.includes('@')) return null;

    const existing = nurturingStore.get(norm) || {};
    const merged = {
        ...existing,
        ...stateObj,
        email: norm,
        updatedAt: Date.now()
    };
    nurturingStore.set(norm, merged);

    if (getKvCredentials()) {
        await kvCommand(['SET', `nurturing:${norm}`, JSON.stringify(merged), 'EX', TTL_14_DAYS_SEC]);
    }
    return merged;
}

async function acquireNurturingLock(ttlSec = 30) {
    const lockId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const creds = getKvCredentials();

    if (!creds) {
        const cur = lockStore.get('nurturing:lock');
        if (cur && cur.expiresAt > Date.now()) {
            return null;
        }
        lockStore.set('nurturing:lock', { lockId, expiresAt: Date.now() + (ttlSec * 1000) });
        return lockId;
    }

    const res = await kvCommand(['SET', 'nurturing:lock', lockId, 'NX', 'EX', ttlSec]);
    if (res.ok && (res.result === 'OK' || res.result === true)) {
        return lockId;
    }
    return null;
}

async function releaseNurturingLock(lockId) {
    if (!lockId) return false;
    const cur = lockStore.get('nurturing:lock');
    if (cur && cur.lockId === lockId) {
        lockStore.delete('nurturing:lock');
    }

    if (getKvCredentials()) {
        const current = await kvCommand(['GET', 'nurturing:lock']);
        if (current.ok && current.result === lockId) {
            await kvCommand(['DEL', 'nurturing:lock']);
        }
    }
    return true;
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
 * Limpia los almacenes en memoria (utilizado para pruebas aisladas)
 */
function resetStateStore() {
    stateStore.clear();
    unsubStore.clear();
    nurturingStore.clear();
    lockStore.clear();
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
    syncEmailLeadByEmail,
    scanAllLeadRecords,
    getUnsubMap,
    isUnsubscribed,
    markUnsubscribed,
    getNurturingStatesMap,
    saveNurturingState,
    acquireNurturingLock,
    releaseNurturingLock,
    flushLeadState,
    fetchRemoteKv,
    kvCommand,
    resetStateStore,
    TTL_14_DAYS_MS,
    TTL_14_DAYS_SEC,
    TTL_UNSUB_180_DAYS_SEC,
    MAX_CONVERSATION_TURNS
};
