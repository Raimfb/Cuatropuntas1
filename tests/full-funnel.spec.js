const { test, expect } = require('@playwright/test');
const path = require('path');

const publicDir = path.resolve(__dirname, '..', 'public');
const indexPath = path.join(publicDir, 'index.html');
const indexUrl = `file:///${indexPath.replace(/\\/g, '/')}`;

test.describe('Spec 018: Polimorfismo Integral del Paso 2 y Sincronización del Funnel', () => {

    test('T01.1: Sincronización de validación en Paso 1 (Remodelación 3 m² y espacios obligatorios; Obras mayores 10 m²)', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        let alertMessage = '';
        page.on('dialog', async dialog => {
            alertMessage = dialog.message();
            await dialog.accept();
        });

        const tipoSelect = page.locator('#qTipo');
        const areaInput = page.locator('#qArea');
        const nextBtn1 = page.locator('#step1 button:has-text("Siguiente")');
        const espaciosInput = page.locator('#espacios-remodelar');

        // 1. Remodelación: Exigir espacios si viene vacío
        await tipoSelect.selectOption('Remodelacion');
        await areaInput.fill('15');
        await espaciosInput.fill('');
        alertMessage = '';
        await nextBtn1.click();
        expect(alertMessage).toMatch(/espacios|recintos/i);
        await expect(page.locator('#step2')).toBeHidden();

        // 2. Remodelación: Rechazar superficie menor a 3 m²
        await espaciosInput.fill('Cocina y Baño');
        await areaInput.fill('2');
        alertMessage = '';
        await nextBtn1.click();
        expect(alertMessage).toMatch(/3\s*m²/i);
        await expect(page.locator('#step2')).toBeHidden();

        // 3. Remodelación: Permitir avance con 3 m² o más
        await areaInput.fill('4');
        await nextBtn1.click();
        await expect(page.locator('#step2')).toBeVisible();

        // Volver al Paso 1
        await page.locator('#step2 button:has-text("Anterior")').click();
        await expect(page.locator('#step1')).toBeVisible();

        // 4. Casa Nueva: Rechazar menos de 10 m²
        await tipoSelect.selectOption('Casa Nueva');
        await areaInput.fill('8');
        alertMessage = '';
        await nextBtn1.click();
        expect(alertMessage).toMatch(/10\s*m²/i);
        await expect(page.locator('#step2')).toBeHidden();

        // 5. Ampliación: Rechazar menos de 10 m²
        await tipoSelect.selectOption('Ampliacion');
        await areaInput.fill('9');
        alertMessage = '';
        await nextBtn1.click();
        expect(alertMessage).toMatch(/10\s*m²/i);
        await expect(page.locator('#step2')).toBeHidden();

        // 6. Quincho: Rechazar menos de 10 m²
        await tipoSelect.selectOption('Quincho');
        await areaInput.fill('9.5');
        alertMessage = '';
        await nextBtn1.click();
        expect(alertMessage).toMatch(/10\s*m²/i);
        await expect(page.locator('#step2')).toBeHidden();

        // Permitir avance en Quincho con 10 m²
        await areaInput.fill('10');
        await nextBtn1.click();
        await expect(page.locator('#step2')).toBeVisible();
    });

    test('T01.2: Polimorfismo Paso 2 para Remodelación (Pisos y Permisos ocultos, Terminaciones Interiores, avance fluido)', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const tipoSelect = page.locator('#qTipo');
        await tipoSelect.selectOption('Remodelacion');
        await page.locator('#espacios-remodelar').fill('Cocina americana y baño');
        await page.locator('#qArea').fill('20');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        await expect(page.locator('#step2')).toBeVisible();

        const pisosContainer = page.locator('#qPisosContainer');
        const permisosContainer = page.locator('#qPermisosContainer');
        const pisosSelect = page.locator('#qPisos');
        const permisosSelect = page.locator('#qPermisos');
        const terminacionesContainer = page.locator('#qTerminacionesContainer');
        const terminacionesLabel = page.locator('#qTerminacionesLabel');
        const terminacionesSelect = page.locator('#qTerminaciones');
        const comunaSelect = page.locator('#qComuna');

        // Pisos y Permisos deben estar ocultos y no requeridos
        await expect(pisosContainer).toBeHidden();
        await expect(permisosContainer).toBeHidden();
        expect(await pisosSelect.evaluate(el => el.hasAttribute('required'))).toBe(false);
        expect(await permisosSelect.evaluate(el => el.hasAttribute('required'))).toBe(false);

        // Los valores por defecto deben ser 1 e Idea
        expect(await pisosSelect.inputValue()).toBe('1');
        expect(await permisosSelect.inputValue()).toBe('Idea');

        // Terminaciones adaptadas a interiores
        await expect(terminacionesContainer).toBeVisible();
        expect(await terminacionesLabel.innerText()).toMatch(/interiores|terminaciones/i);
        const termOptions = await terminacionesSelect.locator('option').evaluateAll(opts => opts.map(o => o.value));
        expect(termOptions).toContain('Estandar');
        expect(termOptions).toContain('Premium');

        // Seleccionar comuna y avanzar a Paso 3 sin error de campos ocultos
        await comunaSelect.selectOption('La Florida');
        await page.locator('#step2 button:has-text("Siguiente")').click();

        await expect(page.locator('#step3')).toBeVisible();
        await expect(page.locator('#step3RemodelacionResumen')).toBeVisible();
    });

    test('T01.3: Polimorfismo Paso 2 para Quinchos (Pisos y Permisos ocultos, Terminaciones exteriores, tarjeta resumen)', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const tipoSelect = page.locator('#qTipo');
        await tipoSelect.selectOption('Quincho');
        await page.locator('#qArea').fill('25');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        await expect(page.locator('#step2')).toBeVisible();

        const pisosContainer = page.locator('#qPisosContainer');
        const permisosContainer = page.locator('#qPermisosContainer');
        const terminacionesLabel = page.locator('#qTerminacionesLabel');
        const terminacionesSelect = page.locator('#qTerminaciones');
        const comunaSelect = page.locator('#qComuna');

        // Pisos y Permisos ocultos
        await expect(pisosContainer).toBeHidden();
        await expect(permisosContainer).toBeHidden();

        // Label de terminaciones orientado a quinchos / exteriores
        expect(await terminacionesLabel.innerText()).toMatch(/pavimentos|quincho|terminaciones/i);
        const termTexts = await terminacionesSelect.locator('option').allInnerTexts();
        expect(termTexts.some(t => /radier|afinado|porcelanato/i.test(t))).toBe(true);

        // Seleccionar comuna y avanzar al Paso 3
        await comunaSelect.selectOption('Colina (Chicureo)');
        await page.locator('#step2 button:has-text("Siguiente")').click();

        await expect(page.locator('#step3')).toBeVisible();
        await expect(page.locator('#step3QuinchoResumen')).toBeVisible();
    });

    test('T01.4: Polimorfismo Paso 2 para Ampliación (Ubicación 1º vs 2º piso, Permisos DOM activos)', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const tipoSelect = page.locator('#qTipo');
        await tipoSelect.selectOption('Ampliacion');
        await page.locator('#qArea').fill('35');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        await expect(page.locator('#step2')).toBeVisible();

        const pisosContainer = page.locator('#qPisosContainer');
        const pisosLabel = page.locator('#qPisosLabel');
        const pisosSelect = page.locator('#qPisos');
        const permisosContainer = page.locator('#qPermisosContainer');

        // Contenedor de Pisos debe ser visible y consultar la ubicación de la obra
        await expect(pisosContainer).toBeVisible();
        expect(await pisosLabel.innerText()).toMatch(/ubicación|ubicacion|nivel/i);

        const pisosTexts = await pisosSelect.locator('option').allInnerTexts();
        expect(pisosTexts.some(t => /primer piso|extensión|patio/i.test(t))).toBe(true);
        expect(pisosTexts.some(t => /segundo piso|sobreelevación|sobreelevacion/i.test(t))).toBe(true);

        // Permisos DOM deben estar visibles y activos
        await expect(permisosContainer).toBeVisible();
        expect(await pisosSelect.evaluate(el => el.hasAttribute('required'))).toBe(true);
    });

    test('T01.5: Preservación de Paso 2 para Casa Nueva (4 preguntas completas)', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const tipoSelect = page.locator('#qTipo');
        await tipoSelect.selectOption('Casa Nueva');
        await page.locator('#qArea').fill('100');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        await expect(page.locator('#step2')).toBeVisible();

        await expect(page.locator('#qPisosContainer')).toBeVisible();
        await expect(page.locator('#qTerminacionesContainer')).toBeVisible();
        await expect(page.locator('#qComunaContainer')).toBeVisible();
        await expect(page.locator('#qPermisosContainer')).toBeVisible();

        expect(await page.locator('#qPisosLabel').innerText()).toMatch(/número de pisos|pisos/i);
    });

    test('T01.6: Integridad de payload hacia /api/quote para tipologías con campos ocultos', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        // Completar flujo de Quincho
        await page.locator('#qTipo').selectOption('Quincho');
        await page.locator('#qArea').fill('22');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        await expect(page.locator('#step2')).toBeVisible();
        await page.locator('#qComuna').selectOption('Lo Barnechea');
        await page.locator('#step2 button:has-text("Siguiente")').click();

        await expect(page.locator('#step3')).toBeVisible();
        await page.locator('#qNombre').fill('Juan Pérez');
        await page.locator('#qEmail').fill('juan.perez@example.com');
        await page.locator('#qTelefono').fill('912345678');

        await page.locator('#quoteSubmitBtn').click();

        await expect(page.locator('#stepSuccess')).toBeVisible({ timeout: 5000 });

        const interceptedPayload = await page.evaluate(() => window.__lastQuotePayload);
        expect(interceptedPayload).not.toBeNull();
        expect(interceptedPayload.tipo).toBe('Quincho');
        expect(interceptedPayload.area).toBe(22);
        expect(interceptedPayload.pisos).toBe(1);
        expect(interceptedPayload.permisos).toBe('Idea');
        expect(interceptedPayload.comuna).toBe('Lo Barnechea');
        expect(interceptedPayload.email).toBe('juan.perez@example.com');
    });

});
