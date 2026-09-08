const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const scriptPath = path.join(rootDir, 'scripts', 'auto-curate-and-publish.js');
const workflowPath = path.join(rootDir, '.github', 'workflows', 'weekly-blog.yml');
const postsJsonPath = path.join(rootDir, 'public', 'blog', 'posts.json');

test.describe('Spec 004: Piloto Automático de Blog (Cron GitHub Actions)', () => {

    test('T01.1: El script scripts/auto-curate-and-publish.js debe existir y exportar funciones clave', async () => {
        expect(fs.existsSync(scriptPath), 'El script scripts/auto-curate-and-publish.js debe existir').toBe(true);

        const autoCurator = require(scriptPath);
        expect(typeof autoCurator.fetchYouTubeRssFeed).toBe('function');
        expect(typeof autoCurator.extractViableTopics).toBe('function');
        expect(typeof autoCurator.filterDuplicateTopics).toBe('function');
        expect(typeof autoCurator.selectNextTopic).toBe('function');
        expect(typeof autoCurator.buildGeminiPrompt).toBe('function');
        expect(typeof autoCurator.autoCurateAndPublish).toBe('function');
        expect(Array.isArray(autoCurator.CONTINGENCY_TOPIC_POOL)).toBe(true);
        expect(autoCurator.CONTINGENCY_TOPIC_POOL.length).toBeGreaterThanOrEqual(3);
    });

    test('T01.2: Extracción y filtrado de videos de YouTube (descarte de Shorts y Hashtags)', async () => {
        const autoCurator = require(scriptPath);

        const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
            <title>Construir Simple</title>
            <entry>
                <id>yt:video:11111</id>
                <title>#arquitectura #casasmadera #home #construccion</title>
                <published>2026-09-01T12:00:00+00:00</published>
            </entry>
            <entry>
                <id>yt:video:22222</id>
                <title>El Error Que Calienta Tu Casa en Verano</title>
                <published>2026-09-02T12:00:00+00:00</published>
            </entry>
            <entry>
                <id>yt:video:33333</id>
                <title>#shorts #viral</title>
                <published>2026-09-03T12:00:00+00:00</published>
            </entry>
            <entry>
                <id>yt:video:44444</id>
                <title>Desde 2025 Ya No Puedes Construir Igual En Chile</title>
                <published>2026-09-04T12:00:00+00:00</published>
            </entry>
        </feed>`;

        const extracted = autoCurator.extractViableTopics(sampleXml);
        expect(extracted.length).toBe(2);
        expect(extracted[0].title).toBe('El Error Que Calienta Tu Casa en Verano');
        expect(extracted[1].title).toBe('Desde 2025 Ya No Puedes Construir Igual En Chile');
    });

    test('T01.3: Detección anti-duplicados y activación del banco de contingencia', async () => {
        const autoCurator = require(scriptPath);

        const mockExistingPosts = [
            { slug: 'permisos-edificacion-dom-santiago-guia', title: 'Permisos de edificación DOM en Santiago' },
            { slug: 'aislacion-termica-zona-3-rm-oguc', title: 'Aislación térmica en la Región Metropolitana' }
        ];

        // Caso A: Título que colisiona con post existente
        const candidateTopics = [
            { title: 'Permisos de edificación en la DOM y cómo tramitarlos' },
            { title: 'Secretos del Radier de Hormigón H-20 y Fisuras en Santiago' }
        ];

        const filtered = autoCurator.filterDuplicateTopics(candidateTopics, mockExistingPosts);
        expect(filtered.length).toBe(1);
        expect(filtered[0].title).toContain('Radier de Hormigón H-20');

        // Caso B: Todos los candidatos ya están cubiertos -> Debe activar banco de contingencia
        const allDuplicates = [
            { title: 'Aislación térmica para techos y muros' }
        ];
        const nextTopic = autoCurator.selectNextTopic(allDuplicates, autoCurator.CONTINGENCY_TOPIC_POOL, mockExistingPosts);
        expect(nextTopic).toBeDefined();
        expect(nextTopic.title).toBeDefined();
        expect(nextTopic.source).toBe('contingency_pool');
    });

    test('T01.4: Inyección estricta del SSOT de Cuatropuntas en el prompt de Gemini', async () => {
        const autoCurator = require(scriptPath);

        const prompt = autoCurator.buildGeminiPrompt({
            title: 'El Error Que Calienta Tu Casa en Verano: Acondicionamiento Térmico'
        });

        // 1. Telefonía Oficial y purga
        expect(prompt).toContain('+56 9 2738 4075');
        expect(prompt).toContain('63482439'); // Debe mencionarse explícitamente como número PROHIBIDO
        expect(prompt).toContain('cal.com/cuatropuntas.com/visita-tecnica');

        // 2. Matriz de precios oficial
        expect(prompt).toContain('19 UF');
        expect(prompt).toContain('21 UF');
        expect(prompt).toContain('25 UF');

        // 3. Normativa chilena
        expect(prompt).toContain('OGUC');
        expect(prompt).toContain('DOM');
        expect(prompt).toContain('Zona 3');
    });

    test('T01.5: Validación del Workflow de GitHub Actions (.github/workflows/weekly-blog.yml)', async () => {
        expect(fs.existsSync(workflowPath), 'El archivo de workflow .github/workflows/weekly-blog.yml debe existir').toBe(true);

        const content = fs.readFileSync(workflowPath, 'utf8');

        // 1. Triggers: cron de los viernes 12:00 UTC y workflow_dispatch manual
        expect(content).toMatch(/cron:\s*['"]?0 12 \* \* 5['"]?/i);
        expect(content).toContain('workflow_dispatch');

        // 2. Permisos para git push desatendido
        expect(content).toMatch(/contents:\s*write/i);

        // 3. Ejecución del script y Playwright
        expect(content).toContain('scripts/auto-curate-and-publish.js');
        expect(content).toContain('npx playwright test tests/blog-automation.spec.js');

        // 4. Git commit y push con skip ci
        expect(content).toContain('[skip ci]');
        expect(content).toContain('git push');
    });

});
