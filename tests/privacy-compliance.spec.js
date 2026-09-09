const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Spec 009: Política de Privacidad y Cumplimiento Normativo de Datos Personales', () => {
    const publicDir = path.join(__dirname, '../public');
    const privacidadPath = path.join(publicDir, 'privacidad.html');
    const indexPath = path.join(publicDir, 'index.html');

    test('T01.1: public/privacidad.html debe existir físicamente y contener las cláusulas legales y ARCO', async ({ page }) => {
        // 1. Existencia física
        expect(fs.existsSync(privacidadPath)).toBe(true);

        const fileUrl = `file:///${privacidadPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        const bodyText = await page.innerText('body');

        // 2. Identificación del responsable
        expect(bodyText).toContain('Constructora Cuatropuntas SpA');
        expect(bodyText).toContain('contacto@cuatropuntas.com');

        // 3. Marco normativo Ley 19.628
        expect(bodyText).toMatch(/19\.628/);

        // 4. Cláusulas y procedimiento de Derechos ARCO
        expect(bodyText).toContain('ARCO');
        expect(bodyText).toContain('Acceso');
        expect(bodyText).toContain('Rectificación');
        expect(bodyText).toContain('Cancelación');
        expect(bodyText).toContain('Oposición');

        // 5. Finalidades y no cesión a terceros
        expect(bodyText.toLowerCase()).toContain('cotización');
        expect(bodyText.toLowerCase()).toContain('visita técnica');
    });

    test('T01.2: El cotizador modular debe renderizar la cláusula legal con enlace a /privacidad en el Paso 3', async ({ page }) => {
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        // Avanzar a Paso 2
        await page.locator('#qTipo').selectOption('Casa Nueva');
        await page.locator('#qArea').fill('90');
        await page.locator('#step1 button:has-text("Siguiente")').click();

        // Avanzar a Paso 3
        await page.locator('#qComuna').selectOption('Santiago Centro');
        await page.locator('#step2 button:has-text("Siguiente")').click();

        // Verificar visibilidad del paso 3 y la leyenda legal
        const step3 = page.locator('#step3');
        await expect(step3).toBeVisible();

        const privacyLink = step3.locator('a[href*="/privacidad"]');
        await expect(privacyLink).toBeVisible();
        await expect(privacyLink).toHaveAttribute('target', '_blank');

        const privacyText = await step3.innerText();
        expect(privacyText).toContain('Política de Privacidad');
        expect(privacyText).toContain('aceptas el tratamiento de tus datos');
    });

    test('T01.3: El componente de comentarios del blog debe vincular a /privacidad en el checkbox comercial', async ({ page }) => {
        const postPath = path.join(publicDir, 'blog/posts/permisos-edificacion-dom-santiago-guia.html');
        const fileUrl = `file:///${postPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.removeItem('cuatropuntas_blog_user'));
        await page.addScriptTag({ path: path.join(publicDir, 'blog-comments.js') });

        const gateBox = page.locator('#comment-manual-auth-form');
        await expect(gateBox).toBeAttached();

        const privacyLink = gateBox.locator('a[href*="/privacidad"]');
        await expect(privacyLink).toBeVisible();
        await expect(privacyLink).toHaveAttribute('target', '_blank');
        expect(await privacyLink.innerText()).toContain('Política de Privacidad');
    });

    test('T01.4: El footer de index.html debe incluir el enlace a /privacidad', async ({ page }) => {
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        const footer = page.locator('footer');
        const privacyLink = footer.locator('a[href="/privacidad"]');
        await expect(privacyLink.first()).toBeVisible();
        expect(await privacyLink.first().innerText()).toMatch(/Privacidad/i);
    });
});
