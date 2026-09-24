const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Spec 023: Agente Asesor Consultivo y Orquestación de Estados', () => {

    test.beforeEach(() => {
        // Asegurar que no haya token real en tests para usar Mock
        delete process.env.WHATSAPP_TOKEN;
    });

    test('T01.1: Ciclo de Vida y Transición de Estados en lib/leads-state.js', async () => {
        const leadsState = require('../lib/leads-state');
        leadsState.resetStateStore();

        const rawPhone = '+56 9 8765 4321';
        const normalized = leadsState.normalizePhone(rawPhone);
        expect(normalized).toBe('56987654321');

        // 1. Siembra inicial en COTIZADO
        leadsState.setLeadState(rawPhone, {
            name: 'Carlos Solar',
            email: 'carlos@ejemplo.com',
            tipo: 'Casa Nueva',
            areaNum: 140,
            comunaHuman: 'Chicureo, Colina',
            sistema: 'Metalcom Estructural',
            minUF: 2660,
            maxUF: 2940
        });

        let lead = leadsState.getLeadState(rawPhone);
        expect(lead).not.toBeNull();
        expect(lead.estado).toBe('COTIZADO');
        expect(lead.name).toBe('Carlos Solar');
        expect(lead.phone).toBe('56987654321');

        // Búsqueda por email
        const leadByEmail = leadsState.findLeadByPhoneOrEmail('carlos@ejemplo.com');
        expect(leadByEmail).not.toBeNull();
        expect(leadByEmail.phone).toBe('56987654321');

        // 2. Transición a EN_CONVERSACION
        leadsState.updateLeadState(rawPhone, 'EN_CONVERSACION');
        lead = leadsState.getLeadState(rawPhone);
        expect(lead.estado).toBe('EN_CONVERSACION');

        // 3. Transición a VISITA_AGENDADA
        leadsState.updateLeadState(rawPhone, 'VISITA_AGENDADA', { bookingId: 'cal_test_123' });
        lead = leadsState.getLeadState(rawPhone);
        expect(lead.estado).toBe('VISITA_AGENDADA');
        expect(lead.bookingId).toBe('cal_test_123');
    });

    test('T01.2: Regla canBotReply(phone) asegura silencio en visitas agendadas y no registrados', async () => {
        const leadsState = require('../lib/leads-state');
        leadsState.resetStateStore();

        const phoneA = '+56 9 1111 2222'; // Lead cotizado
        const phoneB = '+56 9 3333 4444'; // Lead desconocido (frío)

        // Lead desconocido -> canBotReply === false
        expect(leadsState.canBotReply(phoneB)).toBe(false);

        // Lead sembrado en COTIZADO -> canBotReply === true
        leadsState.setLeadState(phoneA, { name: 'Mariana', email: 'mariana@ejemplo.com', tipo: 'Quincho' });
        expect(leadsState.canBotReply(phoneA)).toBe(true);

        // Lead pasa a EN_CONVERSACION -> canBotReply === true
        leadsState.updateLeadState(phoneA, 'EN_CONVERSACION');
        expect(leadsState.canBotReply(phoneA)).toBe(true);

        // Lead pasa a VISITA_AGENDADA -> canBotReply === false (Silencio IA total)
        leadsState.updateLeadState(phoneA, 'VISITA_AGENDADA');
        expect(leadsState.canBotReply(phoneA)).toBe(false);
    });

    test('T01.3: Modo Mock y Resiliencia en lib/meta-client.js', async () => {
        const metaClient = require('../lib/meta-client');
        metaClient.clearSentMessages();

        const res = await metaClient.sendWhatsAppMessage('56987654321', 'Hola Carlos, evaluemos tu terreno');
        expect(res.success).toBe(true);
        expect(res.mocked).toBe(true);

        const history = metaClient.getSentMessages();
        expect(history.length).toBe(1);
        expect(history[0].to).toBe('56987654321');
        expect(history[0].text).toContain('Hola Carlos');
    });

    test('T01.4: Agente Asesor Consultivo (lib/agent-consultor.js) genera respuesta técnica con enlace Cal.com', async () => {
        const agentConsultor = require('../lib/agent-consultor');

        const leadData = {
            name: 'Roberto Gómez',
            tipo: 'Casa Nueva',
            areaNum: 120,
            comunaHuman: 'Lo Barnechea',
            sistema: 'Metalcom'
        };

        const reply = await agentConsultor.generateConsultativeReply(
            '¿Qué tipo de radier recomiendan para un terreno con pendiente suave en Lo Barnechea?',
            leadData
        );

        expect(typeof reply).toBe('string');
        expect(reply.length).toBeGreaterThan(40);
        // Debe mencionar el contexto del proyecto
        expect(reply).toMatch(/Roberto|Casa Nueva|radier|fundaci[oó]n|terreno/i);
        // Debe contener el enlace oficial de agendamiento
        expect(reply).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');
        // Debe respetar formato WhatsApp (sin doble asterisco)
        expect(reply).not.toContain('**');
    });

    test('T01.5: Webhook Meta en api/webhooks/whatsapp.js (Handshake GET y Silencio en POST)', async () => {
        const whatsappWebhook = require('../api/webhooks/whatsapp');
        const leadsState = require('../lib/leads-state');
        const metaClient = require('../lib/meta-client');
        leadsState.resetStateStore();
        metaClient.clearSentMessages();

        // 1. GET Handshake
        const reqGet = {
            method: 'GET',
            query: {
                'hub.mode': 'subscribe',
                'hub.verify_token': 'cuatropuntas_webhook_secret_2026',
                'hub.challenge': 'challenge_token_abc123'
            }
        };
        let getStatus = 0;
        let getBody = '';
        const resGet = {
            status: (code) => { getStatus = code; return resGet; },
            send: (text) => { getBody = text; }
        };

        await whatsappWebhook(reqGet, resGet);
        expect(getStatus).toBe(200);
        expect(getBody).toBe('challenge_token_abc123');

        // 2. POST de lead con VISITA_AGENDADA -> Silencio IA
        const leadPhone = '56977778888';
        leadsState.setLeadState(leadPhone, { name: 'Andrea', tipo: 'Ampliación' });
        leadsState.updateLeadState(leadPhone, 'VISITA_AGENDADA');

        const reqPostSilencio = {
            method: 'POST',
            body: {
                entry: [{
                    changes: [{
                        value: {
                            messages: [{
                                from: leadPhone,
                                text: { body: 'Hola, ya llegué a la casa' }
                            }]
                        }
                    }]
                }]
            }
        };
        let postStatus = 0;
        let postBody = '';
        const resPost = {
            status: (code) => { postStatus = code; return resPost; },
            send: (text) => { postBody = text; }
        };

        await whatsappWebhook(reqPostSilencio, resPost);
        expect(postStatus).toBe(200);
        expect(metaClient.getSentMessages().length).toBe(0); // CERO respuestas automáticas

        // 3. POST de lead COTIZADO -> Responde IA y transiciona a EN_CONVERSACION
        const activePhone = '56955556666';
        leadsState.setLeadState(activePhone, { name: 'Esteban', tipo: 'Segundo Piso', areaNum: 60 });

        const reqPostActivo = {
            method: 'POST',
            body: {
                entry: [{
                    changes: [{
                        value: {
                            messages: [{
                                from: activePhone,
                                text: { body: '¿Cuánto peso resiste la estructura existente?' }
                            }]
                        }
                    }]
                }]
            }
        };

        await whatsappWebhook(reqPostActivo, resPost);
        expect(postStatus).toBe(200);
        expect(metaClient.getSentMessages().length).toBe(1);
        expect(leadsState.getLeadState(activePhone).estado).toBe('EN_CONVERSACION');
    });

    test('T01.6: Webhook Cal.com (api/webhooks/calcom.js) transiciona a VISITA_AGENDADA y entrega contacto del Director Técnico (+56 9 7909 2027)', async () => {
        const calWebhook = require('../api/webhooks/calcom');
        const leadsState = require('../lib/leads-state');
        const metaClient = require('../lib/meta-client');
        leadsState.resetStateStore();
        metaClient.clearSentMessages();

        const clientPhone = '+56 9 4444 5555';
        leadsState.setLeadState(clientPhone, {
            name: 'Patricia Silva',
            email: 'patricia@ejemplo.com',
            tipo: 'Remodelación'
        });

        const calReq = {
            method: 'POST',
            headers: {},
            body: {
                triggerEvent: 'BOOKING_CREATED',
                payload: {
                    title: 'Evaluación Técnica de Factibilidad en Terreno',
                    startTime: '2026-10-15T15:00:00Z',
                    attendees: [{
                        name: 'Patricia Silva',
                        email: 'patricia@ejemplo.com',
                        phoneNumber: clientPhone
                    }],
                    responses: {
                        phone: clientPhone
                    }
                }
            }
        };

        let calStatus = 0;
        let calJson = null;
        const calRes = {
            setHeader: () => {},
            status: (code) => { calStatus = code; return calRes; },
            json: (obj) => { calJson = obj; }
        };

        await calWebhook(calReq, calRes);
        expect(calStatus).toBe(200);
        expect(calJson.success).toBe(true);

        // Estado del lead actualizado a VISITA_AGENDADA
        const lead = leadsState.getLeadState(clientPhone);
        expect(lead.estado).toBe('VISITA_AGENDADA');
        expect(leadsState.canBotReply(clientPhone)).toBe(false);

        // Mensaje formaliza al Director Técnico (+56 9 7909 2027)
        const sent = metaClient.getSentMessages();
        expect(sent.length).toBeGreaterThanOrEqual(1);

        const clientConfirmation = sent.find(m => m.to.includes('56944445555'));
        expect(clientConfirmation).toBeDefined();
        expect(clientConfirmation.text).toMatch(/(?:\+?56\s*9\s*7909\s*2027|7909\s*2027|Director T[eé]cnico)/i);
    });

    test('T01.7: Cotizador (api/quote.js) siembra automáticamente el estado COTIZADO en lib/leads-state.js', async () => {
        const quoteHandler = require('../api/quote');
        const leadsState = require('../lib/leads-state');
        leadsState.resetStateStore();

        // Simular req/res de cotización web
        const testPhone = '+56 9 9988 7766';
        const req = {
            method: 'POST',
            body: {
                tipo: 'Casa Nueva',
                sistema: 'Metalcom Estructural',
                area: 100,
                pisos: 1,
                terminaciones: 'Estandar',
                comuna: 'la-reina',
                permisos: 'tengo_permiso',
                nombre: 'Gonzalo Vial',
                email: 'gonzalo@ejemplo.com',
                telefono: testPhone
            }
        };

        let statusCode = 0;
        let jsonResponse = null;
        const res = {
            setHeader: () => {},
            status: (code) => { statusCode = code; return res; },
            json: (data) => { jsonResponse = data; }
        };

        // Ejecutar quoteHandler con credenciales SMTP mock
        const nodemailer = require('nodemailer');
        const origCreateTransport = nodemailer.createTransport;
        const origPass = process.env.ZOHO_PASS;
        process.env.ZOHO_PASS = 'mock_pass_test';
        nodemailer.createTransport = () => ({
            sendMail: async () => ({ messageId: 'mock-mail-id' })
        });

        try {
            await quoteHandler(req, res);
        } finally {
            nodemailer.createTransport = origCreateTransport;
            if (origPass !== undefined) {
                process.env.ZOHO_PASS = origPass;
            } else {
                delete process.env.ZOHO_PASS;
            }
        }

        // Verificar siembra en leadsState
        const lead = leadsState.getLeadState(testPhone);
        expect(lead).not.toBeNull();
        expect(lead.estado).toBe('COTIZADO');
        expect(lead.name).toBe('Gonzalo Vial');
        expect(lead.tipo).toBe('Casa Nueva');
        expect(lead.areaNum).toBe(100);
        expect(leadsState.canBotReply(testPhone)).toBe(true);
    });

});
