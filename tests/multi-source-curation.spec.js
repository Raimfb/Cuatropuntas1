const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const curatorScriptPath = path.join(rootDir, 'scripts', 'auto-curate-and-publish.js');
const evergreenCatalogPath = path.join(rootDir, 'content', 'evergreen-topics.json');
const tempCatalogPath = path.join(rootDir, 'content', 'temp-test-evergreen.json');

function cleanupTempCatalog() {
    if (fs.existsSync(tempCatalogPath)) {
        try { fs.unlinkSync(tempCatalogPath); } catch (e) {}
    }
}

test.describe('Spec 019: Motor de Curaduría Multi-Fuente y Respaldo Evergreen para el Blog', () => {

    test.beforeEach(() => {
        cleanupTempCatalog();
    });

    test.afterAll(() => {
        cleanupTempCatalog();
    });

    test('T01.1: El script auto-curate-and-publish.js debe exportar las funciones clave de curaduría multi-fuente', async () => {
        expect(fs.existsSync(curatorScriptPath), 'El script auto-curate-and-publish.js debe existir').toBe(true);

        const curator = require(curatorScriptPath);
        expect(typeof curator.fetchArchitectureRssFeed).toBe('function');
        expect(typeof curator.extractArchitectureTopics).toBe('function');
        expect(typeof curator.loadEvergreenCatalog).toBe('function');
        expect(typeof curator.markEvergreenTopicAsUsed).toBe('function');
        expect(typeof curator.selectNextTopicMultiSource).toBe('function');
        expect(typeof curator.buildGeminiPrompt).toBe('function');
    });

    test('T01.2: El catálogo content/evergreen-topics.json debe contener al menos 25 temas estructurados con cobertura de servicios', async () => {
        expect(fs.existsSync(evergreenCatalogPath), 'content/evergreen-topics.json debe existir físicamente').toBe(true);

        const curator = require(curatorScriptPath);
        const topics = curator.loadEvergreenCatalog(evergreenCatalogPath);

        expect(Array.isArray(topics)).toBe(true);
        expect(topics.length).toBeGreaterThanOrEqual(25);

        // Validar esquema estricto de cada tema
        for (const topic of topics) {
            expect(topic.id, 'Cada tema debe tener id único').toBeTruthy();
            expect(topic.title, 'Cada tema debe tener title').toBeTruthy();
            expect(topic.category, 'Cada tema debe tener category').toBeTruthy();
            expect(topic.service, 'Cada tema debe tener service asociado').toBeTruthy();
            expect(Array.isArray(topic.keywords), 'Keywords debe ser un array').toBe(true);
            expect(topic.keywords.length).toBeGreaterThanOrEqual(2);
            expect(typeof topic.used).toBe('boolean');
        }

        // Validar cobertura de los servicios principales de Cuatropuntas
        const services = topics.map(t => t.service.toLowerCase());
        expect(services.some(s => s.includes('casa'))).toBe(true);
        expect(services.some(s => s.includes('amplia') || s.includes('segundo'))).toBe(true);
        expect(services.some(s => s.includes('remodela'))).toBe(true);
        expect(services.some(s => s.includes('quincho'))).toBe(true);
    });

    test('T01.3: Cascada de resolución jerárquica (Fuente 1 YouTube -> Fuente 2 RSS -> Fuente 3 Evergreen)', async () => {
        const curator = require(curatorScriptPath);

        const existingPosts = [
            { title: 'Post Antiguo sobre Casas', slug: 'post-antiguo-casas' }
        ];

        // 1. Caso A: YouTube tiene temas viables y no duplicados -> Gana YouTube (Fuente 1)
        const sampleYouTubeTopics = [
            { title: 'Novedades de Construcción en Seco 2026', url: 'https://youtube.com/watch?v=123', source: 'youtube' }
        ];
        const sampleRssTopics = [
            { title: 'Tendencias de Madera en Chile', url: 'https://archdaily.cl/madera', source: 'architecture_rss' }
        ];
        const sampleEvergreen = [
            { id: 'eg-01', title: 'Quinchos Habitables todo el Año', category: 'Quinchos', used: false }
        ];

        const selectedA = curator.selectNextTopicMultiSource({
            youtubeTopics: sampleYouTubeTopics,
            rssTopics: sampleRssTopics,
            evergreenTopics: sampleEvergreen,
            existingPosts
        });
        expect(selectedA.source).toBe('youtube');
        expect(selectedA.title).toBe('Novedades de Construcción en Seco 2026');

        // 2. Caso B: YouTube vacío o con error -> Gana RSS de Arquitectura (Fuente 2)
        const selectedB = curator.selectNextTopicMultiSource({
            youtubeTopics: [],
            rssTopics: sampleRssTopics,
            evergreenTopics: sampleEvergreen,
            existingPosts
        });
        expect(selectedB.source).toBe('architecture_rss');
        expect(selectedB.title).toBe('Tendencias de Madera en Chile');

        // 3. Caso C: YouTube y RSS vacíos/fallidos -> Gana Catálogo Evergreen (Fuente 3)
        const selectedC = curator.selectNextTopicMultiSource({
            youtubeTopics: [],
            rssTopics: [],
            evergreenTopics: sampleEvergreen,
            existingPosts
        });
        expect(selectedC.source).toBe('evergreen_catalog');
        expect(selectedC.title).toBe('Quinchos Habitables todo el Año');
    });

    test('T01.4: Resiliencia ante fallos de red y deduplicación contra posts existentes', async () => {
        const curator = require(curatorScriptPath);

        // 1. Timeout / Error en RSS retorna null o array vacío sin lanzar excepción
        const deadUrl = 'https://dominio-inexistente-12345-fake.cl/feed.xml';
        const rssResult = await curator.fetchArchitectureRssFeed(deadUrl, 500);
        expect(rssResult === null || Array.isArray(rssResult)).toBe(true);

        // 2. Deduplicación semántica: descarta temas que coincidan en título o slug con posts.json
        const existingPosts = [
            { title: 'Aislación Térmica Zona 3 RM OGUC', slug: 'aislacion-termica-zona-3-rm-oguc' }
        ];
        const duplicateCandidate = [
            { title: 'Aislación Térmica en la Zona 3 de la RM con Norma OGUC', source: 'architecture_rss' }
        ];
        const freshEvergreen = [
            { id: 'eg-99', title: 'Impermeabilización de Duchas y Prevención de Filtraciones', category: 'Remodelaciones', used: false }
        ];

        const selected = curator.selectNextTopicMultiSource({
            youtubeTopics: [],
            rssTopics: duplicateCandidate,
            evergreenTopics: freshEvergreen,
            existingPosts
        });

        // Debe descartar el candidato duplicado de RSS y saltar al evergreen limpio
        expect(selected.source).toBe('evergreen_catalog');
        expect(selected.title).toContain('Impermeabilización de Duchas');
    });

    test('T01.5: Persistencia de estado used: true en el catálogo evergreen', async () => {
        const curator = require(curatorScriptPath);

        const initialMockCatalog = [
            { id: 'eg-test-01', title: 'Tema Test 1', used: false, lastUsedDate: null },
            { id: 'eg-test-02', title: 'Tema Test 2', used: false, lastUsedDate: null }
        ];
        fs.writeFileSync(tempCatalogPath, JSON.stringify(initialMockCatalog, null, 2), 'utf8');

        // Marcar tema 1 como usado
        const success = curator.markEvergreenTopicAsUsed(tempCatalogPath, 'eg-test-01');
        expect(success).toBe(true);

        // Verificar persistencia en disco
        const updatedCatalog = JSON.parse(fs.readFileSync(tempCatalogPath, 'utf8'));
        const topic1 = updatedCatalog.find(t => t.id === 'eg-test-01');
        const topic2 = updatedCatalog.find(t => t.id === 'eg-test-02');

        expect(topic1.used).toBe(true);
        expect(topic1.lastUsedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(topic2.used).toBe(false);
    });

    test('T01.6: buildGeminiPrompt debe orientar a audiencia B2C e inyectar doble CTA (Cotizador + Cal.com)', async () => {
        const curator = require(curatorScriptPath);

        const prompt = curator.buildGeminiPrompt({
            title: "¿Conviene ampliar hacia el patio o construir un segundo piso?",
            category: "Segundos Pisos & Ampliaciones"
        });

        // 1. Tono y audiencia B2C para dueños de casa
        expect(prompt).toMatch(/dueños de casa|familias|propietarios|b2c/i);
        expect(prompt).toMatch(/elevar el nivel de conciencia|mitos|cotidiano/i);

        // 2. Doble CTA obligatorio de agendamiento
        expect(prompt).toContain('https://www.cuatropuntas.com/#cotizador');
        expect(prompt).toMatch(/cal\.com\/cuatropuntas(\.com)?\/visita-tecnica/i);
    });

});
