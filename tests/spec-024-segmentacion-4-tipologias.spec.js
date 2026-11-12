const { test, expect } = require('@playwright/test');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const indexUrl = `file:///${path.join(publicDir, 'index.html').replace(/\\/g, '/')}`;

test.describe('Spec 024: Segmentación Visual de 4 Tipologías, Preselección Web y Chips de Remodelación ("Zero-Breakage")', () => {

    test('T024.1: Renderizado de 4 tarjetas visuales en #step1 con iconos y estado activo inicial', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const cardsContainer = page.locator('#tipoCardsContainer');
        await expect(cardsContainer).toBeVisible();

        const cards = page.locator('#tipoCardsContainer .tipo-card');
        await expect(cards).toHaveCount(4);

        // Casa Nueva activa por defecto
        const casaCard = page.locator('.tipo-card[data-tipo-card="Casa Nueva"]');
        await expect(casaCard).toHaveAttribute('aria-checked', 'true');
        await expect(casaCard).toContainText('Construcción Casa Nueva');
        await expect(casaCard).toContainText('Vivienda llave en mano en sitio propio');

        // Tarjetas inactivas
        const ampliaCard = page.locator('.tipo-card[data-tipo-card="Ampliacion"]');
        await expect(ampliaCard).toHaveAttribute('aria-checked', 'false');
        await expect(ampliaCard).toContainText('Ampliación / 2º Piso');

        const remodelaCard = page.locator('.tipo-card[data-tipo-card="Remodelacion"]');
        await expect(remodelaCard).toHaveAttribute('aria-checked', 'false');
        await expect(remodelaCard).toContainText('Remodelación Integral');

        const quinchoCard = page.locator('.tipo-card[data-tipo-card="Quincho"]');
        await expect(quinchoCard).toHaveAttribute('aria-checked', 'false');
        await expect(quinchoCard).toContainText('Quinchos y Terrazas');
    });

    test('T024.2: Clic en tarjeta visual sincroniza bidireccionalmente #qTipo y gatilla polimorfismo', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const tipoSelect = page.locator('#qTipo');
        const quinchoCard = page.locator('.tipo-card[data-tipo-card="Quincho"]');

        // Clic en tarjeta Quincho
        await quinchoCard.click();

        // #qTipo debe haber cambiado a 'Quincho'
        await expect(tipoSelect).toHaveValue('Quincho');
        await expect(quinchoCard).toHaveAttribute('aria-checked', 'true');

        // El polimorfismo debe reflejar cobertizo / quincho
        const sistemaLabel = page.locator('#qSistemaLabel');
        await expect(sistemaLabel).toContainText('Estructura y Techumbre');

        // Opciones de Quincho con nombres técnicos
        const optionsText = await page.locator('#qSistema option').allInnerTexts();
        expect(optionsText.some(t => /madera|pino oregón/i.test(t))).toBe(true);

        // Ahora cambiar a Ampliación mediante clic en tarjeta
        const ampliaCard = page.locator('.tipo-card[data-tipo-card="Ampliacion"]');
        await ampliaCard.click();

        await expect(tipoSelect).toHaveValue('Ampliacion');
        await expect(ampliaCard).toHaveAttribute('aria-checked', 'true');
        await expect(quinchoCard).toHaveAttribute('aria-checked', 'false');
        await expect(sistemaLabel).toContainText('Ampliación 1º piso o Sobreelevación 2º piso');
    });

    test('T024.3: Cambio nativo en select #qTipo sincroniza el estado activo de las tarjetas', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        const tipoSelect = page.locator('#qTipo');
        const remodelaCard = page.locator('.tipo-card[data-tipo-card="Remodelacion"]');

        // Cambiar nativamente
        await tipoSelect.selectOption('Remodelacion');

        // La tarjeta debe activarse
        await expect(remodelaCard).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('.tipo-card[data-tipo-card="Casa Nueva"]')).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator('#qSistemaLabel')).toHaveText('Materialidad Actual de los Muros a Intervenir');
        await expect(page.locator('#qSistemaContainer')).toBeVisible();
    });

    test('T024.4: Chips de selección rápida en Remodelación rellenan el input de espacios a remodelar', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        // Seleccionar Remodelación
        await page.locator('.tipo-card[data-tipo-card="Remodelacion"]').click();

        const espaciosContainer = page.locator('#espaciosRemodelarContainer');
        await expect(espaciosContainer).toBeVisible();

        const espaciosInput = page.locator('#espacios-remodelar');

        // Chip Baño y Cocina
        const chipBanoCocina = page.locator('[data-remodela-chip="Baño y Cocina"]');
        await expect(chipBanoCocina).toBeVisible();
        await chipBanoCocina.click();

        await expect(espaciosInput).toHaveValue('Baño y Cocina');

        // Chip Solo Cocina
        const chipCocina = page.locator('[data-remodela-chip="Cocina integral"]');
        await chipCocina.click();

        await expect(espaciosInput).toHaveValue('Cocina integral');
    });

    test('T024.5: Permisos DOM para Quinchos muestra nota explicativa calmante sin romper validación', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        // Seleccionar Quincho y avanzar a Paso 2
        await page.locator('.tipo-card[data-tipo-card="Quincho"]').click();
        await page.locator('#qArea').fill('25');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        await expect(page.locator('#step2')).toBeVisible();

        const permisosContainer = page.locator('#qPermisosContainer');
        await expect(permisosContainer).toBeVisible();

        const permisosSelect = page.locator('#qPermisos');
        expect(await permisosSelect.evaluate(el => el.hasAttribute('required'))).toBe(true);

        const helpText = page.locator('#qPermisosHelpText');
        await expect(helpText).toBeVisible();
        await expect(helpText).toContainText('Tranquilo: si aún no tienes permisos municipales');
    });

    test('T024.6: Clic en botones de servicios en index.html preselecciona la tipología correspondiente', async ({ page }) => {
        await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

        // Clic en botón "Cotizar Quincho ->" en la sección de servicios
        const quinchoBtn = page.locator('a[data-quote-tipo="Quincho"]').first();
        await expect(quinchoBtn).toBeVisible();
        await quinchoBtn.click();

        // El cotizador debe haberse actualizado a Quincho
        const tipoSelect = page.locator('#qTipo');
        await expect(tipoSelect).toHaveValue('Quincho');

        const quinchoCard = page.locator('.tipo-card[data-tipo-card="Quincho"]');
        await expect(quinchoCard).toHaveAttribute('aria-checked', 'true');

        // Clic en fila o botón de Remodelación en la tabla de precios
        const remodelaRow = page.locator('tr[data-quote-tipo="Remodelacion"]');
        await remodelaRow.click();

        await expect(tipoSelect).toHaveValue('Remodelacion');
        await expect(page.locator('.tipo-card[data-tipo-card="Remodelacion"]')).toHaveAttribute('aria-checked', 'true');
    });

    test('T024.7: Sin bloqueos silenciosos en Mobile (375x667) y Desktop (1280x800) ni fugas de mailto en frontend', async ({ page }) => {
        for (const vp of [{ width: 375, height: 667 }, { width: 1280, height: 800 }]) {
            await page.setViewportSize(vp);
            await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

            // #qTipo oculto NO debe tener atributo required y #quoteForm debe tener novalidate
            const qTipoHasRequired = await page.locator('#qTipo').evaluate(el => el.hasAttribute('required'));
            expect(qTipoHasRequired).toBe(false);
            const formHasNoValidate = await page.locator('#quoteForm').evaluate(el => el.hasAttribute('novalidate'));
            expect(formHasNoValidate).toBe(true);

            // Cero enlaces mailto:contacto@cuatropuntas.com en el DOM
            await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);

            await page.route('**/api/quote', async route => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        message: 'Cotización generada y enviada correctamente',
                        calendarUrl: 'https://cal.com/cuatropuntas.com/visita-tecnica'
                    })
                });
            });

            // Seleccionar Remodelación en tarjeta visual (que oculta Pisos y Permisos en Paso 2)
            await page.locator('.tipo-card[data-tipo-card="Remodelacion"]').click();
            await page.locator('[data-remodela-chip="Baño y Cocina"]').click();
            await page.locator('#qArea').fill('15');
            await page.locator('#step1 button:has-text("Siguiente")').click();

            await expect(page.locator('#step2')).toBeVisible();
            await page.locator('#qComuna').selectOption('Las Condes');
            await page.locator('#step2 button:has-text("Siguiente")').click();

            await expect(page.locator('#step3')).toBeVisible();
            await page.locator('#qNombre').fill('Cliente Mobile Test');
            await page.locator('#qEmail').fill('mobile@cuatropuntas.com');
            await page.locator('#qTelefono').fill('912345678');
            await page.locator('#quoteSubmitBtn').click();

            await expect(page.locator('#stepSuccess')).toBeVisible({ timeout: 5000 });
        }
    });

});
