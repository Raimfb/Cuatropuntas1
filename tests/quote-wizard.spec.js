const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../public');
const wizardJsPath = path.join(publicDir, 'quote-wizard.js');

test.describe('Spec 002: Modular Quote Wizard Suite', () => {

    test('T01.1: Archivo public/quote-wizard.js debe existir físicamente', async () => {
        expect(fs.existsSync(wizardJsPath)).toBe(true);
    });

    test('T01.2: El componente debe auto-montarse y generar todos los IDs del contrato DOM', async ({ page }) => {
        const indexPath = path.join(publicDir, 'index.html');
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        const contractIds = [
            'quoteForm',
            'step1',
            'step2',
            'step3',
            'stepSuccess',
            'qTipo',
            'qSistema',
            'qArea',
            'qPisos',
            'qTerminaciones',
            'qComuna',
            'qPermisos',
            'qNombre',
            'qEmail',
            'qTelefono',
            'website_url',
            '_hp_check',
            'progressBar',
            'stepIndicatorProg',
            'stepIndicatorTitle',
            'quoteSubmitBtn',
            'quoteStatus',
            'calendarCTAContainer',
            'calendarBtnLink',
            'fallbackCTAContainer'
        ];

        for (const id of contractIds) {
            const el = page.locator(`#${id}`);
            await expect(el, `Elemento #${id} debe existir en el DOM`).toHaveCount(1);
        }
    });

    test('T01.3: Validación de avance de pasos (bloqueo por m² vacío o inválido)', async ({ page }) => {
        const indexPath = path.join(publicDir, 'index.html');
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        // Intentar avanzar sin llenar área
        let dialogMessage = '';
        page.once('dialog', async dialog => {
            dialogMessage = dialog.message();
            await dialog.accept();
        });

        await page.locator('#step1 button:has-text("Siguiente")').click();
        
        // Debe permanecer en paso 1
        const step1 = page.locator('#step1');
        await expect(step1).not.toHaveClass(/hidden/);
        const step2 = page.locator('#step2');
        await expect(step2).toHaveClass(/hidden/);

        // Llenar m² válido y avanzar
        await page.locator('#qArea').fill('45');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        // Debe transicionar a paso 2
        await expect(step1).toHaveClass(/hidden/);
        await expect(step2).not.toHaveClass(/hidden/);
        const prog = page.locator('#stepIndicatorProg');
        await expect(prog).toHaveText('2/3');
    });

    test('T01.4: Formateo y normalización de teléfonos móviles chilenos', async ({ page }) => {
        const indexPath = path.join(publicDir, 'index.html');
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        // Navegar a Paso 3
        await page.locator('#qArea').fill('50');
        await page.locator('#step1 button:has-text("Siguiente")').click();
        await page.locator('#qComuna').selectOption('Ñuñoa');
        await page.locator('#step2 button:has-text("Siguiente")').click();

        const telInput = page.locator('#qTelefono');
        await expect(telInput).toBeVisible();

        // Ingresar 9 dígitos sin código
        await telInput.fill('987654321');
        await telInput.blur();
        const val = await telInput.inputValue();
        expect(val).toContain('+56 9 8765 4321');
    });

    test('T01.5: Pre-llenado automático de campos desde parámetros de URL', async ({ page }) => {
        const indexPath = path.join(publicDir, 'index.html');
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}?nombre=Ana%20Silva&telefono=912345678&tipo=Quincho&area=30`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        const nombreVal = await page.locator('#qNombre').inputValue();
        const areaVal = await page.locator('#qArea').inputValue();
        const tipoVal = await page.locator('#qTipo').inputValue();
        const telVal = await page.locator('#qTelefono').inputValue();

        expect(nombreVal).toBe('Ana Silva');
        expect(areaVal).toBe('30');
        expect(tipoVal).toBe('Quincho');
        expect(telVal).toContain('+56 9 1234 5678');
    });

    test('T01.6: Integración con puente calcularCon(tipo, sistema)', async ({ page }) => {
        const preciosPath = path.join(publicDir, 'precios.html');
        const fileUrl = `file:///${preciosPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        // Ejecutar calcularCon desde la consola del navegador
        await page.evaluate(() => {
            if (typeof window.calcularCon === 'function') {
                window.calcularCon('Quincho', 'Metalcon');
            }
        });

        const tipoVal = await page.locator('#qTipo').inputValue();
        const sistemaVal = await page.locator('#qSistema').inputValue();
        expect(tipoVal).toBe('Quincho');
        expect(sistemaVal).toBe('Metalcon');

        // Debe estar en paso 1
        await expect(page.locator('#step1')).not.toHaveClass(/hidden/);
    });

    test('T01.7: Manejo determinista de envío, loading y éxito con Cal.com', async ({ page }) => {
        const indexPath = path.join(publicDir, 'index.html');
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        // Mock exitoso
        await page.route('**/api/quote', async route => {
            // Simulamos demora de 100ms para verificar loading
            await page.waitForTimeout(100);
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    message: 'Cotización enviada',
                    calendarUrl: 'https://cal.com/cuatropuntas.com/visita-tecnica'
                })
            });
        });

        await page.locator('#qArea').fill('80');
        await page.locator('#step1 button:has-text("Siguiente")').click();
        await page.locator('#qComuna').selectOption('Providencia');
        await page.locator('#step2 button:has-text("Siguiente")').click();

        await page.locator('#qNombre').fill('Prueba Modular');
        await page.locator('#qEmail').fill('modular@ejemplo.com');
        await page.locator('#qTelefono').fill('+56927384075');

        await page.locator('#quoteSubmitBtn').click();

        // Tras éxito
        const stepSuccess = page.locator('#stepSuccess');
        await expect(stepSuccess).toBeVisible({ timeout: 5000 });
        const calLink = page.locator('#calendarBtnLink');
        await expect(calLink).toHaveAttribute('href', 'https://cal.com/cuatropuntas.com/visita-tecnica');
    });

    test('T01.8: Manejo determinista de error HTTP 500 con reactivación de botón', async ({ page }) => {
        const indexPath = path.join(publicDir, 'index.html');
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        // Mock de error
        await page.route('**/api/quote', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'Error interno en servidor SMTP'
                })
            });
        });

        await page.locator('#qArea').fill('80');
        await page.locator('#step1 button:has-text("Siguiente")').click();
        await page.locator('#qComuna').selectOption('Las Condes');
        await page.locator('#step2 button:has-text("Siguiente")').click();

        await page.locator('#qNombre').fill('Prueba Error');
        await page.locator('#qEmail').fill('error@ejemplo.com');
        await page.locator('#qTelefono').fill('+56927384075');

        const submitBtn = page.locator('#quoteSubmitBtn');
        await submitBtn.click();

        // Debe exhibir error y rehabilitar botón
        const statusEl = page.locator('#quoteStatus');
        await expect(statusEl).toBeVisible({ timeout: 5000 });
        await expect(statusEl).toContainText('Error');
        await expect(submitBtn).toBeEnabled();
    });
});
