const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const scriptCoverPath = path.join(rootDir, 'scripts', 'generate-blog-cover.js');
const imagesDir = path.join(rootDir, 'public', 'blog', 'images');
const testImageSlug = 'test-cover-spec012';
const testWebpPath = path.join(imagesDir, `${testImageSlug}.webp`);
const fixtureInputPath = path.join(rootDir, 'public', 'blog_precios_construccion.jpg');

// Helper para limpiar artefactos de prueba
function cleanupTestImages() {
    if (fs.existsSync(testWebpPath)) {
        try { fs.unlinkSync(testWebpPath); } catch (e) {}
    }
    const fallbackTestPath = path.join(imagesDir, 'test-fallback-spec012.webp');
    if (fs.existsSync(fallbackTestPath)) {
        try { fs.unlinkSync(fallbackTestPath); } catch (e) {}
    }
}

test.describe('Spec 012: Generación Automatizada de Portadas con IA para el Blog', () => {

    test.beforeEach(async () => {
        cleanupTestImages();
    });

    test.afterAll(async () => {
        cleanupTestImages();
    });

    test('T01.1: El script scripts/generate-blog-cover.js debe existir y exportar funciones clave', async () => {
        expect(fs.existsSync(scriptCoverPath), 'El script scripts/generate-blog-cover.js debe existir').toBe(true);

        const coverModule = require(scriptCoverPath);
        expect(typeof coverModule.buildVisualPrompt).toBe('function');
        expect(typeof coverModule.processImageToWebp).toBe('function');
        expect(typeof coverModule.generateBlogCover).toBe('function');
    });

    test('T01.2: buildVisualPrompt genera prompt fotográfico arquitectónico con negative prompt estricto', async () => {
        const coverModule = require(scriptCoverPath);

        const topic = {
            title: "Radier vs Sobrecimiento en Casas de Metalcom en Santiago",
            category: "Materiales & Sistemas",
            excerpt: "Guía técnica para fundaciones de hormigón en la Región Metropolitana."
        };

        const { prompt, negativePrompt } = coverModule.buildVisualPrompt(topic);

        // Aserciones sobre el prompt positivo
        expect(prompt.toLowerCase()).toContain('santiago');
        expect(prompt.toLowerCase()).toContain('chile');
        expect(prompt.toLowerCase()).toMatch(/residential|architecture|metalcom|concrete/);
        expect(prompt.toLowerCase()).toMatch(/photorealistic|photography/);

        // Aserciones sobre el negative prompt estricto (EARS-012-02)
        expect(negativePrompt.toLowerCase()).toContain('people');
        expect(negativePrompt.toLowerCase()).toContain('text');
        expect(negativePrompt.toLowerCase()).toMatch(/faces|cartoon|render|logo|watermark/);
    });

    test('T01.3: processImageToWebp convierte a WebP 16:9 (1200x675) con presupuesto estricto < 100 KB', async () => {
        const coverModule = require(scriptCoverPath);
        expect(fs.existsSync(fixtureInputPath), 'El fixture de imagen base debe existir').toBe(true);

        const resultPath = await coverModule.processImageToWebp(fixtureInputPath, testWebpPath, {
            width: 1200,
            height: 675,
            maxBytes: 100 * 1024
        });

        // 1. Archivo físico existe en la ruta esperada
        expect(fs.existsSync(testWebpPath), 'El archivo WebP debe haber sido creado físicamente').toBe(true);
        expect(resultPath).toBe(testWebpPath);

        // 2. Presupuesto de peso estricto < 100 KB (EARS-012-03)
        const stats = fs.statSync(testWebpPath);
        expect(stats.size).toBeLessThan(100 * 1024);
        expect(stats.size).toBeGreaterThan(1000); // No debe ser un archivo vacío corrupto

        // 3. Cabecera WebP válida (primeros bytes: RIFF...WEBP)
        const buffer = fs.readFileSync(testWebpPath);
        const header = buffer.toString('ascii', 0, 4);
        const format = buffer.toString('ascii', 8, 12);
        expect(header).toBe('RIFF');
        expect(format).toBe('WEBP');
    });

    test('T01.4: generateBlogCover implementa graceful fallback ante fallos de cuota o clave inválida', async () => {
        const coverModule = require(scriptCoverPath);

        const topic = {
            title: "Aislamiento Térmico y Confort en Invierno para Santiago",
            category: "Materiales & Sistemas"
        };
        const fallbackSlug = 'test-fallback-spec012';

        // Ejecución forzando clave ficticia para simular fallo de API
        const result = await coverModule.generateBlogCover(topic, fallbackSlug, {
            apiKey: 'AIzaSy_FAKE_INVALID_KEY_FOR_TESTING',
            dryRun: false
        });

        // Debe resolver con éxito utilizando el mecanismo de fallback no destructivo
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.imagePath).toBe(`/blog/images/${fallbackSlug}.webp`);

        const physicalPath = path.join(imagesDir, `${fallbackSlug}.webp`);
        expect(fs.existsSync(physicalPath), 'La imagen de contingencia WebP debe existir físicamente').toBe(true);
        const stats = fs.statSync(physicalPath);
        expect(stats.size).toBeLessThan(100 * 1024);
    });

    test('T01.5: Integración en publish-blog.js propaga la ruta única /blog/images/${slug}.webp a metadatos y HTML', async () => {
        const { compileAndPublishPost, BLOG_POSTS_DIR } = require(path.join(rootDir, 'scripts', 'publish-blog.js'));
        const integrationSlug = 'post-prueba-imagen-unica-spec012';
        const expectedImagePath = `/blog/images/${integrationSlug}.webp`;
        const postHtmlPath = path.join(rootDir, 'public', 'blog', 'posts', `${integrationSlug}.html`);

        try {
            const publishResult = compileAndPublishPost({
                title: "Post de Prueba Integración Portada WebP Única",
                slug: integrationSlug,
                excerpt: "Validación de metadatos og:image y Schema.org con imágenes únicas de Spec 012.",
                category: "Casas Nuevas",
                content: "## Sección de Prueba\n\nContenido verificado.",
                image: expectedImagePath,
                date: "2026-09-09"
            });

            expect(publishResult.postData.image).toBe(expectedImagePath);
            expect(fs.existsSync(postHtmlPath)).toBe(true);

            const htmlContent = fs.readFileSync(postHtmlPath, 'utf8');

            // 1. og:image apunta a la URL canónica absoluta
            expect(htmlContent).toContain(`content="https://www.cuatropuntas.com${expectedImagePath}"`);

            // 2. twitter:image o imagen del artículo
            expect(htmlContent).toContain(`src="${expectedImagePath}"`);

            // 3. Schema.org TechArticle o metadatos
            expect(htmlContent).toContain('TechArticle');

            // 4. posts.json actualizado con la ruta de la portada
            const postsJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'blog', 'posts.json'), 'utf8'));
            const entry = postsJson.find(p => p.slug === integrationSlug);
            expect(entry).toBeDefined();
            expect(entry.image).toBe(expectedImagePath);

        } finally {
            // Teardown limpio del post de prueba
            if (fs.existsSync(postHtmlPath)) {
                try { fs.unlinkSync(postHtmlPath); } catch (e) {}
            }
            const postsJsonPath = path.join(rootDir, 'public', 'blog', 'posts.json');
            if (fs.existsSync(postsJsonPath)) {
                try {
                    const posts = JSON.parse(fs.readFileSync(postsJsonPath, 'utf8'));
                    const filtered = posts.filter(p => p.slug !== integrationSlug);
                    fs.writeFileSync(postsJsonPath, JSON.stringify(filtered, null, 2), 'utf8');
                } catch (e) {}
            }

            const blogIndexPath = path.join(rootDir, 'public', 'blog', 'index.html');
            if (fs.existsSync(blogIndexPath)) {
                try {
                    let indexHtml = fs.readFileSync(blogIndexPath, 'utf8');
                    const cardRegex = new RegExp(`\\s*<!-- Post Card: ${integrationSlug} -->[\\s\\S]*?<!-- End Post Card: ${integrationSlug} -->`, 'gi');
                    if (indexHtml.includes(integrationSlug)) {
                        indexHtml = indexHtml.replace(cardRegex, '');
                        fs.writeFileSync(blogIndexPath, indexHtml, 'utf8');
                    }
                } catch (e) {}
            }

            const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
            if (fs.existsSync(sitemapPath)) {
                try {
                    let sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
                    const locStr = `https://www.cuatropuntas.com/blog/posts/${integrationSlug}.html`;
                    if (sitemapXml.includes(locStr)) {
                        const urlNodeRegex = new RegExp(`\\s*<url>\\s*<loc>${locStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/loc>[\\s\\S]*?<\\/url>`, 'g');
                        sitemapXml = sitemapXml.replace(urlNodeRegex, '');
                        fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
                    }
                } catch (e) {}
            }
        }
    });

});
