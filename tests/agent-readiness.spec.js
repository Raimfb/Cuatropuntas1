const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

test.describe('Spec 006 & Spec 025: AI Agent Readiness & Discovery Tests', () => {
  const baseDir = path.resolve(__dirname, '..');

  test('Local verification: .well-known JSON files, poppy.json, and auth.md integrity', async () => {
    // 1. http-message-signatures-directory
    const sigPath = path.join(baseDir, 'public', '.well-known', 'http-message-signatures-directory');
    expect(fs.existsSync(sigPath)).toBeTruthy();
    const sigJson = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
    expect(Array.isArray(sigJson.keys)).toBeTruthy();

    // 2. oauth-authorization-server agent_auth block & poppy_domains
    const authServerPath = path.join(baseDir, 'public', '.well-known', 'oauth-authorization-server');
    expect(fs.existsSync(authServerPath)).toBeTruthy();
    const authServerJson = JSON.parse(fs.readFileSync(authServerPath, 'utf8'));
    expect(authServerJson.agent_auth).toBeDefined();
    expect(authServerJson.agent_auth.register_uri).toBe('https://www.cuatropuntas.com/api/mcp');
    expect(authServerJson.agent_auth.instructions).toBe('https://www.cuatropuntas.com/auth.md');
    expect(authServerJson.agent_auth.supported_identity_types).toContain('ephemeral');
    expect(authServerJson.agent_auth.credential_types).toContain('bearer');
    expect(authServerJson.poppy_domains).toContain('cuatropuntas.com');
    expect(authServerJson.revocation_endpoint).toBe('https://www.cuatropuntas.com/api/auth/revoke');

    // 3. oauth-protected-resource (Static and API handler)
    const protPath = path.join(baseDir, 'public', '.well-known', 'oauth-protected-resource');
    expect(fs.existsSync(protPath)).toBeTruthy();
    const protJson = JSON.parse(fs.readFileSync(protPath, 'utf8'));
    expect(protJson.resource).toBe('https://www.cuatropuntas.com');
    expect(protJson.authorization_servers).toContain('https://www.cuatropuntas.com');

    const apiProtHandler = require(path.join(baseDir, 'api', 'oauth-protected-resource.js'));
    let capturedRes = {};
    apiProtHandler({ method: 'GET', query: { path: 'precios' } }, {
      setHeader: () => {},
      status: (c) => ({ json: (d) => { capturedRes = d; } })
    });
    expect(capturedRes.resource).toBe('https://www.cuatropuntas.com');
    expect(capturedRes.authorization_servers).toContain('https://www.cuatropuntas.com');

    // 4. poppy.json
    const poppyPath = path.join(baseDir, 'public', '.well-known', 'poppy.json');
    expect(fs.existsSync(poppyPath)).toBeTruthy();
    const poppyJson = JSON.parse(fs.readFileSync(poppyPath, 'utf8'));
    expect(poppyJson.protocol_version).toBe('0.1');
    expect(poppyJson.organization.domain).toBe('cuatropuntas.com');
    expect(poppyJson.web).toBeDefined();

    // 5. auth.md frontmatter
    const authMdPath = path.join(baseDir, 'public', 'auth.md');
    expect(fs.existsSync(authMdPath)).toBeTruthy();
    const authMdContent = fs.readFileSync(authMdPath, 'utf8');
    expect(authMdContent).toContain('name: Cuatro Puntas Agent Registration');
    expect(authMdContent).toContain('register_uri: https://www.cuatropuntas.com/api/mcp');
    expect(authMdContent).toContain('# auth.md - Cuatro Puntas Agent Registration & API Authorization');

    // 6. vercel.json routing and headers
    const vercelPath = path.join(baseDir, 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    expect(Array.isArray(vercelConfig.headers)).toBeTruthy();
    const linkHeaderRule = vercelConfig.headers.find(h => h.source === '/(.*)');
    const linkValue = linkHeaderRule.headers.find(k => k.key === 'Link').value;
    expect(linkValue).toContain('rel="oauth-protected-resource"');

    const hasProtectedResourceRewrite = vercelConfig.rewrites.some(r => r.source === '/.well-known/oauth-protected-resource/:path*');
    expect(hasProtectedResourceRewrite).toBeTruthy();
  });

  test('Agent Skills cryptographic hashes & SSOT price compliance', async () => {
    const indexPath = path.join(baseDir, 'public', '.well-known', 'agent-skills', 'index.json');
    expect(fs.existsSync(indexPath)).toBeTruthy();
    const indexJson = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    expect(indexJson.skills.length).toBeGreaterThanOrEqual(3);

    for (const skill of indexJson.skills) {
      const skillFile = path.join(baseDir, 'public', skill.url);
      expect(fs.existsSync(skillFile)).toBeTruthy();
      const content = fs.readFileSync(skillFile);
      const computedHash = 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
      expect(skill.digest).toBe(computedHash);
    }

    const cotizarContent = fs.readFileSync(path.join(baseDir, 'public', '.well-known', 'agent-skills', 'cotizar-proyecto', 'SKILL.md'), 'utf8');
    expect(cotizarContent).toContain('desde 19 UF/m²');
    expect(cotizarContent).toContain('desde 21 UF/m²');
    expect(cotizarContent).toContain('desde 25 UF/m²');
    expect(cotizarContent).not.toContain('63482439');
    expect(cotizarContent).not.toContain('6348 2439');
  });

  test('WebMCP Tool Declarations in precios.html, blog/index.html, and index.html', async () => {
    const preciosHtml = fs.readFileSync(path.join(baseDir, 'public', 'precios.html'), 'utf8');
    expect(preciosHtml).toContain('toolname="cotizar_construccion"');
    expect(preciosHtml).toContain('mc.registerTool');
    expect(preciosHtml).toContain('rel="alternate" type="text/markdown"');
    expect(preciosHtml).toContain('rel="oauth-protected-resource"');

    const blogHtml = fs.readFileSync(path.join(baseDir, 'public', 'blog', 'index.html'), 'utf8');
    expect(blogHtml).toContain('toolname="buscar_articulos_blog"');
    expect(blogHtml).toContain('mc.registerTool');
    expect(blogHtml).toContain('rel="alternate" type="text/markdown"');
    expect(blogHtml).toContain('rel="oauth-protected-resource"');

    const indexHtml = fs.readFileSync(path.join(baseDir, 'public', 'index.html'), 'utf8');
    expect(indexHtml).toContain('toolname="cotizar_construccion"');
    expect(indexHtml).toContain('mc.registerTool');
    expect(indexHtml).toContain('rel="oauth-protected-resource"');
  });

  test('Markdown Content Negotiation (/api/markdown) returns SSOT data', async () => {
    const markdownHandler = require(path.join(baseDir, 'api', 'markdown.js'));

    const runMd = (query) => {
      let out = '';
      let headers = {};
      markdownHandler({ query }, {
        setHeader: (k, v) => { headers[k] = v; },
        status: () => ({
          send: (body) => { out = body; }
        })
      });
      return { out, headers };
    };

    // 1. Precios
    const preciosMd = runMd({ page: 'precios' });
    expect(preciosMd.out).toContain('Metalcom Estructural (Steel Frame):** desde **19 UF/m²**');
    expect(preciosMd.out).toContain('Panel SIP / Covintec:** desde **21 UF/m²**');
    expect(preciosMd.out).toContain('Albañilería Armada / Mixto:** desde **25 UF/m²**');
    expect(preciosMd.out).toContain('Quinchos y Terrazas de Alto Estándar');
    expect(preciosMd.out).toContain('+56 9 2738 4075');
    expect(preciosMd.out).not.toContain('63482439');
    expect(preciosMd.headers['Content-Type']).toBe('text/markdown; charset=utf-8');
    expect(preciosMd.headers['x-markdown-tokens']).toBeDefined();

    // 2. Blog Index
    const blogMd = runMd({ page: 'blog' });
    expect(blogMd.out).toContain('# Blog Técnico de Construcción y Arquitectura Residencial en Chile');
    expect(blogMd.out).toContain('Artículos Técnicos Publicados');
    expect(blogMd.out).toContain('seguimos-construyendo-casas-como-hace-30-anos');

    // 3. Single Blog Post
    const singlePostMd = runMd({ page: 'blog', post: 'seguimos-construyendo-casas-como-hace-30-anos' });
    expect(singlePostMd.out).toContain('# ¿Seguimos Construyendo Casas Como Hace 30 Años?');
    expect(singlePostMd.out).toContain('Resumen Ejecutivo');
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

    expect(data.level).toBeGreaterThanOrEqual(4);
    expect(data.checks?.discoverability?.robotsTxt?.status).toBe('pass');
    expect(data.checks?.discoverability?.sitemap?.status).toBe('pass');
    expect(data.checks?.contentAccessibility?.markdownNegotiation?.status).toBe('pass');
  });
});
