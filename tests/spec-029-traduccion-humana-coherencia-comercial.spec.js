const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const quoteApiPath = path.resolve(__dirname, '..', 'api', 'quote.js');
const leadsStatePath = path.resolve(__dirname, '..', 'lib', 'leads-state.js');
const agentConsultorPath = path.resolve(__dirname, '..', 'lib', 'agent-consultor.js');

test.describe('Spec 029: Corrección Crítica de Coherencia Comercial y Traducción Humana', () => {

    test('T029.1: resolveCommercialLabels traduce correctamente sistemas, suprime pisos y desescala DOM en Quinchos', () => {
        const { resolveCommercialLabels } = require(quoteApiPath);
        expect(typeof resolveCommercialLabels).toBe('function');

        // 1. Quincho con Metalcon (Estructura Madera / Pino Oregón)
        const labelsQuincho = resolveCommercialLabels({
            tipo: 'Quincho',
            sistema: 'Metalcon',
            area: 36,
            pisos: 1,
            terminaciones: 'Estandar',
            permisos: 'Idea'
        });

        expect(labelsQuincho.isQuincho).toBe(true);
        expect(labelsQuincho.sistemaComercial).toBe('Estructura en Pino Oregón / Madera Seleccionada');
        expect(labelsQuincho.noPisos).toBe(true);
        expect(labelsQuincho.pisosComercial).toBeNull();
        expect(labelsQuincho.proyectoResumen).toBe('Quincho (36 m² · Estructura en Pino Oregón / Madera Seleccionada)');
        expect(labelsQuincho.proyectoResumen).not.toMatch(/piso/i);
        expect(labelsQuincho.permisosData.adminBadge).toBe('Evaluación de Factibilidad y Diseño en Terreno (Permiso municipal opcional según evaluación)');
        expect(labelsQuincho.permisosData.badgeShort).toBe('Eval. en Terreno');

        // 2. Quincho con SIP y Albañilería
        const labelsSip = resolveCommercialLabels({ tipo: 'Quincho', sistema: 'SIP' });
        expect(labelsSip.sistemaComercial).toBe('Estructura Mixta con Cubierta Termoaislada');

        const labelsAlba = resolveCommercialLabels({ tipo: 'Quincho', sistema: 'Albanileria' });
        expect(labelsAlba.sistemaComercial).toBe('Perfilería de Acero y Albañilería a la Vista');
    });

    test('T029.2: resolveCommercialLabels traduce adecuadamente Remodelaciones y Casa Nueva', () => {
        const { resolveCommercialLabels } = require(quoteApiPath);

        // Remodelación con recintos
        const labelsRemodela = resolveCommercialLabels({
            tipo: 'Remodelacion',
            sistema: 'Metalcon',
            area: 25,
            pisos: 1,
            espacios_remodelar: 'Baño y Cocina',
            permisos: 'Idea'
        });

        expect(labelsRemodela.isRemodelacion).toBe(true);
        expect(labelsRemodela.sistemaComercial).toBe('Intervención en Tabiquería Liviana');
        expect(labelsRemodela.noPisos).toBe(true);
        expect(labelsRemodela.proyectoResumen).toBe('Remodelación: Baño y Cocina (25 m² · Intervención en Tabiquería Liviana)');
        expect(labelsRemodela.proyectoResumen).not.toMatch(/piso/i);
        expect(labelsRemodela.permisosData.adminBadge).toBe('Evaluación de Factibilidad y Diseño en Terreno (Permiso municipal opcional según evaluación)');

        // Casa Nueva (debe conservar pisos y badge completo)
        const labelsCasa = resolveCommercialLabels({
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            area: 120,
            pisos: 2,
            permisos: 'Idea'
        });

        expect(labelsCasa.isCasaNueva).toBe(true);
        expect(labelsCasa.sistemaComercial).toBe('Metalcom Estructural');
        expect(labelsCasa.noPisos).toBe(false);
        expect(labelsCasa.pisosComercial).toBe('2 pisos');
        expect(labelsCasa.proyectoResumen).toContain('2 pisos');
        expect(labelsCasa.permisosData.adminBadge).toBe('PROYECTO COMPLETO (Diseño + DOM + Construcción)');
    });

    test('T029.3: generateEmailData genera HTML coherente sin "1 piso", sin "Metalcon" crudo y con DOM desescalado para Quinchos', () => {
        const { generateEmailData } = require(quoteApiPath);

        const emailData = generateEmailData({
            nombre: 'Roberto Arancibia',
            email: 'rarancibiaf@gmail.com',
            telefono: '+56 9 9275 1313',
            tipo: 'Quincho',
            sistema: 'Metalcon',
            area: 36,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Las Condes',
            permisos: 'Idea'
        });

        const html = emailData.html;

        // Validar sistema comercial traducido
        expect(html).toContain('Estructura en Pino Oregón / Madera Seleccionada');
        expect(html).not.toMatch(/>\s*Metalcon\s*</);

        // Validar supresión de "1 piso"
        expect(html).toContain('Quincho (36 m²)');
        expect(html).not.toMatch(/Quincho\s*\(36\s*m²\s*-\s*1\s*piso\)/i);
        expect(html).not.toMatch(/36\s*m²,\s*1\s*piso/i);

        // Validar desescalada de Estado DOM
        expect(html).toContain('Evaluación de Factibilidad y Diseño en Terreno');
        expect(html).not.toContain('PROYECTO COMPLETO (Diseño + DOM + Construcción)');
    });

    test('T029.4: Ficha Técnica PDF de Quincho genera exactamente 1 sola página Letter y traduce materialidad', async () => {
        const { generatePdfBuffer } = require(quoteApiPath);

        const pdfBuffer = await generatePdfBuffer({
            nombre: 'Roberto Arancibia',
            email: 'rarancibiaf@gmail.com',
            telefono: '+56 9 9275 1313',
            tipo: 'Quincho',
            sistema: 'Metalcon',
            area: 36,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Las Condes',
            permisos: 'Idea'
        });

        expect(Buffer.isBuffer(pdfBuffer)).toBe(true);

        // Contar páginas Letter (debe ser estrictamente 1)
        const matches = pdfBuffer.toString('binary').match(/\/Type\s*\/Page(?!\w)/g);
        const pageCount = matches ? matches.length : 0;
        expect(pageCount).toBe(1);

        // Inspeccionar texto decodificado
        const zlib = require('zlib');
        let fullText = '';
        const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
        let match;
        const binaryStr = pdfBuffer.toString('binary');
        while ((match = streamRegex.exec(binaryStr)) !== null) {
            let streamData = Buffer.from(match[1], 'binary');
            try {
                streamData = zlib.inflateSync(streamData);
            } catch (e) {}
            const textMatches = streamData.toString('latin1').matchAll(/<([0-9a-fA-F]+)>/g);
            for (const tm of textMatches) {
                fullText += Buffer.from(tm[1], 'hex').toString('latin1') + ' ';
            }
        }

        const cleanFullText = fullText.replace(/\s+/g, '');
        expect(cleanFullText).toContain('Pino');
        expect(cleanFullText).toContain('Madera');
        expect(cleanFullText).toContain('Seleccionada');
        expect(fullText).not.toMatch(/36\s*m²\s*\(1\s*piso\)/i);
    });

    test('T029.5: Sincronización con Agente IA WhatsApp (leads-state y fallback de agent-consultor)', () => {
        const { setLeadState, getLeadState } = require(leadsStatePath);
        const { generateDeterministicConsultativeFallback } = require(agentConsultorPath);

        const testPhone = '56992751313';
        setLeadState(testPhone, {
            name: 'Roberto Arancibia',
            email: 'rarancibiaf@gmail.com',
            tipo: 'Quincho',
            areaNum: 36,
            comunaHuman: 'Las Condes, RM',
            sistema: 'Metalcon',
            sistemaComercial: 'Estructura en Pino Oregón / Madera Seleccionada',
            proyectoResumen: 'Quincho (36 m² · Estructura en Pino Oregón / Madera Seleccionada)',
            minUF: '470',
            maxUF: '514'
        });

        const lead = getLeadState(testPhone);
        expect(lead.sistemaComercial).toBe('Estructura en Pino Oregón / Madera Seleccionada');
        expect(lead.proyectoResumen).toBe('Quincho (36 m² · Estructura en Pino Oregón / Madera Seleccionada)');

        const reply = generateDeterministicConsultativeFallback('Hola, ¿cómo se hace el radier de mi quincho?', lead);
        expect(reply).toContain('Estructura en Pino Oregón / Madera Seleccionada');
        expect(reply).not.toContain('Metalcon');
        expect(reply).not.toContain('1 piso');
    });

    test('T029.6: Endpoint /api/quote persiste datos comerciales y arma correo al administrador con resumen limpio', async () => {
        const quoteHandler = require(quoteApiPath);
        const nodemailer = require('nodemailer');

        let sentMails = [];
        const origCreate = nodemailer.createTransport;
        const origPass = process.env.ZOHO_PASS;
        process.env.ZOHO_PASS = 'mock_pass';

        nodemailer.createTransport = () => ({
            sendMail: async (mailOptions) => {
                sentMails.push(mailOptions);
                return { messageId: 'mock-mail-id' };
            }
        });

        const mockReq = {
            method: 'POST',
            body: {
                tipo: 'Quincho',
                sistema: 'Metalcon',
                area: 36,
                pisos: 1,
                terminaciones: 'Estandar',
                comuna: 'Las Condes',
                permisos: 'Idea',
                nombre: 'Roberto Arancibia',
                email: 'rarancibiaf@gmail.com',
                telefono: '+56 9 9275 1313'
            }
        };

        let responseStatusCode = null;
        let responseJsonData = null;

        const mockRes = {
            setHeader: function () { return this; },
            status: function (code) {
                responseStatusCode = code;
                return this;
            },
            json: function (data) {
                responseJsonData = data;
                return this;
            }
        };

        try {
            await quoteHandler(mockReq, mockRes);

            expect(responseStatusCode).toBe(200);
            expect(responseJsonData.success).toBe(true);

            expect(sentMails.length).toBe(2);
            const clientMail = sentMails[0];
            const adminMail = sentMails[1];

            // 1. Correo Cliente
            expect(clientMail.to).toBe('rarancibiaf@gmail.com');
            expect(clientMail.html).toContain('Estructura en Pino Oregón / Madera Seleccionada');
            expect(clientMail.html).not.toMatch(/1\s*piso/);

            // 2. Correo Administrador
            expect(adminMail.to).toBe('contacto@cuatropuntas.com');
            expect(adminMail.subject).toContain('Quincho (36 m² · Estructura en Pino Oregón / Madera Seleccionada)');
            expect(adminMail.subject).not.toContain('1 piso');
            expect(adminMail.subject).not.toContain('Metalcon');

            expect(adminMail.html).toContain('Quincho (36 m² · Estructura en Pino Oregón / Madera Seleccionada)');
            expect(adminMail.html).not.toMatch(/Quincho\s*\(36\s*m²,\s*1\s*piso,\s*Metalcon\)/i);
            expect(adminMail.html).toContain('Evaluación de Factibilidad y Diseño en Terreno');
        } finally {
            nodemailer.createTransport = origCreate;
            process.env.ZOHO_PASS = origPass;
        }
    });
});
