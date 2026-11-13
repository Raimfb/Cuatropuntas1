// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
    DEFAULT_WHATSAPP_PHONE_NUMBER_ID,
    DEFAULT_WHATSAPP_ALERT_TEMPLATE,
    DEFAULT_WHATSAPP_ALERT_TEMPLATE_LANG,
    buildWhatsAppTemplatePayload,
    dispatchCriticalAlerts,
    validateRobotsTxt,
    validateCleanUrlsInArtifact,
    validatePageSchemas
} = require('../scripts/seo-geo-guardian');

const ROOT_DIR = path.resolve(__dirname, '..');
const WORKFLOW_PATH = path.join(ROOT_DIR, '.github', 'workflows', 'seo-geo-guardian.yml');
const SPEC_PATH = path.join(ROOT_DIR, 'specs', '030_guardian_seo_geo_diario', 'spec.md');
const GUARDIAN_SCRIPT_PATH = path.join(ROOT_DIR, 'scripts', 'seo-geo-guardian.js');

test.describe('Spec 030: Agente Guardián SEO / GEO Diario (Autonomous Monitor)', () => {

    test('T030.1: Documentación formal SDD y ejecución limpia de node scripts/seo-geo-guardian.js --dry-run contra producción (0 errores críticos)', async () => {
        test.setTimeout(90000);

        expect(fs.existsSync(SPEC_PATH)).toBe(true);
        const specContent = fs.readFileSync(SPEC_PATH, 'utf8');
        expect(specContent).toContain('CRÍTICO');
        expect(specContent).toContain('ADVERTENCIA');
        expect(specContent).toContain('OK');

        // Ejecutar el script en modo --dry-run contra https://www.cuatropuntas.com
        const output = execFileSync(process.execPath, [GUARDIAN_SCRIPT_PATH, '--dry-run'], {
            cwd: ROOT_DIR,
            encoding: 'utf8',
            timeout: 80000
        });

        expect(output).toContain('SALUDABLE (0 Errores Críticos)');
        expect(output).toContain('0 CRÍTICOS');
        expect(output).toContain('Googlebot -> /');
        expect(output).toContain('OAI-SearchBot -> /');
        expect(output).toContain('PerplexityBot -> /');
        expect(output).toContain('/servicios/casas-nuevas');
        expect(output).toContain('/servicios/quinchos');
    });

    test('T030.2: Validador unitario detecta y reporta discrepancias de precios SSOT, JSON-LD malformado, bots bloqueados y URLs .html sucias', async () => {
        // 1. Simular una URL .html sucia en sitemap.xml y llms-full.txt
        const dirtySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.cuatropuntas.com/servicios/casas-nuevas.html</loc></url>
</urlset>`;
        const sitemapFindings = validateCleanUrlsInArtifact(dirtySitemap, '/sitemap.xml');
        expect(sitemapFindings.some(f => f.severity === 'CRÍTICO' && f.message.includes('.html'))).toBe(true);

        const dirtyLlmsFull = `# Catálogo\nVisita https://www.cuatropuntas.com/servicios/quinchos.html para cotizar.`;
        const llmsFindings = validateCleanUrlsInArtifact(dirtyLlmsFull, '/llms-full.txt');
        expect(llmsFindings.some(f => f.severity === 'CRÍTICO' && f.message.includes('.html'))).toBe(true);

        // 2. Simular una discrepancia de precios en JSON-LD de Casas Nuevas (ej. 14 UF en vez de 19 UF)
        const fakeHtmlPriceMismatch = `<!DOCTYPE html><html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Casas Nuevas",
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "14",
    "highPrice": "25",
    "priceCurrency": "CLF"
  }
}
</script></head><body></body></html>`;
        const priceFindings = validatePageSchemas(fakeHtmlPriceMismatch, '/servicios/casas-nuevas');
        expect(priceFindings.some(f => f.severity === 'CRÍTICO' && f.message.includes('Discrepancia de precios SSOT'))).toBe(true);

        // 3. Simular bloqueo de PerplexityBot en robots.txt
        const blockedRobots = `User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: PerplexityBot\nDisallow: /\n`;
        const robotsFindings = validateRobotsTxt(blockedRobots);
        expect(robotsFindings.some(f => f.severity === 'CRÍTICO' && f.message.includes('PerplexityBot'))).toBe(true);
    });

    test('T030.3: Validez sintáctica y estructural del workflow .github/workflows/seo-geo-guardian.yml', async () => {
        expect(fs.existsSync(WORKFLOW_PATH)).toBe(true);
        const yamlContent = fs.readFileSync(WORKFLOW_PATH, 'utf8');

        // Verificar que no contenga tabulaciones inválidas en YAML
        expect(yamlContent.includes('\t')).toBe(false);

        // Verificar cron diario (0 11 * * *), workflow_dispatch, secrets y ejecución del script
        expect(yamlContent).toContain("cron: '0 11 * * *'");
        expect(yamlContent).toContain('workflow_dispatch:');
        expect(yamlContent).toContain('SMTP_HOST');
        expect(yamlContent).toContain('SMTP_PORT');
        expect(yamlContent).toContain('SMTP_USER');
        expect(yamlContent).toContain('SMTP_PASS');
        expect(yamlContent).toContain('GEMINI_API_KEY');
        expect(yamlContent).toContain('WHATSAPP_TOKEN');
        expect(yamlContent).toContain('WHATSAPP_PHONE_NUMBER_ID');
        expect(yamlContent).toContain('WHATSAPP_PHONE_ID');
        expect(yamlContent).toContain('1243578125508024');
        expect(yamlContent).toContain('WHATSAPP_ALERT_TEMPLATE');
        expect(DEFAULT_WHATSAPP_PHONE_NUMBER_ID).toBe('1243578125508024');
        expect(DEFAULT_WHATSAPP_ALERT_TEMPLATE).toBe('alerta_guardian_cuatropuntas');
        expect(DEFAULT_WHATSAPP_ALERT_TEMPLATE_LANG).toBe('es');
        expect(yamlContent).toContain('node scripts/seo-geo-guardian.js');
    });

    test('T030.4: dispatchCriticalAlerts prioriza type:"template" y solo usa fallback type:"text" si falla la plantilla', async () => {
        const sampleFindings = [
            { layer: 'HTTP', target: 'https://www.cuatropuntas.com/', message: 'Timeout\n\tcrítico    detectado' }
        ];

        const payload = buildWhatsAppTemplatePayload('56979092027', sampleFindings);
        expect(payload.type).toBe('template');
        expect(payload.template.name).toBe('alerta_guardian_cuatropuntas');
        expect(payload.template.language.code).toBe('es');
        const bodyParams = payload.template.components[0].parameters;
        expect(bodyParams[0].text).toBe('1');
        expect(bodyParams[1].text).not.toMatch(/[\r\n\t]/);
        expect(bodyParams[1].text).not.toMatch(/\s{2,}/);

        const prevToken = process.env.WHATSAPP_TOKEN;
        const prevZoho = process.env.ZOHO_PASS;
        const prevSmtp = process.env.SMTP_PASS;
        process.env.WHATSAPP_TOKEN = 'test-guardian-token';
        delete process.env.ZOHO_PASS;
        delete process.env.SMTP_PASS;

        try {
            // Caso 1: Plantilla aprobada responde OK -> NO debe llamar fallback type:"text"
            const callsOk = [];
            const resOk = await dispatchCriticalAlerts(sampleFindings, '', {
                fetchImpl: async (url, init) => {
                    callsOk.push({ url, body: JSON.parse(init.body) });
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ messages: [{ id: 'wamid.test.template.ok' }] })
                    };
                }
            });
            expect(callsOk).toHaveLength(1);
            expect(callsOk[0].body.type).toBe('template');
            expect(callsOk[0].body.to).toBe('56979092027');
            expect(resOk.whatsappSent).toBe(true);
            expect(resOk.whatsappMode).toBe('template');
            expect(resOk.whatsappMessageId).toBe('wamid.test.template.ok');

            // Caso 2: Plantilla falla HTTP 400 -> activa fallback type:"text"
            const callsFallback = [];
            const resFallback = await dispatchCriticalAlerts(sampleFindings, '', {
                fetchImpl: async (url, init) => {
                    const body = JSON.parse(init.body);
                    callsFallback.push({ url, body });
                    if (body.type === 'template') {
                        return {
                            ok: false,
                            status: 400,
                            json: async () => ({ error: { message: 'Template not ready' } })
                        };
                    }
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ messages: [{ id: 'wamid.test.text.fallback' }] })
                    };
                }
            });
            expect(callsFallback).toHaveLength(2);
            expect(callsFallback[0].body.type).toBe('template');
            expect(callsFallback[1].body.type).toBe('text');
            expect(resFallback.whatsappSent).toBe(true);
            expect(resFallback.whatsappMode).toBe('text-fallback');
            expect(resFallback.whatsappMessageId).toBe('wamid.test.text.fallback');
        } finally {
            if (prevToken === undefined) delete process.env.WHATSAPP_TOKEN; else process.env.WHATSAPP_TOKEN = prevToken;
            if (prevZoho !== undefined) process.env.ZOHO_PASS = prevZoho;
            if (prevSmtp !== undefined) process.env.SMTP_PASS = prevSmtp;
        }
    });

});
