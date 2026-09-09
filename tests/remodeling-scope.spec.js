const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const quoteApiPath = path.join(rootDir, 'api', 'quote.js');

test.describe('Spec 013: Lógica Condicional y Alcance Específico para Remodelaciones', () => {

    test('T01.1: Visibilidad condicional del contenedor #espaciosRemodelarContainer en el Wizard', async ({ page }) => {
        const indexPath = path.join(publicDir, 'index.html');
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        const container = page.locator('#espaciosRemodelarContainer');
        const input = page.locator('#espacios-remodelar');

        // Inicialmente con "Casa Nueva" debe estar oculto
        await expect(container).toBeHidden();

        // Al cambiar a "Remodelacion" debe hacerse visible
        await page.locator('#qTipo').selectOption('Remodelacion');
        await expect(container).toBeVisible();
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', /Ej:\s*Cocina y baño/i);

        // Escribir texto en el campo
        await input.fill('Cocina y baño principal');
        expect(await input.inputValue()).toBe('Cocina y baño principal');

        // Al volver a "Casa Nueva", debe ocultarse y limpiar el campo
        await page.locator('#qTipo').selectOption('Casa Nueva');
        await expect(container).toBeHidden();
        expect(await input.inputValue()).toBe('');

        // Al volver a "Ampliacion", sigue oculto
        await page.locator('#qTipo').selectOption('Ampliacion');
        await expect(container).toBeHidden();

        // Al cambiar de nuevo a "Remodelacion", vuelve a aparecer
        await page.locator('#qTipo').selectOption('Remodelacion');
        await expect(container).toBeVisible();
    });

    test('T01.2: En servicios/remodelaciones.html el campo debe montarse visible por defecto', async ({ page }) => {
        const remodelaPath = path.join(publicDir, 'servicios', 'remodelaciones.html');
        const fileUrl = `file:///${remodelaPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        const container = page.locator('#espaciosRemodelarContainer');
        const input = page.locator('#espacios-remodelar');

        await expect(container).toBeVisible();
        await expect(input).toBeVisible();
    });

    test('T01.3: Partidas fijas cerradas para recintos húmedos puros en calculateQuote (Baño, Cocina y Combinado)', async () => {
        const { calculateQuote, analyzeRemodelingSpaces } = require(quoteApiPath);
        expect(typeof analyzeRemodelingSpaces).toBe('function');

        // 1. Baño y Cocina Puro -> 185 UF + IVA (ignora m²)
        const banoCocinaQuote = calculateQuote({
            tipo: 'Remodelacion',
            sistema: 'Metalcon',
            area: 25,
            espacios_remodelar: 'Baño y cocina'
        });
        expect(banoCocinaQuote.totalEstimado).toBe(185);
        expect(banoCocinaQuote.isHumedoPuro).toBe(true);
        expect(banoCocinaQuote.tipoHumedo).toBe('Baño y Cocina');

        // 2. Solo Baño -> 75 UF + IVA (ignora m²)
        const soloBanoQuote = calculateQuote({
            tipo: 'Remodelacion',
            sistema: 'Metalcon',
            area: 12,
            espacios_remodelar: 'Solo baño principal'
        });
        expect(soloBanoQuote.totalEstimado).toBe(75);
        expect(soloBanoQuote.isHumedoPuro).toBe(true);
        expect(soloBanoQuote.tipoHumedo).toBe('Baño');

        // 3. Solo Cocina -> 110 UF + IVA (ignora m²)
        const soloCocinaQuote = calculateQuote({
            tipo: 'Remodelacion',
            sistema: 'Metalcon',
            area: 18,
            espacios_remodelar: 'Cocina integral'
        });
        expect(soloCocinaQuote.totalEstimado).toBe(110);
        expect(soloCocinaQuote.isHumedoPuro).toBe(true);
        expect(soloCocinaQuote.tipoHumedo).toBe('Cocina');
    });

    test('T01.4: Cálculo por m² para remodelación mixta/seca con inyección de notas de alcance técnico', async () => {
        const { calculateQuote } = require(quoteApiPath);

        // 1. Comedor y baño 40 m² con Metalcon (40 * 11 UF = 440 UF)
        const mixtoBanoQuote = calculateQuote({
            tipo: 'Remodelacion',
            sistema: 'Metalcon',
            area: 40,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea',
            espacios_remodelar: 'Comedor y baño'
        });

        expect(mixtoBanoQuote.isHumedoPuro).toBe(false);
        expect(mixtoBanoQuote.totalEstimado).toBe(440);
        expect(Array.isArray(mixtoBanoQuote.notasAlcance)).toBe(true);
        expect(mixtoBanoQuote.notasAlcance.length).toBe(1);
        expect(mixtoBanoQuote.notasAlcance[0]).toContain('Baño incluido');
        expect(mixtoBanoQuote.notasAlcance[0]).toContain('showerdoor');

        // 2. Living y cocina 50 m² con Metalcon (50 * 11 UF = 550 UF)
        const mixtoCocinaQuote = calculateQuote({
            tipo: 'Remodelacion',
            sistema: 'Metalcon',
            area: 50,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea',
            espacios_remodelar: 'Living y cocina'
        });

        expect(mixtoCocinaQuote.isHumedoPuro).toBe(false);
        expect(mixtoCocinaQuote.totalEstimado).toBe(550);
        expect(Array.isArray(mixtoCocinaQuote.notasAlcance)).toBe(true);
        expect(mixtoCocinaQuote.notasAlcance.length).toBe(1);
        expect(mixtoCocinaQuote.notasAlcance[0]).toContain('Cocina incluida');
        // Aserción taxativa mandatada por el usuario
        expect(mixtoCocinaQuote.notasAlcance[0]).toContain('Se excluye taxativamente todo tipo de electrodomésticos y línea blanca');

        // 3. Living, comedor, dormitorio, cocina y baño (ambas notas presentes)
        const fullMixtoQuote = calculateQuote({
            tipo: 'Remodelacion',
            sistema: 'Metalcon',
            area: 70,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea',
            espacios_remodelar: 'Living, comedor, dormitorios, baño y cocina'
        });

        expect(fullMixtoQuote.isHumedoPuro).toBe(false);
        expect(fullMixtoQuote.totalEstimado).toBe(770);
        expect(fullMixtoQuote.notasAlcance.length).toBe(2);
    });

    test('T01.5: Retrocompatibilidad total cuando no se especifica espacios_remodelar o viene vacío', async () => {
        const { calculateQuote } = require(quoteApiPath);

        // Remodelación pequeña de 4 m² sin espacios_remodelar preserva piso de 60 UF
        const emptySmallQuote = calculateQuote({
            tipo: 'Remodelacion',
            sistema: 'Metalcon',
            area: 4,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea',
            espacios_remodelar: ''
        });
        expect(emptySmallQuote.totalEstimado).toBe(60);
        expect(emptySmallQuote.isHumedoPuro).toBe(false);
        expect(emptySmallQuote.notasAlcance.length).toBe(0);

        // Casa Nueva no se ve afectada
        const casaQuote = calculateQuote({
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            area: 100,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea',
            espacios_remodelar: 'Cocina y baño' // No debe alterar casa nueva
        });
        expect(casaQuote.totalEstimado).toBe(1900);
        expect(casaQuote.notasAlcance.length).toBe(0);
    });

    test('T01.6: Visualización de resumen en Paso 3 y persistencia con espacios_remodelar', async ({ page }) => {
        const indexPath = path.join(publicDir, 'index.html');
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        // Paso 1
        await page.locator('#qTipo').selectOption('Remodelacion');
        await page.locator('#espacios-remodelar').fill('Cocina y baño');
        await page.locator('#qArea').fill('45');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        // Paso 2
        await page.locator('#qComuna').selectOption('Santiago Centro');
        await page.locator('#step2 button:has-text("Siguiente")').click();

        // Paso 3
        const resumenStep3 = page.locator('#step3RemodelacionResumen');
        await expect(resumenStep3).toBeVisible();
        expect(await resumenStep3.innerText()).toContain('Cocina y baño');

        // Validar persistLeadToGoogleSheets con espacios_remodelar
        const { persistLeadToGoogleSheets } = require(quoteApiPath);
        const persistResult = await persistLeadToGoogleSheets({
            nombre: 'Test Scope',
            email: 'test@cuatropuntas.com',
            telefono: '+56912345678',
            tipo: 'Remodelacion',
            espacios_remodelar: 'Cocina y baño',
            sistema: 'Metalcon',
            areaNum: 45,
            pisosNum: 1,
            terminaciones: 'Estandar',
            comunaHuman: 'Santiago, RM',
            permisos: 'Idea',
            minUF: '475',
            maxUF: '520',
            totalEstimado: 495
        });
        expect(typeof persistResult.success).toBe('boolean');
    });

});
