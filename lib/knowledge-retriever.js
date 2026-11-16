/**
 * lib/knowledge-retriever.js
 *
 * Capa 2 (Mini-RAG Local Determinista) y Capa 3 (Tool Interna de Cálculo Paramétrico).
 * Carga y memoiza en memoria a 0 ms de red:
 * - Artículos reales de public/blog/posts.json
 * - Catálogo oficial de Guías PDF DOM desde api/_leadMagnet.js
 * - Motor paramétrico SSOT y notas de alcance desde api/quote.js
 */

const fs = require('fs');
const path = require('path');
const {
    calculateQuote,
    getPermisosData,
    resolveCommercialLabels
} = require('../api/quote');
const { GUIDES } = require('../api/_leadMagnet');

const POSTS_PATH = path.join(__dirname, '..', 'public', 'blog', 'posts.json');
const GUIAS_PORTAL_URL = 'https://www.cuatropuntas.com/#guias-dom';
const COTIZADOR_URL = 'https://www.cuatropuntas.com/#cotizador';

let cachedPosts = null;

const RM_COMUNAS_LOOKUP = [
    'las condes', 'vitacura', 'lo barnechea', 'la reina', 'providencia',
    'colina', 'chicureo', 'piedra roja', 'chamisero',
    'buin', 'paine', 'calera de tango', 'talagante', 'penaflor', 'peñaflor',
    'isla de maipo', 'el monte', 'padre hurtado', 'melipilla', 'curacavi', 'curacaví',
    'lampa', 'tiltil', 'pirque',
    'puente alto', 'la florida', 'nunoa', 'ñuñoa', 'macul', 'penalolen', 'peñalolén',
    'santiago', 'santiago centro', 'maipu', 'maipú', 'san bernardo', 'san miguel',
    'la cisterna', 'huechuraba', 'quilicura', 'pudahuel', 'estacion central', 'independencia',
    'recoleta', 'la pintana', 'el bosque', 'san joaquin', 'san ramon', 'la granja', 'cerrillos',
    'lo prado', 'quinta normal', 'renca', 'conchali', 'cerro navia', 'pedro aguirre cerda',
    'lo espejo', 'san jose de maipo', 'alhue', 'maria pinto', 'san pedro'
];

const STOPWORDS = new Set([
    'para', 'como', 'cómo', 'cual', 'cuál', 'cuanto', 'cuánto', 'cuesta', 'vale', 'sale',
    'quiero', 'tengo', 'necesito', 'sobre', 'entre', 'desde', 'hasta', 'esta', 'este',
    'una', 'unos', 'unas', 'los', 'las', 'del', 'con', 'por', 'que', 'qué', 'casa',
    'construir', 'hacer', 'proyecto', 'obra', 'santiago', 'chile', 'hola', 'buenas'
]);

/**
 * Normaliza texto para matching determinista sin tildes
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Carga y memoiza los artículos publicados del blog desde public/blog/posts.json
 * @returns {Array<Object>}
 */
function loadBlogPosts() {
    if (cachedPosts) return cachedPosts;
    try {
        if (fs.existsSync(POSTS_PATH)) {
            const parsed = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));
            cachedPosts = Array.isArray(parsed) ? parsed : [];
            return cachedPosts;
        }
    } catch (err) {
        console.warn('⚠️ [KNOWLEDGE RETRIEVER] No se pudo cargar posts.json:', err.message);
    }
    cachedPosts = [];
    return cachedPosts;
}

/**
 * Permite invalidar el caché de posts (útil en tests o tras compilación de blog)
 */
function clearKnowledgeCache() {
    cachedPosts = null;
}

/**
 * Retorna el catálogo oficial de Guías Técnicas DOM desde api/_leadMagnet.js
 * @returns {Array<Object>}
 */
function getLeadMagnetGuides() {
    return Object.values(GUIDES || {}).map((g) => ({
        id: g.id,
        title: g.title,
        filename: g.filename,
        downloadUrl: `https://www.cuatropuntas.com${g.downloadUrl}`,
        portalUrl: GUIAS_PORTAL_URL
    }));
}

/**
 * Recupera contexto dinámico relevante (artículos del blog, guías DOM y notas de alcance)
 * a partir de la consulta del usuario. Operación local en memoria (0 ms de red).
 * @param {string} userQuery
 * @param {number} maxArticles
 * @returns {{ articles: Array<Object>, guides: Array<Object>, scopeNotes: Array<string>, promptContext: string }}
 */
function retrieveRelevantContext(userQuery, maxArticles = 2) {
    const queryNorm = normalizeText(userQuery);
    const tokens = queryNorm
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

    const posts = loadBlogPosts();
    const scoredPosts = posts.map((post) => {
        const titleNorm = normalizeText(post.title);
        const excerptNorm = normalizeText(post.excerpt);
        const catNorm = normalizeText(post.category);
        const tagsNorm = normalizeText((post.tags || []).join(' '));
        let score = 0;

        for (const tok of tokens) {
            if (titleNorm.includes(tok)) score += 4;
            if (tagsNorm.includes(tok)) score += 3;
            if (catNorm.includes(tok)) score += 2;
            if (excerptNorm.includes(tok)) score += 1;
        }

        return { post, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxArticles);

    const articles = scoredPosts.map(({ post }) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        category: post.category,
        excerpt: post.excerpt,
        url: `https://www.cuatropuntas.com/blog/posts/${post.slug}`
    }));

    const isDomQuery = /\b(dom|permiso|edificacion|recepcion|municipal|regulariz|carpeta|cip|sec|planos|checklist|guia|pdf)\b/.test(queryNorm);
    const allGuides = getLeadMagnetGuides();
    const guides = isDomQuery ? allGuides : [];

    const scopeNotes = [];
    if (/\b(quincho|terraza|parrilla|asador)\b/.test(queryNorm)) {
        scopeNotes.push('Quincho base incluye cobertizo/techumbre, radier afinado, parrilla refractaria en obra con manivela elevable, campana con tiraje y mesón lateral básico; excluye redes sanitarias, canalización eléctrica y muebles cerrados bajo mesón.');
    }
    if (/\b(bano|baño|cocina|remodel)\b/.test(queryNorm)) {
        scopeNotes.push('Baño Completo (65-95 UF +IVA) y Cocina Integral (90-160 UF +IVA) no se cotizan por m² lineal por densidad de redes sanitarias y eléctricas.');
    }
    if (isDomQuery) {
        scopeNotes.push(`Guías técnicas DOM gratuitas disponibles para descarga con email en ${GUIAS_PORTAL_URL}`);
    }

    const lines = [];
    if (articles.length > 0) {
        lines.push('Artículos técnicos del blog relacionados:');
        for (const a of articles) {
            lines.push(`- "${a.title}" (${a.url}): ${a.excerpt}`);
        }
    }
    if (guides.length > 0) {
        lines.push(`Guías PDF DOM gratuitas (descarga vía Email-Gate en ${GUIAS_PORTAL_URL}):`);
        for (const g of guides) {
            lines.push(`- ${g.title} (${g.downloadUrl})`);
        }
    }
    if (scopeNotes.length > 0) {
        lines.push('Notas técnicas aplicables:');
        for (const n of scopeNotes) {
            lines.push(`- ${n}`);
        }
    }

    return {
        articles,
        guides,
        scopeNotes,
        promptContext: lines.join('\n')
    };
}

/**
 * Extrae parámetros de proyecto desde texto libre del usuario.
 * @param {string} rawText
 * @returns {Object}
 */
function parseProjectParamsFromText(rawText) {
    const text = String(rawText || '');
    const norm = normalizeText(text);

    const areaMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metros?\s*cuadrados?|mts2?)/i);
    const area = areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : 0;

    let tipo = 'Casa Nueva';
    if (/\b(quincho|terraza|asador|parrilla)\b/.test(norm)) {
        tipo = 'Quincho';
    } else if (/\b(remodela|bano|cocina)\b/.test(norm)) {
        tipo = 'Remodelacion';
    } else if (/\b(segundo\s*piso|2do\s*piso|2°\s*piso|ampliacion|ampliar|sobreelevacion)\b/.test(norm)) {
        tipo = 'Ampliacion';
    }

    const pisos = /\b(segundo\s*piso|2do\s*piso|2°\s*piso|2\s*pisos|dos\s*pisos)\b/.test(norm) ? 2 : 1;

    let sistema = 'Metalcon';
    if (/\b(sip|covintec|panel)\b/.test(norm)) {
        sistema = 'SIP';
    } else if (/\b(albanileria|ladrillo|hormigon|solida|solido)\b/.test(norm)) {
        sistema = 'Albanileria';
    } else if (/\bmixt[oa]\b/.test(norm)) {
        sistema = 'Mixto';
    }

    let permisos = 'Idea';
    if (/\b(permiso\s*(?:dom\s*)?aprobado|ya\s*tengo\s*permiso|con\s*permiso\s*municipal)\b/.test(norm)) {
        permisos = 'PermisoAprobado';
    } else if (/\b(arquitecto\s*propio|tengo\s*arquitecto)\b/.test(norm)) {
        permisos = 'ArquitectoPropio';
    } else if (/\b(tengo\s*(?:los\s*)?planos|con\s*planos|planos\s*listos)\b/.test(norm)) {
        permisos = 'Planos';
    }

    let comuna = '';
    for (const candidate of RM_COMUNAS_LOOKUP) {
        const candNorm = normalizeText(candidate);
        if (norm.includes(candNorm)) {
            comuna = candidate;
            break;
        }
    }

    let espacios_remodelar = '';
    if (tipo === 'Remodelacion') {
        const parts = [];
        if (/\bbano\b/.test(norm)) parts.push('Baño');
        if (/\bcocina\b/.test(norm)) parts.push('Cocina');
        if (/\b(living|comedor|dormitorio|pieza|casa|departamento|depto)\b/.test(norm)) parts.push('Recintos secos');
        espacios_remodelar = parts.join(' y ');
    }

    return { tipo, sistema, area, pisos, comuna, permisos, espacios_remodelar };
}

/**
 * Tool Interna Segura: ejecuta calculateQuote() de api/quote.js y retorna
 * el rango referencial neto (+IVA) SIN exponer multiplicadores internos ni anillos.
 * @param {string|Object} input
 * @returns {Object}
 */
function executeParametricQuoteTool(input) {
    const params = typeof input === 'string'
        ? parseProjectParamsFromText(input)
        : (input && typeof input === 'object' ? {
            ...parseProjectParamsFromText(input.text || ''),
            ...input
        } : {});

    const areaNum = parseFloat(params.area) || 0;
    const isRemod = String(params.tipo || '').toLowerCase().includes('remodela');
    const minArea = isRemod ? 3 : 10;

    if (areaNum < minArea || areaNum > 5000) {
        return {
            calculated: false,
            reason: 'INSUFFICIENT_AREA_PARAMETERS',
            cotizadorUrl: COTIZADOR_URL
        };
    }

    const quote = calculateQuote({
        tipo: params.tipo || 'Casa Nueva',
        sistema: params.sistema || 'Metalcon',
        area: areaNum,
        pisos: params.pisos || 1,
        terminaciones: params.terminaciones || 'Estandar',
        comuna: params.comuna || '',
        permisos: params.permisos || 'Idea',
        espacios_remodelar: params.espacios_remodelar || ''
    });

    const permisosData = quote.permisosData || getPermisosData(params.permisos || 'Idea', params.tipo || 'Casa Nueva');
    const commercial = quote.commercial || resolveCommercialLabels(params);

    return {
        calculated: true,
        tipoComercial: commercial.tipoComercial,
        sistemaComercial: commercial.sistemaComercial,
        proyectoResumen: commercial.proyectoResumen,
        areaNum: quote.areaNum,
        comunaHuman: params.comuna ? quote.comunaHuman : 'Región Metropolitana (referencia base)',
        minUF: quote.minUF,
        maxUF: quote.maxUF,
        minUF_raw: quote.minUF_raw,
        maxUF_raw: quote.maxUF_raw,
        permisosLabel: permisosData.label,
        gestionPdf: permisosData.gestionPdf,
        notasAlcance: quote.notasAlcance || [],
        notaTerritorial: quote.factorComuna > 1
            ? 'Los valores del presupuesto son estimativos y calculados en base al tipo de obra, tipo de terreno, valor de suelo y lejanía de la urbe de Santiago.'
            : 'Valores estimativos netos (+IVA) sujetos a evaluación técnica en terreno.',
        cotizadorUrl: COTIZADOR_URL
    };
}

module.exports = {
    loadBlogPosts,
    clearKnowledgeCache,
    getLeadMagnetGuides,
    retrieveRelevantContext,
    parseProjectParamsFromText,
    executeParametricQuoteTool,
    GUIAS_PORTAL_URL,
    COTIZADOR_URL
};
