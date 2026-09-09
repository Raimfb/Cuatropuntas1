const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const whatsappPath = path.join(rootDir, 'api', 'whatsapp.js');
const chatPath = path.join(rootDir, 'api', 'chat.js');
const indexPath = path.join(rootDir, 'public', 'index.html');

test.describe('Spec 015: Asistente Conversacional como SDR de Embudo y Derivación al Cotizador', () => {

    test('T01.1: api/whatsapp.js incorpora la regla SDR de 3 pasos, Graceful Pivot y mapa de URLs canónicas', async () => {
        const content = fs.readFileSync(whatsappPath, 'utf8');

        // 1. Regla de 3 pasos de SDR
        expect(content).toMatch(/3\s*pasos/i);
        expect(content).toMatch(/Paso\s*1.*(Respuesta|Concreta|breve)/i);
        expect(content).toMatch(/Paso\s*2.*(Puente|dimensionar)/i);
        expect(content).toMatch(/Paso\s*3.*(Llamado a la acci[oó]n|CTA|cotizador)/i);

        // 2. Tenor mandatario exacto del Graceful Pivot
        const expectedPivot = "Para revisar en detalle lo que conversaste o recibiste por correo y aplicar las condiciones exactas a tu proyecto, te invito a generar tu presupuesto preliminar en nuestro cotizador: https://www.cuatropuntas.com/#cotizador. Con esos datos, nuestro equipo técnico y de ventas toma tu requerimiento de inmediato para coordinar la visita a terreno.";
        expect(content).toContain(expectedPivot);

        // 3. Mapa canónico de URLs
        expect(content).toContain('https://www.cuatropuntas.com/#cotizador');
        expect(content).toContain('https://www.cuatropuntas.com/servicios/casas-nuevas.html');
        expect(content).toContain('https://www.cuatropuntas.com/servicios/segundos-pisos.html');
        expect(content).toContain('https://www.cuatropuntas.com/servicios/remodelaciones.html');
        expect(content).toContain('https://www.cuatropuntas.com/servicios/quinchos.html');
        expect(content).toContain('https://www.cuatropuntas.com/precios.html');
        expect(content).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');

        // 4. Formato de WhatsApp (1 solo asterisco, texto plano)
        expect(content).toMatch(/WhatsApp solo soporta 1 solo asterisco/i);
    });

    test('T01.2: api/chat.js homologa la regla SDR de 3 pasos, Graceful Pivot y mapa canónico', async () => {
        const content = fs.readFileSync(chatPath, 'utf8');

        // 1. Regla de 3 pasos de SDR
        expect(content).toMatch(/3\s*pasos/i);
        expect(content).toMatch(/Paso\s*1.*(Respuesta|Concreta|breve)/i);
        expect(content).toMatch(/Paso\s*2.*(Puente|dimensionar)/i);
        expect(content).toMatch(/Paso\s*3.*(Llamado a la acci[oó]n|CTA|cotizador)/i);

        // 2. Tenor mandatario exacto del Graceful Pivot
        const expectedPivot = "Para revisar en detalle lo que conversaste o recibiste por correo y aplicar las condiciones exactas a tu proyecto, te invito a generar tu presupuesto preliminar en nuestro cotizador: https://www.cuatropuntas.com/#cotizador. Con esos datos, nuestro equipo técnico y de ventas toma tu requerimiento de inmediato para coordinar la visita a terreno.";
        expect(content).toContain(expectedPivot);

        // 3. Mapa canónico de URLs
        expect(content).toContain('https://www.cuatropuntas.com/#cotizador');
        expect(content).toContain('https://www.cuatropuntas.com/servicios/casas-nuevas.html');
        expect(content).toContain('https://www.cuatropuntas.com/servicios/segundos-pisos.html');
        expect(content).toContain('https://www.cuatropuntas.com/servicios/remodelaciones.html');
        expect(content).toContain('https://www.cuatropuntas.com/servicios/quinchos.html');
        expect(content).toContain('https://www.cuatropuntas.com/precios.html');
        expect(content).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');
    });

    test('T01.3: public/index.html contiene el ancla id="cotizador" para aterrizaje preciso', async ({ page }) => {
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        const cotizadorAnchor = page.locator('#cotizador');
        await expect(cotizadorAnchor).toHaveCount(1);

        // El cotizador modular debe existir inmediatamente adyacente o dentro del ancla
        const wizardContainer = page.locator('#quote-wizard-container');
        await expect(wizardContainer).toBeVisible();
    });

    test('T01.4: Preservación de políticas técnicas en ambos prompts (Specs 011, 013, 014)', async () => {
        const waContent = fs.readFileSync(whatsappPath, 'utf8');
        const chatContent = fs.readFileSync(chatPath, 'utf8');

        // Spec 011: Contrato a suma alzada y Art 18 LGUC
        expect(waContent).toMatch(/suma alzada/i);
        expect(chatContent).toMatch(/suma alzada/i);

        // Spec 013: Recintos húmedos no se cobran por metro cuadrado lineal
        expect(waContent).toMatch(/Baño Completo 65-95 UF/i);
        expect(chatContent).toMatch(/Baño Completo.*65 a 95 UF/i);

        // Spec 014: Quinchos base (12 y 15 UF/m²) excluyen redes sanitarias y muebles cerrados
        expect(waContent).toMatch(/Quinchos y Terrazas.*(sanitarios|agua|desag[uü]e|muebles)/i);
        expect(chatContent).toMatch(/Quinchos.*(sanitarias|agua|desag[uü]e|muebles)/i);
    });

});
