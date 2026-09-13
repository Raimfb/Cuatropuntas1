/**
 * scripts/auto-curate-and-publish.js
 * Constructora Cuatropuntas SpA
 * Piloto Automático de Blog: Curaduría de Fuentes, Generación con Gemini y Publicación (Spec 004)
 *
 * Puede ser ejecutado por CLI:
 *   node scripts/auto-curate-and-publish.js [--dry-run] [--force-topic="..."]
 */

const fs = require('fs');
const path = require('path');
try { require('dotenv').config(); } catch (e) {}
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { compileAndPublishPost, sanitizeContent } = require('./publish-blog');
const { generateBlogCover } = require('./generate-blog-cover');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const POSTS_JSON_PATH = path.join(PUBLIC_DIR, 'blog', 'posts.json');
const DRAFTS_DIR = path.join(ROOT_DIR, 'content', 'drafts');

// Constantes de Curaduría
const YOUTUBE_CHANNEL_ID = 'UCigCwSjY7u0zslMU1iMAGPA'; // @ConstruirSimple
const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
const ARCHITECTURE_RSS_URL = 'https://www.plataformaarquitectura.cl/cl/feed';
const EVERGREEN_CATALOG_PATH = path.join(ROOT_DIR, 'content', 'evergreen-topics.json');

// Banco de Temas Técnicos de Contingencia (Chile)
const CONTINGENCY_TOPIC_POOL = [
    {
        title: "Radier vs Sobrecimiento: Cuándo usar hormigón H-20 y cómo evitar fisuras por retracción plástica en Santiago",
        category: "Materiales & Sistemas",
        keywords: ["radier", "hormigon", "h-20", "sobrecimiento", "fisuras"]
    },
    {
        title: "Ventanas Termopanel y Doble Vidriado Hermético: Por qué el marco de PVC o aluminio RPT es decisivo en la Zona 3 RM",
        category: "Materiales & Sistemas",
        keywords: ["termopanel", "doble vidriado", "pvc", "zona 3", "oguc"]
    },
    {
        title: "Construcción en Terrenos con Pendiente y Muros de Contención: Requisitos de ingeniería y cálculo NCh en la RM",
        category: "Guías Prácticas",
        keywords: ["pendiente", "muros de contencion", "calculo estructural", "terreno", "nch"]
    },
    {
        title: "Techos de Teja Asfáltica vs Zinc vs Panel Teja: Comparativa de costos, durabilidad e impermeabilización en Chile",
        category: "Materiales & Sistemas",
        keywords: ["techumbres", "teja asfaltica", "zinc", "panel teja", "impermeabilizacion"]
    },
    {
        title: "Apertura de Muros y Concepto Abierto: Cálculo de vigas metálicas IPN y refuerzos en viviendas habitadas",
        category: "Precios & Remodelaciones",
        keywords: ["concepto abierto", "viga ipn", "apertura muros", "calculo estructural"]
    }
];

/**
 * Consulta el feed RSS de YouTube con timeout
 */
async function fetchYouTubeRssFeed(channelId = YOUTUBE_CHANNEL_ID, timeoutMs = 6000) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CuatropuntasBlogBot/1.0)' }
        });
        clearTimeout(timer);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} al consultar feed de YouTube`);
        }
        return await response.text();
    } catch (err) {
        clearTimeout(timer);
        console.warn(`⚠️ [CURATOR WARNING] No se pudo consultar feed de YouTube: ${err.message}`);
        return null;
    }
}

/**
 * Consulta el feed RSS de Arquitectura Chilena con timeout
 */
async function fetchArchitectureRssFeed(url = ARCHITECTURE_RSS_URL, timeoutMs = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CuatropuntasBlogBot/1.0)' }
        });
        clearTimeout(timer);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} al consultar feed de arquitectura`);
        }
        return await response.text();
    } catch (err) {
        clearTimeout(timer);
        console.warn(`⚠️ [CURATOR WARNING] No se pudo consultar feed de arquitectura: ${err.message}`);
        return null;
    }
}

/**
 * Extrae temas viables desde feeds RSS de arquitectura (RSS 2.0 o Atom)
 */
function extractArchitectureTopics(xmlContent) {
    if (!xmlContent || typeof xmlContent !== 'string') return [];

    const topics = [];
    const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
    let match;

    while ((match = itemRegex.exec(xmlContent)) !== null) {
        const itemBlock = match[1];

        // Extraer título
        const titleMatch = itemBlock.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))<\/title>/i);
        if (!titleMatch) continue;
        let title = (titleMatch[1] || titleMatch[2] || '').trim();

        // Extraer link
        let url = '';
        const linkMatch = itemBlock.match(/<link[^>]*href="([^"]+)"/i) || itemBlock.match(/<link[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))<\/link>/i);
        if (linkMatch) {
            url = (linkMatch[1] || linkMatch[2] || '').trim();
        }

        // Extraer fecha
        let date = '';
        const dateMatch = itemBlock.match(/<(?:pubDate|published|updated|dc:date)[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))<\/(?:pubDate|published|updated|dc:date)>/i);
        if (dateMatch) {
            date = (dateMatch[1] || dateMatch[2] || '').trim();
        }

        // Limpiar sufijos típicos de medios de arquitectura
        title = title
            .replace(/\s*(\||\-)\s*(ArchDaily|Plataforma Arquitectura|Madera21|Chile).*$/i, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (title.length < 5) continue;

        topics.push({
            title,
            url,
            date,
            source: 'architecture_rss'
        });
    }

    return topics;
}

/**
 * Carga el catálogo evergreen desde el archivo JSON
 */
function loadEvergreenCatalog(catalogPath = EVERGREEN_CATALOG_PATH) {
    if (!fs.existsSync(catalogPath)) {
        return [];
    }
    try {
        const content = fs.readFileSync(catalogPath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        console.warn(`⚠️ [CURATOR WARNING] Error al leer catálogo evergreen: ${err.message}`);
        return [];
    }
}

/**
 * Marca un tema del catálogo evergreen como utilizado y persiste la fecha
 */
function markEvergreenTopicAsUsed(catalogPath = EVERGREEN_CATALOG_PATH, topicId) {
    if (!fs.existsSync(catalogPath)) {
        return false;
    }
    try {
        const topics = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        const topic = topics.find(t => t.id === topicId);
        if (!topic) {
            return false;
        }
        topic.used = true;
        topic.lastUsedDate = new Date().toISOString().split('T')[0];
        fs.writeFileSync(catalogPath, JSON.stringify(topics, null, 2) + '\n', 'utf8');
        return true;
    } catch (err) {
        console.error(`⚠️ [CURATOR ERROR] No se pudo actualizar estado del tema ${topicId}: ${err.message}`);
        return false;
    }
}

/**
 * Extrae y filtra temas viables del XML de YouTube
 * Descarta shorts y entradas basadas en hashtags
 */
function extractViableTopics(xmlContent) {
    if (!xmlContent) return [];

    const topics = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xmlContent)) !== null) {
        const entryBlock = match[1];

        // Extraer título
        const titleMatch = entryBlock.match(/<title>([^<]+)<\/title>/);
        if (!titleMatch) continue;

        let title = titleMatch[1].trim();

        // Extraer link si existe
        const linkMatch = entryBlock.match(/<link[^>]*href="([^"]+)"/);
        const url = linkMatch ? linkMatch[1] : '';

        // Extraer fecha
        const dateMatch = entryBlock.match(/<published>([^<]+)<\/published>/);
        const date = dateMatch ? dateMatch[1] : '';

        // Filtro 1: Descartar títulos que comiencen con # o contengan más de 2 hashtags
        const hashtagCount = (title.match(/#[a-zA-Z0-9_-]+/g) || []).length;
        if (title.startsWith('#') || hashtagCount >= 2) {
            continue;
        }

        // Filtro 2: Descartar si tiene menos de 4 palabras sustantivas
        const words = title.split(/\s+/).filter(w => !w.startsWith('#') && w.length > 2);
        if (words.length < 4) {
            continue;
        }

        // Limpiar hashtags residuales del título
        title = title.replace(/#[a-zA-Z0-9_-]+/g, '').replace(/\s+/g, ' ').trim();

        topics.push({
            title,
            url,
            date,
            source: 'youtube'
        });
    }

    return topics;
}

/**
 * Filtra temas candidatos contra los artículos ya publicados en posts.json
 */
function filterDuplicateTopics(candidateTopics, existingPosts = []) {
    if (!candidateTopics || candidateTopics.length === 0) return [];

    const clean = (str) => (str || '')
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .trim();

    const existingTitles = existingPosts.map(p => clean(p.title));
    const existingSlugs = existingPosts.map(p => clean(p.slug || p.id));

    const STOP_WORDS = new Set(['para', 'como', 'este', 'esta', 'todo', 'toda', 'con', 'por', 'los', 'las', 'del', 'una', 'uno', 'que', 'mas', 'sobre', 'entre']);

    return candidateTopics.filter(candidate => {
        const candClean = clean(candidate.title);
        const candWords = candClean.split(/\s+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));

        // Comprobar coincidencia directa o alta similitud
        for (const existTitle of existingTitles) {
            if (existTitle.includes(candClean) || candClean.includes(existTitle)) {
                return false;
            }

            // Coincidencia de 2 o más palabras clave significativas (ej: permisos + edificacion + dom)
            const matchCount = candWords.filter(w => existTitle.includes(w)).length;
            if (matchCount >= 2) {
                return false;
            }
        }

        for (const existSlug of existingSlugs) {
            const matchCount = candWords.filter(w => existSlug.includes(w)).length;
            if (matchCount >= 2) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Selecciona el próximo tema garantizando la cadencia semanal ininterrumpida (legacy)
 */
function selectNextTopic(candidateTopics = [], fallbackPool = CONTINGENCY_TOPIC_POOL, existingPosts = []) {
    // 1. Intentar temas filtrados de YouTube
    const viableCandidates = filterDuplicateTopics(candidateTopics, existingPosts);
    if (viableCandidates.length > 0) {
        return viableCandidates[0];
    }

    // 2. Si no hay candidatos viables de YouTube, recurrir al banco de contingencia
    const viableFallbacks = filterDuplicateTopics(fallbackPool, existingPosts);
    if (viableFallbacks.length > 0) {
        return {
            ...viableFallbacks[0],
            source: 'contingency_pool'
        };
    }

    // 3. Fallback de emergencia último recurso
    return {
        title: "Guía de Presupuestos y Sistemas Constructivos en Santiago de Chile 2026",
        category: "Precios & Cotización",
        source: 'contingency_pool'
    };
}

/**
 * Selección jerárquica multi-fuente (Spec 019):
 * 1. YouTube -> 2. RSS Arquitectura -> 3. Catálogo Evergreen -> 4. Contingency Pool -> 5. Fallback Emergencia
 */
function selectNextTopicMultiSource({ youtubeTopics = [], rssTopics = [], evergreenTopics = [], existingPosts = [] } = {}) {
    // 1. Fuente 1: YouTube
    const viableYouTube = filterDuplicateTopics(youtubeTopics || [], existingPosts);
    if (viableYouTube.length > 0) {
        return {
            ...viableYouTube[0],
            source: viableYouTube[0].source || 'youtube'
        };
    }

    // 2. Fuente 2: RSS Arquitectura
    const viableRss = filterDuplicateTopics(rssTopics || [], existingPosts);
    if (viableRss.length > 0) {
        return {
            ...viableRss[0],
            source: viableRss[0].source || 'architecture_rss'
        };
    }

    // 3. Fuente 3: Catálogo Evergreen
    let unusedEvergreen = (evergreenTopics || []).filter(t => !t.used);
    if (unusedEvergreen.length === 0 && (evergreenTopics || []).length > 0) {
        // Reset cíclico: ordenar por lastUsedDate más antiguo
        unusedEvergreen = [...evergreenTopics].sort((a, b) => (a.lastUsedDate || '').localeCompare(b.lastUsedDate || ''));
    }
    const viableEvergreen = filterDuplicateTopics(unusedEvergreen, existingPosts);
    if (viableEvergreen.length > 0) {
        return {
            ...viableEvergreen[0],
            source: 'evergreen_catalog'
        };
    }

    // 4. Contingency Topic Pool (fallback)
    const viableFallbacks = filterDuplicateTopics(CONTINGENCY_TOPIC_POOL, existingPosts);
    if (viableFallbacks.length > 0) {
        return {
            ...viableFallbacks[0],
            source: 'contingency_pool'
        };
    }

    // 5. Fallback de emergencia último recurso
    return {
        title: "Guía de Presupuestos y Sistemas Constructivos en Santiago de Chile 2026",
        category: "Precios & Cotización",
        source: 'contingency_pool'
    };
}

/**
 * Inyecta el SSOT estricto de Cuatropuntas en el prompt para Google Gemini
 */
function buildGeminiPrompt(topicData) {
    return `Actúa como el Ingeniero Civil y Arquitecto Jefe de Constructora Cuatropuntas SpA en Santiago de Chile.

Debes redactar un artículo técnico, pedagógico y comercial exhaustivo para el blog oficial de la empresa basado en el siguiente tema:
TEMA: "${topicData.title}"

=== AUDIENCIA Y ENFOQUE EDITORIAL B2C (DUEÑOS DE CASA) ===
- Audiencia 100% B2C: El contenido está dirigido a dueños de casa, familias y propietarios de viviendas en la Región Metropolitana de Santiago, no a contratistas ni empresas constructoras.
- Redacción ágil, entretenida y de alto valor: Debes elevar el nivel de conciencia del lector desde el problema cotidiano que vive en su hogar hacia una solución constructiva inteligente y duradera.
- Desmitificación y claridad: Derribar mitos populares de construcción y evitar jerga técnica pesada o academicismos innecesarios. Explicar siempre el "por qué" y el beneficio tangible para la habitabilidad y el patrimonio familiar. Cero relleno y cero clichés de IA ("En resumen", "un tapiz de", etc.).

=== DIRECTRICES INVIOLABLES DE NEGOCIO Y SSOT (AGENTS.md) ===
1. Vocabulario y contexto técnico chileno:
   - Normativa: OGUC (Ordenanza General de Urbanismo y Construcciones), DOM (Dirección de Obras Municipales), Serviu, SEC TE1, recepción final/definitiva.
   - Términos constructivos: Radier de hormigón H-20/H-25 con polietileno 0.2mm, perfiles de acero galvanizado Metalcom (Cintac), paneles SIP con núcleo EPS de alta densidad, albañilería confinada/armada, aislación térmica Zona 3 RM (NCh853), ventanas termopanel herméticas.
2. Matriz Oficial de Precios (Valores netos +IVA en UF y UF/m²):
   - Casas Nuevas (1 Piso): Metalcom desde 19 UF/m², SIP desde 21 UF/m², Albañilería desde 25 UF/m².
   - Segundos Pisos y Ampliaciones: Metalcom desde 22 UF/m², SIP desde 24 UF/m², Albañilería desde 27 UF/m².
   - Quinchos de Alto Estándar: Metalcom desde 12 UF/m², Albañilería desde 15 UF/m².
   - Remodelaciones Integrales (>25 m²): desde 11 a 13 UF/m². Baños completos cerrados: 65 a 95 UF. Cocinas integrales: 90 a 160 UF.
3. Ecosistema Oficial de Telefonía y Canales:
   - WhatsApp Oficial: +56 9 2738 4075 (enlace: https://wa.me/56927384075).
   - Agendamiento Oficial: https://cal.com/cuatropuntas.com/visita-tecnica.
   - NÚMERO ESTRICTAMENTE PROHIBIDO: Queda terminantemente prohibido mencionar el número obsoleto 63482439.
4. Doble Llamado a la Acción (CTA de Cierre Obligatorio):
   Todo artículo debe rematar al final con la siguiente sección obligatoria de conversión en dos pasos:
   ### ¿Listo para dar el siguiente paso en tu proyecto?
   - **Paso 1 (Cotización):** Genera tu presupuesto preliminar en nuestro cotizador web: https://www.cuatropuntas.com/#cotizador
   - **Paso 2 (Agendamiento):** Agenda tu evaluación técnica presencial en terreno con nuestros profesionales: https://cal.com/cuatropuntas.com/visita-tecnica

=== FORMATO DE SALIDA OBLIGATORIO ===
Entrega ÚNICAMENTE un documento Markdown válido que comience directamente con el bloque de Frontmatter YAML entre delimitadores '---', sin rodearlo de comillas invertidas (\`\`\`markdown):

---
title: "[Título atractivo y optimizado para SEO]"
slug: "[slug-en-kebab-case-sin-tildes]"
excerpt: "[Resumen pedagógico de 1 a 2 oraciones para Google]"
category: "[Una de: Casas Nuevas | Segundos Pisos & Ampliaciones | Remodelaciones | Quinchos | Precios & Cotización | Guías Prácticas | Materiales & Sistemas]"
date: "${new Date().toISOString().split('T')[0]}"
author: "Equipo Técnico Cuatropuntas"
image: "/blog/images/[slug].webp"
readTime: "7 min de lectura"
tags:
  - [Tag 1]
  - [Tag 2]
  - [Tag 3]
  - [Tag 4]
faq:
  - question: "¿[Pregunta técnica frecuente 1]?"
    answer: "[Respuesta técnica clara de 2-3 oraciones]"
  - question: "¿[Pregunta técnica frecuente 2]?"
    answer: "[Respuesta técnica clara de 2-3 oraciones]"
---

## [Sección 1 con análisis técnico profundo y pedagógico]
[Contenido en párrafos y listas]

## [Sección 2 con comparativa técnica y costos]
A continuación presentamos una tabla comparativa de valores referenciales en Santiago:

| Sistema Constructivo | Costo Base (UF/m²) | Plazo Estimado | Desempeño Térmico y Sísmico |
| :--- | :--- | :--- | :--- |
| Metalcom Estructural | Desde 19 UF/m² | 3 a 4 meses | [Detalle] |
| Panel SIP | Desde 21 UF/m² | 3 a 5 meses | [Detalle] |
| Albañilería Armada | Desde 25 UF/m² | 5 a 7 meses | [Detalle] |

> **Regla técnica de obra:** [Consejo clave sobre normativa DOM o ejecución de fundaciones/techumbres]

## [Sección 3 con recomendaciones para propietarios en Santiago]
[Contenido consultivo y pedagógico]

## ¿Listo para dar el siguiente paso en tu proyecto?
Planificar con certeza técnica y financiera es la clave de una obra sin sobresaltos:
1. **Cotiza en línea:** Estima los costos preliminares de tu obra en nuestro [cotizador en línea](https://www.cuatropuntas.com/#cotizador).
2. **Agenda en terreno:** Coordina una [visita técnica presencial](https://cal.com/cuatropuntas.com/visita-tecnica) con nuestro equipo de ingeniería y arquitectura.
`;
}

/**
 * Genera el artículo completo utilizando el SDK de Google Gemini
 */
async function generatePostWithGemini(topicData, options = {}) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        if (options.dryRun) {
            console.log('ℹ️ [DRY RUN] Sin API Key configurada. Generando borrador simulado...');
            const slug = (topicData.title || 'post-simulado')
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

            return `---
title: "${topicData.title}"
slug: "${slug}"
excerpt: "Guía técnica sobre ${topicData.title} para propietarios y constructoras en Santiago de Chile."
category: "${topicData.category || 'Materiales & Sistemas'}"
date: "${new Date().toISOString().split('T')[0]}"
author: "Equipo Técnico Cuatropuntas"
image: "/blog/images/${slug}.webp"
readTime: "7 min de lectura"
tags:
  - Construcción Santiago
  - Precios UF m2
  - Metalcom
  - Normativa OGUC
faq:
  - question: "¿Por qué es clave considerar este factor en Santiago?"
    answer: "Porque la amplitud térmica de la Zona 3 y las normas de la DOM exigen aislamiento y resistencia estructural certificada."
  - question: "¿Cómo se cotiza este tipo de obras en Cuatropuntas?"
    answer: "Las obras se cotizan con valores netos desde 19 UF/m² en Metalcom y 25 UF/m² en albañilería."
---

## Análisis técnico de ${topicData.title}

Explicación detallada del proyecto según la normativa chilena vigente.

| Sistema Constructivo | Costo Base (UF/m²) | Plazo Estimado |
| :--- | :--- | :--- |
| Metalcom Estructural | Desde 19 UF/m² | 3 a 4 meses |
| Panel SIP | Desde 21 UF/m² | 3 a 5 meses |
| Albañilería Armada | Desde 25 UF/m² | 5 a 7 meses |

> **Regla técnica de obra:** Siempre verificar el Permiso de Edificación en la DOM correspondiente.

## ¿Listo para dar el siguiente paso en tu proyecto?

1. **Cotiza en línea:** Estima los costos preliminares de tu obra en nuestro [cotizador en línea](https://www.cuatropuntas.com/#cotizador).
2. **Agenda en terreno:** Coordina una [visita técnica presencial](https://cal.com/cuatropuntas.com/visita-tecnica) con nuestro equipo de ingeniería y arquitectura.
`;
        }
        throw new Error('No se encontró GOOGLE_GENERATIVE_AI_API_KEY ni GEMINI_API_KEY en variables de entorno');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = buildGeminiPrompt(topicData);

    // Auto-descubrimiento o fallback de modelo
    let modelName = 'gemini-3.5-flash-lite';
    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const listResp = await fetch(listUrl);
        const listData = await listResp.json();
        if (listData && listData.models) {
            const viable = listData.models.find(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes('generateContent') &&
                (m.name.includes('flash-lite') || m.name.includes('3.5-flash') || m.name.includes('3.6-flash'))
            );
            if (viable) {
                modelName = viable.name.replace('models/', '');
            }
        }
    } catch (e) {
        // Usar default
    }

    // Reintento con modelos alternativos ante 503/429
    const candidateModels = [modelName, 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-2.5-flash'].filter((v, i, a) => a.indexOf(v) === i);
    let result = null;
    let lastError = null;

    for (const currentModel of candidateModels) {
        try {
            console.log(`🤖 Generando artículo con Gemini (${currentModel})...`);
            const model = genAI.getGenerativeModel({ model: currentModel });
            result = await model.generateContent(prompt);
            if (result && result.response) break;
        } catch (err) {
            console.warn(`⚠️ [GEMINI RETRY] Modelo ${currentModel} ocupado (${err.message}). Probando alternativa...`);
            lastError = err;
        }
    }

    if (!result || !result.response) {
        throw lastError || new Error('Fallo al generar artículo con modelos Gemini');
    }

    let text = result.response.text();

    // Limpiar bloques de código markdown si los incluyó
    text = text.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    return sanitizeContent(text);
}

/**
 * Pipeline principal de Curaduría, Generación y Publicación Autónoma
 */
async function autoCurateAndPublish(options = {}) {
    console.log('🚀 [PILOTO AUTOMÁTICO] Iniciando ciclo editorial de Cuatropuntas...');

    // 1. Cargar posts existentes
    let existingPosts = [];
    if (fs.existsSync(POSTS_JSON_PATH)) {
        try {
            existingPosts = JSON.parse(fs.readFileSync(POSTS_JSON_PATH, 'utf8'));
        } catch (e) {
            existingPosts = [];
        }
    }

    // 2. Selección de Tema
    let selectedTopic = null;

    if (options.forceTopic) {
        console.log(`🎯 Tema forzado por parámetro: "${options.forceTopic}"`);
        selectedTopic = {
            title: options.forceTopic,
            category: "Materiales & Sistemas",
            source: 'manual_override'
        };
    } else {
        console.log(`📡 Consultando cascada multi-fuente de curaduría...`);

        // Fuente 1: YouTube
        console.log(`   1. Consultando feed RSS de YouTube (@ConstruirSimple)...`);
        const ytXml = await fetchYouTubeRssFeed(YOUTUBE_CHANNEL_ID);
        const youtubeTopics = extractViableTopics(ytXml);
        console.log(`      Se extrajeron ${youtubeTopics.length} temas candidatos viables de YouTube.`);

        // Fuente 2: RSS Arquitectura
        console.log(`   2. Consultando feed RSS de Arquitectura Chilena...`);
        const rssXml = await fetchArchitectureRssFeed(ARCHITECTURE_RSS_URL);
        const rssTopics = extractArchitectureTopics(rssXml);
        console.log(`      Se extrajeron ${rssTopics.length} temas candidatos viables de Arquitectura.`);

        // Fuente 3: Catálogo Evergreen
        console.log(`   3. Cargando catálogo evergreen local...`);
        const evergreenTopics = loadEvergreenCatalog(EVERGREEN_CATALOG_PATH);
        console.log(`      Se cargaron ${evergreenTopics.length} temas del catálogo evergreen.`);

        selectedTopic = selectNextTopicMultiSource({
            youtubeTopics,
            rssTopics,
            evergreenTopics,
            existingPosts
        });
        console.log(`✅ Tema seleccionado (${selectedTopic.source}): "${selectedTopic.title}"`);
    }

    // 3. Generación con Gemini
    let markdownContent = await generatePostWithGemini(selectedTopic, options);

    // Extraer slug del frontmatter para nombrar el archivo borrador
    const slugMatch = markdownContent.match(/slug:\s*["']?([^"'\n\r]+)["']?/);
    const slug = slugMatch ? slugMatch[1].trim() : `post-${Date.now()}`;

    // 3.5. Generar o procesar portada visual WebP única (Spec 012)
    const coverResult = await generateBlogCover(selectedTopic, slug, options);
    const coverPath = coverResult.imagePath || `/blog/images/${slug}.webp`;

    // Sincronizar campo 'image' en el Frontmatter
    if (/^image:\s*.+$/m.test(markdownContent)) {
        markdownContent = markdownContent.replace(/^image:\s*.+$/m, `image: "${coverPath}"`);
    } else {
        markdownContent = markdownContent.replace(/^slug:\s*.+$/m, `$&\nimage: "${coverPath}"`);
    }

    // 4. Guardar borrador en content/drafts
    if (!fs.existsSync(DRAFTS_DIR)) {
        fs.mkdirSync(DRAFTS_DIR, { recursive: true });
    }
    const draftPath = path.join(DRAFTS_DIR, `${slug}.md`);
    fs.writeFileSync(draftPath, markdownContent, 'utf8');
    console.log(`📝 Borrador guardado en: ${draftPath}`);

    // 5. Compilar y publicar si no es dry-run
    if (options.dryRun) {
        console.log('🔍 [DRY RUN] Simulación exitosa. No se modificaron catálogos ni archivos públicos.');
        return {
            success: true,
            dryRun: true,
            slug,
            image: coverPath,
            draftPath,
            topic: selectedTopic
        };
    }

    const { parseMarkdownWithFrontmatter } = require('./publish-blog');
    const { metadata, content } = parseMarkdownWithFrontmatter(markdownContent);
    const publishResult = compileAndPublishPost({ ...metadata, image: coverPath, content });

    // Marcar tema evergreen como utilizado si proviene del catálogo
    if (selectedTopic && selectedTopic.id) {
        markEvergreenTopicAsUsed(EVERGREEN_CATALOG_PATH, selectedTopic.id);
        console.log(`📌 Tema evergreen "${selectedTopic.id}" marcado como utilizado.`);
    }

    console.log(`🎉 [PUBLICACIÓN EXITOSA]`);
    console.log(`   Slug: ${publishResult.slug}`);
    console.log(`   URL:  ${publishResult.url}`);
    console.log(`   Ruta: ${publishResult.filePath}`);

    return {
        success: true,
        dryRun: false,
        slug: publishResult.slug,
        url: publishResult.url,
        filePath: publishResult.filePath,
        topic: selectedTopic
    };
}

// Ejecución CLI directa
if (require.main === module) {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const forceTopicArg = args.find(a => a.startsWith('--force-topic='));
    const forceTopic = forceTopicArg ? forceTopicArg.replace('--force-topic=', '').replace(/^["']|["']$/g, '') : null;

    autoCurateAndPublish({ dryRun: isDryRun, forceTopic })
        .then(res => {
            process.exit(0);
        })
        .catch(err => {
            console.error(`❌ [ERROR CRON]: ${err.message}`);
            process.exit(1);
        });
}

module.exports = {
    fetchYouTubeRssFeed,
    fetchArchitectureRssFeed,
    extractViableTopics,
    extractArchitectureTopics,
    loadEvergreenCatalog,
    markEvergreenTopicAsUsed,
    filterDuplicateTopics,
    selectNextTopic,
    selectNextTopicMultiSource,
    buildGeminiPrompt,
    generatePostWithGemini,
    autoCurateAndPublish,
    CONTINGENCY_TOPIC_POOL,
    EVERGREEN_CATALOG_PATH,
    ARCHITECTURE_RSS_URL,
    YOUTUBE_CHANNEL_ID
};
