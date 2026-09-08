const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const blogPostsDir = path.join(publicDir, 'blog', 'posts');
const postsJsonPath = path.join(publicDir, 'blog', 'posts.json');
const blogIndexPath = path.join(publicDir, 'blog', 'index.html');
const sitemapPath = path.join(publicDir, 'sitemap.xml');
const fixturePath = path.join(__dirname, 'fixtures', 'test-post.md');
const testSlug = 'guia-construccion-metalcom-chile';
const testPostHtmlPath = path.join(blogPostsDir, `${testSlug}.html`);

// Helper para restaurar estado limpio del repositorio
function cleanupTestPost() {
    // 1. Eliminar archivo HTML generado
    if (fs.existsSync(testPostHtmlPath)) {
        try { fs.unlinkSync(testPostHtmlPath); } catch (e) {}
    }

    // 2. Limpiar entrada en posts.json si existe
    if (fs.existsSync(postsJsonPath)) {
        try {
            const posts = JSON.parse(fs.readFileSync(postsJsonPath, 'utf8'));
            const filtered = posts.filter(p => p.slug !== testSlug);
            if (filtered.length !== posts.length) {
                fs.writeFileSync(postsJsonPath, JSON.stringify(filtered, null, 2), 'utf8');
            }
        } catch (e) {}
    }

    // 3. Limpiar card en blog/index.html si existe
    if (fs.existsSync(blogIndexPath)) {
        try {
            let indexHtml = fs.readFileSync(blogIndexPath, 'utf8');
            const cardRegex = new RegExp(`\\s*<!-- Post Card: ${testSlug} -->[\\s\\S]*?<!-- End Post Card: ${testSlug} -->`, 'gi');
            if (indexHtml.includes(testSlug)) {
                indexHtml = indexHtml.replace(cardRegex, '');
                fs.writeFileSync(blogIndexPath, indexHtml, 'utf8');
            }
        } catch (e) {}
    }

    // 4. Limpiar nodo en sitemap.xml si existe
    if (fs.existsSync(sitemapPath)) {
        try {
            let sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
            const locStr = `https://www.cuatropuntas.com/blog/posts/${testSlug}.html`;
            if (sitemapXml.includes(locStr)) {
                const urlNodeRegex = new RegExp(`\\s*<url>\\s*<loc>${locStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/loc>[\\s\\S]*?<\\/url>`, 'g');
                sitemapXml = sitemapXml.replace(urlNodeRegex, '');
                fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
            }
        } catch (e) {}
    }
}

test.describe('Spec 003: Pipeline y Motor Automatizado de Publicación del Blog', () => {

    test.beforeAll(async () => {
        cleanupTestPost();
    });

    test.afterAll(async () => {
        cleanupTestPost();
    });

    test('T01.1: El script scripts/publish-blog.js debe existir y exportar la función compileAndPublishPost', async () => {
        const scriptPath = path.join(rootDir, 'scripts', 'publish-blog.js');
        expect(fs.existsSync(scriptPath), 'El script scripts/publish-blog.js debe existir').toBe(true);

        const compiler = require(scriptPath);
        expect(typeof compiler.compileAndPublishPost).toBe('function');
    });

    test('T01.2: Compilación por CLI desde archivo Markdown fixture', async () => {
        const scriptPath = path.join(rootDir, 'scripts', 'publish-blog.js');
        expect(fs.existsSync(scriptPath)).toBe(true);

        const cmd = `node "${scriptPath}" "${fixturePath}"`;
        const stdout = execSync(cmd, { cwd: rootDir, encoding: 'utf8' });
        expect(stdout).toContain(testSlug);

        // Verificar que el archivo HTML se generó físicamente
        expect(fs.existsSync(testPostHtmlPath), `El archivo ${testPostHtmlPath} debe existir tras compilar`).toBe(true);
    });

    test('T01.3: Validación de estructura canónica, SEO, OpenGraph y Schema.org en el HTML generado', async ({ page }) => {
        expect(fs.existsSync(testPostHtmlPath)).toBe(true);
        const fileUrl = `file:///${testPostHtmlPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        // 1. Título y Metadatos SEO
        const title = await page.title();
        expect(title).toContain('Guía de Construcción en Metalcom');
        expect(title).toContain('Cuatropuntas');

        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(canonical).toBe(`https://www.cuatropuntas.com/blog/posts/${testSlug}.html`);

        // 2. OpenGraph
        const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
        expect(ogTitle).toContain('Guía de Construcción en Metalcom');

        // 3. Schema.org JSON-LD
        const jsonLdContent = await page.locator('script[type="application/ld+json"]').textContent();
        expect(jsonLdContent).toBeTruthy();
        const schema = JSON.parse(jsonLdContent);
        const graph = schema['@graph'] || [schema];

        const articleNode = graph.find(n => n['@type'] === 'TechArticle' || n['@type'] === 'Article');
        expect(articleNode, 'Debe incluir nodo TechArticle o Article').toBeDefined();
        expect(articleNode.headline).toContain('Guía de Construcción en Metalcom');

        const faqNode = graph.find(n => n['@type'] === 'FAQPage');
        expect(faqNode, 'Debe incluir nodo FAQPage si hay faqs').toBeDefined();
        expect(faqNode.mainEntity.length).toBeGreaterThanOrEqual(2);

        // 4. Ecosistema Oficial de Telefonía (SSOT)
        const htmlContent = fs.readFileSync(testPostHtmlPath, 'utf8');
        expect(htmlContent).toContain('56927384075');
        expect(htmlContent).not.toContain('63482439'); // Prohibido purgado
        expect(htmlContent).toContain('https://cal.com/cuatropuntas.com/visita-tecnica');
        expect(htmlContent).toContain('/#cotizador');

        // 5. Elementos de Contenido (Tablas, Listas y FAQs visuales)
        const table = page.locator('table');
        await expect(table).toHaveCount(1);
        const tableText = await table.textContent();
        expect(tableText).toContain('Metalcom Estructural');
        expect(tableText).toContain('19 UF/m²');

        const faqHeading = page.locator('h3:has-text("Preguntas Frecuentes")');
        await expect(faqHeading).toBeVisible();
    });

    test('T01.4: Sincronización atómica de posts.json, blog/index.html y sitemap.xml', async () => {
        // Asegurar que el post está publicado
        const scriptPath = path.join(rootDir, 'scripts', 'publish-blog.js');
        const compiler = require(scriptPath);
        const { metadata, content } = compiler.parseMarkdownWithFrontmatter(fs.readFileSync(fixturePath, 'utf8'));
        compiler.compileAndPublishPost({ ...metadata, content });

        // 1. posts.json
        expect(fs.existsSync(postsJsonPath)).toBe(true);
        const posts = JSON.parse(fs.readFileSync(postsJsonPath, 'utf8'));
        const postEntry = posts.find(p => p.slug === testSlug);
        expect(postEntry, `El post ${testSlug} debe estar presente en posts.json`).toBeDefined();
        expect(postEntry.title).toContain('Guía de Construcción en Metalcom');
        expect(postEntry.category).toBe('Materiales & Sistemas');

        // 2. blog/index.html (SSR Fallback Card)
        const indexHtml = fs.readFileSync(blogIndexPath, 'utf8');
        expect(indexHtml).toContain(testSlug);
        expect(indexHtml).toContain(`href="/blog/posts/${testSlug}.html"`);

        // 3. sitemap.xml
        const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
        expect(sitemapXml).toContain(`https://www.cuatropuntas.com/blog/posts/${testSlug}.html`);
        // Idempotencia: Verificar que no esté duplicado
        const occurrences = (sitemapXml.match(new RegExp(testSlug, 'g')) || []).length;
        expect(occurrences).toBe(1);
    });

    test('T01.5: Asignación de imagen por defecto según categoría al omitir image', async () => {
        const scriptPath = path.join(rootDir, 'scripts', 'publish-blog.js');
        const compiler = require(scriptPath);

        const result = compiler.compileAndPublishPost({
            title: "Post de Prueba Casas Nuevas Sin Imagen",
            slug: "test-casa-nueva-sin-imagen",
            excerpt: "Descripción de prueba para verificar imagen por defecto de casas nuevas.",
            category: "Casas Nuevas",
            content: "## Contenido de prueba\n\nTexto de prueba.",
            date: "2026-09-08"
        }, { dryRun: true });

        expect(result.postData.image).toBeDefined();
        expect(result.postData.image).toMatch(/\/(blog_precios_construccion\.jpg|casa_solida_moderna)/);
    });

    test('T01.6: Seguridad del endpoint Serverless api/blog-publish.js (401 y 400)', async () => {
        const handlerPath = path.join(rootDir, 'api', 'blog-publish.js');
        expect(fs.existsSync(handlerPath), 'El handler api/blog-publish.js debe existir').toBe(true);

        const handler = require(handlerPath);

        // Test 1: 401 sin encabezado Authorization
        let statusCode = null;
        let responseBody = null;
        const mockRes = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => { responseBody = data; }
                };
            }
        };

        await handler({ headers: {}, body: {} }, mockRes);
        expect(statusCode).toBe(401);
        expect(responseBody.error).toMatch(/no autorizado|token/i);

        // Test 2: 401 con token incorrecto
        process.env.BLOG_PUBLISH_SECRET = 'secret-test-123456';
        await handler({
            headers: { authorization: 'Bearer token-invalido' },
            body: {}
        }, mockRes);
        expect(statusCode).toBe(401);

        // Test 3: 400 si faltan campos obligatorios
        await handler({
            headers: { authorization: 'Bearer secret-test-123456' },
            body: { title: 'Solo título sin slug ni contenido' }
        }, mockRes);
        expect(statusCode).toBe(400);
        expect(responseBody.error).toMatch(/faltan campos obligatorios/i);
    });

    test('T01.7: Publicación exitosa vía endpoint api/blog-publish.js con token válido (200 OK)', async () => {
        const handlerPath = path.join(rootDir, 'api', 'blog-publish.js');
        const handler = require(handlerPath);

        process.env.BLOG_PUBLISH_SECRET = 'secret-test-123456';
        let statusCode = null;
        let responseBody = null;
        const mockRes = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => { responseBody = data; }
                };
            }
        };

        const markdownContent = fs.readFileSync(fixturePath, 'utf8');

        await handler({
            headers: { authorization: 'Bearer secret-test-123456' },
            body: { markdown: markdownContent }
        }, mockRes);

        expect(statusCode).toBe(200);
        expect(responseBody.success).toBe(true);
        expect(responseBody.slug).toBe(testSlug);
        expect(responseBody.url).toBe(`https://www.cuatropuntas.com/blog/posts/${testSlug}.html`);
    });

});
