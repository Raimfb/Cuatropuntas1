/**
 * scripts/publish-blog.js
 * Constructora Cuatropuntas SpA
 * Pipeline y Motor Automatizado de Publicación del Blog (Spec 003)
 *
 * Puede ser ejecutado por CLI: node scripts/publish-blog.js <archivo.md>
 * O importado como módulo: const { compileAndPublishPost } = require('./publish-blog');
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const BLOG_POSTS_DIR = path.join(PUBLIC_DIR, 'blog', 'posts');
const POSTS_JSON_PATH = path.join(PUBLIC_DIR, 'blog', 'posts.json');
const BLOG_INDEX_PATH = path.join(PUBLIC_DIR, 'blog', 'index.html');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');

// SSOT Oficial
const OFFICIAL_PHONE = '+56 9 2738 4075';
const OFFICIAL_PHONE_E164 = '56927384075';
const PURGED_PHONE = '63482439';
const CAL_URL = 'https://cal.com/cuatropuntas.com/visita-tecnica';

// Mapeo canónico de imágenes por categoría
const CATEGORY_DEFAULT_IMAGES = {
    'casas-nuevas': '/blog_precios_construccion.jpg',
    'casas nuevas': '/blog_precios_construccion.jpg',
    'precios & cotización': '/blog_precios_construccion.jpg',
    'precios y cotización': '/blog_precios_construccion.jpg',
    'precios & remodelaciones': '/blog_remodelacion_bano_cocina.jpg',
    'precios y remodelaciones': '/blog_remodelacion_bano_cocina.jpg',
    'segundos pisos': '/blog_regularizar_ampliacion.jpg',
    'segundos-pisos': '/blog_regularizar_ampliacion.jpg',
    'ampliaciones': '/blog_regularizar_ampliacion.jpg',
    'guías prácticas': '/blog_consejos_construir.jpg',
    'guias practicas': '/blog_consejos_construir.jpg',
    'materiales & sistemas': '/blog_comparativa_sistemas.jpg',
    'materiales y sistemas': '/blog_comparativa_sistemas.jpg',
    'remodelaciones': '/blog_remodelacion_bano_cocina.jpg',
    'quinchos': '/quincho_premium_chile_1770071485791.webp'
};

/**
 * Resuelve la imagen canónica según la categoría
 */
function resolveCategoryImage(category) {
    if (!category) return '/blog_precios_construccion.jpg';
    const key = category.trim().toLowerCase();
    return CATEGORY_DEFAULT_IMAGES[key] || '/blog_precios_construccion.jpg';
}

/**
 * Formatea fechas YYYY-MM-DD a formato legible "8 Sep 2026"
 */
function formatDateSpanish(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1] || parts[1];
    const year = parts[0];
    return `${day} ${month} ${year}`;
}

/**
 * Formatea fechas a formato extenso "8 de Septiembre, 2026"
 */
function formatDateFullSpanish(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1] || parts[1];
    const year = parts[0];
    return `${day} de ${month}, ${year}`;
}

/**
 * Sanitiza textos para remover números purgados y clichés de IA
 */
function sanitizeContent(text) {
    if (!text) return '';
    let sanitized = text;
    if (sanitized.includes(PURGED_PHONE)) {
        sanitized = sanitized.replace(new RegExp(`(\\+?56\\s*9\\s*)?${PURGED_PHONE}`, 'g'), OFFICIAL_PHONE);
    }
    return sanitized;
}

/**
 * Parser liviano y nativo de Frontmatter YAML
 */
function parseMarkdownWithFrontmatter(rawContent) {
    const normalized = rawContent.replace(/\r\n/g, '\n');
    const fmRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = normalized.match(fmRegex);

    if (!match) {
        return {
            metadata: {},
            content: normalized.trim()
        };
    }

    const yamlBlock = match[1];
    const content = match[2].trim();
    const metadata = {};

    const lines = yamlBlock.split('\n');
    let currentKey = null;
    let currentArray = null;
    let currentObj = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Elemento de lista en array simple o de objetos
        if (line.startsWith('  - ') || line.startsWith('- ')) {
            const itemText = line.replace(/^\s*-\s*/, '').trim();

            // ¿Es inicio de objeto con question? (como en faqs)
            if (itemText.startsWith('question:')) {
                currentObj = {};
                const qVal = itemText.replace(/^question:\s*/, '').replace(/^["']|["']$/g, '');
                currentObj.question = qVal;
                if (!currentArray) {
                    currentArray = [];
                    metadata[currentKey] = currentArray;
                }
                currentArray.push(currentObj);
                continue;
            } else if (itemText.startsWith('answer:')) {
                const aVal = itemText.replace(/^answer:\s*/, '').replace(/^["']|["']$/g, '');
                if (currentObj) {
                    currentObj.answer = aVal;
                }
                continue;
            }

            if (currentKey) {
                if (!Array.isArray(metadata[currentKey])) {
                    metadata[currentKey] = [];
                }
                metadata[currentKey].push(itemText.replace(/^["']|["']$/g, ''));
            }
            continue;
        }

        // Sub-propiedad de objeto (ej: answer indentado)
        if (line.startsWith('    answer:') || line.startsWith('   answer:')) {
            const aVal = trimmed.replace(/^answer:\s*/, '').replace(/^["']|["']$/g, '');
            if (currentObj) {
                currentObj.answer = aVal;
            }
            continue;
        }

        // Clave - valor normal
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
            const key = line.slice(0, colonIdx).trim();
            let val = line.slice(colonIdx + 1).trim();

            currentKey = key;
            currentObj = null;

            if (val === '') {
                // Posible lista o bloque siguiente
                metadata[key] = [];
                currentArray = metadata[key];
            } else {
                // Limpiar comillas
                val = val.replace(/^["']|["']$/g, '');
                metadata[key] = val;
                currentArray = null;
            }
        }
    }

    return { metadata, content };
}

/**
 * Parser nativo de Markdown a Tailwind HTML optimizado
 */
function convertMarkdownToHtml(markdown) {
    const lines = markdown.split('\n');
    let html = '';
    let inList = false;
    let listType = null; // 'ul' | 'ol'
    let inTable = false;
    let tableRows = [];
    let inSection = false;

    function closeList() {
        if (inList) {
            html += `</${listType}>\n`;
            inList = false;
            listType = null;
        }
    }

    function closeTable() {
        if (inTable && tableRows.length > 0) {
            html += renderTable(tableRows);
            tableRows = [];
            inTable = false;
        }
    }

    function closeSection() {
        if (inSection) {
            html += `</section>\n\n`;
            inSection = false;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const line = rawLine.trim();

        // 1. Líneas vacías
        if (!line) {
            closeList();
            closeTable();
            continue;
        }

        // 2. Tablas GFM (| col | col |)
        if (line.startsWith('|') && line.endsWith('|')) {
            closeList();
            // Ignorar separador |- - - | - - - |
            if (/^\|(\s*:?-+:?\s*\|)+$/.test(line)) {
                continue;
            }
            inTable = true;
            tableRows.push(line);
            continue;
        } else {
            closeTable();
        }

        // 3. Encabezados H2
        if (line.startsWith('## ')) {
            closeList();
            closeTable();
            closeSection();
            const headingText = line.replace(/^##\s+/, '');
            html += `<section class="space-y-4">\n    <h2 class="text-2xl font-bold text-primary border-l-4 border-secondary pl-4">${formatInline(headingText)}</h2>\n`;
            inSection = true;
            continue;
        }

        // 4. Encabezados H3
        if (line.startsWith('### ')) {
            closeList();
            closeTable();
            const headingText = line.replace(/^###\s+/, '');
            html += `    <h3 class="font-bold text-primary text-lg mb-2 mt-6">${formatInline(headingText)}</h3>\n`;
            continue;
        }

        // 5. Citas / Bloques destacados (> ...)
        if (line.startsWith('> ')) {
            closeList();
            closeTable();
            const quoteContent = line.replace(/^>\s*/, '');
            html += `    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg text-amber-900 text-base my-6">\n        ${formatInline(quoteContent)}\n    </div>\n`;
            continue;
        }

        // 6. Listas no ordenadas (- o *)
        if (/^[-*]\s+/.test(line)) {
            closeTable();
            if (!inList || listType !== 'ul') {
                closeList();
                html += `    <ul class="list-disc pl-6 space-y-2 text-base text-gray-700 my-4">\n`;
                inList = true;
                listType = 'ul';
            }
            const itemText = line.replace(/^[-*]\s+/, '');
            html += `        <li>${formatInline(itemText)}</li>\n`;
            continue;
        }

        // 7. Listas ordenadas (1. 2.)
        if (/^\d+\.\s+/.test(line)) {
            closeTable();
            if (!inList || listType !== 'ol') {
                closeList();
                html += `    <ol class="list-decimal pl-6 space-y-2 text-base text-gray-700 my-4">\n`;
                inList = true;
                listType = 'ol';
            }
            const itemText = line.replace(/^\d+\.\s+/, '');
            html += `        <li>${formatInline(itemText)}</li>\n`;
            continue;
        }

        // 8. Párrafo normal
        closeList();
        closeTable();
        html += `    <p class="text-gray-800 text-lg leading-relaxed">\n        ${formatInline(line)}\n    </p>\n`;
    }

    closeList();
    closeTable();
    closeSection();

    return html;
}

/**
 * Formateo inline: bold, italic, links, code
 */
function formatInline(text) {
    if (!text) return '';
    let result = text;

    // Código en línea `code`
    result = result.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-primary font-mono">$1</code>');

    // Negrita **bold** o __bold__
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Cursiva *italic* o _italic_
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Enlaces [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-secondary hover:underline">$1</a>');

    return result;
}

/**
 * Renderiza tabla GFM en HTML estructurado
 */
function renderTable(rows) {
    if (rows.length === 0) return '';
    const parseRow = (r) => r.split('|').map(c => c.trim()).filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1);

    const headers = parseRow(rows[0]);
    const bodyRows = rows.slice(1).map(parseRow);

    let html = `    <div class="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm my-6">\n`;
    html += `        <table class="w-full text-left border-collapse text-sm">\n`;
    html += `            <thead>\n                <tr class="bg-primary text-white">\n`;
    headers.forEach((h, idx) => {
        const alignClass = idx === headers.length - 1 ? 'text-right' : '';
        html += `                    <th class="py-3 px-4 font-semibold ${alignClass}">${formatInline(h)}</th>\n`;
    });
    html += `                </tr>\n            </thead>\n`;
    html += `            <tbody class="divide-y divide-gray-100">\n`;

    bodyRows.forEach(row => {
        html += `                <tr>\n`;
        row.forEach((cell, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === row.length - 1;
            const cellClass = isFirst ? 'font-medium text-gray-900' : isLast ? 'text-right font-bold text-primary' : 'text-gray-600';
            html += `                    <td class="py-3 px-4 ${cellClass}">${formatInline(cell)}</td>\n`;
        });
        html += `                </tr>\n`;
    });

    html += `            </tbody>\n        </table>\n    </div>\n`;
    return html;
}

/**
 * Renderiza sección de FAQs visuales
 */
function renderFaqSection(faqs) {
    if (!faqs || faqs.length === 0) return '';
    let html = `            <!-- FAQ Section -->\n`;
    html += `            <section class="bg-orange-50 p-6 md:p-8 rounded-2xl border border-orange-200 my-10 space-y-6">\n`;
    html += `                <h3 class="text-xl font-bold text-secondary flex items-center gap-2">\n`;
    html += `                    ❓ Preguntas Frecuentes\n`;
    html += `                </h3>\n`;
    html += `                <div class="space-y-4">\n`;

    faqs.forEach(f => {
        const q = f.question || f.q || '';
        const a = f.answer || f.a || '';
        html += `                    <div>\n`;
        html += `                        <h4 class="font-bold text-primary text-base">${q}</h4>\n`;
        html += `                        <p class="text-gray-700 text-sm leading-relaxed mt-1">${a}</p>\n`;
        html += `                    </div>\n`;
    });

    html += `                </div>\n            </section>\n`;
    return html;
}

/**
 * Construye el JSON-LD Schema.org (@graph con TechArticle y FAQPage)
 */
function buildSchemaJsonLd(postData) {
    const graph = [
        {
            "@type": "TechArticle",
            "@id": `https://www.cuatropuntas.com/blog/posts/${postData.slug}.html#article`,
            "headline": postData.title,
            "description": postData.excerpt,
            "author": {
                "@type": "Organization",
                "name": "Constructora Cuatropuntas SpA",
                "url": "https://www.cuatropuntas.com"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Constructora Cuatropuntas SpA",
                "logo": "https://www.cuatropuntas.com/logo_cuatropuntas.webp"
            },
            "datePublished": postData.date,
            "inLanguage": "es-CL"
        }
    ];

    if (postData.faq && postData.faq.length > 0) {
        graph.push({
            "@type": "FAQPage",
            "mainEntity": postData.faq.map(f => ({
                "@type": "Question",
                "name": f.question || f.q || '',
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": f.answer || f.a || ''
                }
            }))
        });
    }

    return JSON.stringify({
        "@context": "https://schema.org",
        "@graph": graph
    }, null, 4);
}

/**
 * Genera el documento HTML completo del post a partir de la plantilla canónica
 */
function generatePostHtml(postData, bodyHtml) {
    const dateFormattedFull = formatDateFullSpanish(postData.date);
    const schemaJson = buildSchemaJsonLd(postData);
    const faqHtml = renderFaqSection(postData.faq);
    const keywordsStr = (postData.tags && Array.isArray(postData.tags)) ? postData.tags.join(', ') : 'construccion chile, cuatropuntas';

    return `<!DOCTYPE html>
<html lang="es-CL" class="scroll-smooth">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- ===== SEO & GEO Metadata ===== -->
    <title>${postData.title} | Cuatropuntas</title>
    <meta name="description" content="${postData.excerpt}">
    <meta name="keywords" content="${keywordsStr}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="${postData.author || 'Equipo Técnico Cuatropuntas'}">
    <link rel="canonical" href="https://www.cuatropuntas.com/blog/posts/${postData.slug}.html">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Cuatropuntas">
    <meta property="og:locale" content="es_CL">
    <meta property="og:url" content="https://www.cuatropuntas.com/blog/posts/${postData.slug}.html">
    <meta property="og:title" content="${postData.title}">
    <meta property="og:description" content="${postData.excerpt}">
    <meta property="og:image" content="https://www.cuatropuntas.com${postData.image.startsWith('/') ? postData.image : '/' + postData.image}">

    <!-- Tailwind -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#1a202c',
                        secondary: '#c05621',
                        accent: '#dd6b20',
                    }
                }
            }
        }
    </script>
    <!-- ===== Favicon ===== -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

    <!-- ===== GEO Structured Data (JSON-LD) ===== -->
    <script type="application/ld+json">
${schemaJson}
    </script>
    <style>
        nav picture img, nav a img, footer picture img, footer a img {
            width: 32px !important;
            height: 32px !important;
            max-width: 32px !important;
            max-height: 32px !important;
            object-fit: contain !important;
        }
        svg { display: inline-block; vertical-align: middle; flex-shrink: 0; }
        svg.w-4, svg.h-4 { width: 1rem !important; height: 1rem !important; }
        svg.w-5, svg.h-5 { width: 1.25rem !important; height: 1.25rem !important; }
        svg.w-6, svg.h-6 { width: 1.5rem !important; height: 1.5rem !important; }
        svg.w-7, svg.h-7 { width: 1.75rem !important; height: 1.75rem !important; }
    </style>
</head>

<body class="font-sans antialiased text-gray-800 bg-gray-50 flex flex-col min-h-screen">

    <!-- ===== Navbar ===== -->
    <nav class="fixed w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm transition-all duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                <div class="flex items-center">
                    <a href="/" aria-label="Cuatropuntas — Constructora en Santiago" class="flex items-center gap-2.5 group">
                        <picture class="flex-shrink-0" style="display:inline-block; width:32px; height:32px;">
                            <source srcset="/logo_cuatropuntas.webp" type="image/webp">
                            <img src="/logo_cuatropuntas.jpg" width="32" height="32" alt="Logo Constructora Cuatropuntas SpA Santiago" style="width:32px; height:32px; max-width:32px; max-height:32px; object-fit:contain;" class="h-8 w-8 object-contain rounded shadow-xs border border-gray-200 flex-shrink-0">
                        </picture>
                        <span class="font-bold text-xl md:text-2xl tracking-tighter text-primary">CUATRO<span class="text-secondary">PUNTAS</span></span>
                    </a>
                </div>
                
                <!-- Desktop Navigation -->
                <div class="hidden md:flex items-center space-x-8">
                    <div class="relative group">
                        <button type="button" class="inline-flex items-center gap-1 text-gray-600 hover:text-primary transition-colors font-medium focus:outline-none" aria-haspopup="true" aria-label="Abrir menú de servicios">
                            Servicios
                            <svg class="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        <div class="absolute left-0 top-full pt-3 w-64 hidden group-hover:block group-focus-within:block z-50" role="menu">
                            <div class="bg-white border border-gray-100 rounded-md shadow-xl p-2">
                                <a href="/servicios/casas-nuevas/" role="menuitem" class="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary rounded transition-colors">Casas Nuevas</a>
                                <a href="/servicios/segundos-pisos/" role="menuitem" class="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary rounded transition-colors">Segundos Pisos y Ampliaciones</a>
                                <a href="/servicios/quinchos/" role="menuitem" class="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary rounded transition-colors">Quinchos</a>
                                <a href="/servicios/remodelaciones/" role="menuitem" class="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary rounded transition-colors">Remodelaciones</a>
                                <a href="/subsidio-minvu-sitio-propio" role="menuitem" class="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary rounded transition-colors">Subsidio MINVU</a>
                            </div>
                        </div>
                    </div>
                    <a href="/precios" class="text-gray-600 hover:text-primary transition-colors font-medium">Precios</a>
                    <a href="/blog/" class="text-secondary font-bold border-b-2 border-secondary pb-1">Blog</a>
                    <a href="/#contacto" class="bg-secondary text-white px-5 py-2.5 rounded-md font-bold hover:bg-orange-700 transition shadow-lg transform hover:-translate-y-0.5">Cotizar Gratis</a>
                </div>

                <!-- Mobile Menu Button (Hamburger) -->
                <div class="flex items-center md:hidden">
                    <button onclick="toggleMobileMenu()" type="button" aria-label="Abrir menú de navegación" class="text-gray-700 hover:text-primary focus:outline-none p-2">
                        <svg id="hamburgerIcon" class="w-7 h-7" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                        <svg id="closeIcon" class="w-7 h-7 hidden" width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile Dropdown Menu -->
        <div id="mobileMenu" class="hidden md:hidden bg-white border-b border-gray-200 px-4 pt-2 pb-6 space-y-3 shadow-xl">
            <div class="border-b border-gray-100">
                <button type="button" id="mobileServicesToggle" onclick="toggleServicesMenu()" aria-expanded="false" aria-controls="mobileServicesMenu" class="w-full flex items-center justify-between text-gray-700 hover:text-secondary font-medium py-2">
                    <span>Servicios</span>
                    <svg class="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div id="mobileServicesMenu" class="hidden pl-4 pb-2 space-y-1">
                    <a href="/servicios/casas-nuevas/" onclick="toggleMobileMenu()" class="block text-gray-700 hover:text-secondary font-medium py-2">Casas Nuevas</a>
                    <a href="/servicios/segundos-pisos/" onclick="toggleMobileMenu()" class="block text-gray-700 hover:text-secondary font-medium py-2">Segundos Pisos y Ampliaciones</a>
                    <a href="/servicios/quinchos/" onclick="toggleMobileMenu()" class="block text-gray-700 hover:text-secondary font-medium py-2">Quinchos</a>
                    <a href="/servicios/remodelaciones/" onclick="toggleMobileMenu()" class="block text-gray-700 hover:text-secondary font-medium py-2">Remodelaciones</a>
                    <a href="/subsidio-minvu-sitio-propio" onclick="toggleMobileMenu()" class="block text-gray-700 hover:text-secondary font-medium py-2">Subsidio MINVU</a>
                </div>
            </div>
            <a href="/precios" onclick="toggleMobileMenu()" class="block text-gray-700 hover:text-secondary font-medium py-2 border-b border-gray-100">Precios</a>
            <a href="/blog/" onclick="toggleMobileMenu()" class="block text-secondary font-bold py-2 border-b border-gray-100">Blog</a>
            <a href="/#contacto" onclick="toggleMobileMenu()" class="block bg-secondary text-white text-center font-bold py-3 rounded-md shadow-md mt-4">Cotizar Gratis</a>
        </div>
    </nav>

    <!-- Main Content -->
    <article class="pt-32 pb-20 flex-grow">
        <header class="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
            <div class="flex items-center space-x-3 text-sm font-semibold text-secondary mb-4">
                <span class="bg-orange-100 px-3 py-1 rounded-full">${postData.category}</span>
                <span class="text-gray-400">• ${dateFormattedFull}</span>
                <span class="text-gray-400">• ${postData.readTime || '6 min de lectura'}</span>
            </div>
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight mb-6">
                ${postData.title}
            </h1>
            <p class="text-xl text-gray-600 leading-relaxed font-normal">
                ${postData.excerpt}
            </p>
        </header>

        <!-- Featured Image -->
        <div class="max-w-5xl mx-auto px-4 sm:px-6 mb-12">
            <img src="${postData.image}" alt="${postData.title}" class="w-full h-[400px] object-cover rounded-2xl shadow-xl">
        </div>

        <div class="max-w-3xl mx-auto px-4 sm:px-6 text-gray-800 text-lg leading-relaxed space-y-8">
${bodyHtml}
${faqHtml}
            <!-- Banner CTA Cotizador -->
            <div class="bg-primary text-white p-8 rounded-2xl text-center space-y-4 shadow-xl mt-12">
                <h3 class="text-2xl font-extrabold">¿Estás pensando en construir o remodelar en Santiago?</h3>
                <p class="text-gray-300 text-sm max-w-xl mx-auto">
                    Cotiza en línea con valores transparentes o agenda una visita técnica en terreno con nuestros profesionales para evaluar el estado real de tu propiedad.
                </p>
                <div class="flex flex-col sm:flex-row justify-center gap-4 pt-2">
                    <a href="/#cotizador" class="inline-block bg-secondary hover:bg-orange-700 text-white font-bold px-8 py-3.5 rounded-lg transition text-base shadow-lg">
                        Simular Cotización Online
                    </a>
                    <a href="${CAL_URL}" target="_blank" rel="noopener noreferrer" class="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-lg transition border border-white/20 text-base">
                        Agendar Visita Técnica a Terreno
                    </a>
                </div>
            </div>

            <!-- Sección de Comentarios & Comunidad (Spec 005) -->
            <div id="blog-comments-container" data-slug="${postData.slug}" class="mt-14"></div>
        </div>
    </article>

    <!-- Footer -->
    <footer class="bg-primary text-gray-400 py-12 border-t border-gray-800">
        <div class="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500">
            &copy; 2026 Constructora Cuatropuntas SpA. Todos los derechos reservados. | <a href="/blog/" class="text-secondary hover:underline">Volver al Blog</a>
        </div>
    </footer>

    <!-- ===== Botón Flotante de WhatsApp Meta ===== -->
    <a href="https://wa.me/${OFFICIAL_PHONE_E164}?text=Hola,%20estoy%20interesado%20en%20cotizar%20con%20ustedes%20un%20proyecto."
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Cotizar por WhatsApp"
       class="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-2xl hover:bg-[#1ebe57] hover:scale-105 transition-all duration-300 group">
        <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
        <span class="absolute right-16 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
            Cotizar por WhatsApp
        </span>
    </a>

    <script src="/navigation.js"></script>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script src="/blog-comments.js" defer></script>
    <script>
        function toggleMobileMenu() {
            const menu = document.getElementById('mobileMenu');
            const hamburger = document.getElementById('hamburgerIcon');
            const close = document.getElementById('closeIcon');
            if (menu) {
                menu.classList.toggle('hidden');
                hamburger.classList.toggle('hidden');
                close.classList.toggle('hidden');
            }
        }
        function toggleServicesMenu() {
            const sm = document.getElementById('mobileServicesMenu');
            const btn = document.getElementById('mobileServicesToggle');
            if (sm) {
                sm.classList.toggle('hidden');
                const isExp = !sm.classList.contains('hidden');
                if (btn) btn.setAttribute('aria-expanded', isExp ? 'true' : 'false');
            }
        }
    </script>
</body>
</html>
`;
}

/**
 * Genera la tarjeta HTML para index.html (SSR Fallback)
 */
function generateIndexCardHtml(postData) {
    const dateFormatted = formatDateSpanish(postData.date);
    return `            <!-- Post Card: ${postData.slug} -->
            <article class="post-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl transition duration-300 flex flex-col" data-slug="${postData.slug}">
                <a href="/blog/posts/${postData.slug}.html" class="block overflow-hidden h-52">
                    <img src="${postData.image}" alt="${postData.title}" class="w-full h-full object-cover hover:scale-105 transition duration-500">
                </a>
                <div class="p-6 flex flex-col flex-grow">
                    <div class="flex justify-between items-center text-xs font-semibold text-secondary mb-3">
                        <span>${postData.category}</span>
                        <span class="text-gray-400">${dateFormatted}</span>
                    </div>
                    <h2 class="text-xl font-bold text-gray-900 mb-3 hover:text-secondary transition leading-snug">
                        <a href="/blog/posts/${postData.slug}.html">
                            ${postData.title}
                        </a>
                    </h2>
                    <p class="text-gray-600 text-sm leading-relaxed mb-6 flex-grow">
                        ${postData.excerpt}
                    </p>
                    <div class="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>${postData.author || 'Equipo Técnico Cuatropuntas'}</span>
                        <a href="/blog/posts/${postData.slug}.html" class="font-bold text-secondary hover:underline flex items-center">
                            Leer artículo &rarr;
                        </a>
                    </div>
                </div>
            </article>
            <!-- End Post Card: ${postData.slug} -->`;
}

/**
 * Sincroniza atómicamente posts.json
 */
function updatePostsJson(postData) {
    let posts = [];
    if (fs.existsSync(POSTS_JSON_PATH)) {
        try {
            posts = JSON.parse(fs.readFileSync(POSTS_JSON_PATH, 'utf8'));
        } catch (e) {
            posts = [];
        }
    }

    const newEntry = {
        id: postData.slug,
        slug: postData.slug,
        title: postData.title,
        excerpt: postData.excerpt,
        category: postData.category,
        date: postData.date,
        readTime: postData.readTime || '6 min de lectura',
        image: postData.image,
        author: postData.author || 'Equipo Técnico Cuatropuntas',
        tags: postData.tags || []
    };

    const existingIdx = posts.findIndex(p => p.slug === postData.slug);
    if (existingIdx !== -1) {
        posts[existingIdx] = newEntry;
    } else {
        posts.unshift(newEntry);
    }

    fs.writeFileSync(POSTS_JSON_PATH, JSON.stringify(posts, null, 2), 'utf8');
}

/**
 * Sincroniza atómicamente public/blog/index.html (inyección/reemplazo de tarjeta SSR)
 */
function updateBlogIndexHtml(postData) {
    if (!fs.existsSync(BLOG_INDEX_PATH)) return;

    let indexHtml = fs.readFileSync(BLOG_INDEX_PATH, 'utf8');
    const newCard = generateIndexCardHtml(postData);

    // Buscar si ya existe la tarjeta por slug delimitada
    const existingCardRegex = new RegExp(`\\s*<!-- Post Card: ${postData.slug} -->[\\s\\S]*?<!-- End Post Card: ${postData.slug} -->`, 'i');

    if (existingCardRegex.test(indexHtml)) {
        indexHtml = indexHtml.replace(existingCardRegex, '\n' + newCard);
    } else {
        // Insertar al inicio de #postsGrid
        const gridMarker = '<div id="postsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">';
        if (indexHtml.includes(gridMarker)) {
            indexHtml = indexHtml.replace(gridMarker, `${gridMarker}\n${newCard}`);
        }
    }

    fs.writeFileSync(BLOG_INDEX_PATH, indexHtml, 'utf8');
}

/**
 * Sincroniza atómicamente public/sitemap.xml
 */
function updateSitemapXml(postData) {
    if (!fs.existsSync(SITEMAP_PATH)) return;

    let sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const canonicalLoc = `https://www.cuatropuntas.com/blog/posts/${postData.slug}.html`;

    if (sitemap.includes(canonicalLoc)) {
        // Actualizar lastmod
        const regex = new RegExp(`(<loc>${canonicalLoc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/loc>\\s*<lastmod>)[^<]*(<\\/lastmod>)`, 'g');
        sitemap = sitemap.replace(regex, `$1${postData.date}$2`);
    } else {
        // Insertar nuevo nodo <url> antes de </urlset>
        const newUrlNode = `    <url>
        <loc>${canonicalLoc}</loc>
        <lastmod>${postData.date}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>`;
        sitemap = sitemap.replace('</urlset>', newUrlNode);
    }

    fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
}

/**
 * Función principal pura: Compila y publica un artículo
 *
 * @param {Object} inputData - { title, slug, content, excerpt, category, date, author, image, readTime, tags, faq }
 * @param {Object} options - { dryRun: boolean }
 */
function compileAndPublishPost(inputData, options = {}) {
    if (!inputData) throw new Error('Datos de entrada vacíos');

    const postData = { ...inputData };

    // Validar y sanear campos obligatorios
    if (!postData.title || !postData.slug || !postData.content) {
        throw new Error('Faltan campos obligatorios: title, slug y content son requeridos');
    }

    postData.title = sanitizeContent(postData.title);
    postData.excerpt = sanitizeContent(postData.excerpt || '');
    postData.category = postData.category || 'Materiales & Sistemas';
    postData.date = postData.date || new Date().toISOString().split('T')[0];
    postData.author = postData.author || 'Equipo Técnico Cuatropuntas';

    // Asignación de imagen por defecto según categoría si no viene provista
    if (!postData.image) {
        postData.image = resolveCategoryImage(postData.category);
    }

    // Convertir markdown a HTML
    const bodyHtml = convertMarkdownToHtml(sanitizeContent(postData.content));
    const fullHtml = generatePostHtml(postData, bodyHtml);

    if (options.dryRun) {
        return {
            success: true,
            postData,
            html: fullHtml
        };
    }

    // Asegurar directorio destino
    if (!fs.existsSync(BLOG_POSTS_DIR)) {
        fs.mkdirSync(BLOG_POSTS_DIR, { recursive: true });
    }

    // 1. Escribir archivo HTML
    const postFilePath = path.join(BLOG_POSTS_DIR, `${postData.slug}.html`);
    fs.writeFileSync(postFilePath, fullHtml, 'utf8');

    // 2. Actualizar posts.json
    updatePostsJson(postData);

    // 3. Actualizar blog/index.html (SSR)
    updateBlogIndexHtml(postData);

    // 4. Actualizar sitemap.xml
    updateSitemapXml(postData);

    return {
        success: true,
        slug: postData.slug,
        url: `https://www.cuatropuntas.com/blog/posts/${postData.slug}.html`,
        filePath: postFilePath,
        postData
    };
}

// Ejecución CLI directa
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Uso: node scripts/publish-blog.js <archivo.md>');
        process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), args[0]);
    if (!fs.existsSync(filePath)) {
        console.error(`Error: Archivo no encontrado: ${filePath}`);
        process.exit(1);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const { metadata, content } = parseMarkdownWithFrontmatter(raw);

    const payload = {
        ...metadata,
        content
    };

    try {
        const result = compileAndPublishPost(payload);
        console.log(`✅ Artículo compilado y publicado con éxito:`);
        console.log(`   Slug: ${result.slug}`);
        console.log(`   URL:  ${result.url}`);
        console.log(`   Ruta: ${result.filePath}`);
    } catch (err) {
        console.error(`❌ Error al compilar el artículo: ${err.message}`);
        process.exit(1);
    }
}

module.exports = {
    compileAndPublishPost,
    parseMarkdownWithFrontmatter,
    convertMarkdownToHtml,
    resolveCategoryImage,
    formatDateSpanish,
    formatDateFullSpanish,
    sanitizeContent
};
