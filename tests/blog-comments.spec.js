const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const apiCommentsPath = path.join(rootDir, 'api', 'blog-comments.js');
const publicCommentsJsPath = path.join(rootDir, 'public', 'blog-comments.js');
const publicDir = path.join(rootDir, 'public');
const testPostHtml = path.join(publicDir, 'blog', 'posts', 'guia-precios-construccion-chile.html');

test.describe('Spec 005 - Blog Comments & Lead Capture Suite', () => {

    // --- Módulo Backend Unitario ---
    test.describe('Backend Unit: api/blog-comments.js', () => {

        test('T01.1: Archivo api/blog-comments.js debe existir y exportar funciones clave', async () => {
            expect(fs.existsSync(apiCommentsPath), 'api/blog-comments.js debe existir').toBe(true);
            const commentsModule = require('../api/blog-comments');
            expect(typeof commentsModule).toBe('function');
            expect(typeof commentsModule.escapeHtml).toBe('function');
            expect(typeof commentsModule.persistCommentLeadToGoogleSheets).toBe('function');
        });

        test('T01.2: escapeHtml sanitiza caracteres especiales contra stored XSS', async () => {
            const { escapeHtml } = require('../api/blog-comments');
            const maliciousPayload = '<script>alert("XSS & hack")</script>';
            const clean = escapeHtml(maliciousPayload);
            expect(clean).not.toContain('<script>');
            expect(clean).toContain('&lt;script&gt;');
            expect(clean).toContain('&amp;');
            expect(clean).toContain('&quot;');
            expect(clean).toContain('&lt;&#x2F;script&gt;');
        });

        test('T01.3: GET /api/blog-comments valida parámetros y retorna lista de comentarios', async () => {
            const commentsHandler = require('../api/blog-comments');

            // Falta slug -> 400
            let status400 = 0;
            let json400 = null;
            const reqMissingSlug = { method: 'GET', query: {}, headers: {} };
            const resMissingSlug = {
                status: (s) => { status400 = s; return resMissingSlug; },
                json: (j) => { json400 = j; },
                setHeader: () => {}
            };
            await commentsHandler(reqMissingSlug, resMissingSlug);
            expect(status400).toBe(400);

            // Con slug válido -> 200 y array
            let status200 = 0;
            let json200 = null;
            const reqValid = { method: 'GET', query: { slug: 'guia-precios-construccion-chile' }, headers: {} };
            const resValid = {
                status: (s) => { status200 = s; return resValid; },
                json: (j) => { json200 = j; },
                setHeader: () => {}
            };
            await commentsHandler(reqValid, resValid);
            expect(status200).toBe(200);
            expect(json200.success).toBe(true);
            expect(Array.isArray(json200.comments)).toBe(true);
        });

        test('T01.4: POST /api/blog-comments valida campos obligatorios y longitud mínima de 10 caracteres', async () => {
            const commentsHandler = require('../api/blog-comments');

            // Comentario demasiado corto (< 10 caracteres)
            let statusShort = 0;
            let jsonShort = null;
            const reqShort = {
                method: 'POST',
                body: {
                    slug: 'guia-precios-construccion-chile',
                    name: 'Carlos Muñoz',
                    email: 'carlos@ejemplo.cl',
                    comment: 'Hola',
                    auth_provider: 'email'
                },
                headers: {}
            };
            const resShort = {
                status: (s) => { statusShort = s; return resShort; },
                json: (j) => { jsonShort = j; },
                setHeader: () => {}
            };
            await commentsHandler(reqShort, resShort);
            expect(statusShort).toBe(400);
            expect(jsonShort.error).toMatch(/10 caracteres/i);

            // Email inválido
            let statusEmail = 0;
            let jsonEmail = null;
            const reqBadEmail = {
                method: 'POST',
                body: {
                    slug: 'guia-precios-construccion-chile',
                    name: 'Carlos Muñoz',
                    email: 'correo-no-valido',
                    comment: 'Consulta válida sobre los radieres H20 en Santiago',
                    auth_provider: 'email'
                },
                headers: {}
            };
            const resBadEmail = {
                status: (s) => { statusEmail = s; return resBadEmail; },
                json: (j) => { jsonEmail = j; },
                setHeader: () => {}
            };
            await commentsHandler(reqBadEmail, resBadEmail);
            expect(statusEmail).toBe(400);
            expect(jsonEmail.error).toMatch(/correo/i);
        });

        test('T01.5: POST bloquea bots mediante honeypots de forma transparente', async () => {
            const commentsHandler = require('../api/blog-comments');
            let statusCode = 0;
            let resJson = null;

            const reqBot = {
                method: 'POST',
                body: {
                    slug: 'guia-precios-construccion-chile',
                    name: 'Spam Bot',
                    email: 'bot@spam.com',
                    comment: 'Comentario generado automáticamente por un scraper',
                    website_url: 'https://spam-link.com', // Honeypot activado
                    auth_provider: 'email'
                },
                headers: {}
            };
            const resBot = {
                status: (s) => { statusCode = s; return resBot; },
                json: (j) => { resJson = j; },
                setHeader: () => {}
            };

            await commentsHandler(reqBot, resBot);
            expect(statusCode).toBe(200);
            expect(resJson.success).toBe(true);
            // El bot cree que tuvo éxito pero no se persiste
        });

        test('T01.6: persistCommentLeadToGoogleSheets es fail-safe ante URL faltante o timeout', async () => {
            const { persistCommentLeadToGoogleSheets } = require('../api/blog-comments');

            // 1. Sin variable de entorno
            const originalUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
            delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;

            const resWithoutUrl = await persistCommentLeadToGoogleSheets({
                nombre: 'Prueba Local',
                email: 'prueba@cuatropuntas.cl',
                slug: 'test-slug',
                comentario: 'Consulta de prueba local'
            });
            expect(resWithoutUrl.success).toBe(false);
            expect(resWithoutUrl.reason).toBe('URL_NOT_CONFIGURED');

            // 2. Con timeout simulado (10ms hacia IP no ruteable)
            process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'http://10.255.255.1';
            const resTimeout = await persistCommentLeadToGoogleSheets({
                nombre: 'Prueba Timeout',
                email: 'timeout@cuatropuntas.cl',
                slug: 'test-slug',
                comentario: 'Consulta de prueba timeout'
            }, 10);
            expect(resTimeout.success).toBe(false);
            expect(['TIMEOUT_EXCEEDED', 'AbortError']).toContain(resTimeout.reason);

            // Restaurar entorno
            if (originalUrl) process.env.GOOGLE_SHEETS_WEBHOOK_URL = originalUrl;
            else delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
        });
    });

    // --- Componente Frontend e Integración en Post ---
    test.describe('Frontend Component: public/blog-comments.js', () => {

        test('T01.7: Archivo public/blog-comments.js debe existir físicamente', async () => {
            expect(fs.existsSync(publicCommentsJsPath), 'public/blog-comments.js debe existir').toBe(true);
        });

        test('T01.8: Post existente incluye contenedor #blog-comments-container y script del widget', async ({ page }) => {
            const fileUrl = `file:///${testPostHtml.replace(/\\/g, '/')}`;
            await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

            const container = page.locator('#blog-comments-container');
            await expect(container).toHaveCount(1);
            await expect(container).toHaveAttribute('data-slug', 'guia-precios-construccion-chile');

            // Verificar inclusión de script canónico en el DOM
            const rawHtml = fs.readFileSync(testPostHtml, 'utf8');
            expect(rawHtml).toContain('src="/blog-comments.js"');
            expect(rawHtml).toContain('id="blog-comments-container"');
        });

        test('T01.9: Renderizado inicial en estado bloqueado con copy de Email Marketing y formulario alternativo', async ({ page }) => {
            const fileUrl = `file:///${testPostHtml.replace(/\\/g, '/')}`;
            await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
            await page.evaluate(() => localStorage.removeItem('cuatropuntas_blog_user'));
            await page.addScriptTag({ path: publicCommentsJsPath });

            // Copy persuasivo de lead magnet
            const gateHeading = page.locator('#blog-comments-container');
            await expect(gateHeading).toContainText('conversación técnica');
            await expect(gateHeading).toContainText('novedades de costos');

            // Botón Google o contenedor GIS
            const googleContainer = page.locator('#blog-comments-google-auth');
            await expect(googleContainer).toBeVisible();

            // Formulario alternativo (Nombre, Email, Checkbox de consentimiento)
            const nameInput = page.locator('#comment-author-name');
            const emailInput = page.locator('#comment-author-email');
            const optInCheckbox = page.locator('#comment-marketing-consent');
            await expect(nameInput).toBeVisible();
            await expect(emailInput).toBeVisible();
            await expect(optInCheckbox).toBeVisible();
        });

        test('T01.10: Identificación alternativa desbloquea formulario de comentario activo', async ({ page }) => {
            const fileUrl = `file:///${testPostHtml.replace(/\\/g, '/')}`;
            await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
            await page.evaluate(() => localStorage.removeItem('cuatropuntas_blog_user'));
            await page.addScriptTag({ path: publicCommentsJsPath });

            // Llenar formulario alternativo
            await page.fill('#comment-author-name', 'Patricio Alarcón');
            await page.fill('#comment-author-email', 'patricio@empresa.cl');
            await page.check('#comment-marketing-consent');

            // Enviar identificación
            await page.click('#btn-manual-auth');

            // El estado debe cambiar a autenticado: debe aparecer el textarea de comentarios
            const commentTextarea = page.locator('#comment-body-input');
            await expect(commentTextarea).toBeVisible();

            // Debe mostrar el nombre del suscriptor autenticado
            const userBadge = page.locator('#authenticated-user-badge');
            await expect(userBadge).toContainText('Patricio Alarcón');

            // Verificar que la sesión quedó guardada en localStorage
            const storedUser = await page.evaluate(() => localStorage.getItem('cuatropuntas_blog_user'));
            expect(storedUser).toBeTruthy();
            expect(JSON.parse(storedUser).email).toBe('patricio@empresa.cl');
        });

        test('T01.11: Publicación reactiva de un comentario válido se añade a la vista', async ({ page }) => {
            const fileUrl = `file:///${testPostHtml.replace(/\\/g, '/')}`;
            await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
            await page.evaluate(() => {
                localStorage.setItem('cuatropuntas_blog_user', JSON.stringify({
                    name: 'Camila Valenzuela',
                    email: 'camila@arquitectura.cl',
                    auth_provider: 'email'
                }));
                window.fetch = async (url, opts) => {
                    if (opts && opts.method === 'POST') {
                        const body = JSON.parse(opts.body);
                        return {
                            ok: true,
                            status: 201,
                            json: async () => ({
                                success: true,
                                message: '¡Muchas gracias! Tu consulta ha sido publicada con éxito y recibida por nuestros constructores.',
                                comment: {
                                    id: 'mock-1',
                                    slug: body.slug,
                                    name: body.name,
                                    comment: body.comment,
                                    auth_provider: body.auth_provider,
                                    date: new Date().toISOString()
                                }
                            })
                        };
                    }
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ success: true, count: 0, comments: [] })
                    };
                };
            });

            await page.addScriptTag({ path: publicCommentsJsPath });

            // Llenar comentario de prueba
            await page.fill('#comment-body-input', '¿Qué espesor de losa de hormigón recomiendan para segundo piso en Metalcon?');
            await page.click('#btn-submit-comment');

            // Verificar mensaje de éxito
            const container = page.locator('#blog-comments-container');
            await expect(container).toContainText('publicada con éxito');

            // Verificar que el comentario aparece en la lista
            await expect(container).toContainText('¿Qué espesor de losa de hormigón recomiendan');
            await expect(container).toContainText('Camila Valenzuela');
        });
    });
});
