const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const GUIAS_DIR = path.join(PUBLIC_DIR, 'guias');

const PDF_PERMISO = path.join(GUIAS_DIR, 'guia-permiso-edificacion-rm.pdf');
const PDF_CHECKLIST = path.join(GUIAS_DIR, 'checklist-recepcion-final-dom.pdf');

function extractPdfContent(filePath) {
    const rawBuffer = fs.readFileSync(filePath);
    const rawLatin = rawBuffer.toString('latin1');

    const countMatches = [...rawLatin.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
    const pageCount = countMatches.length > 0 ? Math.max(...countMatches) : 0;

    const decompressed = [...rawLatin.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
        .map((m) => {
            try {
                return zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
            } catch {
                return '';
            }
        })
        .join('\n');

    const lines = [];
    for (const tjMatch of decompressed.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
        const hexParts = [...tjMatch[1].matchAll(/<([0-9a-fA-F]+)>/g)]
            .map((h) => Buffer.from(h[1], 'hex').toString('latin1'));
        if (hexParts.length > 0) {
            lines.push(hexParts.join(''));
        }
    }

    const uris = [...rawLatin.matchAll(/\/URI\s*\(([^)]+)\)/g)].map((m) => m[1]);

    return {
        bytes: rawBuffer.length,
        header: rawLatin.slice(0, 8),
        pageCount,
        text: lines.join(' ').replace(/\s+/g, ' ').trim(),
        uris,
        rawLatin
    };
}

function createMockRes() {
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
        ended: false,
        setHeader(k, v) {
            this.headers[k.toLowerCase()] = v;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            this.ended = true;
            return this;
        },
        send(payload) {
            this.body = payload;
            this.ended = true;
            return this;
        },
        end() {
            this.ended = true;
            return this;
        }
    };
    return res;
}

test.describe('Spec 033: Lead Magnets PDF DOM & Flujo Email-Gate', () => {
    test('T033.1: Existencia, compilación reproducida, peso mínimo y 2 páginas LETTER exactas', async () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
        expect(pkg.scripts['build:guias']).toBe('node scripts/build-lead-magnets.js');

        const builder = require('../scripts/build-lead-magnets');
        expect(typeof builder.buildLeadMagnets).toBe('function');

        for (const pdfPath of [PDF_PERMISO, PDF_CHECKLIST]) {
            expect(fs.existsSync(pdfPath)).toBe(true);
            const pdf = extractPdfContent(pdfPath);
            expect(pdf.header.startsWith('%PDF-1.')).toBe(true);
            expect(pdf.bytes).toBeGreaterThan(5000);
            expect(pdf.pageCount).toBe(2);
        }
    });

    test('T033.2: Auditoría de contenido normativo, SSOT y enlaces PDF 1 (Permiso de Edificación)', async () => {
        const pdf = extractPdfContent(PDF_PERMISO);
        const text = pdf.text;

        expect(text).toContain('Guía Práctica del Permiso de Edificación en la RM');
        expect(text).toContain('Certificado de Informaciones Previas (CIP)');
        expect(text).toContain('30 días hábiles');
        expect(text).toContain('60 días');
        expect(text).toContain('1,5%');
        expect(text).toContain('MINVU');
        expect(text).toContain('SEREMI de Salud');
        expect(text).toContain('Agua Potable Rural (APR)');
        expect(text).toContain('Art. 55 LGUC');
        expect(text).toContain('Pirque');
        expect(text).toContain('Chicureo/Colina');
        expect(text).toContain('Obra Menor (Art. 5.1.4 OGUC)');
        expect(text).toContain('+8%');
        expect(text).toContain('-3%');
        expect(text).toContain('-6%');
        expect(text).toContain('19 UF/m²');
        expect(text).toContain('21 UF/m²');
        expect(text).toContain('25 UF/m²');
        expect(text).toContain('22 UF/m²');
        expect(text).toContain('24 UF/m²');
        expect(text).toContain('27 UF/m²');
        expect(text).toContain('+IVA');
        expect(text).toContain('5 Anillos Logísticos RM');
        expect(text).toContain('+2%');
        expect(text).toContain('+18%');
        expect(text).toContain('+22%');
        expect(text).toContain('Suma Alzada');
        expect(text).toContain('+56 9 2738 4075');

        expect(pdf.uris).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');
        expect(pdf.uris).toContain('https://www.cuatropuntas.com/#contacto');
        expect(pdf.uris).toContain('https://wa.me/56927384075');

        expect(text).not.toContain('63482439');
        expect(text).not.toMatch(/aprobaci[oó]n garantizada/i);
        expect(text).not.toMatch(/sin interrumpir la habitabilidad/i);
    });

    test('T033.3: Auditoría de contenido normativo, errores fatales y enlaces PDF 2 (Recepción Final)', async () => {
        const pdf = extractPdfContent(PDF_CHECKLIST);
        const text = pdf.text;

        expect(text).toContain('Checklist Oficial de Recepción Final Municipal (DOM)');
        expect(text).toContain('SEC TE1');
        expect(text).toContain('SEC TC6');
        expect(text).toContain('SEREMI de Salud');
        expect(text).toContain('Rol');
        expect(text).toContain('Art. 5.2.6');
        expect(text).toContain('Libro de Obras');
        expect(text).toContain('Art. 1.2.9');
        expect(text).toContain('Art. 5.8.3');
        expect(text).toContain('CBR');
        expect(text).toContain('Modificación de Proyecto');
        expect(text).toContain('patente municipal vigente');
        expect(text).toContain('patente profesional vigente');
        expect(text).toContain('Zona 3 RM');
        expect(text).toContain('Tasación Bancaria');
        expect(text).toContain('Seguros de Incendio y Sismo');
        expect(text).toContain('Empalmes Definitivos');
        expect(text).toContain('Art. 18 LGUC');
        expect(text).toContain('Suma Alzada');
        expect(text).toContain('+56 9 2738 4075');

        expect(pdf.uris).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');
        expect(pdf.uris).toContain('https://www.cuatropuntas.com/#contacto');
        expect(pdf.uris).toContain('https://wa.me/56927384075');

        expect(text).not.toContain('63482439');
        expect(text).not.toMatch(/aprobaci[oó]n garantizada/i);
        expect(text).not.toMatch(/sin interrumpir la habitabilidad/i);
    });

    test('T033.4: Handler api/_leadMagnet.js y delegación vía api/contact.js (/api/lead-magnet) validan payload y persisten LEAD_GUIA_DOM', async () => {
        process.env.SKIP_LEAD_MAGNET_EMAIL = '1';
        const leadsState = require('../lib/leads-state');
        const handler = require('../api/_leadMagnet');
        const contactRouter = require('../api/contact');
        leadsState.resetStateStore();

        // 1. Método GET no permitido
        const resGet = createMockRes();
        await handler({ method: 'GET' }, resGet);
        expect(resGet.statusCode).toBe(405);

        // 2. Email inválido -> 400
        const resBadEmail = createMockRes();
        await handler({
            method: 'POST',
            body: { nombre: 'Carolina Soto', email: 'correo-malo', guia: 'permiso-edificacion' }
        }, resBadEmail);
        expect(resBadEmail.statusCode).toBe(400);
        expect(resBadEmail.body.ok).toBe(false);

        // 3. Guía inexistente -> 400
        const resBadGuia = createMockRes();
        await handler({
            method: 'POST',
            body: { nombre: 'Carolina Soto', email: 'carolina@ejemplo.cl', guia: 'inexistente' }
        }, resBadGuia);
        expect(resBadGuia.statusCode).toBe(400);

        // 4. Honeypot activado -> 400
        const resBot = createMockRes();
        await handler({
            method: 'POST',
            body: { nombre: 'Carolina Soto', email: 'carolina@ejemplo.cl', guia: 'permiso-edificacion', website_url: 'http://spam.test' }
        }, resBot);
        expect(resBot.statusCode).toBe(400);

        // 5. Envío válido PDF 1
        const resOk1 = createMockRes();
        await handler({
            method: 'POST',
            body: {
                nombre: 'Carolina Soto',
                email: 'Carolina.Soto@Ejemplo.CL',
                guia: 'permiso-edificacion',
                sourcePage: '/precios'
            }
        }, resOk1);
        expect(resOk1.statusCode).toBe(200);
        expect(resOk1.body).toMatchObject({
            ok: true,
            guia: 'permiso-edificacion',
            filename: 'guia-permiso-edificacion-rm.pdf',
            downloadUrl: '/guias/guia-permiso-edificacion-rm.pdf',
            leadState: 'LEAD_GUIA_DOM',
            guiasDescargadas: ['permiso-edificacion']
        });

        const stored1 = leadsState.findLeadByPhoneOrEmail('carolina.soto@ejemplo.cl');
        expect(stored1).not.toBeNull();
        expect(stored1.estado).toBe('LEAD_GUIA_DOM');
        expect(stored1.segmento).toBe('EMAIL_MARKETING_DOM');
        expect(stored1.sourcePage).toBe('/precios');
        expect(stored1.guiasDescargadas).toEqual(['permiso-edificacion']);

        // 6. Segunda descarga del mismo email delegada vía api/contact.js?action=lead-magnet (límite 12 funciones Vercel Hobby)
        const resOk2 = createMockRes();
        await contactRouter({
            method: 'POST',
            url: '/api/contact?action=lead-magnet',
            query: { action: 'lead-magnet' },
            body: {
                nombre: 'Carolina Soto',
                email: 'carolina.soto@ejemplo.cl',
                guia: 'recepcion-final',
                sourcePage: '/servicios/casas-nuevas'
            }
        }, resOk2);
        expect(resOk2.statusCode).toBe(200);
        expect(resOk2.body.downloadUrl).toBe('/guias/checklist-recepcion-final-dom.pdf');
        expect(resOk2.body.guiasDescargadas).toEqual(['permiso-edificacion', 'recepcion-final']);
    });

    const pagesToVerify = [
        { file: 'index.html', label: 'Home' },
        { file: 'precios.html', label: 'Precios' },
        { file: 'servicios/casas-nuevas.html', label: 'Casas Nuevas' },
        { file: 'servicios/segundos-pisos.html', label: 'Segundos Pisos' }
    ];

    for (const pInfo of pagesToVerify) {
        test(`T033.5 (${pInfo.label}): Email-Gate Modal en desktop desbloquea ambas guías y carga sin errores`, async ({ page }) => {
            const fullPath = path.join(PUBLIC_DIR, pInfo.file);
            const fileUrl = `file:///${fullPath.replace(/\\/g, '/')}`;
            let interceptedPayload = null;

            await page.route('**/api/lead-magnet', async (route) => {
                interceptedPayload = route.request().postDataJSON();
                const isChecklist = interceptedPayload.guia === 'recepcion-final';
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        ok: true,
                        guia: interceptedPayload.guia,
                        filename: isChecklist ? 'checklist-recepcion-final-dom.pdf' : 'guia-permiso-edificacion-rm.pdf',
                        downloadUrl: isChecklist ? '/guias/checklist-recepcion-final-dom.pdf' : '/guias/guia-permiso-edificacion-rm.pdf',
                        leadState: 'LEAD_GUIA_DOM',
                        emailSent: false
                    })
                });
            });

            await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

            const btnPermiso = page.locator('[data-lead-magnet="permiso-edificacion"]').first();
            const btnChecklist = page.locator('[data-lead-magnet="recepcion-final"]').first();
            await expect(btnPermiso).toBeVisible();
            await expect(btnChecklist).toBeVisible();

            await btnPermiso.click();
            const modal = page.locator('#leadMagnetModal');
            await expect(modal).toBeVisible();

            await page.fill('#lmNombre', 'Rodrigo Vargas');
            await page.fill('#lmEmail', 'rodrigo.vargas@ejemplo.cl');
            await page.click('#lmSubmitBtn');

            await expect(page.locator('#lmSuccessMessage')).toBeVisible();
            expect(interceptedPayload).toMatchObject({
                nombre: 'Rodrigo Vargas',
                email: 'rodrigo.vargas@ejemplo.cl',
                guia: 'permiso-edificacion'
            });
            const directHref = await page.locator('#lmDirectDownloadLink').getAttribute('href');
            expect(directHref).toContain('guia-permiso-edificacion-rm.pdf');

            await page.click('#lmCloseBtn');
            await expect(modal).toBeHidden();

            // Verificar segunda guía en la misma página
            await btnChecklist.click();
            await expect(modal).toBeVisible();
            await page.click('#lmSubmitBtn');
            await expect(page.locator('#lmSuccessMessage')).toBeVisible();
            expect(interceptedPayload.guia).toBe('recepcion-final');
            const secondHref = await page.locator('#lmDirectDownloadLink').getAttribute('href');
            expect(secondHref).toContain('checklist-recepcion-final-dom.pdf');
        });
    }

    test('T033.5 Mobile (375x667): Bloque de guías y modal Email-Gate sin desbordamiento horizontal', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        const fullPath = path.join(PUBLIC_DIR, 'index.html');
        await page.goto(`file:///${fullPath.replace(/\\/g, '/')}`, { waitUntil: 'domcontentloaded' });

        const guiasMetrics = await page.evaluate(() => {
            const section = document.querySelector('#guias-dom');
            const rect = section.getBoundingClientRect();
            const cards = [...section.querySelectorAll('article')].map((a) => ({
                left: a.getBoundingClientRect().left,
                right: a.getBoundingClientRect().right,
                width: a.getBoundingClientRect().width
            }));
            return { sectionWidth: rect.width, sectionRight: rect.right, cards };
        });
        expect(guiasMetrics.sectionRight).toBeLessThanOrEqual(375);
        for (const card of guiasMetrics.cards) {
            expect(card.left).toBeGreaterThanOrEqual(0);
            expect(card.right).toBeLessThanOrEqual(375);
        }

        await page.locator('[data-lead-magnet="recepcion-final"]').first().click();
        const modal = page.locator('#leadMagnetModal');
        await expect(modal).toBeVisible();

        const modalMetrics = await page.evaluate(() => {
            const dialog = document.querySelector('#leadMagnetModal .lm-dialog').getBoundingClientRect();
            const submit = document.querySelector('#lmSubmitBtn').getBoundingClientRect();
            return {
                left: dialog.left,
                right: dialog.right,
                width: dialog.width,
                submitRight: submit.right
            };
        });
        expect(modalMetrics.left).toBeGreaterThanOrEqual(0);
        expect(modalMetrics.right).toBeLessThanOrEqual(375);
        expect(modalMetrics.width).toBeLessThanOrEqual(375);
        expect(modalMetrics.submitRight).toBeLessThanOrEqual(375);
    });

    test('T033.6: Sincronización de catálogos AI/LLMs y api/markdown.js', async () => {
        const llms = fs.readFileSync(path.join(PUBLIC_DIR, 'llms.txt'), 'utf8');
        const llmsFull = fs.readFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), 'utf8');

        for (const content of [llms, llmsFull]) {
            expect(content).toContain('/guias/guia-permiso-edificacion-rm.pdf');
            expect(content).toContain('/guias/checklist-recepcion-final-dom.pdf');
            expect(content).not.toContain('63482439');
        }

        const markdownHandler = require('../api/markdown');
        const res = createMockRes();
        markdownHandler({ query: { page: 'index' }, url: '/' }, res);
        expect(res.statusCode).toBe(200);
        expect(res.body).toContain('https://www.cuatropuntas.com/guias/guia-permiso-edificacion-rm.pdf');
        expect(res.body).toContain('https://www.cuatropuntas.com/guias/checklist-recepcion-final-dom.pdf');
    });
});
