# Especificación 026: Optimización SEO Técnico, Local GEO (Chile/RM) y Generative Engine Optimization (GEO)
**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-02  
**Estado:** Aprobado / En Ejecución  

---

## 1. Contexto y Objetivos de Negocio
Constructora Cuatropuntas SpA requiere maximizar su presencia orgánica en dos frentes complementarios:
1. **Motores de Búsqueda Tradicionales (Google, Bing):** Posicionar orgánicamente para términos de alta intención comercial y técnica en la Región Metropolitana de Santiago ("constructora en santiago", "precios construccion m2 chile", "segundo piso metalcom", "quinchos albañileria santiago", "permisos dom santiago").
2. **Motores de Respuesta Generativa (GEO - ChatGPT Search, Perplexity, Gemini, Claude):** Convertir el sitio en la fuente canónica de mayor autoridad y confiabilidad para consultas de costos de construcción residencial, normativa OGUC (aislación térmica Zona 3 RM), garantías legales (Art. 18 LGUC) y contratos a suma alzada en Chile.

---

## 2. Diagnóstico y Hallazgos Críticos de la Auditoría

| Área Auditada | Estado Previo | Impacto Negativo / Oportunidad |
| :--- | :--- | :--- |
| **Sitemap XML & Trailing Slashes** | `sitemap.xml` declaraba `/blog/` con slash final. `vercel.json` tiene `trailingSlash: false`. Cientos de enlaces internos con `/servicios/xxx/` y `/blog/`. | Generaba bucles de redirección 308 en cada clic y rastreo de bots, desperdiciando crawl budget y generando alertas en Google Search Console. |
| **Canónicos de URL** | `public/blog/index.html` tenía canónico apuntando a `/blog/` en vez de `/blog`. | Inconsistencia canónica con el enrutamiento limpio de Vercel. |
| **Consistencia Schema SSOT** | `precios.html` declaraba `lowPrice: "8"` y `index.html` `lowPrice: "12"`. | Conflicto con la matriz de precios oficial SSOT (remodelaciones desde 11 UF/m², quinchos desde 12 UF/m²). |
| **Etiquetas GEO en Blog** | 17 de 17 artículos técnicos carecían de etiquetas `geo.region`, `geo.placename`, `geo.position` e `ICBM`. | Desconexión geográfica de búsquedas locales chilenas en el 100% de los posts del blog. |
| **Comunas de Alto Valor (RM)** | `LocalBusiness.areaServed` en `index.html` omitía comunas residenciales y parcelas clave como Chicureo, Vitacura, Lo Barnechea, Providencia, Ñuñoa, Pirque, Buin, Paine, Calera de Tango. | Pérdida de relevancia semántica local en zonas de mayor ticket promedio. |
| **Snippets SERP Truncados** | Meta descriptions en páginas de servicios superaban 200 caracteres (máx. recomendado ~155-160). | Truncamiento antiestético en los resultados de Google y pérdida de CTR. |
| **Catálogo LLM (`llms.txt`)** | Omitía enlaces directos al blog técnico, al agendamiento Cal.com y citas a la Ley General de Urbanismo y Construcciones (LGUC). | Menor tasa de citación y atribución en agentes generativos. |
| **Schema Speakable y Publisher** | Los artículos del blog carecían de especificación `Speakable` y logo institucional en `TechArticle`. | Limitación para extracción directa en fragmentos destacados por voz o respuestas IA conversacionales. |

---

## 3. Requisitos Funcionales y Técnicos (Sintaxis EARS)

### 3.1. Requisitos de SEO Técnico
- **REQ-SEO-01 (Inmediatez de Canónicos limpios):** Cuando un rastreador web inspeccione cualquier página HTML del sitio, el sistema DEBE proveer un enlace canónico absoluto sin trailing slash (salvo la raíz `/`).
- **REQ-SEO-02 (Eliminación de Redirecciones 308 Internas):** Cuando cualquier componente de navegación, pie de página o enlace interno haga referencia a `/blog` o `/servicios/[slug]`, el sistema DEBE enlazar a la URL limpia sin trailing slash.
- **REQ-SEO-03 (Sincronización del Sitemap):** Cuando los motores de búsqueda descarguen `public/sitemap.xml`, todas las URLs DEBEN coincidir exactamente con las rutas canónicas del sitio, eliminando el slash final en `https://www.cuatropuntas.com/blog`.
- **REQ-SEO-04 (Robots.txt Canónico):** Cuando un bot lea `public/robots.txt`, las directivas `Sitemap` y `Agentmap` DEBEN apuntar al dominio canónico oficial con subdominio `www`.
- **REQ-SEO-05 (Optimización de Snippets SERP):** Cuando se desplieguen los metadatos en Google SERP, las meta descriptions de las páginas de servicios DEBEN tener entre 140 y 160 caracteres y los títulos no superar 70 caracteres para evitar truncamiento.

### 3.2. Requisitos de Local GEO (Chile & Región Metropolitana)
- **REQ-GEO-01 (Etiquetado Geográfico Universal):** Cuando se cargue cualquier archivo HTML del blog (`public/blog/posts/*.html`) o páginas principales, el sistema DEBE incluir las etiquetas meta `geo.region` (`CL-RM`), `geo.placename` (`Santiago`), `geo.position` (`-33.448890;-70.669265`) e `ICBM`.
- **REQ-GEO-02 (Automatización de GEO en Pipeline del Blog):** Cuando se compile un nuevo post mediante `scripts/publish-blog.js`, el compilador DEBE inyectar automáticamente los metadatos GEO chilenos en el `<head>`.
- **REQ-GEO-03 (Cobertura Ampliada de Comunas en Schema):** Cuando los rastreadores lean `LocalBusiness.areaServed` en `public/index.html`, el sistema DEBE incluir formalmente las comunas objetivo de alto ticket: Chicureo, Lo Barnechea, Vitacura, Providencia, Ñuñoa, Pirque, Buin, Paine, Calera de Tango y Padre Hurtado.

### 3.3. Requisitos de Generative Engine Optimization (GEO) y Schema
- **REQ-AI-01 (Sincronización de Precios en Schema):** Cuando se consulte el Schema `AggregateOffer` en `precios.html` y `index.html`, `lowPrice` DEBE reflejar el valor mínimo oficial de la matriz SSOT: `"11"` UF/m² (remodelaciones).
- **REQ-AI-02 (Optimización de `llms.txt` y `llms-full.txt`):** Cuando agentes de IA consulten los archivos LLM, el sistema DEBE proporcionar enlaces directos a guías técnicas clave del blog, el link oficial de agendamiento en terreno (`https://cal.com/cuatropuntas.com/visita-tecnica`), el estándar térmico OGUC Art. 4.1.10 y las garantías del Art. 18 LGUC.
- **REQ-AI-03 (Schema Speakable & Publisher en Blog):** Cuando motores de IA analicen el Schema `TechArticle` de un post del blog, el documento DEBE incluir `publisher` con logotipo oficial y `speakable` orientado a titulares, primer párrafo explicativo y respuestas de preguntas frecuentes.

---

## 4. Criterios de Aceptación Técnicos
1. `tests/seo-geo-optimization.spec.js` debe verificar con 100% de éxito:
   - Cero enlaces internos con trailing slash en páginas principales y posts.
   - Presencia de meta etiquetas GEO en el 100% de los 17 posts del blog y en páginas raíz/servicios.
   - Sincronización canónica en `sitemap.xml` y `blog/index.html`.
   - Schema `AggregateOffer` con `lowPrice` = `"11"`.
   - Presencia de entidades clave en `llms.txt` y `llms-full.txt`.
2. `scripts/publish-blog.js` probado y validado con los nuevos metadatos y schema.
3. Despliegue exitoso en producción (`vercel deploy --prod`) con HTTP 200 en las rutas actualizadas.
