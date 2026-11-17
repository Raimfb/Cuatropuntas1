/**
 * api/_emailNurturing.js
 *
 * Spec 038: Motor de Secuencia Automatizada de Nurturing por Email (Día 3 y Día 7 en 4 Perfiles).
 * Prefijo `_` para excluir del límite de 12 Serverless Functions en Vercel Hobby (enrutado vía api/contact.js).
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const leadsState = require('../lib/leads-state');

const PROFILES = {
    GUIA_DOM: 'PERFIL_GUIA_DOM',
    OBRA_MAYOR_INTEGRAL: 'PERFIL_OBRA_MAYOR_INTEGRAL',
    OBRA_MAYOR_EJECUCION: 'PERFIL_OBRA_MAYOR_EJECUCION',
    QUINCHO_REMODELACION: 'PERFIL_QUINCHO_REMODELACION'
};

const HOUR_MS = 3600 * 1000;
const DAY3_MIN_MS = 72 * HOUR_MS;
const DAY7_MIN_MS = 168 * HOUR_MS;
const MAX_AGE_MS = 336 * HOUR_MS;
const DEFAULT_MAX_BATCH = 12;
const DEFAULT_TIME_BUDGET_MS = 6000;
const MAX_PERMANENT_FAILURES = 2;

const CAL_URL = 'https://cal.com/cuatropuntas.com/visita-tecnica';
const COTIZADOR_URL = 'https://www.cuatropuntas.com/#cotizador';
const WA_URL = 'https://wa.me/56927384075';

function normalizeAscii(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeTokenCompare(expected, provided) {
    if (!expected || !provided) return false;
    const hExpected = crypto.createHash('sha256').update(String(expected), 'utf8').digest();
    const hProvided = crypto.createHash('sha256').update(String(provided), 'utf8').digest();
    return crypto.timingSafeEqual(hExpected, hProvided);
}

function getCronSecret() {
    return (process.env.CRON_SECRET || '').trim();
}

function getUnsubSecret() {
    return (process.env.NURTURING_UNSUB_SECRET || process.env.CRON_SECRET || '').trim();
}

function signUnsubscribeToken(email) {
    const secret = getUnsubSecret();
    const normEmail = leadsState.normalizeEmail(email);
    if (!secret || !normEmail) return null;
    return crypto.createHmac('sha256', secret).update(normEmail).digest('hex');
}

function verifyUnsubscribeToken(email, token) {
    const expected = signUnsubscribeToken(email);
    if (!expected || !token) return false;
    return safeTokenCompare(expected, String(token).trim());
}

function buildUnsubscribeUrl(email) {
    const normEmail = leadsState.normalizeEmail(email);
    const token = signUnsubscribeToken(normEmail);
    if (!normEmail || !token) return 'https://www.cuatropuntas.com/politicas';
    return `https://www.cuatropuntas.com/api/unsubscribe?email=${encodeURIComponent(normEmail)}&token=${encodeURIComponent(token)}`;
}

function isAuthorizedCronRequest(req) {
    const secret = getCronSecret();
    if (!secret) return false;
    const headers = (req && req.headers) || {};
    const authHeader = headers.authorization || headers.Authorization || '';
    const match = String(authHeader).match(/^Bearer\s+(.+)$/i);
    if (!match) return false;
    return safeTokenCompare(secret, match[1].trim());
}

function isQuoteRecord(rec) {
    if (!rec || typeof rec !== 'object') return false;
    if (rec.hasQuoted === true) return true;
    if (rec.estado === 'COTIZADO') return true;
    if (Number(rec.areaNum) > 0) return true;
    if (Boolean(rec.minUF) && rec.minUF !== 0 && rec.minUF !== '0') return true;
    return false;
}

function getRecordTimestamp(rec, preferQuoted = false) {
    if (!rec) return 0;
    const candidates = preferQuoted
        ? [rec.quotedAt, rec.createdAt, Date.parse(rec.timestamp || ''), rec.updatedAt]
        : [rec.createdAt, Date.parse(rec.timestamp || ''), rec.updatedAt];
    for (const val of candidates) {
        const num = Number(val);
        if (Number.isFinite(num) && num > 0) return num;
    }
    return 0;
}

function classifyQuotedProfile(quoteRec) {
    const tipoNorm = normalizeAscii(quoteRec.tipo || quoteRec.proyectoResumen || '');
    if (!tipoNorm) return null;

    if (tipoNorm.includes('quincho')) {
        return { profile: PROFILES.QUINCHO_REMODELACION, variant: 'quincho' };
    }
    if (tipoNorm.includes('remodela')) {
        return { profile: PROFILES.QUINCHO_REMODELACION, variant: 'remodelacion' };
    }
    if (tipoNorm.includes('casa') || tipoNorm.includes('segundo') || tipoNorm.includes('amplia')) {
        const rawPerm = String(quoteRec.permisosKey || quoteRec.permisos || '').trim();
        const permNorm = normalizeAscii(rawPerm);
        const isEjecucion =
            permNorm === 'permisoaprobado' ||
            permNorm === 'arquitectopropio' ||
            permNorm.includes('permiso dom aprobado') ||
            permNorm.includes('arquitecto propio');

        if (isEjecucion) {
            return { profile: PROFILES.OBRA_MAYOR_EJECUCION, variant: 'ejecucion' };
        }
        return { profile: PROFILES.OBRA_MAYOR_INTEGRAL, variant: 'integral' };
    }

    return null;
}

/**
 * Consolida registros `lead:*` por email normalizado, aplica reglas de parada
 * y determina perfil exclusivo + correo pendiente (Día 3 o Día 7).
 */
function consolidateAndClassifyLeads(records = [], unsubMap = new Map(), nurturingMap = new Map(), nowTs = Date.now()) {
    const grouped = new Map();

    for (const entry of records) {
        const data = entry && entry.data ? entry.data : entry;
        if (!data || typeof data !== 'object') continue;
        const email = leadsState.normalizeEmail(data.email);
        if (!email || !email.includes('@')) continue;

        if (!grouped.has(email)) grouped.set(email, []);
        grouped.get(email).push(data);
    }

    const candidates = [];
    const skipped = [];

    for (const [email, recs] of grouped.entries()) {
        if (unsubMap.get(email)) {
            skipped.push({ email, reason: 'UNSUBSCRIBED' });
            continue;
        }

        if (recs.some(r => r.estado === 'VISITA_AGENDADA')) {
            skipped.push({ email, reason: 'VISITA_AGENDADA' });
            continue;
        }

        const quotedRecords = recs.filter(isQuoteRecord);
        const classifiableQuoted = quotedRecords.filter(r => classifyQuotedProfile(r) !== null);
        const guideRecords = recs.filter(r => !isQuoteRecord(r) && (r.estado === 'LEAD_GUIA_DOM' || Boolean(r.guia)));

        let classification = null;
        let selectedLead = null;
        let originTs = 0;

        if (classifiableQuoted.length > 0) {
            classifiableQuoted.sort((a, b) => getRecordTimestamp(b, true) - getRecordTimestamp(a, true));
            selectedLead = classifiableQuoted[0];
            classification = classifyQuotedProfile(selectedLead);
            originTs = getRecordTimestamp(selectedLead, true);
        } else if (quotedRecords.length > 0) {
            skipped.push({ email, reason: 'UNCLASSIFIABLE_TIPO' });
            continue;
        } else if (guideRecords.length > 0) {
            guideRecords.sort((a, b) => (Number(b.updatedAt) || getRecordTimestamp(b, false)) - (Number(a.updatedAt) || getRecordTimestamp(a, false)));
            selectedLead = guideRecords[0];
            const guiaNorm = normalizeAscii(selectedLead.guia || '');
            classification = {
                profile: PROFILES.GUIA_DOM,
                variant: guiaNorm.includes('recepcion') ? 'recepcion-final' : 'permiso-edificacion'
            };
            originTs = getRecordTimestamp(selectedLead, false);
        } else {
            skipped.push({ email, reason: 'COLD_NO_PROFILE' });
            continue;
        }

        if (!originTs || originTs > nowTs) {
            skipped.push({ email, reason: 'INVALID_ORIGIN_TS' });
            continue;
        }

        const elapsedMs = nowTs - originTs;
        if (elapsedMs < DAY3_MIN_MS) {
            skipped.push({ email, profile: classification.profile, reason: 'TOO_EARLY' });
            continue;
        }
        if (elapsedMs >= MAX_AGE_MS) {
            skipped.push({ email, profile: classification.profile, reason: 'EXPIRED_14D' });
            continue;
        }

        const nurtState = nurturingMap.get(email) || null;
        const sameSequence = Boolean(
            nurtState &&
            nurtState.profile === classification.profile &&
            (!nurtState.originTs || Math.abs(Number(nurtState.originTs) - originTs) < 60000)
        );

        if (sameSequence && Number(nurtState.failures || 0) >= MAX_PERMANENT_FAILURES) {
            skipped.push({ email, profile: classification.profile, reason: 'PERMANENT_BOUNCE_QUARANTINE' });
            continue;
        }

        const lastSentDay = sameSequence ? Number(nurtState.lastSentDay || 0) : 0;
        let targetDay = null;

        if (elapsedMs >= DAY7_MIN_MS) {
            if (lastSentDay < 7) targetDay = 7;
        } else if (elapsedMs >= DAY3_MIN_MS) {
            if (lastSentDay < 3) targetDay = 3;
        }

        if (!targetDay) {
            skipped.push({ email, profile: classification.profile, reason: 'ALREADY_SENT_FOR_WINDOW' });
            continue;
        }

        candidates.push({
            email,
            profile: classification.profile,
            variant: classification.variant,
            day: targetDay,
            originTs,
            elapsedHours: Math.floor(elapsedMs / HOUR_MS),
            lead: selectedLead
        });
    }

    return { candidates, skipped };
}

function wrapEmailLayout({ title, innerHtml, unsubUrl }) {
    const safeUnsub = escapeHtml(unsubUrl);
    return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #2d3748; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #1a365d; color: #ffffff; padding: 20px 24px; border-bottom: 4px solid #c05621;">
            <p style="margin: 0; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #fbd38d;">Constructora Cuatropuntas SpA</p>
            <h2 style="margin: 6px 0 0; font-size: 19px; line-height: 1.35;">${escapeHtml(title)}</h2>
        </div>
        <div style="padding: 24px; font-size: 14.5px; line-height: 1.6;">
            ${innerHtml}
        </div>
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #718096;">
            <p style="margin: 0 0 6px 0;"><strong>Constructora Cuatropuntas SpA</strong> · Santiago de Chile · <a href="https://www.cuatropuntas.com" style="color: #c05621; text-decoration: none;">www.cuatropuntas.com</a></p>
            <p style="margin: 0 0 8px 0;">WhatsApp Captura Técnica: <a href="${WA_URL}" style="color: #c05621; text-decoration: none;">+56 9 2738 4075</a> · contacto@cuatropuntas.com</p>
            <p style="margin: 0;"><a href="${safeUnsub}" style="color: #718096; text-decoration: underline;">Darme de baja de estos correos</a></p>
        </div>
    </div>`;
}

/**
 * Renderiza Asunto, HTML y Texto Plano según Perfil, Variante y Día (3 o 7).
 */
function renderNurturingEmail({ profile, variant, day, lead = {}, unsubUrl = '' }) {
    const rawName = String(lead.name || lead.nombre || '').trim();
    const rawFirst = rawName ? rawName.split(/\s+/)[0] : 'Estimado(a)';
    const firstNameHtml = escapeHtml(rawFirst);
    const firstNameTxt = rawFirst;

    const rawComuna = String(lead.comunaHuman || 'Región Metropolitana').split(',')[0].trim() || 'Región Metropolitana';
    const comunaHtml = escapeHtml(rawComuna);
    const comunaTxt = rawComuna;

    const rawTipoComercial = String(lead.tipo || 'Proyecto Habitacional').trim();
    const tipoTxt = normalizeAscii(rawTipoComercial).includes('amplia') || normalizeAscii(rawTipoComercial).includes('segundo')
        ? 'Ampliación'
        : (normalizeAscii(rawTipoComercial).includes('quincho')
            ? 'Quincho'
            : (normalizeAscii(rawTipoComercial).includes('remodela') ? 'Remodelación' : 'Casa Nueva'));

    const rawResumen = String(lead.proyectoResumen || `${tipoTxt}${lead.areaNum ? ` (${lead.areaNum} m²)` : ''}`).trim();
    const resumenHtml = escapeHtml(rawResumen);
    const resumenTxt = rawResumen;

    const rawRango = (lead.minUF && lead.maxUF) ? `${lead.minUF} a ${lead.maxUF}` : 'estimado preliminar';
    const rangoHtml = escapeHtml(rawRango);
    const rangoTxt = rawRango;

    const unsubLink = unsubUrl || buildUnsubscribeUrl(lead.email || '');

    // --- PERFIL 1: GUÍA DOM ---
    if (profile === PROFILES.GUIA_DOM) {
        if (variant === 'recepcion-final') {
            if (day === 3) {
                const subject = `${firstNameTxt}, lo que revisa la DOM (y el banco) en tu Recepción Final`;
                const innerHtml = `
                    <p>Hola <strong>${firstNameHtml}</strong>,</p>
                    <p>Vimos que descargaste nuestro <em>Checklist Oficial de Recepción Final Municipal (DOM)</em>. Un proyecto puede quedar terminado físicamente y aun así trabarse al momento de vender, hipotecar o pedir tasación bancaria si falta un certificado reglamentario.</p>
                    <div style="background-color:#fffaf5;border:1px solid #fed7aa;border-left:4px solid #c05621;padding:16px;margin:18px 0;border-radius:4px;">
                        <p style="margin:0 0 8px 0;font-weight:bold;color:#9c4221;">Puntos que más bloquean una Recepción Final:</p>
                        <ul style="margin:0;padding-left:18px;font-size:14px;color:#2d3748;">
                            <li><strong>Certificaciones de redes y Libro de Obras:</strong> Declaraciones SEC TE1 (electricidad) y TC6 (gas), empalmes definitivos y Libro de Obras completo y firmado.</li>
                            <li><strong>Concordancia con planos aprobados:</strong> Cualquier cambio en terreno respecto del permiso aprobado exige tramitar Modificación de Proyecto.</li>
                            <li><strong>Obras anexas o preexistencias sin regularizar:</strong> Si en el mismo predio existen ampliaciones previas irregulares, quinchos, piscinas u obras ejecutadas por terceros fuera del permiso, la DOM suele objetar la recepción del conjunto.</li>
                        </ul>
                    </div>
                    <p>Si estás planificando construir o ampliar y quieres dimensionar tu proyecto desde el inicio con carpeta técnica ordenada, calcula tu estimación preliminar neto (+IVA) en nuestro cotizador:</p>
                    <p style="text-align:center;margin:24px 0;">
                        <a href="${COTIZADOR_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:6px;font-weight:bold;">Cotizar Mi Proyecto</a>
                    </p>
                    <p style="font-size:13px;color:#4a5568;">¿Tienes dudas sobre tu propiedad? Escríbenos por WhatsApp al <a href="${WA_URL}" style="color:#c05621;font-weight:bold;">+56 9 2738 4075</a>.</p>`;
                const text = `Hola ${firstNameTxt},\n\nRevisaste nuestro Checklist Oficial de Recepción Final Municipal (DOM). Un proyecto terminado en obra puede frenar una tasación bancaria o venta futura si falta respaldo documental:\n1. Certificados SEC TE1/TC6, empalmes definitivos y Libro de Obras al día.\n2. Concordancia exacta con los planos aprobados (o Modificación de Proyecto si hubo cambios).\n3. Sin obras anexas fuera de permiso ni construcciones preexistentes sin regularizar en el predio.\n\nSi estás evaluando construir o ampliar en la RM, estima valores netos (+IVA) y alcance DOM en nuestro cotizador:\n${COTIZADOR_URL}\n\nWhatsApp directo: +56 9 2738 4075 (${WA_URL})\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile\nDarse de baja: ${unsubLink}`;
                return { subject, html: wrapEmailLayout({ title: 'Checklist Recepción Final DOM', innerHtml, unsubUrl: unsubLink }), text };
            }

            const subject = 'Cómo evitar trabas municipales y asegurar tu carpeta técnica desde el día 1';
            const innerHtml = `
                <p>Hola <strong>${firstNameHtml}</strong>,</p>
                <p>La diferencia entre una obra que obtiene su <strong>Certificado de Recepción Final Definitiva</strong> sin tropiezos y una que queda estancada por años está en la coordinación entre arquitectura, cálculo, ejecución y Libro de Obras desde el primer día.</p>
                <p>En <strong>Constructora Cuatropuntas</strong> ejecutamos proyectos llave en mano bajo contrato a suma alzada. Cuando contratamos diseño/cálculo y obra en la RM, gestionamos el ciclo completo sobre lo construido por nuestro equipo hasta la Recepción Final (sujeto a que no existan obras anexas de terceros ni preexistencias irregulares en el predio).</p>
                <p style="text-align:center;margin:24px 0;">
                    <a href="${COTIZADOR_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:6px;font-weight:bold;margin:4px;">Calcular Cotización Preliminar</a>
                    <a href="${CAL_URL}" style="display:inline-block;background:#1a365d;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:6px;font-weight:bold;margin:4px;">Agendar Visita Técnica a Terreno</a>
                </p>
                <p style="font-size:13px;color:#4a5568;">Atención técnica en Región Metropolitana: <a href="${WA_URL}" style="color:#c05621;">WhatsApp +56 9 2738 4075</a>.</p>`;
            const text = `Hola ${firstNameTxt},\n\nLa obtención del Certificado de Recepción Final Definitiva depende de coordinar desde el día 1 planos aprobados, Libro de Obras, certificados SEC y cumplimiento térmico OGUC.\n\nEn Constructora Cuatropuntas trabajamos bajo contrato a suma alzada en toda la Región Metropolitana. Cuando llevas diseño/cálculo y obra con nosotros, gestionamos el expediente completo sobre lo ejecutado por nuestro equipo hasta la Recepción Final (siempre que no existan obras anexas no contratadas ni preexistencias sin regularizar).\n\n- Cotizador web: ${COTIZADOR_URL}\n- Agendar Visita Técnica a Terreno: ${CAL_URL}\n- WhatsApp: +56 9 2738 4075 (${WA_URL})\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile\nDarse de baja: ${unsubLink}`;
            return { subject, html: wrapEmailLayout({ title: 'Carpeta Técnica y Recepción Final DOM', innerHtml, unsubUrl: unsubLink }), text };
        }

        // Variante permiso-edificacion
        if (day === 3) {
            const subject = `${firstNameTxt}, 3 errores previos al Permiso de Edificación que encarecen la obra en la RM`;
            const innerHtml = `
                <p>Hola <strong>${firstNameHtml}</strong>,</p>
                <p>Hace unos días descargaste nuestra <em>Guía Práctica del Permiso de Edificación en la RM</em>. En nuestras evaluaciones en terreno vemos un patrón frecuente: muchas familias contratan planos sin validar antes dos filtros clave del terreno, lo que termina en observaciones municipales o reajustes de presupuesto.</p>
                <div style="background-color:#f8fafc;border-left:4px solid #c05621;padding:16px;margin:18px 0;border-radius:4px;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#1a365d;">Antes de ingresar un expediente a la DOM, revisa esto:</p>
                    <ul style="margin:0;padding-left:18px;font-size:14px;color:#2d3748;">
                        <li><strong>CIP y normativa del predio:</strong> Coeficiente de constructibilidad, rasantes, antejardín y afectaciones a utilidad pública.</li>
                        <li><strong>Factibilidad técnica y sanitaria:</strong> Empalmes vigentes o solución particular SEREMI de Salud en sectores rurales o de parcela (Art. 55 LGUC cuando corresponda).</li>
                        <li><strong>Preexistencias sin regularizar:</strong> Si existen construcciones previas no regularizadas en el sitio, pueden frenar la tramitación hasta resolver su situación.</li>
                    </ul>
                </div>
                <p>Si ya tienes los metros cuadrados aproximados y la comuna en la Región Metropolitana, puedes estimar hoy un rango preliminar neto (+IVA) según materialidad (Metalcom desde 19 UF/m², Panel SIP desde 21 UF/m² o Albañilería desde 25 UF/m²) y etapa de planos/DOM:</p>
                <p style="text-align:center;margin:24px 0;">
                    <a href="${COTIZADOR_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:6px;font-weight:bold;">Calcular Presupuesto Preliminar</a>
                </p>
                <p style="font-size:13px;color:#4a5568;">¿Prefieres comentarnos brevemente tu caso? Escríbenos por WhatsApp al <a href="${WA_URL}" style="color:#c05621;font-weight:bold;">+56 9 2738 4075</a>.</p>`;
            const text = `Hola ${firstNameTxt},\n\nHace unos días descargaste nuestra Guía Práctica del Permiso de Edificación en la RM. Antes de contratar planos o ingresar un expediente a la DOM, conviene validar tres puntos críticos en el terreno:\n1. Certificado de Informaciones Previas (CIP): constructibilidad, rasantes, antejardín y afectaciones.\n2. Factibilidad sanitaria y de servicios: empalmes o aprobación SEREMI de Salud en parcelas (y Art. 55 LGUC si aplica).\n3. Preexistencias en el predio: construcciones previas sin regularizar pueden detener la tramitación.\n\nSi ya tienes superficie estimada y comuna en la Región Metropolitana, calcula tu rango preliminar neto (+IVA) (Metalcom desde 19 UF/m², SIP desde 21 UF/m², Albañilería desde 25 UF/m²) en nuestro cotizador oficial:\n${COTIZADOR_URL}\n\nConsultas directas por WhatsApp: +56 9 2738 4075 (${WA_URL})\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile · www.cuatropuntas.com\nSi no deseas recibir más correos de seguimiento: ${unsubLink}`;
            return { subject, html: wrapEmailLayout({ title: 'Permiso de Edificación DOM en la RM', innerHtml, unsubUrl: unsubLink }), text };
        }

        const subject = 'De la guía PDF a un presupuesto real por m² y factibilidad en terreno';
        const innerHtml = `
            <p>Hola <strong>${firstNameHtml}</strong>,</p>
            <p>Cerramos este ciclo de orientación técnica con una idea práctica: una guía resuelve el marco general, pero el costo real y los plazos de un proyecto dependen siempre del tipo de obra, las condiciones de suelo, el emplazamiento en la Región Metropolitana y el estado de tus planos.</p>
            <p>En <strong>Constructora Cuatropuntas</strong> trabajamos con <strong>contrato a suma alzada e itemizado detallado</strong>: una vez que evaluamos tu propiedad en terreno, definimos el alcance completo —desde diseño, cálculo estructural y gestión DOM hasta el Certificado de Recepción Final Definitiva sobre lo ejecutado por nuestra constructora— con respaldo legal conforme al Art. 18 de la LGUC.</p>
            <p style="text-align:center;margin:24px 0;">
                <a href="${COTIZADOR_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:6px;font-weight:bold;margin:4px;">Ir al Cotizador Online</a>
                <a href="${CAL_URL}" style="display:inline-block;background:#1a365d;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:6px;font-weight:bold;margin:4px;">Agendar Visita Técnica a Terreno</a>
            </p>
            <p style="font-size:13px;color:#4a5568;">Si aún estás evaluando opciones sin fecha definida, puedes retomar cuando quieras en <a href="${COTIZADOR_URL}" style="color:#c05621;">www.cuatropuntas.com/#cotizador</a> o por WhatsApp al <a href="${WA_URL}" style="color:#c05621;">+56 9 2738 4075</a>.</p>`;
        const text = `Hola ${firstNameTxt},\n\nCerramos este seguimiento técnico recordando un punto práctico: una guía ordena el proceso, pero el presupuesto real depende del tipo de obra, condiciones del terreno, emplazamiento en la Región Metropolitana y etapa de planos.\n\nEn Constructora Cuatropuntas trabajamos con contrato a suma alzada e itemizado detallado y garantías legales Art. 18 LGUC, abarcando desde diseño y cálculo hasta la gestión DOM hacia el Certificado de Recepción Final Definitiva sobre las obras que ejecutamos.\n\n- Cotizador preliminar en línea: ${COTIZADOR_URL}\n- Agendar Visita Técnica a Terreno: ${CAL_URL}\n- WhatsApp: +56 9 2738 4075 (${WA_URL})\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile\nDarse de baja: ${unsubLink}`;
        return { subject, html: wrapEmailLayout({ title: 'De la Guía Técnica a tu Presupuesto Real', innerHtml, unsubUrl: unsubLink }), text };
    }

    // --- PERFIL 2: OBRA MAYOR INTEGRAL (Idea / Planos) ---
    if (profile === PROFILES.OBRA_MAYOR_INTEGRAL) {
        if (day === 3) {
            const subject = `${firstNameTxt}, cómo cerramos el presupuesto a Suma Alzada de tu ${tipoTxt} en ${comunaTxt}`;
            const innerHtml = `
                <p>Hola <strong>${firstNameHtml}</strong>,</p>
                <p>Hace unos días generaste una estimación preliminar para <strong>${resumenHtml}</strong> en <strong>${comunaHtml}</strong> (referencia <strong>${rangoHtml} UF netas, sin IVA</strong>).</p>
                <p>Sabemos que la mayor preocupación al iniciar una obra habitacional es que el presupuesto cambie a mitad de camino o que el trámite municipal quede inconcluso. Por eso nuestro proceso se sostiene en dos pilares contractuales:</p>
                <div style="background-color:#f0fdf4;border-left:4px solid #16a34a;padding:16px;margin:18px 0;border-radius:4px;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#166534;">1. Contrato a Suma Alzada y Garantías Art. 18 LGUC</p>
                    <p style="margin:0 0 10px 0;font-size:14px;color:#15803d;">Tras el levantamiento en terreno entregamos un itemizado cerrado sobre todas las partidas acordadas: sin cobros sorpresa durante la faena y con respaldo legal de 10 años en estructura, 5 años en instalaciones y 3 años en terminaciones.</p>
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#166534;">2. Gestión DOM hasta Recepción Final Definitiva</p>
                    <p style="margin:0;font-size:14px;color:#15803d;">En tu modalidad integral (diseño/cálculo y gestión municipal), cubrimos el ciclo completo desde el expediente de Permiso de Edificación hasta la obtención del <strong>Certificado de Recepción Final Definitiva</strong> exclusivamente sobre las obras ejecutadas por Cuatropuntas según planos aprobados (derechos municipales 1,5% tabla MINVU y empalmes definitivos se pagan aparte al costo real).</p>
                </div>
                <p style="font-size:13px;color:#4a5568;background:#f8fafc;padding:12px;border-radius:4px;border:1px solid #e2e8f0;"><strong>Nota de transparencia técnica:</strong> Si en el predio se ejecutan obras anexas no contratadas por el mandante o terceros (quinchos, piscinas, ampliaciones adicionales o paisajismo/obras exteriores) o existen construcciones preexistentes sin regularizar, Cuatropuntas no tramitará la Recepción Final.</p>
                <p>El siguiente paso para pasar del rango estimado a tu propuesta cerrada es revisar deslindes, suelo, cotas y preexistencias directamente en tu propiedad:</p>
                <p style="text-align:center;margin:24px 0;">
                    <a href="${CAL_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;">Agendar Visita Técnica a Terreno</a>
                </p>
                <p style="font-size:13px;color:#4a5568;">¿Quieres resolver una duda antes de agendar? Escríbenos por WhatsApp al <a href="${WA_URL}" style="color:#c05621;font-weight:bold;">+56 9 2738 4075</a>.</p>`;
            const text = `Hola ${firstNameTxt},\n\nHace unos días estimaste tu proyecto ${resumenTxt} en ${comunaTxt} (referencia ${rangoTxt} UF netas, sin IVA).\n\nPara darte certeza financiera y normativa antes de partir, trabajamos bajo dos pilares:\n1. Contrato a Suma Alzada e itemizado cerrado: presupuesto inalterable sobre las partidas acordadas y garantía legal Art. 18 LGUC (10 años estructura, 5 instalaciones, 3 terminaciones).\n2. Gestión DOM hasta Recepción Final Definitiva: en modalidad integral cubrimos desde el Permiso de Edificación hasta el Certificado de Recepción Final Definitiva exclusivamente sobre lo ejecutado por Cuatropuntas según planos aprobados (derechos municipales 1,5% MINVU y empalmes aparte al costo real).\n\nNota de transparencia: si el mandante o terceros ejecutan obras anexas no contratadas (quinchos, piscinas, ampliaciones adicionales o paisajismo/exteriores) o existen construcciones preexistentes sin regularizar en el predio, Cuatropuntas no tramitará la Recepción Final.\n\nPara levantar suelo, cotas y preexistencias y emitir tu presupuesto formal cerrado:\nAgendar Visita Técnica a Terreno: ${CAL_URL}\nWhatsApp: +56 9 2738 4075 (${WA_URL})\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile\nDarse de baja: ${unsubLink}`;
            return { subject, html: wrapEmailLayout({ title: 'Suma Alzada y Gestión DOM Integral', innerHtml, unsubUrl: unsubLink }), text };
        }

        const subject = `${firstNameTxt}, cupos de inspección en terreno para tu proyecto en ${comunaTxt}`;
        const innerHtml = `
            <p>Hola <strong>${firstNameHtml}</strong>,</p>
            <p>Queremos hacer un breve seguimiento respecto a tu cotización preliminar para <strong>${resumenHtml}</strong> en <strong>${comunaHtml}</strong> (${rangoHtml} UF netas, sin IVA).</p>
            <p>Para mantener la supervisión directa de nuestros directores de obra y protocolos de faena limpia (especialmente clave si se trata de ampliaciones o segundos pisos planificados por etapas para minimizar impacto en tu rutina diaria), limitamos el inicio simultáneo a un máximo de <strong>3 a 4 faenas por mes</strong>.</p>
            <p>En la visita técnica en terreno auditamos cuatro aspectos concretos para entregarte tu presupuesto formal a suma alzada:</p>
            <ul style="font-size:14px;color:#2d3748;line-height:1.6;">
                <li>Capacidad de carga de suelo o estructura existente, deslindes y pendientes.</li>
                <li>Factibilidad de empalmes sanitarios/eléctricos y preexistencias frente a la DOM.</li>
                <li>Definición exacta de especificaciones técnicas y terminaciones (niveles Base, Confort DVH o Premium).</li>
                <li>Carta Gantt realista y ruta crítica desde permiso municipal hasta Recepción Final Definitiva.</li>
            </ul>
            <p style="text-align:center;margin:24px 0;">
                <a href="${CAL_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;">Agendar Visita Técnica a Terreno</a>
            </p>
            <p style="font-size:13px;color:#4a5568;">Si tu proyecto está previsto para más adelante o quieres ajustar m²/materialidad, cuéntanos por WhatsApp al <a href="${WA_URL}" style="color:#c05621;">+56 9 2738 4075</a> o genera una nueva simulación en <a href="${COTIZADOR_URL}" style="color:#c05621;">www.cuatropuntas.com/#cotizador</a>.</p>`;
        const text = `Hola ${firstNameTxt},\n\nHacemos un breve seguimiento sobre tu estimación para ${resumenTxt} en ${comunaTxt} (${rangoTxt} UF netas, sin IVA).\n\nPara resguardar supervisión directa y faena limpia (especialmente en obras o ampliaciones planificadas por etapas para minimizar impacto en tu rutina), iniciamos un máximo de 3 a 4 faenas por mes.\n\nEn la Visita Técnica en Terreno revisamos suelo o estructura existente, empalmes y preexistencias DOM, nivel de terminaciones y carta Gantt realista hasta Recepción Final Definitiva, entregándote luego tu presupuesto formal a Suma Alzada.\n\nAgendar Visita Técnica a Terreno: ${CAL_URL}\nWhatsApp: +56 9 2738 4075 (${WA_URL})\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile\nDarse de baja: ${unsubLink}`;
        return { subject, html: wrapEmailLayout({ title: 'Evaluación Técnica en Terreno', innerHtml, unsubUrl: unsubLink }), text };
    }

    // --- PERFIL 3: OBRA MAYOR SOLO EJECUCIÓN (PermisoAprobado / ArquitectoPropio) ---
    if (profile === PROFILES.OBRA_MAYOR_EJECUCION) {
        if (day === 3) {
            const subject = `${firstNameTxt}, cómo ejecutamos fielmente los planos de tu arquitecto (Libro de Obras + SEC)`;
            const innerHtml = `
                <p>Hola <strong>${firstNameHtml}</strong>,</p>
                <p>Vimos en tu cotización para <strong>${resumenHtml}</strong> en <strong>${comunaHtml}</strong> (${rangoHtml} UF netas, sin IVA) que ya cuentas con <strong>permiso DOM aprobado o arquitecto propio</strong>, por lo que aplicó automáticamente nuestra modalidad de <strong>solo ejecución material de obra (-6%)</strong>.</p>
                <p>Sabemos lo que exige un arquitecto patrocinante y un mandante en obra cuando el expediente ya está encaminado: cero improvisaciones en terreno y respaldo técnico impecable para que la Recepción Final avance sin reparos.</p>
                <div style="background-color:#f8fafc;border-left:4px solid #1a365d;padding:16px;margin:18px 0;border-radius:4px;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#1a365d;">Qué incluye nuestra Carpeta Técnica del Constructor:</p>
                    <ul style="margin:0;padding-left:18px;font-size:14px;color:#2d3748;">
                        <li><strong>Ejecución fiel a EETT y planos aprobados:</strong> Cubicaciones y contrato a Suma Alzada sin partidas ocultas, bajo dirección coordinada con tu arquitecto.</li>
                        <li><strong>Libro de Obras reglamentario al día (Art. 1.2.9 OGUC):</strong> Registro continuo de hitos, hormigonado, recepción de enfierradura e inspecciones.</li>
                        <li><strong>Seguridad y faena limpia (Art. 5.8.3 OGUC):</strong> Cierres provisorios, orden de faena y trazabilidad de materiales.</li>
                        <li><strong>Certificados SEC e instalaciones listos:</strong> Entrega formal de declaraciones <strong>TE1</strong> (eléctrica) y <strong>TC6</strong> (gas), pruebas de presión sanitaria e informes de calidad para que tu arquitecto gestione la Recepción Final ante la DOM.</li>
                    </ul>
                </div>
                <p>Si quieres que revisemos los planos y especificaciones en tu terreno para emitir un presupuesto formal a suma alzada:</p>
                <p style="text-align:center;margin:24px 0;">
                    <a href="${CAL_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;">Agendar Visita Técnica a Terreno</a>
                </p>
                <p style="font-size:13px;color:#4a5568;">También puedes enviarnos tus planos o dudas técnicas por WhatsApp al <a href="${WA_URL}" style="color:#c05621;font-weight:bold;">+56 9 2738 4075</a> o a <a href="mailto:contacto@cuatropuntas.com" style="color:#c05621;">contacto@cuatropuntas.com</a>.</p>`;
            const text = `Hola ${firstNameTxt},\n\nEn tu cotización para ${resumenTxt} en ${comunaTxt} (${rangoTxt} UF netas, sin IVA) indicaste contar con Permiso DOM aprobado o arquitecto propio (modalidad solo ejecución de obra -6%).\n\nTrabajamos coordinados con tu arquitecto patrocinante bajo contrato a Suma Alzada, entregando al cierre la Carpeta Técnica del Constructor completa para que gestione su Recepción Final sin trabas:\n- Ejecución fiel a planos aprobados y especificaciones técnicas (EETT).\n- Libro de Obras reglamentario al día (Art. 1.2.9 OGUC) y faena ordenada (Art. 5.8.3 OGUC).\n- Certificados SEC TE1 (electricidad) y TC6 (gas), pruebas sanitarias e informes de calidad.\n\nCoordina la revisión de antecedentes y terreno para presupuesto formal cerrado:\nAgendar Visita Técnica a Terreno: ${CAL_URL}\nWhatsApp: +56 9 2738 4075 (${WA_URL}) · Email: contacto@cuatropuntas.com\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile\nDarse de baja: ${unsubLink}`;
            return { subject, html: wrapEmailLayout({ title: 'Ejecución Fiel a Planos y Carpeta Técnica', innerHtml, unsubUrl: unsubLink }), text };
        }

        const subject = `${firstNameTxt}, presupuesto cerrado sobre planos para iniciar tu obra sin sobrecostos`;
        const innerHtml = `
            <p>Hola <strong>${firstNameHtml}</strong>,</p>
            <p>Cuando ya tienes arquitectura o permiso municipal, la clave para no desfinanciar el proyecto está en transformar los planos en un <strong>itemizado detallado a suma alzada</strong> antes de mover el primer metro cúbico de tierra.</p>
            <p>En <strong>Constructora Cuatropuntas</strong> respaldamos nuestra ejecución con garantías legales conforme al <strong>Art. 18 de la LGUC</strong> (10 años estructura, 5 instalaciones, 3 terminaciones) y limitamos nuestra agenda a <strong>3–4 faenas simultáneas al mes</strong> para asegurar supervisión permanente en obra.</p>
            <p>Si deseas que visitemos tu propiedad en <strong>${comunaHtml}</strong> (idealmente junto a tus planos o con tu arquitecto) para levantar cotas, accesos de faena y entregarte una propuesta constructiva cerrada:</p>
            <p style="text-align:center;margin:24px 0;">
                <a href="${CAL_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;">Agendar Visita Técnica a Terreno</a>
            </p>
            <p style="font-size:13px;color:#4a5568;">¿Prefieres compartir primero los planos en PDF/DWG para pre-evaluación? Respóndenos a <a href="mailto:contacto@cuatropuntas.com" style="color:#c05621;">contacto@cuatropuntas.com</a> o escríbenos por <a href="${WA_URL}" style="color:#c05621;">WhatsApp +56 9 2738 4075</a>.</p>`;
        const text = `Hola ${firstNameTxt},\n\nTeniendo planos o permiso aprobado, el paso decisivo es convertir el proyecto en un itemizado detallado a Suma Alzada antes de iniciar excavaciones.\n\nEn Constructora Cuatropuntas respaldamos tu obra con garantías Art. 18 LGUC (10/5/3 años), supervisión directa (máx. 3–4 faenas por mes) y entrega de carpeta técnica completa (Libro de Obras + certificados SEC TE1/TC6).\n\nAgenda una inspección en terreno para evaluar accesos, niveles y entregarte tu presupuesto formal cerrado:\nAgendar Visita Técnica a Terreno: ${CAL_URL}\nO envíanos tus planos en PDF/DWG a contacto@cuatropuntas.com / WhatsApp +56 9 2738 4075 (${WA_URL}).\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile\nDarse de baja: ${unsubLink}`;
        return { subject, html: wrapEmailLayout({ title: 'Presupuesto Cerrado Sobre Planos', innerHtml, unsubUrl: unsubLink }), text };
    }

    // --- PERFIL 4: QUINCHOS Y REMODELACIONES ---
    if (day === 3) {
        if (variant === 'quincho') {
            const subject = `${firstNameTxt}, detalle técnico y plazos reales de tu Quincho en ${comunaTxt}`;
            const innerHtml = `
                <p>Hola <strong>${firstNameHtml}</strong>,</p>
                <p>Revisamos tu estimación preliminar para <strong>${resumenHtml}</strong> en <strong>${comunaHtml}</strong> (referencia <strong>${rangoHtml} UF netas, sin IVA</strong>).</p>
                <p>Para que compares presupuestos con total transparencia antes de decidir, te detallamos qué contempla nuestra tarifa paramétrica base de quincho (desde 12 UF/m² +IVA en estructura ligera / 15 UF/m² +IVA en albañilería) y qué definimos en terreno:</p>
                <div style="background-color:#fffaf5;border-left:4px solid #c05621;padding:16px;margin:18px 0;border-radius:4px;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#9c4221;">Alcance Base Incluido (Plazo referencial: 4 a 8 semanas)</p>
                    <p style="margin:0 0 10px 0;font-size:14px;color:#2d3748;">Cobertizo o techumbre estructural, radier de hormigón afinado, parrilla tradicional en obra revestida en ladrillos refractarios con mecanismo elevable y manivela frontal, campana de hojalatería con tiraje dimensionado y mesón de apoyo lateral básico.</p>
                    <p style="margin:0 0 6px 0;font-weight:bold;color:#9c4221;">Partidas a cubicar en visita técnica (según tu diseño):</p>
                    <p style="margin:0;font-size:14px;color:#2d3748;">Empalmes de agua potable y desagües a cámara de alcantarillado, canalización eléctrica desde tablero e iluminación decorativa, muebles cerrados bajo mesón (puertas/cajoneras), cubiertas en granito/cuarzo y accesorios como spiedo motorizado.</p>
                </div>
                <p>Ejecutamos bajo protocolos de <strong>faena limpia y acopio ordenado</strong>, planificando las etapas para minimizar el impacto en la rutina diaria de tu casa habitada.</p>
                <p style="text-align:center;margin:24px 0;">
                    <a href="${CAL_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;">Agendar Visita Técnica a Terreno</a>
                </p>
                <p style="font-size:13px;color:#4a5568;">¿Quieres afinar medidas o incorporar lavacopas/muebles? Escríbenos por WhatsApp al <a href="${WA_URL}" style="color:#c05621;font-weight:bold;">+56 9 2738 4075</a>.</p>`;
            const text = `Hola ${firstNameTxt},\n\nRevisamos tu estimación preliminar para ${resumenTxt} en ${comunaTxt} (${rangoTxt} UF netas, sin IVA).\n\nCon total transparencia, te recordamos qué incluye la tarifa base (desde 12 UF/m² Metalcom o 15 UF/m² Albañilería, plazo referencial 4 a 8 semanas):\n- Incluido: techumbre/cobertizo, radier afinado, parrilla tradicional en obra con ladrillos refractarios y manivela frontal elevable, campana con tiraje y mesón básico.\n- A cubicar en visita técnica: redes sanitarias (agua y desagües), canalización eléctrica desde tablero, muebles cerrados bajo mesón, cubiertas de piedra natural y spiedos motorizados.\n\nTrabajamos con protocolos de faena limpia y programación por etapas para minimizar el impacto en tu hogar habitado.\n\nAgenda la visita de cubicación en terreno para recibir tu presupuesto cerrado a Suma Alzada:\nAgendar Visita Técnica a Terreno: ${CAL_URL}\nWhatsApp: +56 9 2738 4075 (${WA_URL})\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile\nDarse de baja: ${unsubLink}`;
            return { subject, html: wrapEmailLayout({ title: 'Alcance Técnico y Plazos de tu Quincho', innerHtml, unsubUrl: unsubLink }), text };
        }

        const subject = `${firstNameTxt}, cómo planificamos tu remodelación en casa habitada sin sorpresas`;
        const innerHtml = `
            <p>Hola <strong>${firstNameHtml}</strong>,</p>
            <p>Revisamos tu estimación para <strong>${resumenHtml}</strong> en <strong>${comunaHtml}</strong> (referencia <strong>${rangoHtml} UF netas, sin IVA</strong>).</p>
            <p>En una remodelación —especialmente cuando hay recintos húmedos como baños o cocinas o la vivienda está habitada— la tranquilidad depende de la planificación previa, no de promesas irreales:</p>
            <div style="background-color:#f8fafc;border-left:4px solid #c05621;padding:16px;margin:18px 0;border-radius:4px;">
                <ul style="margin:0;padding-left:18px;font-size:14px;color:#2d3748;line-height:1.6;">
                    <li><strong>Faena limpia y ejecución por etapas:</strong> Sectorizamos zonas de trabajo con cierres antipolvo, protección de pisos existentes y retiro ordenado de escombros para minimizar el impacto en tu rutina diaria (plazo típico: 1 a 3 meses según alcance).</li>
                    <li><strong>Redes e impermeabilización certificada:</strong> Baños (65–95 UF +IVA) y cocinas (90–160 UF +IVA) se presupuestan por densidad técnica de instalaciones, no por simple m² lineal.</li>
                    <li><strong>Protocolo transparente ante vicios ocultos:</strong> Inspeccionamos cañerías, circuitos y muros antes de cerrar. Si al picar aparece una anomalía oculta preexistente, emitimos informe técnico y cotización complementaria aprobada previamente por ti.</li>
                </ul>
            </div>
            <p>Para medir en detalle los recintos, verificar descargas/electricidad y entregarte un presupuesto cerrado a <strong>Suma Alzada</strong> (con garantías Art. 18 LGUC):</p>
            <p style="text-align:center;margin:24px 0;">
                <a href="${CAL_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;">Agendar Visita Técnica a Terreno</a>
            </p>
            <p style="font-size:13px;color:#4a5568;">Consultas rápidas por WhatsApp: <a href="${WA_URL}" style="color:#c05621;font-weight:bold;">+56 9 2738 4075</a>.</p>`;
        const text = `Hola ${firstNameTxt},\n\nRevisamos tu estimación para ${resumenTxt} en ${comunaTxt} (${rangoTxt} UF netas, sin IVA).\n\nPara remodelar con orden en casa habitada (plazo típico 1 a 3 meses), trabajamos bajo tres reglas claras:\n1. Faena limpia y ejecución por etapas: cierres antipolvo, protección de áreas y retiro controlado de escombros para minimizar el impacto en tu rutina diaria.\n2. Rigor en redes húmedas: baños (65-95 UF +IVA) y cocinas (90-160 UF +IVA) contemplan densidad técnica de instalaciones e impermeabilización, y las remodelaciones generales parten desde 11-13 UF/m² +IVA.\n3. Protocolo ante preexistencias: si al descubrir muros o losas surge un vicio oculto, emitimos informe técnico y presupuesto complementario aprobado por ti antes de ejecutar.\n\nAgenda la visita de cubicación en terreno para cerrar tu presupuesto a Suma Alzada:\nAgendar Visita Técnica a Terreno: ${CAL_URL}\nWhatsApp: +56 9 2738 4075 (${WA_URL})\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile\nDarse de baja: ${unsubLink}`;
        return { subject, html: wrapEmailLayout({ title: 'Planificación de Remodelación por Etapas', innerHtml, unsubUrl: unsubLink }), text };
    }

    // Día 7 común Quincho / Remodelación
    const subject = `${firstNameTxt}, último paso para cubicar en terreno tu proyecto en ${comunaTxt}`;
    const innerHtml = `
        <p>Hola <strong>${firstNameHtml}</strong>,</p>
        <p>Queremos confirmar si sigues evaluando tu proyecto <strong>${resumenHtml}</strong> en <strong>${comunaHtml}</strong> (${rangoHtml} UF netas, sin IVA) o si ya definiste fecha tentativa de inicio.</p>
        <p>En obras en propiedades existentes (quinchos y remodelaciones), una <strong>visita técnica de cubicación de 30–40 minutos</strong> evita diferencias posteriores: revisamos puntos reales de agua, desagüe, tablero eléctrico, muros portantes o cotas de patio, y con eso emitimos un presupuesto definitivo cerrado a <strong>Suma Alzada</strong>.</p>
        <p>Recuerda que ejecutamos un máximo de 3 a 4 proyectos simultáneos al mes para mantener supervisión directa en obra y respaldo legal Art. 18 LGUC.</p>
        <p style="text-align:center;margin:24px 0;">
            <a href="${CAL_URL}" style="display:inline-block;background:#c05621;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;">Agendar Visita Técnica a Terreno</a>
        </p>
        <p style="font-size:13px;color:#4a5568;">¿Prefieres coordinar horario o ajustar el alcance primero? Escríbenos por WhatsApp al <a href="${WA_URL}" style="color:#c05621;font-weight:bold;">+56 9 2738 4075</a> o simula otra opción en <a href="${COTIZADOR_URL}" style="color:#c05621;">www.cuatropuntas.com/#cotizador</a>.</p>`;
    const text = `Hola ${firstNameTxt},\n\nQueremos confirmar si sigues evaluando tu proyecto ${resumenTxt} en ${comunaTxt} (${rangoTxt} UF netas, sin IVA).\n\nEn quinchos y remodelaciones, una visita técnica de cubicación en terreno (30-40 min) permite verificar puntos reales de agua, alcantarillado, tablero eléctrico, niveles o muros existentes, y entregarte tu presupuesto formal cerrado a Suma Alzada con respaldo Art. 18 LGUC.\n\nAgenda tu evaluación en terreno aquí:\nAgendar Visita Técnica a Terreno: ${CAL_URL}\nWhatsApp: +56 9 2738 4075 (${WA_URL})\n\n---\nConstructora Cuatropuntas SpA · Santiago de Chile\nDarse de baja: ${unsubLink}`;
    return { subject, html: wrapEmailLayout({ title: 'Cubicación Técnica en Terreno', innerHtml, unsubUrl: unsubLink }), text };
}

function createPooledSmtpTransport() {
    const zohoUser = process.env.ZOHO_USER || 'contacto@cuatropuntas.com';
    const zohoPass = process.env.ZOHO_PASS;
    if (!zohoPass) return null;

    return nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 465,
        secure: true,
        pool: true,
        maxConnections: 1,
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 3000,
        auth: {
            user: zohoUser,
            pass: zohoPass
        }
    });
}

function classifySmtpError(err) {
    const code = Number(err && (err.responseCode || err.statusCode)) || 0;
    const msg = String((err && (err.code || err.message)) || '').toUpperCase();
    if (
        code === 421 || code === 450 || code === 451 || code === 454 || code === 535 ||
        msg.includes('EAUTH') || msg.includes('ETIMEDOUT') || msg.includes('ECONNECTION') || msg.includes('ESOCKET')
    ) {
        return 'CIRCUIT_BREAK';
    }
    if (code >= 500 && code < 600) {
        return 'PERMANENT_BOUNCE';
    }
    return 'TRANSIENT_OR_UNKNOWN';
}

async function runNurturingDispatch({
    dryRun = false,
    nowTs = Date.now(),
    transportFactory = null,
    maxBatch = DEFAULT_MAX_BATCH,
    timeBudgetMs = DEFAULT_TIME_BUDGET_MS
} = {}) {
    if (process.env.NURTURING_ENABLED === 'false') {
        return { ok: true, skipped: true, reason: 'NURTURING_DISABLED', sent: 0, previews: [] };
    }

    const startTime = Date.now();
    let lockId = null;

    if (!dryRun) {
        if (!getUnsubSecret()) {
            return { ok: false, error: 'UNSUBSCRIBE_SECRET_NOT_CONFIGURED', sent: 0 };
        }
        lockId = await leadsState.acquireNurturingLock(30);
        if (!lockId) {
            return { ok: true, skipped: true, reason: 'LOCK_BUSY', sent: 0, previews: [] };
        }
    }

    let transporter = null;
    try {
        const records = await leadsState.scanAllLeadRecords();
        const emails = [...new Set(records.map(r => leadsState.normalizeEmail(r?.data?.email)).filter(e => e && e.includes('@')))];
        const [unsubMap, nurturingMap] = await Promise.all([
            leadsState.getUnsubMap(emails),
            leadsState.getNurturingStatesMap(emails)
        ]);

        const { candidates, skipped } = consolidateAndClassifyLeads(records, unsubMap, nurturingMap, nowTs);
        const existingNurturingMap = nurturingMap;

        const sentItems = [];
        const previews = [];
        const errors = [];
        let abortedReason = null;

        if (!dryRun && candidates.length > 0) {
            transporter = typeof transportFactory === 'function' ? transportFactory() : createPooledSmtpTransport();
            if (!transporter) {
                return {
                    ok: false,
                    error: 'SMTP_NOT_CONFIGURED',
                    candidatesCount: candidates.length,
                    sent: 0,
                    skippedCount: skipped.length
                };
            }
        }

        const zohoUser = process.env.ZOHO_USER || 'contacto@cuatropuntas.com';

        for (const item of candidates) {
            if (sentItems.length >= maxBatch || previews.length >= maxBatch) {
                abortedReason = 'MAX_BATCH_REACHED';
                break;
            }
            if ((Date.now() - startTime) >= timeBudgetMs) {
                abortedReason = 'TIME_BUDGET_REACHED';
                break;
            }

            const unsubUrl = buildUnsubscribeUrl(item.email);
            const rendered = renderNurturingEmail({
                profile: item.profile,
                variant: item.variant,
                day: item.day,
                lead: item.lead,
                unsubUrl
            });

            if (dryRun) {
                previews.push({
                    email: item.email,
                    profile: item.profile,
                    variant: item.variant,
                    day: item.day,
                    subject: rendered.subject
                });
                continue;
            }

            try {
                await transporter.sendMail({
                    from: `"Constructora Cuatropuntas SpA" <${zohoUser}>`,
                    to: item.email,
                    replyTo: zohoUser,
                    subject: rendered.subject,
                    html: rendered.html,
                    text: rendered.text,
                    headers: {
                        'List-Unsubscribe': `<${unsubUrl}>`,
                        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
                    }
                });

                await leadsState.saveNurturingState(item.email, {
                    profile: item.profile,
                    variant: item.variant,
                    lastSentDay: item.day,
                    lastSentAt: Date.now(),
                    originTs: item.originTs,
                    failures: 0,
                    lastError: null
                });

                sentItems.push({
                    email: item.email,
                    profile: item.profile,
                    variant: item.variant,
                    day: item.day
                });
            } catch (smtpErr) {
                const kind = classifySmtpError(smtpErr);
                errors.push({ email: item.email, kind, message: smtpErr.message });

                if (kind === 'CIRCUIT_BREAK') {
                    abortedReason = `SMTP_CIRCUIT_BREAKER:${smtpErr.responseCode || smtpErr.code || smtpErr.message}`;
                    break;
                }

                if (kind === 'PERMANENT_BOUNCE') {
                    const prev = existingNurturingMap.get(item.email);
                    const prevFailures = (prev && prev.profile === item.profile) ? Number(prev.failures || 0) : 0;
                    await leadsState.saveNurturingState(item.email, {
                        profile: item.profile,
                        variant: item.variant,
                        lastSentDay: (prev && prev.profile === item.profile) ? Number(prev.lastSentDay || 0) : 0,
                        originTs: item.originTs,
                        failures: prevFailures + 1,
                        lastError: String(smtpErr.message || 'SMTP_5XX').slice(0, 160)
                    });
                }
            }
        }

        return {
            ok: true,
            dryRun: Boolean(dryRun),
            scannedRecords: records.length,
            uniqueEmails: emails.length,
            eligibleCount: candidates.length,
            sent: sentItems.length,
            sentItems,
            previews,
            skippedCount: skipped.length,
            errors,
            abortedReason,
            durationMs: Date.now() - startTime
        };
    } finally {
        if (transporter && typeof transporter.close === 'function') {
            try { transporter.close(); } catch {}
        }
        if (lockId) {
            await leadsState.releaseNurturingLock(lockId);
        }
    }
}

function parseBodySafe(req) {
    let body = req && req.body;
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch {
            const params = new URLSearchParams(body);
            const obj = {};
            for (const [k, v] of params.entries()) obj[k] = v;
            return obj;
        }
    }
    if (Buffer.isBuffer(body)) {
        return parseBodySafe({ body: body.toString('utf8') });
    }
    return body && typeof body === 'object' ? body : {};
}

async function handleCronRequest(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }
    if (!isAuthorizedCronRequest(req)) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const body = parseBodySafe(req);
    const query = (req && req.query) || {};
    const dryRun =
        query.dryRun === '1' ||
        query.dryRun === 'true' ||
        query.dryRun === true ||
        body.dryRun === true ||
        body.dryRun === 'true';

    const result = await runNurturingDispatch({ dryRun });
    const status = result.ok === false ? 500 : 200;
    return res.status(status).json(result);
}

function renderUnsubHtml({ title, bodyHtml }) {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="font-family:Arial,sans-serif;background:#f8fafc;color:#1a202c;padding:32px 16px;"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:28px;">${bodyHtml}</div></body></html>`;
}

async function handleUnsubscribeRequest(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const query = (req && req.query) || {};
    const body = parseBodySafe(req);
    const rawEmail = query.email || body.email || '';
    const email = leadsState.normalizeEmail(rawEmail);
    const token = query.token || body.token || '';

    const wantsJson = String((req.headers && (req.headers.accept || req.headers.Accept)) || '').includes('application/json');

    if (!verifyUnsubscribeToken(email, token)) {
        if (wantsJson) {
            return res.status(403).json({ ok: false, error: 'Token de baja inválido o expirado.' });
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(403).send(renderUnsubHtml({
            title: 'Enlace inválido — Cuatropuntas',
            bodyHtml: '<h2 style="color:#c05621;margin-top:0;">Enlace de baja inválido</h2><p>No fue posible validar la firma de seguridad de esta solicitud.</p><p><a href="https://www.cuatropuntas.com" style="color:#1a365d;">Volver a Cuatropuntas</a></p>'
        }));
    }

    const safeEmail = escapeHtml(email);
    const safeToken = escapeHtml(token);

    if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(renderUnsubHtml({
            title: 'Confirmar baja de correos — Cuatropuntas',
            bodyHtml: `<h2 style="color:#1a365d;margin-top:0;">Confirmar baja de seguimiento</h2><p>¿Deseas dejar de recibir correos de seguimiento técnico para <strong>${safeEmail}</strong>?</p><form method="POST" action="/api/unsubscribe?email=${encodeURIComponent(email)}&amp;token=${encodeURIComponent(token)}"><input type="hidden" name="email" value="${safeEmail}"><input type="hidden" name="token" value="${safeToken}"><button type="submit" style="background:#c05621;color:#fff;border:none;padding:12px 22px;border-radius:6px;font-weight:bold;cursor:pointer;">Confirmar baja de correos</button></form>`
        }));
    }

    await leadsState.markUnsubscribed(email);

    if (wantsJson) {
        return res.status(200).json({ ok: true, unsubscribed: true, email });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderUnsubHtml({
        title: 'Baja confirmada — Cuatropuntas',
        bodyHtml: `<h2 style="color:#166534;margin-top:0;">Baja confirmada</h2><p>El correo <strong>${safeEmail}</strong> ha sido dado de baja de nuestra secuencia automatizada de seguimiento.</p><p><a href="https://www.cuatropuntas.com" style="color:#1a365d;">Volver a www.cuatropuntas.com</a></p>`
    }));
}

module.exports = {
    PROFILES,
    DAY3_MIN_MS,
    DAY7_MIN_MS,
    MAX_AGE_MS,
    DEFAULT_MAX_BATCH,
    DEFAULT_TIME_BUDGET_MS,
    escapeHtml,
    signUnsubscribeToken,
    verifyUnsubscribeToken,
    buildUnsubscribeUrl,
    isAuthorizedCronRequest,
    classifyQuotedProfile,
    consolidateAndClassifyLeads,
    renderNurturingEmail,
    runNurturingDispatch,
    handleCronRequest,
    handleUnsubscribeRequest
};
