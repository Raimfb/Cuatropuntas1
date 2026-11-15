# Spec 032: Disclaimer Estratégico de Vigencia de Valores en el Blog

- **Estado:** `IMPLEMENTED`
- **Metodología:** SDD (Specification-Driven Development)
- **Alcance:** Portada editorial del blog (`public/blog/index.html`), plantilla de compilación de nuevos artículos (`scripts/publish-blog.js`, compartida con `scripts/auto-curate-and-publish.js` y `scripts/self-heal-blog.js`) y cobertura TDD (`tests/blog-automation.spec.js`).
- **Exclusión explícita:** No se modifican retroactivamente las entradas HTML históricas ya publicadas en `public/blog/posts/*.html`.

---

## 1. Hallazgos de Auditoría (Solo Lectura)

### 1.1. Visualización actual de fechas de publicación
1. **Índice del Blog ([public/blog/index.html](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/blog/index.html)):**
   - **Tarjetas SSR estáticas (`L242-L245`, y tarjetas subsiguientes):** Muestran la fecha de publicación en la esquina superior derecha de cada tarjeta dentro de `<div class="flex justify-between items-center text-xs font-semibold text-secondary mb-3"><span>...</span><span class="text-gray-400">13 Nov 2026</span></div>`, generada por `formatDateSpanish()` (`scripts/publish-blog.js#L742`).
   - **Tarjetas CSR dinámicas (`renderPosts()`, `L746-L749`):** Replican exactamente la misma cabecera visual (`<span class="text-gray-400">${p.date}</span>`) leyendo el arreglo publicado en `/blog/posts.json`.
2. **Artículos individuales (`public/blog/posts/*.html`, ej. [guia-precios-construccion-chile.html](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/blog/posts/guia-precios-construccion-chile.html)):**
   - **Cabecera visual del artículo (`L222-L226`):** Dentro de `<article class="pt-32 pb-20 flex-grow"><header class="max-w-4xl mx-auto px-4 sm:px-6 mb-12">`, la fila superior muestra categoría, fecha (`<span class="text-gray-400">• 7 de Agosto, 2026</span>`) y tiempo de lectura, inmediatamente sobre el `<h1>` (`L227-L229`) y el extracto `<p>` (`L230-L232`).
   - **Datos estructurados JSON-LD (`L95`):** Nodo `TechArticle` con propiedad `"datePublished": "2026-08-07"`.

### 1.2. Ubicación estratégica en `public/blog/index.html`
- Dentro de `<!-- ===== Hero Header ===== -->` (`L200-L221`), inmediatamente debajo del subtítulo principal:
  ```html
  <p class="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto font-normal leading-relaxed mb-8">
      Respuestas claras sobre presupuestos en UF/m², normativas DOM, permisos de edificación y diferencias entre sistemas constructivos.
  </p>
  ```
  (`L209-L211`) y justo antes del buscador (`L214-L219`).
- Colocar el cintillo aquí asegura lectura inmediata *above-the-fold* (tanto en desktop como en móvil), vincula visualmente la advertencia con la fecha mostrada en las tarjetas del catálogo inferior, mantiene limpia la grilla de tarjetas (`#postsGrid`) y no interfiere con el buscador ni con el botón `https://cal.com/cuatropuntas.com/visita-tecnica` (`tests/verify.spec.js#L98`).

### 1.3. Evaluación del template para nuevos artículos
- Tanto el pipeline autónomo ([scripts/auto-curate-and-publish.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/scripts/auto-curate-and-publish.js#L679)) como el agente centinela ([scripts/self-heal-blog.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/scripts/self-heal-blog.js#L443)) delegan la generación HTML final a `compileAndPublishPost()` y `generatePostHtml()` dentro de [scripts/publish-blog.js](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/scripts/publish-blog.js#L486-L727).
- **Decisión técnica:** Sí conviene incorporar una línea sutil equivalente en `generatePostHtml()` (`scripts/publish-blog.js#L648`, al cierre de `<header class="max-w-4xl mx-auto px-4 sm:px-6 mb-12">`) inmediatamente después del `<p>` de extracto.
- **Restricción estructural (`SpeakableSpecification` y Markdown extractor):** `generatePostHtml()` declara `"cssSelector": ["h1", "article p:first-of-type", ".faq-answer"]` (`scripts/publish-blog.js#L456`). Por ello, el disclaimer en la plantilla del artículo debe usar una etiqueta `<div>` (y **nunca** `<p>`) para que `article p:first-of-type` continúe seleccionando el párrafo introductorio real (`postData.excerpt`). Esto protege también a todos los futuros artículos autocurados sin tocar las entradas históricas ya publicadas.

---

## 2. Requisitos Funcionales (Notación EARS)

- **REQ-032-01 (Cintillo de Vigencia en Portada del Blog):**  
  *Cuando* un usuario o agente cargue `public/blog/index.html`, *el sistema deberá mostrar* bajo el subtítulo principal del Hero Header (`L209-L211`) un cintillo discreto y legible (`id="blog-pricing-disclaimer"`, `role="note"`) con el texto exacto:  
  > **\*Nota sobre valores referenciales:** Los precios en UF/m² y estimaciones presupuestarias publicados en los artículos de este blog corresponden exclusivamente a las condiciones de mercado vigentes en la fecha de publicación indicada en cada entrada, por lo que pueden haber variado a la fecha actual. Para obtener una estimación actualizada según su proyecto y comuna en la RM, utilice nuestro [Cotizador Paramétrico Oficial](/#contacto).

- **REQ-032-02 (Enlace Canónico al Cotizador):**  
  *Dentro* del cintillo en `public/blog/index.html` y de la nota sutil en los nuevos artículos generados, *el texto* `Cotizador Paramétrico Oficial` *deberá enlazar* exactamente a `href="/#contacto"`.

- **REQ-032-03 (Nota Sutil en Template de Nuevos Artículos):**  
  *Cuando* `scripts/publish-blog.js` (`compileAndPublishPost()` / `generatePostHtml()`, usado también por `scripts/auto-curate-and-publish.js` y `scripts/self-heal-blog.js`) compile un nuevo artículo, *el HTML resultante deberá incluir* dentro del `<header>` del `<article>`, debajo del bloque fecha/extracto y usando un contenedor `<div>` (`class="blog-post-pricing-disclaimer ..."`), una nota discreta ligada a `${dateFormattedFull}`:  
  > **\*Nota sobre valores referenciales:** Los precios en UF/m² y estimaciones presupuestarias de este artículo reflejan condiciones vigentes al **${dateFormattedFull}** y pueden variar en la fecha actual. Obtenga una estimación vigente en nuestro [Cotizador Paramétrico Oficial](/#contacto).  
  Sin alterar retroactivamente los archivos HTML históricos ya publicados en `public/blog/posts/*.html`.

- **REQ-032-04 (Invariabilidad SEO, JSON-LD, Speakable y Tests Existentes):**  
  *Al implementar* los cambios de la Spec 032, *el sistema deberá mantener intactos*:
  - `<title>` y `<meta name="description">` de `public/blog/index.html` (`153` caracteres, dentro del rango `120–165` verificado por `tests/seo-geo-optimization.spec.js`).
  - Los esquemas `JSON-LD` (`Blog`, `BreadcrumbList`, `TechArticle`, `FAQPage`, `SpeakableSpecification` con `article p:first-of-type`).
  - Los marcadores `<!-- BLOG_SSR_POSTS_START -->` y el botón de agendamiento `https://cal.com/cuatropuntas.com/visita-tecnica` (`tests/verify.spec.js#L98`).

- **REQ-032-05 (Verificación Automatizada TDD T032):**  
  *El repositorio deberá contar* con pruebas automatizadas (`T032` en `tests/blog-automation.spec.js`) que validen:
  1. Presencia, visibilidad y redacción exacta del disclaimer con asterisco `*` en `public/blog/index.html`, incluyendo enlace `href="/#contacto"`.
  2. Presencia de la nota sutil de vigencia vinculada a la fecha de publicación y enlace `href="/#contacto"` en un post recién compilado por `scripts/publish-blog.js`, preservando `article p:first-of-type` sobre el extracto.
  3. Ejecución limpia y sin regresiones de la suite completa de Playwright.
