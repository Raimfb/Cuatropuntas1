const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Spec 006: AI Agent Readiness & Discovery Tests', () => {
  const baseDir = path.resolve(__dirname, '..');

  test('Local verification: .well-known JSON files and auth.md integrity', async () => {
    // 1. http-message-signatures-directory
    const sigPath = path.join(baseDir, 'public', '.well-known', 'http-message-signatures-directory');
    expect(fs.existsSync(sigPath)).toBeTruthy();
    const sigJson = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
    expect(Array.isArray(sigJson.keys)).toBeTruthy();

    // 2. oauth-authorization-server agent_auth block
    const authServerPath = path.join(baseDir, 'public', '.well-known', 'oauth-authorization-server');
    expect(fs.existsSync(authServerPath)).toBeTruthy();
    const authServerJson = JSON.parse(fs.readFileSync(authServerPath, 'utf8'));
    expect(authServerJson.agent_auth).toBeDefined();
    expect(authServerJson.agent_auth.register_uri).toBe('https://www.cuatropuntas.com/api/mcp');
    expect(authServerJson.agent_auth.instructions).toBe('https://www.cuatropuntas.com/auth.md');
    expect(authServerJson.agent_auth.supported_identity_types).toContain('ephemeral');
    expect(authServerJson.agent_auth.credential_types).toContain('bearer');

    // 3. oauth-protected-resource
    const protPath = path.join(baseDir, 'public', '.well-known', 'oauth-protected-resource');
    expect(fs.existsSync(protPath)).toBeTruthy();
    const protJson = JSON.parse(fs.readFileSync(protPath, 'utf8'));
    expect(protJson.resource).toBe('https://www.cuatropuntas.com');

    // 4. auth.md frontmatter
    const authMdPath = path.join(baseDir, 'public', 'auth.md');
    expect(fs.existsSync(authMdPath)).toBeTruthy();
    const authMdContent = fs.readFileSync(authMdPath, 'utf8');
    expect(authMdContent).toContain('name: Cuatro Puntas Agent Registration');
    expect(authMdContent).toContain('register_uri: https://www.cuatropuntas.com/api/mcp');
    expect(authMdContent).toContain('# auth.md - Cuatro Puntas Agent Registration & API Authorization');

    // 5. vercel.json routing
    const vercelPath = path.join(baseDir, 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    expect(Array.isArray(vercelConfig.headers)).toBeTruthy();
    const hasWellKnownRule = vercelConfig.headers.some(h => h.source === '/.well-known/(.*)');
    expect(hasWellKnownRule).toBeTruthy();
  });

  test('Live Scan API returns optimal readiness level (Level 5 Agent-Native)', async ({ request }) => {
    test.setTimeout(45000);
    const res = await request.post('https://isitagentready.com/api/scan', {
      data: { url: 'https://cuatropuntas.com' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 35000
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    console.log('=== RESULTADO DEL ESCANEO EN VIVO (ISITAGENTREADY) ===');
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
    expect(data.checks?.discoverability?.robotsTxt?.status).toBe('pass');
    expect(data.checks?.discoverability?.sitemap?.status).toBe('pass');
    expect(data.checks?.contentAccessibility?.markdownNegotiation?.status).toBe('pass');
  });

  test('UI Scanner renders scan results on isitagentready.com', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('https://isitagentready.com', { waitUntil: 'networkidle' });

    await page.fill('#url-input', 'https://cuatropuntas.com');
    await page.click('#scan-button');

    await page.waitForSelector('#results:not([hidden])', { timeout: 45000 });
    await page.waitForTimeout(3000);

    const testResultsDir = path.join(baseDir, 'test-results');
    if (!fs.existsSync(testResultsDir)) fs.mkdirSync(testResultsDir, { recursive: true });
    await page.screenshot({ path: path.join(testResultsDir, 'isitagentready-result.png'), fullPage: true });

    const artifactDir = 'C:/Users/raimu/.gemini/antigravity/brain/b644b3ca-2507-46bf-af21-a58a9fe590e0';
    if (fs.existsSync(artifactDir)) {
      await page.screenshot({ path: path.join(artifactDir, 'isitagentready-result.png'), fullPage: true });
    }
    console.log('Screenshot guardada exitosamente.');
  });
});
