// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { INDEXNOW_KEY, notifyIndexNow } = require('../scripts/indexnow-notify');

test.describe('Spec 026 & Spec 028: SEO, Local GEO, AI Crawlers & IndexNow Verification', () => {

  test('1. Sitemap XML & Robots.txt Canonical Integrity (Zero .html & AI Bots Allowed)', async () => {
    const sitemapContent = fs.readFileSync('public/sitemap.xml', 'utf8');
    const urls = [...sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

    // Ensure /blog and /privacidad are included without trailing slash or .html
    expect(urls).toContain('https://www.cuatropuntas.com/blog');
    expect(urls).toContain('https://www.cuatropuntas.com/privacidad');
    expect(urls).not.toContain('https://www.cuatropuntas.com/blog/');

    // Ensure all URLs belong to canonical www.cuatropuntas.com and NEVER end in .html or /
    urls.forEach(u => {
      expect(u.startsWith('https://www.cuatropuntas.com')).toBeTruthy();
      expect(u.endsWith('.html'), `Found .html extension in sitemap URL: ${u}`).toBeFalsy();
      if (u !== 'https://www.cuatropuntas.com/') {
        expect(u.endsWith('/'), `Found trailing slash in sitemap URL: ${u}`).toBeFalsy();
      }
    });

    // Check robots.txt for canonical Sitemap, Agentmap and 2026 AI Search Bots
    const robotsContent = fs.readFileSync('public/robots.txt', 'utf8');
    expect(robotsContent).toContain('Sitemap: https://www.cuatropuntas.com/sitemap.xml');
    expect(robotsContent).toContain('Agentmap: https://www.cuatropuntas.com/.well-known/ai-catalog.json');
    expect(robotsContent).toContain('User-agent: OAI-SearchBot');
    expect(robotsContent).toContain('User-agent: ChatGPT-User');
    expect(robotsContent).toContain('User-agent: PerplexityBot');
    expect(robotsContent).toContain('User-agent: ClaudeBot');
    expect(robotsContent).toContain('User-agent: Google-Extended');
    expect(robotsContent).toContain('User-agent: Applebot-Extended');
    expect(robotsContent).toContain('User-agent: Meta-ExternalAgent');
    expect(robotsContent).toContain('User-agent: CCBot');
  });

  test('2. HTML Canonical Integrity, Zero .html Canonicals & Unlimited AI Snippets', async () => {
    function getAllHtml(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          results = results.concat(getAllHtml(full));
        } else if (file.endsWith('.html')) {
          results.push(full);
        }
      });
      return results;
    }

    const htmlFiles = getAllHtml('public');
    expect(htmlFiles.length).toBeGreaterThanOrEqual(27);

    htmlFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const canonicalMatch = content.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
      expect(canonicalMatch, `Missing canonical in ${file}`).not.toBeNull();
      if (canonicalMatch) {
        const canonUrl = canonicalMatch[1];
        expect(canonUrl.startsWith('https://www.cuatropuntas.com')).toBeTruthy();
        expect(canonUrl.endsWith('.html'), `Found .html in canonical ${canonUrl} in ${file}`).toBeFalsy();
        if (canonUrl !== 'https://www.cuatropuntas.com/') {
          expect(canonUrl.endsWith('/'), `Trailing slash in canonical ${canonUrl} in ${file}`).toBeFalsy();
        }
      }

      // Check unlimited snippet directive in meta robots
      expect(content, `Missing max-snippet:-1 in ${file}`).toContain('max-snippet:-1');
    });

    // Check vercel.json X-Robots-Tag header
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    const globalHeaders = vercelConfig.headers.find(h => h.source === '/(.*)');
    expect(globalHeaders).toBeDefined();
    const xRobots = globalHeaders.headers.find(h => h.key === 'X-Robots-Tag');
    expect(xRobots).toBeDefined();
    expect(xRobots.value).toContain('max-snippet:-1');
  });

  test('3. Zero Internal Links with Trailing Slashes or .html Extensions (Prevents 308 redirect chains)', async () => {
    function getAllHtml(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          results = results.concat(getAllHtml(full));
        } else if (file.endsWith('.html')) {
          results.push(full);
        }
      });
      return results;
    }

    const htmlFiles = getAllHtml('public');
    const trailingSlashRegex = /href=["'](\/(?:servicios\/[a-zA-Z0-9_-]+|blog)\/)["']/g;
    const htmlExtBlogLinkRegex = /href=["']([^"']*\/blog\/posts\/[^"']+\.html)["']/g;

    htmlFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const matchesSlash = [...content.matchAll(trailingSlashRegex)];
      expect(matchesSlash.length, `Found trailing slash links in ${file}: ${matchesSlash.map(m => m[0]).join(', ')}`).toBe(0);

      const matchesHtml = [...content.matchAll(htmlExtBlogLinkRegex)];
      expect(matchesHtml.length, `Found .html blog links in ${file}: ${matchesHtml.map(m => m[0]).join(', ')}`).toBe(0);
    });
  });

  test('4. Local GEO Tags (CL-RM Santiago) in all Main Pages and 17 Blog Posts', async () => {
    const mainPages = [
      'public/index.html',
      'public/precios.html',
      'public/subsidio-minvu-sitio-propio.html',
      'public/blog/index.html',
      'public/servicios/casas-nuevas.html',
      'public/servicios/segundos-pisos.html',
      'public/servicios/quinchos.html',
      'public/servicios/remodelaciones.html'
    ];

    mainPages.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content, `Missing geo.region in ${file}`).toContain('name="geo.region"');
      expect(content, `Missing geo.placename in ${file}`).toContain('name="geo.placename"');
      expect(content, `Missing geo.position in ${file}`).toContain('name="geo.position"');
      expect(content, `Missing ICBM in ${file}`).toContain('name="ICBM"');
    });

    const postsDir = 'public/blog/posts';
    const posts = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));
    expect(posts.length).toBeGreaterThanOrEqual(17);

    posts.forEach(postFile => {
      const content = fs.readFileSync(path.join(postsDir, postFile), 'utf8');
      expect(content, `Missing geo.region in ${postFile}`).toContain('name="geo.region"');
      expect(content, `Missing geo.placename in ${postFile}`).toContain('name="geo.placename"');
      expect(content, `Missing geo.position in ${postFile}`).toContain('name="geo.position"');
      expect(content, `Missing ICBM in ${postFile}`).toContain('name="ICBM"');
    });
  });

  test('5. Schema.org SSOT Pricing (including remodelaciones.html 11-13 UF) & LocalBusiness AreaServed', async () => {
    // precios.html lowPrice must be "11"
    const preciosContent = fs.readFileSync('public/precios.html', 'utf8');
    const preciosSchema = JSON.parse(preciosContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const product = preciosSchema['@graph'].find(n => n['@type'] === 'Product');
    expect(product.offers.lowPrice).toBe('11');

    // remodelaciones.html lowPrice must be "11" and highPrice "13"
    const remodContent = fs.readFileSync('public/servicios/remodelaciones.html', 'utf8');
    const remodSchema = JSON.parse(remodContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const remodService = remodSchema['@graph'].find(n => n['@type'] === 'Service');
    expect(remodService.offers.lowPrice).toBe('11');
    expect(remodService.offers.highPrice).toBe('13');

    // index.html areaServed must include high-demand communes
    const indexContent = fs.readFileSync('public/index.html', 'utf8');
    const indexSchema = JSON.parse(indexContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const business = indexSchema['@graph'].find(n => Array.isArray(n['@type']) && n['@type'].includes('LocalBusiness'));
    const servedNames = business.areaServed.map(a => a.name);

    expect(servedNames).toContain('Chicureo');
    expect(servedNames).toContain('Vitacura');
    expect(servedNames).toContain('Lo Barnechea');
    expect(servedNames).toContain('Providencia');
    expect(servedNames).toContain('Ñuñoa');
    expect(servedNames).toContain('Pirque');
    expect(servedNames).toContain('Buin');
    expect(servedNames).toContain('Paine');

    // index.html service offer lowPrice must be "11"
    const service = indexSchema['@graph'].find(n => n['@type'] === 'Service');
    expect(service.offers.lowPrice).toBe('11');
  });

  test('6. Generative Engine Optimization (llms.txt & llms-full.txt SSOT Compliance & Clean Links)', async () => {
    const llms = fs.readFileSync('public/llms.txt', 'utf8');
    const llmsFull = fs.readFileSync('public/llms-full.txt', 'utf8');

    // Must link to canonical blog and booking
    expect(llms).toContain('https://www.cuatropuntas.com/blog');
    expect(llms).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');
    expect(llms).toContain('LGUC');
    expect(llms).toContain('OGUC');

    expect(llmsFull).toContain('https://www.cuatropuntas.com/blog');
    expect(llmsFull).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');
    expect(llmsFull).toContain('10 años');
    expect(llmsFull).toContain('Art. 18');
    expect(llmsFull).toContain('Zona Térmica 3');
    expect(llmsFull).not.toMatch(/\/blog\/posts\/[a-zA-Z0-9_-]+\.html/);
  });

  test('7. Blog Posts & Legal Pages Schema Completeness (BreadcrumbList, Speakable, FAQPage, WebPage)', async () => {
    // Check blog/index.html has BreadcrumbList
    const blogIndexContent = fs.readFileSync('public/blog/index.html', 'utf8');
    const blogIndexJson = JSON.parse(blogIndexContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    expect(blogIndexJson['@graph'].some(n => n['@type'] === 'BreadcrumbList')).toBeTruthy();

    // Check all 17 posts have BreadcrumbList, Publisher, Speakable and clean @id
    const postsDir = 'public/blog/posts';
    const posts = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));

    posts.forEach(postFile => {
      const content = fs.readFileSync(path.join(postsDir, postFile), 'utf8');
      const match = content.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      expect(match, `No JSON-LD in ${postFile}`).not.toBeNull();
      const json = JSON.parse(match[1]);
      expect(json['@graph'].some(n => n['@type'] === 'BreadcrumbList'), `Missing BreadcrumbList in ${postFile}`).toBeTruthy();

      const article = json['@graph'].find(n => n['@type'] === 'TechArticle' || n['@type'] === 'Article' || n['@type'] === 'HowTo');
      expect(article, `Article/HowTo node not found in ${postFile}`).toBeDefined();
      expect(article.publisher, `Publisher missing in ${postFile}`).toBeDefined();
      expect(article.publisher.logo, `Publisher logo missing in ${postFile}`).toBeDefined();
      expect(article.speakable, `Speakable missing in ${postFile}`).toBeDefined();
      if (article['@id']) {
        expect(article['@id']).not.toContain('.html');
      }
    });

    // Check metalcon-vs-albanileria-vs-sip.html has FAQPage
    const metalconContent = fs.readFileSync('public/blog/posts/metalcon-vs-albanileria-vs-sip.html', 'utf8');
    const metalconJson = JSON.parse(metalconContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    expect(metalconJson['@graph'].some(n => n['@type'] === 'FAQPage')).toBeTruthy();

    // Check politicas.html & privacidad.html have WebPage & BreadcrumbList
    ['public/politicas.html', 'public/privacidad.html'].forEach(legalFile => {
      const legalContent = fs.readFileSync(legalFile, 'utf8');
      const legalMatch = legalContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      expect(legalMatch, `No JSON-LD in ${legalFile}`).not.toBeNull();
      const legalJson = JSON.parse(legalMatch[1]);
      expect(legalJson['@graph'].some(n => n['@type'] === 'WebPage')).toBeTruthy();
      expect(legalJson['@graph'].some(n => n['@type'] === 'BreadcrumbList')).toBeTruthy();
    });
  });

  test('8. Meta Description Lengths Optimized for SERP (no truncation)', async () => {
    const servicePages = [
      'public/servicios/casas-nuevas.html',
      'public/servicios/segundos-pisos.html',
      'public/servicios/quinchos.html',
      'public/servicios/remodelaciones.html',
      'public/precios.html',
      'public/blog/index.html'
    ];

    servicePages.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      expect(descMatch, `Description missing in ${file}`).not.toBeNull();
      const desc = descMatch[1];
      expect(desc.length, `Description too long in ${file} (${desc.length} chars)`).toBeLessThanOrEqual(165);
      expect(desc.length, `Description too short in ${file} (${desc.length} chars)`).toBeGreaterThanOrEqual(120);
    });
  });

  test('9. IndexNow Protocol Key Verification & Notifier Dry-Run', async () => {
    const keyFilePath = path.join('public', `${INDEXNOW_KEY}.txt`);
    expect(fs.existsSync(keyFilePath)).toBeTruthy();
    const keyContent = fs.readFileSync(keyFilePath, 'utf8').trim();
    expect(keyContent).toBe(INDEXNOW_KEY);
    expect(keyContent.length).toBe(32);

    const dryRunRes = await notifyIndexNow({ dryRun: true });
    expect(dryRunRes.success).toBeTruthy();
    expect(dryRunRes.count).toBeGreaterThanOrEqual(27);
    expect(dryRunRes.payload.host).toBe('www.cuatropuntas.com');
  });
});
