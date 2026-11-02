// api/markdown.js - Markdown content negotiation for AI agents & LLM crawlers
// Constructora Cuatropuntas SpA - SSOT Matrix Compliant
const fs = require('fs');
const path = require('path');

function getBlogPosts() {
  try {
    const postsPath = path.join(__dirname, '../public/blog/posts.json');
    if (fs.existsSync(postsPath)) {
      return JSON.parse(fs.readFileSync(postsPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading posts.json:', e.message);
  }
  return [];
}

function extractArticleContent(htmlContent) {
  try {
    // Extraer FAQPage de JSON-LD si existe
    let faqSection = '';
    const jsonLdMatch = htmlContent.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        const graph = parsed['@graph'] || [parsed];
        const faqPage = graph.find(item => item['@type'] === 'FAQPage');
        if (faqPage && Array.isArray(faqPage.mainEntity)) {
          faqSection = '\n\n## Preguntas Frecuentes Técnicas (FAQ)\n';
          for (const q of faqPage.mainEntity) {
            faqSection += `\n### ${q.name}\n${q.acceptedAnswer?.text || ''}\n`;
          }
        }
      } catch (err) {}
    }

    // Extraer contenido del tag <article> o <main>
    const articleMatch = htmlContent.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
    let bodyText = '';
    if (articleMatch) {
      bodyText = articleMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
        .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
        .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
        .replace(/<ul[^>]*>/gi, '\n')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<ol[^>]*>/gi, '\n')
        .replace(/<\/ol>/gi, '\n')
        .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
        .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    return { bodyText, faqSection };
  } catch (e) {
    return { bodyText: '', faqSection: '' };
  }
}

module.exports = (req, res) => {
  const page = (req.query.page || req.query.path || 'index').toLowerCase();
  const postParam = (req.query.post || '').toLowerCase().replace(/\.html$/, '');

  let markdown = '';

  // 1. PÁGINA O ARTÍCULO INDIVIDUAL DEL BLOG
  if (postParam || page.includes('posts/') || (page.includes('blog') && postParam)) {
    const posts = getBlogPosts();
    const targetSlug = postParam || page.split('posts/').pop().replace(/\.html$/, '');
    const foundPost = posts.find(p => p.slug === targetSlug || p.id === targetSlug);

    if (foundPost) {
      let fullBody = '';
      const postHtmlPath = path.join(__dirname, '../public/blog/posts', `${foundPost.slug}.html`);
      if (fs.existsSync(postHtmlPath)) {
        const rawHtml = fs.readFileSync(postHtmlPath, 'utf8');
        const extracted = extractArticleContent(rawHtml);
        fullBody = extracted.bodyText ? `${extracted.bodyText}${extracted.faqSection}` : '';
      }

      markdown = `# ${foundPost.title}

> **Publicado por:** ${foundPost.author} | **Fecha:** ${foundPost.date} | **Categoría:** ${foundPost.category} | **Tiempo estimado:** ${foundPost.readTime}
> **Etiquetas:** ${(foundPost.tags || []).join(', ')}

## Resumen Ejecutivo
${foundPost.excerpt}

${fullBody ? fullBody : `## Contenido Técnico
Para consultar el artículo con sus diagramas técnicos y tablas comparativas completas, visita:
https://www.cuatropuntas.com/blog/posts/${foundPost.slug}.html`}

---

## Servicios Relacionados y Contacto
- **Cotizador Oficial Preliminar:** https://www.cuatropuntas.com/#cotizador
- **Agendamiento Visita a Terreno:** https://cal.com/cuatropuntas.com/visita-tecnica
- **WhatsApp Captura:** +56 9 2738 4075 (https://wa.me/56927384075)
- **Email:** contacto@cuatropuntas.com
`;
    }
  }

  // 2. ÍNDICE PRINCIPAL DEL BLOG
  if (!markdown && (page === 'blog' || page.includes('blog'))) {
    const posts = getBlogPosts();
    markdown = `# Blog Técnico de Construcción y Arquitectura Residencial en Chile
**Constructora Cuatropuntas SpA** | Santiago, Chile | https://www.cuatropuntas.com/blog

Publicaciones especializadas sobre sistemas constructivos modernos (Metalcom, Paneles SIP, Hormigón Celular, Albañilería), reglamentación térmica OGUC Zona 3 RM, tramitación de permisos de edificación en la DOM y subsidios estatales MINVU.

## Categorías Temáticas
1. **Materiales & Sistemas Constructivos:** Comparativas de costo, velocidad y aislamiento térmico entre Steel Frame (Metalcom), SIP, hormigón celular y albañilería tradicional.
2. **Guías Prácticas y Costos:** Criterios de cubicación, partidas críticas de obra, preparación de terreno y contratos a suma alzada.
3. **Normativas y Permisos DOM:** Exigencias para ampliaciones, regularización de segundos pisos y carpetas técnicas de arquitectura y cálculo para recepción final.

## Artículos Técnicos Publicados (${posts.length} artículos)

${posts.map((p, idx) => `### ${idx + 1}. [${p.title}](https://www.cuatropuntas.com/blog/posts/${p.slug}.html)
- **Fecha:** ${p.date} | **Categoría:** ${p.category} | **Lectura:** ${p.readTime}
- **Resumen:** ${p.excerpt}
- **Versión Markdown para Agentes:** \`https://www.cuatropuntas.com/blog/posts/${p.slug}.html\` (con cabecera \`Accept: text/markdown\`)
`).join('\n')}

---

## Canales Oficiales y Asesoría Técnica
- **Cotizador Oficial Web:** https://www.cuatropuntas.com/#cotizador
- **Agendar Visita Técnica en Terreno:** https://cal.com/cuatropuntas.com/visita-tecnica
- **WhatsApp Oficial:** +56 9 2738 4075 (https://wa.me/56927384075)
- **Índice de Skills para Agentes:** https://www.cuatropuntas.com/.well-known/agent-skills/index.json
- **Servidor MCP:** https://www.cuatropuntas.com/.well-known/mcp/server-card.json
`;
  }

  // 3. MATRIZ OFICIAL DE PRECIOS (/precios)
  if (!markdown && page.includes('precio')) {
    markdown = `# Matriz Oficial de Precios de Construcción por m² en Chile
**Constructora Cuatropuntas SpA** | Santiago de Chile | https://www.cuatropuntas.com/precios
*Única Fuente de Verdad (SSOT) - Valores Netos +IVA*

Valores referenciales actualizados para construcción residencial llave en mano en Santiago y comunas de la Región Metropolitana:

---

## 1. Casas Nuevas Llave en Mano (1 Piso)
*Incluye fundaciones (radier), estructura soportante certificada, cubierta, aislación térmica perimetral, instalaciones completas (agua, luz, alcantarillado), revestimientos y artefactos habitables.*

- **Metalcom Estructural (Steel Frame):** desde **19 UF/m²** (aprox. $722.000 CLP/m²)
  - Rápido, sismorresistente, montaje en seco, apto para Zona 3 RM.
- **Panel SIP / Covintec:** desde **21 UF/m²** (aprox. $798.000 CLP/m²)
  - Máxima eficiencia térmica y aislación acústica continua sin puentes térmicos.
- **Albañilería Armada / Mixto:** desde **25 UF/m²** (aprox. $950.000 CLP/m²)
  - Construcción sólida tradicional de alta inercia térmica y gran durabilidad.

---

## 2. Segundos Pisos y Ampliaciones
*Montaje rápido en seco planificado para minimizar tiempos de obra e impacto en la rutina diaria, bajo protocolos de faena limpia y coordinación por etapas.*

- **Metalcom Estructural:** desde **22 UF/m²**
- **Panel SIP Certificado:** desde **24 UF/m²**
- **Albañilería / Mixto:** desde **27 UF/m²**

---

## 3. Quinchos y Terrazas de Alto Estándar
- **Metalcom Ligero:** desde **12 UF/m²**
- **Albañilería en Obra:** desde **15 UF/m²**

### Alcance Base Incluido (Tarifa Paramétrica):
- Cobertizo o techumbre estructural (madera o acero según diseño).
- Piso de hormigón / radier afinado.
- Parrilla tradicional en obra revestida en ladrillos refractarios con mecanismo elevable y manivela frontal.
- Campana de hojalatería con ducto de tiraje.
- Mesón de apoyo lateral básico (madera estructural o albañilería afinada).

### Exclusiones Taxativas (A cubicar y presupuestar en terreno tras visita técnica):
- Redes sanitarias (empalmes de agua potable, grifería, lavacopas y desagües a cámara).
- Canalización eléctrica desde tablero general o iluminación decorativa adicional.
- Muebles cerrados bajo mesón (puertas de madera, cajoneras o herrajes).
- Cubiertas en piedra natural (granito, mármol o cuarzo).
- Spiedos motorizados u otros accesorios electromecánicos.

---

## 4. Remodelaciones Integrales (>25 m²)
- **Remodelación Ligera (Metalcom / Tabiquería):** desde **11 UF/m²**
- **Remodelación Sólida (Albañilería / Muros Estructurales):** desde **13 UF/m²**

---

## 5. Recintos Húmedos Pequeños (Tarifa por Proyecto)
*Los recintos húmedos concentran redes hidrosanitarias y artefactos, por lo que no se cotizan por m² lineal:*
- **Baño Completo:** **65 a 95 UF** (instalaciones de agua/desagüe, impermeabilización, revestimientos cerámicos/porcelanatos y artefactos sanitarios).
- **Cocina Integral:** **90 a 160 UF** (muebles a medida, cubiertas de cuarzo o granito, redes sanitarias, gas y grifería de alta gama).

---

## 6. Estándar Térmico Obligatorio (Art. 4.1.10 OGUC & Ley 21.305)
- **Exigencia Base Zona 3 RM (Santiago):** Cumplimiento de transmitancia máxima en techumbre $U \le 0.38\ \text{W/m}^2\text{K}$ ($R_{100} \ge 260$), aislación perimetral en muros y barrera de vapor continua para aprobación de Recepción Final en la DOM (Art. 5.1.6).
- **Nivel Base Normativo (Desde 19 UF/m² +IVA):** 100% conforme a la normativa legal para recepción municipal.
- **Nivel Confort & Eficiencia (22 a 24 UF/m² +IVA):** Termopanel DVH en recintos habitables, mayor densidad aislante y sellos perimetrales (hasta 40% de ahorro energético).
- **Nivel Premium / EIFS (26 a 29 UF/m² +IVA):** Envolvente térmica exterior continua (EIFS), eliminación total de puentes térmicos, apto para Calificación Energética de Viviendas (CEV).

---

## 7. Garantías Contractuales y Transparencia
- **Contrato a Suma Alzada:** Itemizado detallado con total transparencia en cada partida, sin cobros imprevistos.
- **Garantías Legales Art. 18 LGUC:** Hasta 10 años de garantía en la estructura soportante.
- **Expediente Técnico Completo:** Planos de arquitectura y memoria de cálculo listos para ingreso y recepción municipal en la DOM.

---

## 8. Canales Oficiales de Atención y Cotización
- **Cotizador Preliminar en Línea:** https://www.cuatropuntas.com/#cotizador
- **Agendamiento Oficial Visita a Terreno:** https://cal.com/cuatropuntas.com/visita-tecnica
- **WhatsApp Captura & SDR:** +56 9 2738 4075 (https://wa.me/56927384075)
- **Contacto Comercial / Cierre Humano:** +56 9 7909 2027
- **Email:** contacto@cuatropuntas.com
`;
  }

  // 4. SUBSIDIO MINVU DS1 SITIO PROPIO
  if (!markdown && page.includes('subsidio')) {
    markdown = `# Subsidio MINVU DS1 - Construcción en Sitio Propio
**Constructora Cuatropuntas SpA** | Santiago, Chile | https://www.cuatropuntas.com/subsidio-minvu-sitio-propio

Guía técnica integral y postulación para construir vivienda con subsidio del Estado en terreno propio en la Región Metropolitana.

## Tramos del Subsidio DS1
- **Tramo 1:** Hasta 950 UF de costo de construcción.
- **Tramo 2:** Hasta 1.400 UF de costo.
- **Tramo 3:** Hasta 2.200 UF de costo.

## Requisitos Principales
1. Terreno con título de dominio inscrito en el Conservador de Bienes Raíces (CBR) a nombre del postulante o cónyuge.
2. Certificado de Informaciones Previas (CIP) con factibilidad habitacional.
3. Factibilidad de servicios básicos (agua potable, alcantarillado, electricidad).
4. Ahorro mínimo en cuenta para la vivienda al último día hábil del mes anterior a la postulación.

## Servicio Integral Cuatropuntas
- Proyecto de Arquitectura y Cálculo Estructural conforme a la OGUC.
- Tramitación y gestión del Permiso de Edificación ante la Dirección de Obras Municipales (DOM).
- Ejecución completa de obras con contrato formal a suma alzada.
- Tramitación de Recepción Final Municipal.

Contacto: contacto@cuatropuntas.com / WhatsApp: +56 9 2738 4075
Agendamiento de Visita: https://cal.com/cuatropuntas.com/visita-tecnica
`;
  }

  // 5. PORTADA / DEFAULT
  if (!markdown) {
    markdown = `# Constructora Cuatro Puntas SpA
**Casas Nuevas Llave en Mano, Ampliaciones, Segundos Pisos y Quinchos en Santiago de Chile**
https://www.cuatropuntas.com

Constructora líder en la Región Metropolitana especializada en proyectos residenciales con metodología de faena limpia, contratos a suma alzada y estricto cumplimiento del Art. 4.1.10 de la OGUC.

## Catálogo de Servicios y Tarifas Base (Netas +IVA)
- **Casas Nuevas Llave en Mano (1 Piso):**
  - Metalcom Estructural: desde 19 UF/m²
  - Panel SIP / Covintec: desde 21 UF/m²
  - Albañilería Armada / Mixto: desde 25 UF/m²
- **Segundos Pisos y Ampliaciones:**
  - Metalcom: desde 22 UF/m²
  - Panel SIP: desde 24 UF/m²
  - Albañilería: desde 27 UF/m²
- **Quinchos y Terrazas de Alto Estándar:**
  - Metalcom: desde 12 UF/m²
  - Albañilería en obra: desde 15 UF/m²
- **Remodelaciones Integrales (>25 m²):** desde 11 UF/m²
- **Recintos Húmedos:** Baño completo (65-95 UF), Cocina integral (90-160 UF)

## Recursos para Agentes de Inteligencia Artificial (Agent-Ready)
- **Matriz de Precios (Markdown):** https://www.cuatropuntas.com/precios (Accept: text/markdown)
- **Blog Técnico (Markdown):** https://www.cuatropuntas.com/blog (Accept: text/markdown)
- **Resumen LLMs:** https://www.cuatropuntas.com/llms.txt
- **Documentación Completa LLMs:** https://www.cuatropuntas.com/llms-full.txt
- **Servidor MCP:** https://www.cuatropuntas.com/.well-known/mcp/server-card.json
- **Catálogo de Agent Skills:** https://www.cuatropuntas.com/.well-known/agent-skills/index.json
- **OAuth Protected Resource:** https://www.cuatropuntas.com/.well-known/oauth-protected-resource
- **Poppy Protocol:** https://www.cuatropuntas.com/.well-known/poppy.json

## Canales Oficiales
- **Cotizador Preliminar:** https://www.cuatropuntas.com/#cotizador
- **Visita Técnica a Terreno:** https://cal.com/cuatropuntas.com/visita-tecnica
- **WhatsApp Captura:** +56 9 2738 4075 (https://wa.me/56927384075)
- **Email:** contacto@cuatropuntas.com
`;
  }

  // Estimar tokens aproximados (1 token ~ 4 caracteres)
  const tokenCount = Math.ceil(markdown.length / 4);

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Vary', 'Accept');
  res.setHeader('x-markdown-tokens', tokenCount.toString());
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Link', '</llms.txt>; rel="describedby"; type="text/markdown", </.well-known/api-catalog>; rel="api-catalog", </.well-known/oauth-protected-resource>; rel="oauth-protected-resource"');
  res.status(200).send(markdown);
};
