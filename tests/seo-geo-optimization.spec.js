// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Spec 026: SEO, Local GEO & Generative Engine Optimization (GEO) Verification', () => {

  test('1. Sitemap XML & Robots.txt Canonical Integrity', async () => {
    const sitemapContent = fs.readFileSync('public/sitemap.xml', 'utf8');
    const urls = [...sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

    // Ensure /blog does not have trailing slash
    expect(urls).toContain('https://www.cuatropuntas.com/blog');
    expect(urls).not.toContain('https://www.cuatropuntas.com/blog/');

    // Ensure all URLs belong to canonical www.cuatropuntas.com
    urls.forEach(u => {
      expect(u.startsWith('https://www.cuatropuntas.com')).toBeTruthy();
      if (u !== 'https://www.cuatropuntas.com/') {
        expect(u.endsWith('/')).toBeFalsy();
      }
    });

    // Check robots.txt
    const robotsContent = fs.readFileSync('public/robots.txt', 'utf8');
    expect(robotsContent).toContain('Sitemap: https://www.cuatropuntas.com/sitemap.xml');
    expect(robotsContent).toContain('Agentmap: https://www.cuatropuntas.com/.well-known/ai-catalog.json');
  });

  test('2. HTML Canonical Integrity & Zero Trailing Slash Canonicals', async () => {
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
    expect(htmlFiles.length).toBeGreaterThanOrEqual(25);

    htmlFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const canonicalMatch = content.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
      expect(canonicalMatch, `Missing canonical in ${file}`).not.toBeNull();
      if (canonicalMatch) {
        const canonUrl = canonicalMatch[1];
        expect(canonUrl.startsWith('https://www.cuatropuntas.com')).toBeTruthy();
        if (canonUrl !== 'https://www.cuatropuntas.com/') {
          expect(canonUrl.endsWith('/'), `Trailing slash in canonical ${canonUrl} in ${file}`).toBeFalsy();
        }
      }
    });

    // Specific check for blog/index.html
    const blogIndex = fs.readFileSync('public/blog/index.html', 'utf8');
    expect(blogIndex).toContain('<link rel="canonical" href="https://www.cuatropuntas.com/blog">');
  });

  test('3. Zero Internal Links with Trailing Slashes (Prevents 308 redirect chains)', async () => {
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

    htmlFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const matches = [...content.matchAll(trailingSlashRegex)];
      expect(matches.length, `Found trailing slash links in ${file}: ${matches.map(m => m[0]).join(', ')}`).toBe(0);
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
    expect(posts.length).toBe(17);

    posts.forEach(postFile => {
      const content = fs.readFileSync(path.join(postsDir, postFile), 'utf8');
      expect(content, `Missing geo.region in ${postFile}`).toContain('name="geo.region"');
      expect(content, `Missing geo.placename in ${postFile}`).toContain('name="geo.placename"');
      expect(content, `Missing geo.position in ${postFile}`).toContain('name="geo.position"');
      expect(content, `Missing ICBM in ${postFile}`).toContain('name="ICBM"');
    });
  });

  test('5. Schema.org SSOT Pricing & LocalBusiness AreaServed', async () => {
    // precios.html lowPrice must be "11"
    const preciosContent = fs.readFileSync('public/precios.html', 'utf8');
    const preciosSchema = JSON.parse(preciosContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const product = preciosSchema['@graph'].find(n => n['@type'] === 'Product');
    expect(product.offers.lowPrice).toBe('11');

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

  test('6. Generative Engine Optimization (llms.txt & llms-full.txt SSOT Compliance)', async () => {
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
  });

  test('7. Blog Posts Schema Speakable & Publisher Organization with Logo', async () => {
    const postsDir = 'public/blog/posts';
    const posts = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));

    posts.forEach(postFile => {
      const content = fs.readFileSync(path.join(postsDir, postFile), 'utf8');
      const match = content.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      expect(match, `No JSON-LD in ${postFile}`).not.toBeNull();
      const json = JSON.parse(match[1]);
      const article = json['@graph'].find(n => n['@type'] === 'TechArticle' || n['@type'] === 'Article' || n['@type'] === 'HowTo');
      expect(article, `Article/HowTo node not found in ${postFile}`).toBeDefined();
      expect(article.publisher, `Publisher missing in ${postFile}`).toBeDefined();
      expect(article.publisher.logo, `Publisher logo missing in ${postFile}`).toBeDefined();
      expect(article.speakable, `Speakable missing in ${postFile}`).toBeDefined();
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
});
