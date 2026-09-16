const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const quoteApiPath = path.join(rootDir, 'api', 'quote.js');
const qrHelperPath = path.join(rootDir, 'api', '_qrMatrix.js');

test.describe('Spec 020: Optimización High-Ticket de Presupuesto por Correo y Ficha Técnica PDF', () => {

    test('T01.1: Generación de Asunto Dinámico y Personalizado de Alta Apertura', async () => {
        const quoteModule = require(quoteApiPath);
        expect(typeof quoteModule.generateEmailData).toBe('function');

        // Caso 1: Casa Nueva en Las Condes
        const emailCasa = quoteModule.generateEmailData({
            nombre: 'Carlos Edwards',
            email: 'carlos@example.com',
            telefono: '56912345678',
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            area: 120,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Las Condes',
            permisos: 'Idea'
        });

        expect(emailCasa.subject).toMatch(/^📐 Diagnóstico y Presupuesto Preliminar: Casa Nueva en Las Condes — Cuatropuntas$/);

        // Caso 2: Quincho en Colina (Chicureo)
        const emailQuincho = quoteModule.generateEmailData({
            nombre: 'Marcela Paz',
            email: 'marcela@example.com',
            telefono: '56987654321',
            tipo: 'Quincho',
            sistema: 'Metalcon',
            area: 30,
            pisos: 1,
            terminaciones: 'Premium',
            comuna: 'Colina (Chicureo)',
            permisos: 'Idea'
        });

        expect(emailQuincho.subject).toMatch(/^📐 Diagnóstico y Presupuesto Preliminar: Quincho en Colina \(Chicureo\) — Cuatropuntas$/);
    });

    test('T01.2: Copywriting High-Ticket B2C en el Correo (Art. 18 LGUC, Suma Alzada, Cupos y Doble CTA)', async () => {
        const quoteModule = require(quoteApiPath);
        const emailData = quoteModule.generateEmailData({
            nombre: 'Roberto Gomez',
            email: 'roberto@example.com',
            telefono: '56999887766',
            tipo: 'Ampliacion',
            sistema: 'SIP',
            area: 50,
            pisos: 2,
            terminaciones: 'Estandar',
            comuna: 'La Reina',
            permisos: 'Idea'
        });

        const html = emailData.html;

        // 1. Saludo personalizado con primer nombre
        expect(html).toContain('Roberto');

        // 2. Bloque Cero Sobrecostos y Contrato a Suma Alzada
        expect(html).toMatch(/contrato a suma alzada/i);
        expect(html).toMatch(/itemizado detallado/i);

        // 3. Respaldo Legal Art. 18 LGUC con plazos de garantía
        expect(html).toMatch(/art(\.|ículo)?\s*18.*lguc/i);
        expect(html).toMatch(/10 a[ñn]os.*estructura/i);
        expect(html).toMatch(/5 a[ñn]os.*instalaciones/i);
        expect(html).toMatch(/3 a[ñn]os.*terminaciones/i);

        // 4. Reencuadre de la visita a "Diagnóstico Técnico de Factibilidad en Terreno"
        expect(html).toMatch(/diagn[oó]stico t[eé]cnico de factibilidad en terreno/i);

        // 5. Cláusula honesta de capacidad operativa (3 a 4 inicios de obra por mes)
        expect(html).toMatch(/3 a 4/i);
        expect(html).toMatch(/supervisi[oó]n|cupos|faenas/i);

        // 6. Doble llamado a la acción con enlaces canónicos oficiales (SSOT)
        expect(html).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');
        expect(html).toContain('56927384075');
    });

    test('T01.3: Ficha Técnica PDF en Estricta Página Única Letter para las 4 Tipologías', async () => {
        const quoteModule = require(quoteApiPath);
        expect(typeof quoteModule.generatePdfBuffer).toBe('function');

        // Helper para contar páginas analizando el buffer PDF
        const countPdfPages = (buf) => {
            const matches = buf.toString('binary').match(/\/Type\s*\/Page(?!\w)/g);
            return matches ? matches.length : 0;
        };

        const testCases = [
            {
                name: 'Casa Nueva (120 m², 2 pisos, Albañilería)',
                payload: {
                    nombre: 'Pedro Pascal',
                    email: 'pedro@example.com',
                    telefono: '56911223344',
                    tipo: 'Casa Nueva',
                    sistema: 'Albanileria',
                    area: 120,
                    pisos: 2,
                    terminaciones: 'Premium',
                    comuna: 'Lo Barnechea',
                    permisos: 'Planos'
                }
            },
            {
                name: 'Ampliación Segundo Piso (45 m², Metalcon)',
                payload: {
                    nombre: 'Camila Valle',
                    email: 'camila@example.com',
                    telefono: '56922334455',
                    tipo: 'Ampliacion',
                    sistema: 'Metalcon',
                    area: 45,
                    pisos: 2,
                    terminaciones: 'Estandar',
                    comuna: 'Nunoa',
                    permisos: 'Idea'
                }
            },
            {
                name: 'Quincho con Notas de Alcance (35 m²)',
                payload: {
                    nombre: 'Ignacio Larrain',
                    email: 'ignacio@example.com',
                    telefono: '56933445566',
                    tipo: 'Quincho',
                    sistema: 'Metalcon',
                    area: 35,
                    pisos: 1,
                    terminaciones: 'Premium',
                    comuna: 'Colina (Chicureo)',
                    permisos: 'Idea'
                }
            },
            {
                name: 'Remodelación con Múltiples Recintos y Notas (Cocina y dos baños)',
                payload: {
                    nombre: 'Francisca Silva',
                    email: 'francisca@example.com',
                    telefono: '56944556677',
                    tipo: 'Remodelacion',
                    sistema: 'Metalcon',
                    area: 28,
                    pisos: 1,
                    terminaciones: 'Premium',
                    comuna: 'Las Condes',
                    permisos: 'Idea',
                    espacios_remodelar: 'Cocina principal completa y dos baños'
                }
            }
        ];

        for (const tc of testCases) {
            const pdfBuffer = await quoteModule.generatePdfBuffer(tc.payload);
            expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
            expect(pdfBuffer.length).toBeGreaterThan(1000);

            const pageCount = countPdfPages(pdfBuffer);
            expect(pageCount, `Fallo en ${tc.name}: el PDF tiene ${pageCount} páginas (debe ser exactamente 1)`).toBe(1);
        }
    });

    test('T01.4: Ficha Técnica PDF contiene Metodología en 4 Pasos, Garantía Art. 18 y Enlace Cal.com', async () => {
        const quoteModule = require(quoteApiPath);
        const zlib = require('zlib');

        const pdfBuffer = await quoteModule.generatePdfBuffer({
            nombre: 'Andres Bello',
            email: 'andres@example.com',
            telefono: '56955667788',
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            area: 90,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Providencia',
            permisos: 'Idea'
        });

        // 1. Validar enlace interactivo oficial Cal.com en objetos/anotaciones del PDF
        const rawPdfString = pdfBuffer.toString('latin1');
        expect(rawPdfString).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');

        // 2. Extraer texto de los streams de contenido (descomprimiendo FlateDecode y decodificando hex de PDFKit)
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

        // Validar mención a Garantía / Art. 18 LGUC
        expect(fullText).toMatch(/Garant[ií]a|LGUC|Art\.?\s*18/i);

        // Validar Metodología en 4 pasos
        expect(fullText).toMatch(/Metodolog[ií]a|4 Pasos/i);
    });

    test('T01.5: Módulo api/_qrMatrix.js genera matriz de bits pura para el enlace Cal.com', async () => {
        expect(fs.existsSync(qrHelperPath)).toBe(true);
        const { generateQrMatrix } = require(qrHelperPath);
        expect(typeof generateQrMatrix).toBe('function');

        const testUrl = 'https://cal.com/cuatropuntas.com/visita-tecnica';
        const matrix = generateQrMatrix(testUrl);

        expect(Array.isArray(matrix)).toBe(true);
        expect(matrix.length).toBeGreaterThan(20);
        expect(matrix.length).toBe(matrix[0].length); // Matriz cuadrada

        // Verificar patrones de posición (Finders de 7x7 en las 3 esquinas)
        // Esquina superior izquierda (0,0) a (6,6) tiene anillo exterior oscuro, anillo medio claro y centro oscuro
        expect(matrix[0][0]).toBe(true);
        expect(matrix[3][3]).toBe(true); // Centro oscuro del finder
        expect(matrix[1][1]).toBe(false); // Anillo claro interior del finder
    });
});
