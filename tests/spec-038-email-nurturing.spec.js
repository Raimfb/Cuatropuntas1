const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function createMockRes() {
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
        send(payload) { this.body = payload; return this; },
        end() { return this; }
    };
    return res;
}

test.describe('Spec 038: Secuencia Automatizada de Nurturing por Email (4 Perfiles)', () => {

    let origCronSecret;
    let origUnsubSecret;
    let origNurturingEnabled;
    let origZohoPass;
    let origKvUrl;
    let origKvToken;

    test.beforeEach(() => {
        origCronSecret = process.env.CRON_SECRET;
        origUnsubSecret = process.env.NURTURING_UNSUB_SECRET;
        origNurturingEnabled = process.env.NURTURING_ENABLED;
        origZohoPass = process.env.ZOHO_PASS;
        origKvUrl = process.env.KV_REST_API_URL;
        origKvToken = process.env.KV_REST_API_TOKEN;

        delete process.env.KV_REST_API_URL;
        delete process.env.KV_REST_API_TOKEN;
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        delete process.env.WHATSAPP_TOKEN;
        process.env.CRON_SECRET = 'test_cron_secret_038';
        process.env.NURTURING_UNSUB_SECRET = 'test_unsub_secret_038';
        process.env.NURTURING_ENABLED = 'true';

        require('../lib/leads-state').resetStateStore();
        require('../lib/meta-client').clearSentMessages();
    });

    test.afterEach(() => {
        const restore = (k, v) => {
            if (v === undefined) delete process.env[k];
            else process.env[k] = v;
        };
        restore('CRON_SECRET', origCronSecret);
        restore('NURTURING_UNSUB_SECRET', origUnsubSecret);
        restore('NURTURING_ENABLED', origNurturingEnabled);
        restore('ZOHO_PASS', origZohoPass);
        restore('KV_REST_API_URL', origKvUrl);
        restore('KV_REST_API_TOKEN', origKvToken);
    });

    test('T038.1: Clasificación exclusiva en los 4 perfiles (incluyendo adminBadge heredado, hasQuoted undefined y tie-breaker)', () => {
        const { PROFILES, DAY3_MIN_MS, consolidateAndClassifyLeads } = require('../api/_emailNurturing');
        const now = Date.now();
        const age80h = now - (DAY3_MIN_MS + 8 * 3600 * 1000);

        const records = [
            // Perfil 1A: Guía permiso (hasQuoted undefined heredado)
            { key: 'lead:email:guia1@ejemplo.cl', data: { email: 'guia1@ejemplo.cl', estado: 'LEAD_GUIA_DOM', guia: 'permiso-edificacion', createdAt: age80h, updatedAt: age80h } },
            // Perfil 1B: Guía recepción final
            { key: 'lead:email:guia2@ejemplo.cl', data: { email: 'guia2@ejemplo.cl', estado: 'LEAD_GUIA_DOM', guia: 'recepcion-final', createdAt: age80h, updatedAt: age80h } },
            // Perfil 2: Obra Mayor Integral vía adminBadge heredado de api/quote.js
            { key: 'lead:56911111111', data: { email: 'integral@ejemplo.cl', estado: 'COTIZADO', hasQuoted: true, tipo: 'Casa Nueva', permisos: 'PROYECTO COMPLETO (Diseño + DOM + Construcción)', createdAt: age80h, updatedAt: age80h } },
            // Perfil 3: Obra Mayor Solo Ejecución vía adminBadge y vía permisosKey
            { key: 'lead:56922222222', data: { email: 'ejecucion1@ejemplo.cl', estado: 'COTIZADO', hasQuoted: true, tipo: 'Ampliacion', permisos: 'PERMISO DOM APROBADO (Listo para inicio inmediato)', createdAt: age80h, updatedAt: age80h } },
            { key: 'lead:56933333333', data: { email: 'ejecucion2@ejemplo.cl', estado: 'COTIZADO', hasQuoted: true, tipo: 'segundo_piso', permisosKey: 'ArquitectoPropio', createdAt: age80h, updatedAt: age80h } },
            // Perfil 4: Quincho y Remodelación
            { key: 'lead:56944444444', data: { email: 'quincho@ejemplo.cl', estado: 'COTIZADO', hasQuoted: true, tipo: 'Quincho', createdAt: age80h, updatedAt: age80h } },
            { key: 'lead:56955555555', data: { email: 'remodela@ejemplo.cl', estado: 'COTIZADO', hasQuoted: true, tipo: 'Remodelacion', createdAt: age80h, updatedAt: age80h } },
            // Multi-cotización mismo email: gana la más reciente (Quincho sobre Casa Nueva)
            { key: 'lead:56966666661', data: { email: 'multi@ejemplo.cl', estado: 'COTIZADO', hasQuoted: true, tipo: 'Casa Nueva', permisosKey: 'Idea', quotedAt: now - 110 * 3600 * 1000, updatedAt: now - 110 * 3600 * 1000 } },
            { key: 'lead:56966666662', data: { email: 'multi@ejemplo.cl', estado: 'COTIZADO', hasQuoted: true, tipo: 'Quincho', quotedAt: age80h, updatedAt: age80h } }
        ];

        const { candidates } = consolidateAndClassifyLeads(records, new Map(), new Map(), now);
        const byEmail = new Map(candidates.map(c => [c.email, c]));

        expect(byEmail.get('guia1@ejemplo.cl')).toMatchObject({ profile: PROFILES.GUIA_DOM, variant: 'permiso-edificacion', day: 3 });
        expect(byEmail.get('guia2@ejemplo.cl')).toMatchObject({ profile: PROFILES.GUIA_DOM, variant: 'recepcion-final', day: 3 });
        expect(byEmail.get('integral@ejemplo.cl')).toMatchObject({ profile: PROFILES.OBRA_MAYOR_INTEGRAL, day: 3 });
        expect(byEmail.get('ejecucion1@ejemplo.cl')).toMatchObject({ profile: PROFILES.OBRA_MAYOR_EJECUCION, day: 3 });
        expect(byEmail.get('ejecucion2@ejemplo.cl')).toMatchObject({ profile: PROFILES.OBRA_MAYOR_EJECUCION, day: 3 });
        expect(byEmail.get('quincho@ejemplo.cl')).toMatchObject({ profile: PROFILES.QUINCHO_REMODELACION, variant: 'quincho', day: 3 });
        expect(byEmail.get('remodela@ejemplo.cl')).toMatchObject({ profile: PROFILES.QUINCHO_REMODELACION, variant: 'remodelacion', day: 3 });
        expect(byEmail.get('multi@ejemplo.cl')).toMatchObject({ profile: PROFILES.QUINCHO_REMODELACION, variant: 'quincho', day: 3 });
    });

    test('T038.2: Cadencia temporal exacta (72h Día 3, 168h Día 7, catch-up sin duplicar, 336h expiración)', async () => {
        const leadsState = require('../lib/leads-state');
        const { runNurturingDispatch } = require('../api/_emailNurturing');
        const h = 3600 * 1000;
        const baseTs = Date.now() - (2 * 24 * h); // Dentro del TTL real de 14 días

        // Lead A: en 71h (aún no elegible), luego 73h (Día 3), luego 170h (Día 7)
        leadsState.setLeadState('56910000001', {
            name: 'Camila Díaz',
            email: 'camila@ejemplo.cl',
            estado: 'COTIZADO',
            hasQuoted: true,
            tipo: 'Casa Nueva',
            permisosKey: 'Idea',
            quotedAt: baseTs,
            createdAt: baseTs,
            updatedAt: Date.now()
        });

        // Lead B: en 73h (Día 3) y 170h (Día 7)
        leadsState.setLeadState('56910000002', {
            name: 'Pedro Lagos',
            email: 'pedro@ejemplo.cl',
            estado: 'COTIZADO',
            hasQuoted: true,
            tipo: 'Quincho',
            quotedAt: baseTs,
            createdAt: baseTs,
            updatedAt: Date.now()
        });

        const sentMails = [];
        const mockTransportFactory = () => ({
            sendMail: async (mail) => { sentMails.push(mail); return { messageId: 'ok' }; },
            close: () => {}
        });

        // 1) A las 71h: ninguno debe recibir Día 3
        const r71 = await runNurturingDispatch({ nowTs: baseTs + 71 * h, transportFactory: mockTransportFactory });
        expect(r71.sent).toBe(0);

        // 2) A las 73h: ambos reciben Día 3
        const r73 = await runNurturingDispatch({ nowTs: baseTs + 73 * h, transportFactory: mockTransportFactory });
        expect(r73.sent).toBe(2);
        expect(r73.sentItems.every(i => i.day === 3)).toBe(true);

        // 3) Re-ejecución a las 90h: idempotencia total (0 envíos)
        const r90 = await runNurturingDispatch({ nowTs: baseTs + 90 * h, transportFactory: mockTransportFactory });
        expect(r90.sent).toBe(0);

        // 4) Lead C aparece directamente en 170h sin haber recibido Día 3 previo -> solo 1 envío (Día 7)
        leadsState.setLeadState('56910000003', {
            name: 'Ignacio Soto',
            email: 'ignacio@ejemplo.cl',
            estado: 'COTIZADO',
            hasQuoted: true,
            tipo: 'Remodelacion',
            quotedAt: baseTs,
            createdAt: baseTs,
            updatedAt: Date.now()
        });

        // 5) A las 170h: A, B y C reciben Día 7 una sola vez
        const r170 = await runNurturingDispatch({ nowTs: baseTs + 170 * h, transportFactory: mockTransportFactory });
        expect(r170.sent).toBe(3);
        expect(r170.sentItems.every(i => i.day === 7)).toBe(true);

        // 6) A las 200h: todos completaron Día 7 -> 0 envíos
        const r200 = await runNurturingDispatch({ nowTs: baseTs + 200 * h, transportFactory: mockTransportFactory });
        expect(r200.sent).toBe(0);

        // 7) Lead D con >336h (14d) queda excluido por ventana máxima
        leadsState.setLeadState('56910000004', {
            name: 'Antiguo',
            email: 'antiguo@ejemplo.cl',
            estado: 'COTIZADO',
            hasQuoted: true,
            tipo: 'Quincho',
            quotedAt: baseTs - (16 * 24 * h),
            createdAt: baseTs - (16 * 24 * h),
            updatedAt: Date.now()
        });
        const r336 = await runNurturingDispatch({ nowTs: baseTs + 170 * h, transportFactory: mockTransportFactory });
        expect(r336.sent).toBe(0);
    });

    test('T038.3: Transición Guía DOM -> Cotizado, lead frío WhatsApp -> Cotizado (quotedAt) y preservación de VISITA_AGENDADA', async () => {
        const leadsState = require('../lib/leads-state');
        const quoteHandler = require('../api/quote');
        const { PROFILES, runNurturingDispatch } = require('../api/_emailNurturing');
        const nodemailer = require('nodemailer');

        const origCreateTransport = nodemailer.createTransport;
        process.env.ZOHO_PASS = 'mock_pass';
        nodemailer.createTransport = () => ({
            sendMail: async () => ({ messageId: 'mock-id' }),
            close: () => {}
        });

        try {
            // 1. Lead descarga guía hace 4 días y chatea frío en WhatsApp hace 5 días
            const fourDaysAgo = Date.now() - (96 * 3600 * 1000);
            const fiveDaysAgo = Date.now() - (120 * 3600 * 1000);
            await leadsState.persistEmailLead('transicion@ejemplo.cl', {
                nombre: 'Andrea Molina',
                guia: 'permiso-edificacion',
                createdAt: fourDaysAgo,
                updatedAt: fourDaysAgo
            });
            leadsState.setLeadState('56977771111', {
                estado: 'EN_CONVERSACION',
                hasQuoted: false,
                createdAt: fiveDaysAgo,
                updatedAt: fiveDaysAgo
            });

            // 2. Cotiza hoy en api/quote.js
            const req = {
                method: 'POST',
                body: {
                    tipo: 'Casa Nueva',
                    sistema: 'Metalcon',
                    area: 100,
                    pisos: 1,
                    terminaciones: 'Estandar',
                    comuna: 'Providencia',
                    permisos: 'Idea',
                    nombre: 'Andrea Molina',
                    email: 'Transicion@Ejemplo.CL',
                    telefono: '+56 9 7777 1111'
                }
            };
            const res = createMockRes();
            await quoteHandler(req, res);
            expect(res.statusCode).toBe(200);

            // Verificar que lead:email también quedó marcado hasQuoted: true y lead:phone tiene quotedAt reciente
            const phoneLead = leadsState.getLeadState('56977771111');
            const emailLead = leadsState.findLeadByPhoneOrEmail('transicion@ejemplo.cl');
            expect(phoneLead.hasQuoted).toBe(true);
            expect(phoneLead.permisosKey).toBe('Idea');
            expect(phoneLead.quotedAt).toBeGreaterThan(fourDaysAgo);
            expect(emailLead.hasQuoted).toBe(true);

            // 3. Cron ejecutado hoy mismo NO debe enviar Guía DOM ni Día 3 prematuro (solo pasaron minutos desde quotedAt)
            const dryToday = await runNurturingDispatch({ dryRun: true, nowTs: Date.now() });
            expect(dryToday.eligibleCount).toBe(0);

            // 4. Cron a +73h desde quotedAt sí enruta en PERFIL_OBRA_MAYOR_INTEGRAL Día 3
            const dry73h = await runNurturingDispatch({ dryRun: true, nowTs: phoneLead.quotedAt + (73 * 3600 * 1000) });
            expect(dry73h.eligibleCount).toBe(1);
            expect(dry73h.previews[0]).toMatchObject({
                email: 'transicion@ejemplo.cl',
                profile: PROFILES.OBRA_MAYOR_INTEGRAL,
                day: 3
            });

            // 5. Si estaba en VISITA_AGENDADA y re-cotiza, preserva VISITA_AGENDADA
            leadsState.updateLeadState('56977771111', 'VISITA_AGENDADA');
            const resRequote = createMockRes();
            await quoteHandler(req, resRequote);
            expect(leadsState.getLeadState('56977771111').estado).toBe('VISITA_AGENDADA');
        } finally {
            nodemailer.createTransport = origCreateTransport;
        }
    });

    test('T038.4: Parada por Cal.com (lead solo-email), Unsubscribe en 2 pasos (anti-scanner) + RFC 8058 y dryRun', async () => {
        const leadsState = require('../lib/leads-state');
        const calWebhook = require('../api/webhooks/calcom');
        const contactRouter = require('../api/contact');
        const { buildUnsubscribeUrl, runNurturingDispatch } = require('../api/_emailNurturing');

        const age80h = Date.now() - (80 * 3600 * 1000);

        // 1. Lead solo-email que agenda en Cal.com sin teléfono
        await leadsState.persistEmailLead('soloemail@ejemplo.cl', {
            nombre: 'Mateo Vera',
            guia: 'recepcion-final',
            createdAt: age80h,
            updatedAt: age80h
        });
        const calRes = createMockRes();
        await calWebhook({
            method: 'POST',
            headers: {},
            body: {
                triggerEvent: 'BOOKING_CREATED',
                payload: {
                    title: 'Visita Técnica',
                    startTime: '2026-11-20T15:00:00Z',
                    attendees: [{ name: 'Mateo Vera', email: 'soloemail@ejemplo.cl' }],
                    responses: {}
                }
            }
        }, calRes);
        expect(calRes.statusCode).toBe(200);
        expect(leadsState.findLeadByPhoneOrEmail('soloemail@ejemplo.cl').estado).toBe('VISITA_AGENDADA');

        // 2. Lead activo para probar Unsubscribe seguro en 2 pasos
        leadsState.setLeadState('56988881111', {
            name: 'Elena Ríos',
            email: 'elena@ejemplo.cl',
            estado: 'COTIZADO',
            hasQuoted: true,
            tipo: 'Quincho',
            quotedAt: age80h,
            createdAt: age80h,
            updatedAt: age80h
        });

        const unsubUrl = buildUnsubscribeUrl('elena@ejemplo.cl');
        const parsed = new URL(unsubUrl);
        const token = parsed.searchParams.get('token');

        // 2a. GET /api/unsubscribe (pre-fetcher / scanner) NO debe mutar el estado
        const resGet = createMockRes();
        await contactRouter({
            method: 'GET',
            url: `/api/unsubscribe?email=elena@ejemplo.cl&token=${token}`,
            query: { email: 'elena@ejemplo.cl', token },
            headers: {}
        }, resGet);
        expect(resGet.statusCode).toBe(200);
        expect(resGet.body).toContain('Confirmar baja de correos');
        expect(await leadsState.isUnsubscribed('elena@ejemplo.cl')).toBe(false);

        // 2b. dryRun muestra elegible a Elena (y excluye a Mateo por VISITA_AGENDADA)
        const dryRes = await runNurturingDispatch({ dryRun: true, nowTs: Date.now() });
        expect(dryRes.eligibleCount).toBe(1);
        expect(dryRes.previews[0].email).toBe('elena@ejemplo.cl');
        expect(dryRes.sent).toBe(0);

        // 2c. POST /api/unsubscribe (botón confirmación o RFC 8058 One-Click) sí da de baja
        const resPost = createMockRes();
        await contactRouter({
            method: 'POST',
            url: `/api/unsubscribe?email=elena@ejemplo.cl&token=${token}`,
            query: { email: 'elena@ejemplo.cl', token },
            headers: { accept: 'application/json' },
            body: 'List-Unsubscribe=One-Click'
        }, resPost);
        expect(resPost.statusCode).toBe(200);
        expect(resPost.body).toMatchObject({ ok: true, unsubscribed: true, email: 'elena@ejemplo.cl' });
        expect(await leadsState.isUnsubscribed('elena@ejemplo.cl')).toBe(true);

        // 2d. Token inválido -> 403 fail-closed
        const resBad = createMockRes();
        await contactRouter({
            method: 'POST',
            url: '/api/unsubscribe?email=elena@ejemplo.cl&token=forged',
            query: { email: 'elena@ejemplo.cl', token: 'forged' },
            headers: { accept: 'application/json' },
            body: {}
        }, resBad);
        expect(resBad.statusCode).toBe(403);

        // 3. Cron ya no incluye ni a Mateo ni a Elena
        const dryAfter = await runNurturingDispatch({ dryRun: true, nowTs: Date.now() });
        expect(dryAfter.eligibleCount).toBe(0);
    });

    test('T038.5: Auth 401 Cron, Kill-Switch, Escaping XSS, Lock, Batch Cap, Bounce 5xx/Circuit Breaker y KV REST SCAN+MGET', async () => {
        const contactRouter = require('../api/contact');
        const leadsState = require('../lib/leads-state');
        const { runNurturingDispatch, renderNurturingEmail, PROFILES } = require('../api/_emailNurturing');

        // 1. Auth fail-closed
        const resUnauth = createMockRes();
        await contactRouter({ method: 'GET', url: '/api/nurturing-cron', query: { action: 'nurturing-cron' }, headers: {} }, resUnauth);
        expect(resUnauth.statusCode).toBe(401);

        const resWrong = createMockRes();
        await contactRouter({
            method: 'GET',
            url: '/api/nurturing-cron?dryRun=true',
            query: { action: 'nurturing-cron', dryRun: 'true' },
            headers: { authorization: 'Bearer wrong_secret' }
        }, resWrong);
        expect(resWrong.statusCode).toBe(401);

        const resAuthOk = createMockRes();
        await contactRouter({
            method: 'GET',
            url: '/api/nurturing-cron?dryRun=true',
            query: { action: 'nurturing-cron', dryRun: 'true' },
            headers: { authorization: 'Bearer test_cron_secret_038' }
        }, resAuthOk);
        expect(resAuthOk.statusCode).toBe(200);
        expect(resAuthOk.body.dryRun).toBe(true);

        // 2. Kill-switch
        process.env.NURTURING_ENABLED = 'false';
        const resDisabled = await runNurturingDispatch({ dryRun: false });
        expect(resDisabled).toMatchObject({ ok: true, skipped: true, reason: 'NURTURING_DISABLED' });
        process.env.NURTURING_ENABLED = 'true';

        // 3. Escaping XSS en datos del lead
        const xssMail = renderNurturingEmail({
            profile: PROFILES.OBRA_MAYOR_INTEGRAL,
            variant: 'integral',
            day: 3,
            lead: {
                name: '<script>alert(1)</script>',
                email: 'xss@ejemplo.cl',
                comunaHuman: '<img src=x onerror=alert(1)>',
                proyectoResumen: 'Casa <b onclick=x>',
                minUF: 1900,
                maxUF: 2100
            }
        });
        expect(xssMail.html).not.toContain('<script>');
        expect(xssMail.html).not.toContain('<img src=x');
        expect(xssMail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');

        // 4. Rebote 550 cuarentena tras 2 fallos y Circuit Breaker 421
        const age80h = Date.now() - (80 * 3600 * 1000);
        leadsState.setLeadState('56991111111', {
            name: 'Rebote',
            email: 'bounce@ejemplo.cl',
            estado: 'COTIZADO',
            hasQuoted: true,
            tipo: 'Quincho',
            quotedAt: age80h,
            createdAt: age80h,
            updatedAt: age80h
        });
        leadsState.setLeadState('56992222222', {
            name: 'Valido',
            email: 'valid@ejemplo.cl',
            estado: 'COTIZADO',
            hasQuoted: true,
            tipo: 'Quincho',
            quotedAt: age80h,
            createdAt: age80h,
            updatedAt: age80h
        });

        let calls = 0;
        const bounceTransport = () => ({
            sendMail: async (mail) => {
                calls++;
                if (mail.to === 'bounce@ejemplo.cl') {
                    const err = new Error('550 User unknown');
                    err.responseCode = 550;
                    throw err;
                }
                return { messageId: 'ok' };
            },
            close: () => {}
        });

        const rBounce1 = await runNurturingDispatch({ transportFactory: bounceTransport });
        expect(rBounce1.sent).toBe(1);
        expect(rBounce1.errors.length).toBe(1);

        // Segundo fallo 550 deja a bounce en cuarentena (failures = 2)
        const rBounce2 = await runNurturingDispatch({ transportFactory: bounceTransport });
        expect(rBounce2.sent).toBe(0);
        expect(rBounce2.errors.length).toBe(1);

        // Tercer intento: ya ni siquiera intenta llamar a sendMail por cuarentena
        const prevCalls = calls;
        const rBounce3 = await runNurturingDispatch({ transportFactory: bounceTransport });
        expect(rBounce3.eligibleCount).toBe(0);
        expect(calls).toBe(prevCalls);

        // 4b. Circuit breaker 421 y maxBatch cap + lock distribuido
        leadsState.setLeadState('56993333333', { name: 'L1', email: 'l1@ejemplo.cl', estado: 'COTIZADO', hasQuoted: true, tipo: 'Quincho', quotedAt: age80h, createdAt: age80h, updatedAt: age80h });
        leadsState.setLeadState('56994444444', { name: 'L2', email: 'l2@ejemplo.cl', estado: 'COTIZADO', hasQuoted: true, tipo: 'Quincho', quotedAt: age80h, createdAt: age80h, updatedAt: age80h });
        leadsState.setLeadState('56994444445', { name: 'L3', email: 'l3@ejemplo.cl', estado: 'COTIZADO', hasQuoted: true, tipo: 'Quincho', quotedAt: age80h, createdAt: age80h, updatedAt: age80h });

        const rBatch = await runNurturingDispatch({
            maxBatch: 1,
            transportFactory: () => ({ sendMail: async () => ({ messageId: 'ok' }), close: () => {} })
        });
        expect(rBatch.sent).toBe(1);
        expect(rBatch.abortedReason).toBe('MAX_BATCH_REACHED');

        const rCircuit = await runNurturingDispatch({
            transportFactory: () => ({
                sendMail: async () => { const e = new Error('421 Rate limit'); e.responseCode = 421; throw e; },
                close: () => {}
            })
        });
        expect(rCircuit.sent).toBe(0);
        expect(rCircuit.abortedReason).toContain('SMTP_CIRCUIT_BREAKER:421');

        const activeLock = await leadsState.acquireNurturingLock(30);
        expect(activeLock).toBeTruthy();
        const rLocked = await runNurturingDispatch({ dryRun: false });
        expect(rLocked).toMatchObject({ ok: true, skipped: true, reason: 'LOCK_BUSY' });
        await leadsState.releaseNurturingLock(activeLock);

        // 5. Upstash KV REST JSON SCAN + MGET end-to-end
        leadsState.resetStateStore();
        const origFetch = global.fetch;
        const kvMemory = new Map();
        const mockLead = {
            email: 'kv@ejemplo.cl',
            name: 'KV Test',
            estado: 'COTIZADO',
            hasQuoted: true,
            tipo: 'Casa Nueva',
            permisosKey: 'Planos',
            comunaHuman: 'Ñuñoa',
            minUF: 2000,
            maxUF: 2200,
            quotedAt: age80h,
            createdAt: age80h,
            updatedAt: age80h
        };
        kvMemory.set('lead:56995555555', JSON.stringify(mockLead));

        process.env.KV_REST_API_URL = 'https://mock-upstash.example.com';
        process.env.KV_REST_API_TOKEN = 'mock_token';

        global.fetch = async (_url, opts = {}) => {
            const cmd = JSON.parse(opts.body);
            const op = String(cmd[0]).toUpperCase();
            if (op === 'SCAN') {
                return { ok: true, status: 200, json: async () => ({ result: ['0', [...kvMemory.keys()].filter(k => k.startsWith('lead:'))] }) };
            }
            if (op === 'MGET') {
                return { ok: true, status: 200, json: async () => ({ result: cmd.slice(1).map(k => kvMemory.get(k) || null) }) };
            }
            if (op === 'SET') {
                const key = cmd[1];
                const val = cmd[2];
                const hasNx = cmd.includes('NX');
                if (hasNx && kvMemory.has(key)) {
                    return { ok: true, status: 200, json: async () => ({ result: null }) };
                }
                kvMemory.set(key, val);
                return { ok: true, status: 200, json: async () => ({ result: 'OK' }) };
            }
            if (op === 'GET') {
                return { ok: true, status: 200, json: async () => ({ result: kvMemory.get(cmd[1]) || null }) };
            }
            if (op === 'DEL') {
                kvMemory.delete(cmd[1]);
                return { ok: true, status: 200, json: async () => ({ result: 1 }) };
            }
            return { ok: false, status: 404, json: async () => ({}) };
        };

        try {
            const kvDispatch = await runNurturingDispatch({
                transportFactory: () => ({ sendMail: async () => ({ messageId: 'kv-ok' }), close: () => {} })
            });
            expect(kvDispatch.ok).toBe(true);
            expect(kvDispatch.sent).toBe(1);
            expect(kvMemory.has('nurturing:kv@ejemplo.cl')).toBe(true);
            expect(kvMemory.has('nurturing:lock')).toBe(false);
        } finally {
            global.fetch = origFetch;
        }
    });

    test('T038.6: Auditoría SSOT en plantillas y preservación estricta de <= 12 Serverless Functions en api/', () => {
        const { PROFILES, renderNurturingEmail } = require('../api/_emailNurturing');

        const cases = [
            { profile: PROFILES.GUIA_DOM, variant: 'permiso-edificacion', lead: { name: 'Ana', email: 'a@b.cl' } },
            { profile: PROFILES.GUIA_DOM, variant: 'recepcion-final', lead: { name: 'Ana', email: 'a@b.cl' } },
            { profile: PROFILES.OBRA_MAYOR_INTEGRAL, variant: 'integral', lead: { name: 'Carlos', email: 'c@d.cl', tipo: 'Casa Nueva', comunaHuman: 'Las Condes', minUF: 2400, maxUF: 2620 } },
            { profile: PROFILES.OBRA_MAYOR_EJECUCION, variant: 'ejecucion', lead: { name: 'Luis', email: 'l@m.cl', tipo: 'Casa Nueva', comunaHuman: 'La Reina', minUF: 2100, maxUF: 2300 } },
            { profile: PROFILES.QUINCHO_REMODELACION, variant: 'quincho', lead: { name: 'Sofía', email: 's@t.cl', tipo: 'Quincho', comunaHuman: 'Providencia', minUF: 380, maxUF: 420 } },
            { profile: PROFILES.QUINCHO_REMODELACION, variant: 'remodelacion', lead: { name: 'Paula', email: 'p@q.cl', tipo: 'Remodelacion', comunaHuman: 'Ñuñoa', minUF: 550, maxUF: 610 } }
        ];

        const FORBIDDEN = /Anillo\s*[1-5]|5\s*[Aa]nillos|Cord[oó]n\s*Lejano|\+22%|\+18%|aprobaci[oó]n\s+garantizada|sin\s+interrumpir\s+la\s+habitabilidad|6348\s?2439|7909\s?2027/i;

        for (const c of cases) {
            for (const day of [3, 7]) {
                const mail = renderNurturingEmail({ ...c, day });
                const combined = `${mail.subject}\n${mail.html}\n${mail.text}`;
                expect(combined, `Fuga SSOT en ${c.profile}/${c.variant} Día ${day}`).not.toMatch(FORBIDDEN);
                expect(combined).toContain('+56 9 2738 4075');
                expect(combined).toContain('/api/unsubscribe');
            }
        }

        // Validaciones específicas Spec 035 en perfiles de Obra Mayor
        const integralDay3 = renderNurturingEmail({ ...cases[2], day: 3 });
        expect(integralDay3.html).toContain('Certificado de Recepción Final Definitiva');
        expect(integralDay3.html).toContain('obras anexas no contratadas');
        expect(integralDay3.html).toContain('preexistentes sin regularizar');

        const ejecucionDay3 = renderNurturingEmail({ ...cases[3], day: 3 });
        expect(ejecucionDay3.html).toContain('Libro de Obras');
        expect(ejecucionDay3.html).toContain('TE1');
        expect(ejecucionDay3.html).toContain('TC6');
        expect(ejecucionDay3.html).toContain('solo ejecución material de obra');

        // Validar conteo exacto <= 12 funciones serverless (excluyendo _*.js) en api/
        const collectFunctions = (dir) => {
            let count = 0;
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.isDirectory()) count += collectFunctions(path.join(dir, entry.name));
                else if (entry.name.endsWith('.js') && !entry.name.startsWith('_')) count += 1;
            }
            return count;
        };
        expect(collectFunctions(path.join(ROOT, 'api'))).toBeLessThanOrEqual(12);

        // Validar JSON válido y cron/rewrites en vercel.json
        const vercelCfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
        expect(vercelCfg.crons).toEqual([{ path: '/api/contact?action=nurturing-cron', schedule: '0 13 * * *' }]);
        expect(vercelCfg.rewrites.some(r => r.source === '/api/unsubscribe')).toBe(true);
        expect(vercelCfg.rewrites.some(r => r.source === '/api/nurturing-cron')).toBe(true);
    });
});
