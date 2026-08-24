const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('AI Agent Readiness Tests', () => {
  test('Live Scan API returns optimal readiness level (Level 4+)', async ({ request }) => {
    const res = await request.post('https://isitagentready.com/api/scan', {
      data: { url: 'https://cuatropuntas.com' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    console.log('=== RESULTADO DEL ESCANEO EN VIVO ===');
    console.log('Nivel obtenido:', data.level, '-', data.levelName);
    console.log('Discoverability:', {
      robotsTxt: data.checks?.discoverability?.robotsTxt?.status,
      sitemap: data.checks?.discoverability?.sitemap?.status,
      linkHeaders: data.checks?.discoverability?.linkHeaders?.status
    });
    console.log('BotAccessControl:', {
      contentSignals: data.checks?.botAccessControl?.contentSignals?.status
    });
    console.log('ContentAccessibility:', {
      markdownNegotiation: data.checks?.contentAccessibility?.markdownNegotiation?.status
    });
    console.log('Discovery:', {
      mcpServerCard: data.checks?.discovery?.mcpServerCard?.status,
      agentSkills: data.checks?.discovery?.agentSkills?.status,
      a2aAgentCard: data.checks?.discovery?.a2aAgentCard?.status,
      authMd: data.checks?.discovery?.authMd?.status,
      apiCatalog: data.checks?.discovery?.apiCatalog?.status,
      ard: data.checks?.discovery?.ard?.status
    });

    expect(data.level).toBeGreaterThanOrEqual(4);
  });

  test('UI Scanner renders scan results on isitagentready.com', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('https://isitagentready.com', { waitUntil: 'networkidle' });

    await page.fill('#url-input', 'https://cuatropuntas.com');
    await page.click('#scan-button');

    await page.waitForSelector('#results:not([hidden])', { timeout: 45000 });
    await page.waitForTimeout(3000);

    const testResultsDir = 'c:/Users/raimu/Documents/vyxa core/Cuatropuntas-Secure/test-results';
    if (!fs.existsSync(testResultsDir)) fs.mkdirSync(testResultsDir, { recursive: true });
    await page.screenshot({ path: testResultsDir + '/isitagentready-result.png', fullPage: true });

    const artifactDir = 'C:/Users/raimu/.gemini/antigravity/brain/b644b3ca-2507-46bf-af21-a58a9fe590e0';
    await page.screenshot({ path: artifactDir + '/isitagentready-result.png', fullPage: true });
    console.log('Screenshot guardada exitosamente.');
  });
});
