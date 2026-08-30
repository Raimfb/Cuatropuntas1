const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../public');
const mainPagesToTest = [
    'index.html',
    'precios.html',
    'politicas.html',
    'subsidio-minvu-sitio-propio.html',
    'servicios/casas-nuevas.html',
    'servicios/quinchos.html',
    'servicios/remodelaciones.html',
    'servicios/segundos-pisos.html'
];

const blogPostsToTest = [
    { page: 'blog/index.html', expectedImages: ['blog_precios_construccion.jpg', 'blog_consejos_construir.jpg'] },
    { page: 'blog/posts/permisos-edificacion-dom-santiago-guia.html', expectedImage: 'blog_permisos_dom_santiago.jpg' },
    { page: 'blog/posts/aislacion-termica-zona-3-rm-oguc.html', expectedImage: 'blog_aislacion_termica_oguc.jpg' },
    { page: 'blog/posts/como-regularizar-ampliacion-segundo-piso-chile.html', expectedImage: 'blog_regularizar_ampliacion.jpg' },
    { page: 'blog/posts/en-que-fijarse-antes-de-construir.html', expectedImage: 'blog_consejos_construir.jpg' },
    { page: 'blog/posts/guia-precios-construccion-chile.html', expectedImage: 'blog_precios_construccion.jpg' },
    { page: 'blog/posts/metalcon-vs-albanileria-vs-sip.html', expectedImage: 'blog_comparativa_sistemas.jpg' }
];

const screenshotsDir = path.join(__dirname, '../test-results/screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

for (const relPath of mainPagesToTest) {
    test(`Verificar ${relPath}`, async ({ page }) => {
        const fullPath = path.join(publicDir, relPath);
        expect(fs.existsSync(fullPath)).toBe(true);

        const fileUrl = `file:///${fullPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        const bodyText = await page.innerText('body');

        // Check 1: Old phone number +56 9 7909 2027 should NOT be present in visible text
        expect(bodyText).not.toContain('7909 2027');
        expect(bodyText).not.toContain('79092027');

        // Check 2: Floating WhatsApp button present
        const floatingBtn = page.locator('a[href*="wa.me/56927384075"]');
        await expect(floatingBtn.first()).toBeVisible();

        // Check 3: Si la página tiene el botón de agendar visita técnica, validar texto y enlace exacto
        const calBtn = page.locator('#calendarBtnLink');
        if (await calBtn.count() > 0) {
            await expect(calBtn).toHaveAttribute('href', 'https://cal.com/cuatropuntas.com/visita-tecnica');
            const calBtnText = await calBtn.innerText();
            expect(calBtnText).toContain('Agendar Visita Técnica a Terreno');
        }

        // Check 4: Ninguna página debe tener textos antiguos
        expect(bodyText).not.toContain('Agendar Asesoría Técnica');
        expect(bodyText).not.toContain('Sesión de Asesoría Técnica');
        expect(bodyText).not.toContain('Agendar Reunión Técnica');

        // Captura de screenshot para páginas principales
        const cleanName = relPath.replace(/\//g, '_').replace('.html', '');
        await page.screenshot({ path: path.join(screenshotsDir, `pagina_${cleanName}.png`), fullPage: false });
    });
}

for (const item of blogPostsToTest) {
    test(`Verificar Imágenes e Integridad del Blog: ${item.page}`, async ({ page }) => {
        const fullPath = path.join(publicDir, item.page);
        expect(fs.existsSync(fullPath)).toBe(true);

        const fileUrl = `file:///${fullPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        if (item.expectedImage) {
            const imgLocator = page.locator(`img[src*="${item.expectedImage}"]`);
            await expect(imgLocator.first()).toBeVisible();
        }
        if (item.expectedImages) {
            for (const imgName of item.expectedImages) {
                const imgLocator = page.locator(`img[src*="${imgName}"]`);
                await expect(imgLocator.first()).toBeVisible();
            }
        }
    });
}

test('Verificar enlace y texto del botón de agendamiento en blog/index.html y capturar screenshot', async ({ page }) => {
    const blogPath = path.join(publicDir, 'blog/index.html');
    const fileUrl = `file:///${blogPath.replace(/\\/g, '/')}`;
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

    const calBlogBtn = page.locator('a[href="https://cal.com/cuatropuntas.com/visita-tecnica"]');
    await expect(calBlogBtn.first()).toBeVisible();
    const btnText = await calBlogBtn.first().innerText();
    expect(btnText).toContain('Agendar Visita Técnica a Terreno');

    await calBlogBtn.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshotsDir, 'blog_cta_agendar_visita_tecnica.png') });
});

test('Simular cotizador en index.html y capturar pantalla del modal de agendamiento exitoso', async ({ page }) => {
    const indexPath = path.join(publicDir, 'index.html');
    const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

    // Mock de la llamada fetch al cotizador para prueba de UI
    await page.route('**/api/quote', async (route) => {
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

    // Rellenar formulario cotizador - Paso 1
    await page.locator('#qTipo').selectOption('Casa Nueva');
    await page.locator('#qArea').fill('120');
    await page.locator('#step1 button:has-text("Siguiente")').click();

    // Paso 2
    await page.locator('#qComuna').selectOption('Las Condes');
    await page.locator('#step2 button:has-text("Siguiente")').click();

    // Paso 3
    await page.locator('#qNombre').fill('Cliente Verificación Playwright');
    await page.locator('#qEmail').fill('contacto@cuatropuntas.com');
    await page.locator('#qTelefono').fill('+56927384075');
    await page.locator('#quoteSubmitBtn').click();

    // Validar estado de éxito
    const calContainer = page.locator('#calendarCTAContainer');
    await expect(calContainer).toBeVisible({ timeout: 5000 });

    const calBtn = page.locator('#calendarBtnLink');
    await expect(calBtn).toHaveAttribute('href', 'https://cal.com/cuatropuntas.com/visita-tecnica');
    await expect(calBtn).toContainText('Agendar Visita Técnica a Terreno');

    await calContainer.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshotsDir, 'modal_cotizador_agendar_visita_tecnica.png') });
});

test('Verificar que api/quote.js contiene los textos oficiales y enlace exacto', async () => {
    const quoteCode = fs.readFileSync(path.join(__dirname, '../api/quote.js'), 'utf-8');
    expect(quoteCode).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');
    expect(quoteCode).toContain('Agendar Visita Técnica a Terreno');
    expect(quoteCode).toContain('4. Siguiente Paso — Visita Técnica en Terreno');
    expect(quoteCode).not.toContain('Agendar Asesoría Técnica');
    expect(quoteCode).not.toContain('Sesión de Asesoría Técnica');
    expect(quoteCode).not.toContain('Agendar Reunión Técnica');
});

test('Verificar sitio en vivo en Producción (Home: https://www.cuatropuntas.com) y capturar pantalla', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('https://www.cuatropuntas.com', { waitUntil: 'domcontentloaded', timeout: 45000 });

    const calBtn = page.locator('#calendarBtnLink');
    if (await calBtn.count() > 0) {
        await expect(calBtn).toHaveAttribute('href', 'https://cal.com/cuatropuntas.com/visita-tecnica');
        expect(await calBtn.innerText()).toContain('Agendar Visita Técnica a Terreno');
    }

    await page.screenshot({ path: path.join(screenshotsDir, 'produccion_cuatropuntas_home.png'), fullPage: false });
});

test('Verificar cotizador con remodelación de baño pequeño (4 m²) en servicios/remodelaciones.html', async ({ page }) => {
    const remodelaPath = path.join(publicDir, 'servicios/remodelaciones.html');
    const fileUrl = `file:///${remodelaPath.replace(/\\/g, '/')}`;
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

    await page.route('**/api/quote', async (route) => {
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

    // Paso 1
    await page.locator('#qTipo').selectOption('Remodelacion');
    await page.locator('#qArea').fill('4');
    await page.locator('#step1 button:has-text("Siguiente")').click();

    // Paso 2
    await page.locator('#qComuna').selectOption('Providencia');
    await page.locator('#step2 button:has-text("Siguiente")').click();

    // Paso 3
    await page.locator('#qNombre').fill('Cliente Baño');
    await page.locator('#qEmail').fill('cliente@ejemplo.com');
    await page.locator('#qTelefono').fill('+56927384075');
    await page.locator('#quoteSubmitBtn').click();

    const calContainer = page.locator('#calendarCTAContainer');
    await expect(calContainer).toBeVisible({ timeout: 5000 });
});

test('Verificar Blog en vivo en Producción (https://www.cuatropuntas.com/blog/) y capturar pantalla', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('https://www.cuatropuntas.com/blog/', { waitUntil: 'domcontentloaded', timeout: 45000 });

    const blogCalBtn = page.locator('a[href="https://cal.com/cuatropuntas.com/visita-tecnica"]');
    await expect(blogCalBtn.first()).toBeVisible();
    expect(await blogCalBtn.first().innerText()).toContain('Agendar Visita Técnica a Terreno');
    await blogCalBtn.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshotsDir, 'produccion_blog_agendar_visita_tecnica.png') });
});
