/**
 * Generador Automático de Artículos para el Blog de Constructora Cuatropuntas
 * Optimizado para GEO (Generative Engine Optimization), SEO Local en Chile y Estilo Natural Humano.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const POSTS_JSON_PATH = path.join(__dirname, '../public/blog/posts.json');
const POSTS_DIR = path.join(__dirname, '../public/blog/posts');
const SITEMAP_PATH = path.join(__dirname, '../public/sitemap.xml');

// Banco de Temas y FAQs frecuentes del mercado de construcción en Chile
const TOPIC_POOL = [
    {
        title: "Permisos de edificación DOM en Santiago: ¿Cómo evitar multas y paralización de obras?",
        category: "Guías Prácticas",
        slug: "permisos-edificacion-dom-santiago-guia",
        excerpt: "Explicamos el paso a paso para solicitar el Permiso de Edificación en la Dirección de Obras Municipales (DOM) y los riesgos de construir sin regularizar en la RM.",
        image: "/ampliacion_antes_despues_realista.webp",
        readTime: "7 min de lectura",
        tags: ["Permiso Edificación DOM", "Regulación OGUC", "Multas Municipales", "Recepción Definitiva DOM"],
        faq: {
            q: "¿Qué pasa si construyo un segundo piso sin permiso en Santiago?",
            a: "La Dirección de Obras Municipales (DOM) puede paralizar la faena e cursar multas de hasta un 150% de los derechos municipales. Además, la propiedad no podrá obtener la Recepción Definitiva, lo que impide su venta mediante crédito hipotecario."
        },
        sections: [
            {
                h2: "El rol fundamental de la Dirección de Obras Municipales",
                content: "Todo proyecto de construcción o ampliación que altere la estructura de una vivienda en la Región Metropolitana debe contar con la aprobación previa de la DOM de la comuna correspondiente. Este trámite verifica que la edificación cumpla con la Ley General de Urbanismo y Construcciones (LGUC) y las condiciones fijadas en el Certificado de Informes Previos (CIP)."
            },
            {
                h2: "Documentos exigidos para ingresar el expediente técnico",
                content: "Para tramitar el Permiso de Edificación se requiere presentar la solicitud oficial firmada por el propietario y el arquitecto patrocinante, las escrituras de dominio del terreno, el plano de arquitectura con cuadro de superficies, la memoria de cálculo estructural cuando corresponda y las factibilidades de agua potable y alcantarillado."
            },
            {
                h2: "El proceso para obtener la Recepción Definitiva",
                content: "Una vez completada la edificación, el profesional responsable solicita la Recepción Definitiva de la Obra. En esta etapa, el inspector municipal verifica en terreno que lo construido coincida exactamente con los planos aprobados. Obtenida la recepción, la superficie queda formalmente incorporada al rol del SII y al registro municipal."
            }
        ]
    },
    {
        title: "Aislación térmica en la Región Metropolitana (Zona 3 OGUC): Materiales recomendados",
        category: "Materiales & Sistemas",
        slug: "aislacion-termica-zona-3-rm-oguc",
        excerpt: "Analizamos las exigencias del acondicionamiento térmico según la norma chilena para Santiago y los mejores materiales aislantes para techos y muros.",
        image: "/material_semi_ligero_sip_1770072450181.webp",
        readTime: "6 min de lectura",
        tags: ["Aislación Térmica OGUC", "Lana de Vidrio Chile", "Ventanas Termopanel", "Eficiencia Energética RM"],
        faq: {
            q: "¿Qué exige la norma térmica para viviendas en Santiago?",
            a: "Santiago pertenece a la Zona Térmica 3 de la OGUC. La normativa exige un valor máximo de transmitancia térmica U en techumbres de 0.47 W/m²K y en muros perimetrales de 1.90 W/m²K, requiriendo aislamientos continuos y doble vidriado hermético (termopanel)."
        },
        sections: [
            {
                h2: "Comportamiento térmico del clima en el valle de Santiago",
                content: "La Región Metropolitana experimenta amplitudes térmicas pronunciadas con veranos calurosos sobre los 33°C e inviernos fríos bajo los 0°C. Diseñar la envolvente térmica considerando la orientación solar y el material adecuado reduce el consumo de energía en climatización hasta en un 45%."
            },
            {
                h2: "Comparativa entre Lana de Vidrio, EPS y Poliestireno Extruido",
                content: "La lana de vidrio ofrece un excelente desempeño fónico y térmico en muros tabicados de Metalcon. Por su parte, el poliestireno expandido (EPS) de alta densidad utilizado en Paneles SIP y sistemas EIFS evita los puentes térmicos en la fachada exterior."
            },
            {
                h2: "La importancia del doble vidriado hermético (Termopanel)",
                content: "Las ventanas representan una de las mayores vías de pérdida de calor en invierno. El uso de perfiles de PVC o aluminio con rotura de puente térmico y cristales termopanel asegura un ambiente confortable sin condensación interna."
            }
        ]
    },
    {
        title: "¿Cómo regularizar una ampliación o segundo piso con la ley vigente en Chile?",
        category: "Guías Prácticas",
        slug: "como-regularizar-ampliacion-segundo-piso-chile",
        excerpt: "Guía paso a paso para regularizar construcciones no declaradas en la DOM y actualizar el rol de la propiedad ante el SII.",
        image: "/ampliacion_antes_despues_realista.webp",
        readTime: "8 min de lectura",
        tags: ["Regularizar Ampliación", "Ley del Monito", "Recepción Definitiva", "Tasación Bancaria"],
        faq: {
            q: "¿Puedo vender mi casa si tengo un segundo piso sin regularizar?",
            a: "Sí es posible vender mediante pago al contado, pero los bancos no financian metros cuadrados no regularizados en créditos hipotecarios. Regularizar la ampliación permite que el tasador apruebe el 100% de la superficie útil."
        },
        sections: [
            {
                h2: "Razones para mantener los metros cuadrados regularizados",
                content: "Disponer de la Recepción Definitiva al día protege el valor comercial de la vivienda. Además de facilitar el otorgamiento de créditos hipotecarios en una venta futura, evita notificaciones judiciales por denuncias de vecinos o inspecciones de la DOM."
            },
            {
                h2: "Requisitos de habitabilidad y seguridad según la OGUC",
                content: "Para que una ampliación sea aprobada, la estructura debe cumplir con la altura mínima de piso a cielo (2,30 m en zonas habitables), distanciamientos mínimos a los deslindes vecinos y muros cortafuego en adosamientos según la normativa sísmica y de fuego."
            },
            {
                h2: "El trámite con un arquitecto patrocínante",
                content: "El proceso inicia con el levantamiento del plano de arquitectura existente. El arquitecto elabora la carpeta técnica, firma los planos y realiza la tramitación en la DOM municipal hasta la entrega del certificado de Recepción Definitiva."
            }
        ]
    }
];

// Comprobador de clichés y estilo de IA
function sanitizeTextStyle(text) {
    let sanitized = text;

    // Eliminar patrones clichés tipo "no es X, es Y", "no se trata de X, se trata de Y"
    sanitized = sanitized.replace(/no es (solo )?([^,.?!]+),? es /gi, "se trata de ");
    sanitized = sanitized.replace(/no se trata de ([^,.?!]+),? se trata de /gi, "el foco principal es ");
    sanitized = sanitized.replace(/esto no es ([^,.?!]+),? es /gi, "esto corresponde a ");

    // Reemplazar guiones largos excesivos por comas o paréntesis
    sanitized = sanitized.replace(/ — /g, ", ");

    return sanitized;
}

function generateHTMLPost(postData) {
    const title = sanitizeTextStyle(postData.title);
    const excerpt = sanitizeTextStyle(postData.excerpt);
    const cleanDate = new Date().toISOString().split('T')[0];

    const sectionsHTML = postData.sections.map(sec => `
        <section class="space-y-4">
            <h2 class="text-2xl font-bold text-primary border-l-4 border-secondary pl-4">
                ${sanitizeTextStyle(sec.h2)}
            </h2>
            <p>${sanitizeTextStyle(sec.content)}</p>
        </section>
    `).join('');

    const faqHTML = postData.faq ? `
        <section class="bg-orange-50 p-6 rounded-2xl border border-orange-200 my-10 space-y-4">
            <h3 class="text-xl font-bold text-secondary">
                ❓ Pregunta Frecuente Relevante en Chile
            </h3>
            <div class="space-y-2">
                <h4 class="font-bold text-primary text-base">${sanitizeTextStyle(postData.faq.q)}</h4>
                <p class="text-gray-700 text-sm leading-relaxed">${sanitizeTextStyle(postData.faq.a)}</p>
            </div>
        </section>
    ` : '';

    return `<!DOCTYPE html>
<html lang="es-CL" class="scroll-smooth">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- ===== SEO & GEO Metadata ===== -->
    <title>${title} | Cuatropuntas</title>
    <meta name="description" content="${excerpt}">
    <meta name="keywords" content="${postData.tags.join(', ')}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="Equipo Técnico Cuatropuntas">
    <link rel="canonical" href="https://www.cuatropuntas.com/blog/posts/${postData.slug}.html">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Cuatropuntas">
    <meta property="og:locale" content="es_CL">
    <meta property="og:url" content="https://www.cuatropuntas.com/blog/posts/${postData.slug}.html">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${excerpt}">
    <meta property="og:image" content="https://www.cuatropuntas.com${postData.image}">

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
    <!-- ===== Favicons ===== -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

    <!-- ===== GEO Structured Data (JSON-LD) ===== -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          "@id": "https://www.cuatropuntas.com/blog/posts/${postData.slug}.html#article",
          "headline": "${title}",
          "description": "${excerpt}",
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
          "datePublished": "${cleanDate}",
          "inLanguage": "es-CL"
        }
        ${postData.faq ? `,
        {
          "@type": "FAQPage",
          "mainEntity": [{
            "@type": "Question",
            "name": "${postData.faq.q}",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "${postData.faq.a}"
            }
          }]
        }` : ''}
      ]
    }
    </script>
</head>

<body class="font-sans antialiased text-gray-800 bg-gray-50 flex flex-col min-h-screen">

    <!-- Header Navigation -->
    <nav class="fixed w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm transition-all duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                <div class="flex items-center">
                    <a href="/" aria-label="Cuatropuntas — Constructora en Santiago" class="flex items-center gap-2.5 group">
                        <picture class="flex-shrink-0">
                            <source srcset="/logo_cuatropuntas.webp" type="image/webp">
                            <img src="/logo_cuatropuntas.jpg" alt="Logo Constructora Cuatropuntas SpA Santiago" class="h-8 w-8 object-contain rounded shadow-xs border border-gray-200 flex-shrink-0">
                        </picture>
                        <span class="font-bold text-xl md:text-2xl tracking-tighter text-primary">CUATRO<span class="text-secondary">PUNTAS</span></span>
                    </a>
                </div>
                <div class="hidden md:flex items-center space-x-8">
                    <!-- Dropdown Colapsable Casas Nuevas -->
                    <div class="relative inline-block text-left" id="casasMenuContainer">
                        <button type="button" id="casasMenuBtn" onclick="toggleCasasMenu(event)" class="inline-flex items-center gap-1.5 text-gray-600 hover:text-primary transition-colors font-medium py-2 focus:outline-none cursor-pointer">
                            <span>Casas Nuevas</span>
                            <svg id="casasChevron" class="w-4 h-4 text-gray-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <!-- Desplegable Vertical Colapsable -->
                        <div id="casasDropdown" class="hidden absolute left-0 mt-1 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 py-3 px-2 z-50 transition-all duration-200 flex-col gap-1">
                            <a href="/servicios/casas-nuevas/" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 text-gray-800 hover:text-secondary transition">
                                <span class="text-lg">🏡</span>
                                <div>
                                    <div class="font-bold text-sm text-gray-900">Ver Todas las Casas Nuevas</div>
                                    <div class="text-xs text-gray-500 font-normal">Catálogo y proyectos llave en mano</div>
                                </div>
                            </a>
                            <a href="/servicios/casas-nuevas/#metalcom" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 text-gray-800 hover:text-secondary transition">
                                <span class="text-lg">🏗️</span>
                                <div>
                                    <div class="font-semibold text-sm text-gray-900">Estructura Metalcom</div>
                                    <div class="text-xs text-gray-500 font-normal">Obra rápida y ligera desde 19 UF/m²</div>
                                </div>
                            </a>
                            <a href="/servicios/casas-nuevas/#sip" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 text-gray-800 hover:text-secondary transition">
                                <span class="text-lg">🧩</span>
                                <div>
                                    <div class="font-semibold text-sm text-gray-900">Panel SIP Térmico</div>
                                    <div class="text-xs text-gray-500 font-normal">Aislación máxima desde 21 UF/m²</div>
                                </div>
                            </a>
                            <a href="/servicios/casas-nuevas/#albanileria" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 text-gray-800 hover:text-secondary transition">
                                <span class="text-lg">🧱</span>
                                <div>
                                    <div class="font-semibold text-sm text-gray-900">Albañilería Armada</div>
                                    <div class="text-xs text-gray-500 font-normal">Construcción sólida desde 25 UF/m²</div>
                                </div>
                            </a>
                            <div class="border-t border-gray-100 my-1"></div>
                            <a href="/subsidio-minvu-sitio-propio" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 text-gray-800 hover:text-secondary transition">
                                <span class="text-lg">📜</span>
                                <div>
                                    <div class="font-semibold text-sm text-gray-900">Subsidio MINVU Sitio Propio</div>
                                    <div class="text-xs text-gray-500 font-normal">Construcción con DS1 y DS49</div>
                                </div>
                            </a>
                        </div>
                    </div>
                    <a href="/servicios/segundos-pisos/" class="text-gray-600 hover:text-primary transition-colors font-medium">Segundos Pisos</a>
                    <a href="/servicios/quinchos/" class="text-gray-600 hover:text-primary transition-colors font-medium">Quinchos</a>
                    <a href="/precios" class="text-gray-600 hover:text-primary transition-colors font-medium">Precios</a>
                    <a href="/blog/" class="text-secondary font-bold border-b-2 border-secondary pb-1">Blog</a>
                    <a href="/#cotizador" class="bg-secondary text-white px-5 py-2.5 rounded-md font-bold hover:bg-orange-700 transition shadow-lg">Cotizar Gratis</a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <article class="pt-32 pb-20 flex-grow">
        <header class="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
            <div class="flex items-center space-x-3 text-sm font-semibold text-secondary mb-4">
                <span class="bg-orange-100 px-3 py-1 rounded-full">${postData.category}</span>
                <span class="text-gray-400">• ${cleanDate}</span>
                <span class="text-gray-400">• ${postData.readTime}</span>
            </div>
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight mb-6">
                ${title}
            </h1>
            <p class="text-xl text-gray-600 leading-relaxed font-normal">
                ${excerpt}
            </p>
        </header>

        <!-- Featured Image -->
        <div class="max-w-5xl mx-auto px-4 sm:px-6 mb-12">
            <img src="${postData.image}" alt="${title}" class="w-full h-[400px] object-cover rounded-2xl shadow-xl">
        </div>

        <div class="max-w-3xl mx-auto px-4 sm:px-6 text-gray-800 text-lg leading-relaxed space-y-8">
            ${sectionsHTML}
            ${faqHTML}

            <!-- Banner CTA Cotizador -->
            <div class="bg-primary text-white p-8 rounded-2xl text-center space-y-4 shadow-xl mt-12">
                <h3 class="text-2xl font-extrabold">¿Quieres cotizar tu proyecto en Santiago?</h3>
                <p class="text-gray-300 text-sm max-w-xl mx-auto">
                    Prueba nuestra calculadora paramétrica en línea y recibe en menos de 2 minutos un presupuesto referencial en UF ajustado a tu comuna.
                </p>
                <a href="/#cotizador" class="inline-block bg-secondary hover:bg-orange-700 text-white font-bold px-8 py-3.5 rounded-lg transition text-base">
                    📊 Simular Presupuesto en Lógica UF
                </a>
            </div>
        </div>
    </article>

    <!-- Footer -->
    <footer class="bg-primary text-gray-400 py-12 border-t border-gray-800">
        <div class="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500">
            &copy; 2026 Constructora Cuatropuntas SpA. Todos los derechos reservados. | <a href="/blog/" class="text-secondary hover:underline">Volver al Blog</a>
        </div>
    </footer>
</body>
</html>`;
}

function updateSitemap(newSlug) {
    if (!fs.existsSync(SITEMAP_PATH)) return;
    let sitemap = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    const newUrl = `  <url>\n    <loc>https://www.cuatropuntas.com/blog/posts/${newSlug}.html</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;

    if (!sitemap.includes(newSlug)) {
        sitemap = sitemap.replace('</urlset>', `${newUrl}\n</urlset>`);
        fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf-8');
        console.log(`[SITEMAP UPDATED] Added /blog/posts/${newSlug}.html`);
    }
}

function publishNewPost() {
    let posts = [];
    if (fs.existsSync(POSTS_JSON_PATH)) {
        posts = JSON.parse(fs.readFileSync(POSTS_JSON_PATH, 'utf-8'));
    }

    const existingSlugs = new Set(posts.map(p => p.slug));
    const available = TOPIC_POOL.filter(t => !existingSlugs.has(t.slug));

    if (available.length === 0) {
        console.log('Todos los temas en cola ya han sido publicados.');
        return;
    }

    const selected = available[0];
    console.log(`[GENERATING BLOG POST] ${selected.title}`);

    const htmlContent = generateHTMLPost(selected);
    const postFilePath = path.join(POSTS_DIR, `${selected.slug}.html`);

    if (!fs.existsSync(POSTS_DIR)) {
        fs.mkdirSync(POSTS_DIR, { recursive: true });
    }

    fs.writeFileSync(postFilePath, htmlContent, 'utf-8');
    console.log(`[POST HTML CREATED] ${postFilePath}`);

    const newPostEntry = {
        id: selected.slug,
        slug: selected.slug,
        title: sanitizeTextStyle(selected.title),
        excerpt: sanitizeTextStyle(selected.excerpt),
        category: selected.category,
        date: new Date().toISOString().split('T')[0],
        readTime: selected.readTime,
        image: selected.image,
        author: "Equipo Técnico Cuatropuntas",
        tags: selected.tags
    };

    posts.unshift(newPostEntry);
    fs.writeFileSync(POSTS_JSON_PATH, JSON.stringify(posts, null, 2), 'utf-8');
    console.log(`[POSTS.JSON UPDATED] Total posts: ${posts.length}`);

    updateSitemap(selected.slug);

    // Intentar git commit & push si estamos en entorno git
    try {
        execSync('git add public/blog/ public/sitemap.xml', { cwd: path.join(__dirname, '..') });
        execSync(`git commit -m "feat(blog): publicar articulo ${selected.slug}"`, { cwd: path.join(__dirname, '..') });
        console.log(`[GIT COMMITTED] feat(blog): publicar articulo ${selected.slug}`);
    } catch (e) {
        console.log('[GIT NOTICE] Archivos creados pero sin git commit automático:', e.message);
    }
}

if (require.main === module) {
    publishNewPost();
}

module.exports = { publishNewPost, TOPIC_POOL };
