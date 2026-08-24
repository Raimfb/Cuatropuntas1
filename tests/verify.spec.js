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
