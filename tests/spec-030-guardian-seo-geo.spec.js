// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
    DEFAULT_WHATSAPP_PHONE_NUMBER_ID,
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
        expect(DEFAULT_WHATSAPP_PHONE_NUMBER_ID).toBe('1243578125508024');
        expect(yamlContent).toContain('node scripts/seo-geo-guardian.js');
    });

});
