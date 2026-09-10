const { test, expect } = require('@playwright/test');
const path = require('path');

const publicDir = path.resolve(__dirname, '..', 'public');
const indexPath = path.join(publicDir, 'index.html');
const indexUrl = `file:///${indexPath.replace(/\\/g, '/')}`;

test.describe('Spec 016: Formulario Dinámico y Polimórfico por Tipología de Proyecto', () => {

    test('T01.1: Presencia estructural de #qSistemaContainer, #qSistemaLabel y #qAreaHelpText', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const sistemaContainer = page.locator('#qSistemaContainer');
        const sistemaLabel = page.locator('#qSistemaLabel');
        const areaHelpText = page.locator('#qAreaHelpText');

        await expect(sistemaContainer).toBeAttached();
        await expect(sistemaLabel).toBeAttached();
        await expect(areaHelpText).toBeAttached();
    });

    test('T01.2: Mutación reactiva a "Remodelación" (selector oculto, sin required, espacios visibles y avance a Paso 2)', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const tipoSelect = page.locator('#qTipo');
        const sistemaContainer = page.locator('#qSistemaContainer');
        const sistemaSelect = page.locator('#qSistema');
        const espaciosContainer = page.locator('#espaciosRemodelarContainer');
        const espaciosInput = page.locator('#espacios-remodelar');
        const areaHelpText = page.locator('#qAreaHelpText');

        // Cambiar a Remodelación
        await tipoSelect.selectOption('Remodelacion');

        // El contenedor del selector de sistema debe estar oculto
        await expect(sistemaContainer).toBeHidden();

        // El select de sistema NO debe tener required para no bloquear formularios
        const isRequired = await sistemaSelect.evaluate(el => el.hasAttribute('required'));
        expect(isRequired).toBe(false);

        // El valor asignado debe ser compatible con backend ('Metalcon')
        expect(await sistemaSelect.inputValue()).toBe('Metalcon');

        // Los espacios a remodelar deben estar visibles
        await expect(espaciosContainer).toBeVisible();
        await expect(espaciosInput).toBeVisible();

        // El texto de ayuda sobre partidas cerradas debe estar visible
        await expect(areaHelpText).toBeVisible();
        expect(await areaHelpText.innerText()).toMatch(/húmedos|baño|cocina|paquete|partida/i);

        // Llenar superficie y avanzar al Paso 2 sin error de validación
        await page.locator('#qArea').fill('25');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        // Paso 2 debe estar visible
        await expect(page.locator('#step2')).toBeVisible();
    });

    test('T01.3: Mutación a "Segundo Piso / Ampliación" (label ampliado, opciones Metalcom, SIP y Albañilería 27 UF)', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const tipoSelect = page.locator('#qTipo');
        const sistemaContainer = page.locator('#qSistemaContainer');
        const sistemaLabel = page.locator('#qSistemaLabel');
        const sistemaSelect = page.locator('#qSistema');

        // Cambiar a Ampliación
        await tipoSelect.selectOption('Ampliacion');

        await expect(sistemaContainer).toBeVisible();
        expect(await sistemaLabel.innerText()).toBe('Sistema Constructivo (Ampliación 1º piso o Sobreelevación 2º piso)');

        // Opciones visibles en select
        const options = await sistemaSelect.locator('option').allInnerTexts();
        const optionValues = await sistemaSelect.locator('option').evaluateAll(opts => opts.map(o => o.value));

        // Debe contener Metalcom Liviano (22 UF), SIP Aislante (24 UF) y Albañilería (27 UF)
        expect(options.some(t => /metalco/i.test(t) && /22\s*UF/i.test(t))).toBe(true);
        expect(options.some(t => /sip/i.test(t) && /24\s*UF/i.test(t))).toBe(true);
        expect(options.some(t => /albañilería|albanileria|tradicional/i.test(t) && /27\s*UF/i.test(t))).toBe(true);

        expect(optionValues).toContain('Metalcon');
        expect(optionValues).toContain('SIP');
        expect(optionValues).toContain('Albanileria');

        // Seleccionar Albañilería y avanzar al Paso 2
        await sistemaSelect.selectOption('Albanileria');
        await page.locator('#qArea').fill('45');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        await expect(page.locator('#step2')).toBeVisible();
    });

    test('T01.4: Mutación a "Quincho" (label estructura/techumbre cobertizo, opciones Madera y Acero)', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const tipoSelect = page.locator('#qTipo');
        const sistemaContainer = page.locator('#qSistemaContainer');
        const sistemaLabel = page.locator('#qSistemaLabel');
        const sistemaSelect = page.locator('#qSistema');

        // Cambiar a Quincho
        await tipoSelect.selectOption('Quincho');

        await expect(sistemaContainer).toBeVisible();
        expect(await sistemaLabel.innerText()).toMatch(/cobertizo|techumbre|estructura/i);

        const options = await sistemaSelect.locator('option').allInnerTexts();

        // Opciones de Madera y Fierro/Acero con tarifas respectivas
        expect(options.some(t => /madera/i.test(t) && /12\s*UF/i.test(t))).toBe(true);
        expect(options.some(t => /acero|fierro/i.test(t) && /15\s*UF/i.test(t))).toBe(true);

        // Comprobar mapeo transparente a claves de backend
        const maderaOpt = sistemaSelect.locator('option:has-text("Madera")');
        expect(await maderaOpt.getAttribute('value')).toBe('Metalcon');

        const aceroOpt = sistemaSelect.locator('option:has-text("Acero"), option:has-text("Fierro")');
        expect(await aceroOpt.getAttribute('value')).toBe('Albanileria');
    });

    test('T01.5: Mutación a "Casa Nueva" (3 alternativas estructurales completas)', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const tipoSelect = page.locator('#qTipo');
        const sistemaContainer = page.locator('#qSistemaContainer');
        const sistemaLabel = page.locator('#qSistemaLabel');
        const sistemaSelect = page.locator('#qSistema');

        // Cambiar primero a Quincho y luego volver a Casa Nueva para probar dinamismo bidireccional
        await tipoSelect.selectOption('Quincho');
        await tipoSelect.selectOption('Casa Nueva');

        await expect(sistemaContainer).toBeVisible();
        expect(await sistemaLabel.innerText()).toMatch(/sistema constructivo/i);

        const options = await sistemaSelect.locator('option').allInnerTexts();
        expect(options.some(t => /metalco/i.test(t) && /19\s*UF/i.test(t))).toBe(true);
        expect(options.some(t => /sip/i.test(t) && /21\s*UF/i.test(t))).toBe(true);
        expect(options.some(t => /albañilería|albanileria|mixto/i.test(t) && /25\s*UF/i.test(t))).toBe(true);
    });

    test('T01.6: Montaje polimórfico inicial en servicios/remodelaciones.html y servicios/quinchos.html', async ({ page }) => {
        // 1. servicios/remodelaciones.html
        const remodelaPath = path.join(publicDir, 'servicios', 'remodelaciones.html');
        const remodelaUrl = `file:///${remodelaPath.replace(/\\/g, '/')}`;
        await page.goto(remodelaUrl, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('#qSistemaContainer')).toBeHidden();
        await expect(page.locator('#espaciosRemodelarContainer')).toBeVisible();

        // 2. servicios/quinchos.html
        const quinchosPath = path.join(publicDir, 'servicios', 'quinchos.html');
        const quinchosUrl = `file:///${quinchosPath.replace(/\\/g, '/')}`;
        await page.goto(quinchosUrl, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('#qSistemaContainer')).toBeVisible();
        expect(await page.locator('#qSistemaLabel').innerText()).toMatch(/cobertizo|techumbre|estructura/i);
        const quinchoOpts = await page.locator('#qSistema option').allInnerTexts();
        expect(quinchoOpts.some(t => /madera/i.test(t))).toBe(true);
        expect(quinchoOpts.some(t => /acero|fierro/i.test(t))).toBe(true);
    });

});
