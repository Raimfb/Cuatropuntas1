const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const quoteApiPath = path.join(rootDir, 'api', 'quote.js');

test.describe('Spec 014: Delimitación de Alcance Técnico y Transparencia para Quinchos', () => {

    test('T01.1: calculateQuote inyecta notas de alcance base y exclusiones taxativas para Quinchos', async () => {
        const { calculateQuote } = require(quoteApiPath);

        // 1. Quincho Metalcon (12 UF/m²)
        const quinchoMetalcon = calculateQuote({
            tipo: 'Quincho',
            sistema: 'Metalcon',
            area: 25,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Santiago Centro',
            permisos: 'Idea'
        });

        expect(quinchoMetalcon.isQuincho).toBe(true);
        expect(Array.isArray(quinchoMetalcon.notasAlcance)).toBe(true);
        expect(quinchoMetalcon.notasAlcance.length).toBe(2);

        const [notaBase, notaExclusiones] = quinchoMetalcon.notasAlcance;

        // Validar Alcance Base
        expect(notaBase).toMatch(/cobertizo|techumbre/i);
        expect(notaBase).toMatch(/radier/i);
        expect(notaBase).toMatch(/refractarios/i);
        expect(notaBase).toMatch(/manivela|elevable/i);
        expect(notaBase).toMatch(/campana/i);
        expect(notaBase).toMatch(/mes[oó]n/i);

        // Validar Exclusiones Taxativas
        expect(notaExclusiones).toMatch(/sanitarias|agua potable|desag[uü]e/i);
        expect(notaExclusiones).toMatch(/el[eé]ctrica/i);
        expect(notaExclusiones).toMatch(/muebles|puertas|cajoneras/i);
        expect(notaExclusiones).toMatch(/granito|cuarzo|piedra natural/i);

        // 2. Quincho Albañilería (15 UF/m²)
        const quinchoAlba = calculateQuote({
            tipo: 'Quincho / Terraza',
            sistema: 'Albanileria',
            area: 30,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Colina (Chicureo)',
            permisos: 'Idea'
        });

        expect(quinchoAlba.isQuincho).toBe(true);
        expect(quinchoAlba.notasAlcance.length).toBe(2);

        // 3. Proyecto no quincho (Casa Nueva) NO debe tener notas de quincho
        const casaQuote = calculateQuote({
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            area: 70
        });
        expect(casaQuote.notasAlcance.length).toBe(0);
    });

    test('T01.2: Endpoint HTTP /api/quote responde 200 con notasAlcance para Quinchos', async () => {
        const quoteHandler = require(quoteApiPath);

        const mockReq = {
            method: 'POST',
            body: {
                tipo: 'Quincho',
                sistema: 'Metalcon',
                area: '20',
                pisos: '1',
                terminaciones: 'Estandar',
                comuna: 'La Reina',
                permisos: 'Idea',
                nombre: 'Carlos Asador',
                email: 'carlos@ejemplo.cl',
                telefono: '+56976543210'
            }
        };

        const nodemailer = require('nodemailer');
        const origCreateTransport = nodemailer.createTransport;
        const origPass = process.env.ZOHO_PASS;
        process.env.ZOHO_PASS = 'mock_pass_for_test';
        nodemailer.createTransport = () => ({
            sendMail: async () => ({ messageId: 'mock-mail-id' })
        });

        let responseStatusCode = null;
        let responseJsonData = null;

        const mockRes = {
            setHeader: function () {
                return this;
            },
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
        } finally {
            nodemailer.createTransport = origCreateTransport;
            if (origPass !== undefined) {
                process.env.ZOHO_PASS = origPass;
            } else {
                delete process.env.ZOHO_PASS;
            }
        }

        expect(responseStatusCode).toBe(200);
        expect(responseJsonData).toBeDefined();
        expect(responseJsonData.success).toBe(true);
        expect(Array.isArray(responseJsonData.notasAlcance)).toBe(true);
        expect(responseJsonData.notasAlcance.length).toBe(2);
        expect(responseJsonData.notasAlcance[0]).toMatch(/Quincho Base Incluye/i);
        expect(responseJsonData.notasAlcance[1]).toMatch(/Partidas Adicionales/i);
    });

    test('T01.3: Visualización dinámica y bidireccional de #step3QuinchoResumen en el Wizard', async ({ page }) => {
        const indexPath = path.join(publicDir, 'index.html');
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        // Paso 1: Seleccionar Quincho
        await page.locator('#qTipo').selectOption('Quincho');
        await page.locator('#qArea').fill('25');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        // Paso 2: Completar diseño y comuna
        await page.locator('#qComuna').selectOption('La Florida');
        await page.locator('#step2 button:has-text("Siguiente")').click();

        // Paso 3: Tarjeta de quincho debe estar visible con sus inclusiones y exclusiones
        const quinchoCard = page.locator('#step3QuinchoResumen');
        await expect(quinchoCard).toBeVisible();
        const cardText = await quinchoCard.innerText();
        expect(cardText).toMatch(/cobertizo|radier|parrilla|campana|mes[oó]n/i);
        expect(cardText).toMatch(/agua|desag[uü]es|el[eé]ctrica|muebles/i);

        // Retroceder al Paso 2 y luego al Paso 1
        await page.locator('#step3 button:has-text("Anterior")').click();
        await page.locator('#step2 button:has-text("Anterior")').click();

        // Cambiar a "Casa Nueva"
        await page.locator('#qTipo').selectOption('Casa Nueva');
        await page.locator('#step1 button:has-text("Siguiente")').click();
        await page.locator('#step2 button:has-text("Siguiente")').click();

        // En Paso 3 para Casa Nueva, la tarjeta de Quincho DEBE estar oculta
        await expect(quinchoCard).toBeHidden();

        // Retroceder y cambiar a "Remodelacion" con espacios
        await page.locator('#step3 button:has-text("Anterior")').click();
        await page.locator('#step2 button:has-text("Anterior")').click();
        await page.locator('#qTipo').selectOption('Remodelacion');
        await page.locator('#espacios-remodelar').fill('Baño de visitas');
        await page.locator('#step1 button:has-text("Siguiente")').click();
        await page.locator('#step2 button:has-text("Siguiente")').click();

        // En Paso 3 para Remodelación, quincho oculto y remodelación visible
        await expect(quinchoCard).toBeHidden();
        const remodelaCard = page.locator('#step3RemodelacionResumen');
        await expect(remodelaCard).toBeVisible();
    });

    test('T01.4: En servicios/quinchos.html el wizard carga con Quincho y tarjeta activa en Paso 3', async ({ page }) => {
        const quinchosHtmlPath = path.join(publicDir, 'servicios', 'quinchos.html');
        const fileUrl = `file:///${quinchosHtmlPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        // Verificar preselección de Quincho en el wizard
        const qTipoVal = await page.locator('#qTipo').inputValue();
        expect(qTipoVal).toBe('Quincho');

        // Llenar datos y avanzar
        await page.locator('#qArea').fill('30');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        await page.locator('#qComuna').selectOption('Colina (Chicureo)');
        await page.locator('#step2 button:has-text("Siguiente")').click();

        const quinchoCard = page.locator('#step3QuinchoResumen');
        await expect(quinchoCard).toBeVisible();
    });

    test('T01.5: Saneamiento de copys en public/servicios/quinchos.html (cero sobrepromesas de redes incluidas)', async () => {
        const quinchosHtmlPath = path.join(publicDir, 'servicios', 'quinchos.html');
        const content = fs.readFileSync(quinchosHtmlPath, 'utf8');

        // Meta description no debe prometer conexiones sanitarias/eléctricas incluidas
        expect(content).not.toMatch(/Incluye parrillas, hornos y conexiones hidr[aá]ulicas y el[eé]ctricas/i);

        // JSON-LD no debe declarar redes de agua y luz como incluidas por defecto en la tarifa base
        expect(content).not.toMatch(/barras en granito o hormig[oó]n, y redes de agua y luz/i);
        expect(content).not.toMatch(/"Instalaciones sanitarias y de gas integradas"/i);

        // Sección de equipamiento debe explicitar partidas adicionales a cubicar en terreno
        expect(content).toMatch(/Equipamiento Base|Partidas Adicionales|a presupuestar en terreno|visita t[eé]cnica/i);
    });

});
