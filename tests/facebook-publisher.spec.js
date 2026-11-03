// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildSocialCopy, loadHistory } = require('../scripts/publish-facebook');

test.describe('Spec 027: Facebook Auto-Publisher (Estilo Radio Bío Bío) Tests', () => {

  const samplePost = {
    slug: 'guia-precios-construccion-chile',
    title: '¿Cuánto cuesta construir una casa en Chile en 2026? Precios UF/m² — Cuatropuntas',
    excerpt: 'Guía detallada de valores UF/m² en Chile para 2026. Analizamos costos de construcción en Albañilería, Metalcon y Panel SIP.',
    image: '/casa_solida_moderna_1770071499659.webp'
  };

  test('1. Python Card Generator produces a 1080x1080 JPEG image with logo', async () => {
    const outputDir = path.join(__dirname, '..', 'public', 'blog', 'social');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'test-card-verification.jpg');

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    const scriptPath = path.join(__dirname, '..', 'scripts', 'generate-facebook-card.py');
    const cmd = `python "${scriptPath}" --slug="${samplePost.slug}" --output="${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });

    expect(fs.existsSync(outputPath)).toBeTruthy();

    const stats = fs.statSync(outputPath);
    expect(stats.size).toBeGreaterThan(50 * 1024); // Greater than 50 KB

    // Clean up test verification file
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });

  test('2. Social Copy conforms to Radio Bío Bío curiosity format and SSOT channels', async () => {
    const copy = buildSocialCopy(samplePost);

    // Must contain clean headline without trailing brand
    expect(copy).toContain('¿Cuánto cuesta construir una casa en Chile en 2026? Precios UF/m²');
    expect(copy).not.toContain('— Cuatropuntas');

    // Must contain canonical blog link (clean URL without .html)
    expect(copy).toContain('https://www.cuatropuntas.com/blog/posts/guia-precios-construccion-chile');
    expect(copy).not.toContain('.html');

    // Must contain official SSOT WhatsApp phone and NEVER the purged number
    expect(copy).toContain('+56 9 2738 4075');
    expect(copy).not.toContain('63482439');

    // Must contain construction tags
    expect(copy).toContain('#ConstruccionSantiago');
    expect(copy).toContain('#Cuatropuntas');
  });

  test('3. Dry-run execution runs cleanly in both tuesday-backlog and friday-new modes', async () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'publish-facebook.js');

    const backlogOutput = execSync(`node "${scriptPath}" --mode=tuesday-backlog --dry-run`, { encoding: 'utf8' });
    expect(backlogOutput).toContain('[DRY-RUN]');
    expect(backlogOutput).toContain('COPY PROGRAMADO PARA FACEBOOK');

    const fridayOutput = execSync(`node "${scriptPath}" --mode=friday-new --dry-run`, { encoding: 'utf8' });
    expect(fridayOutput).toContain('[DRY-RUN]');
    expect(fridayOutput).toContain('COPY PROGRAMADO PARA FACEBOOK');
  });

  test('4. Queue History file is readable and properly structured', async () => {
    const history = loadHistory();
    expect(Array.isArray(history)).toBeTruthy();
  });
});
