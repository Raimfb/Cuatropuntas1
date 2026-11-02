# Plan Técnico 026: Optimización SEO Técnico, Local GEO y Generative Engine Optimization (GEO)
**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-02  

---

## 1. Arquitectura de Cambios

```text
[Auditoría Integral Realizada]
          │
          ├──> 1. SEO Técnico Canónico y Enrutamiento Limpio
          │      ├── sitemap.xml: eliminar trailing slash en /blog
          │      ├── robots.txt: usar https://www.cuatropuntas.com
          │      ├── blog/index.html: canónico a /blog
          │      └── Reemplazo de links internos: href="/servicios/.../" y href="/blog/" -> sin slash
          │
          ├──> 2. Local GEO para Chile & RM
          │      ├── Inyección de etiquetas geo (CL-RM, Santiago, coordenadas) en 17 posts
          │      ├── Actualización del generador scripts/publish-blog.js para futuros posts
          │      └── Expansión de areaServed en index.html Schema con comunas residenciales
          │
          ├──> 3. Generative Engine Optimization (GEO) & Schema
          │      ├── Corrección de lowPrice: "11" en AggregateOffer (precios.html e index.html)
          │      ├── Schema TechArticle: agregar publisher logo y speakable en posts y scripts/publish-blog.js
          │      └── Actualización de llms.txt y llms-full.txt (blog, Cal.com, garantías LGUC Art. 18)
          │
          └──> 4. Verificación Automatizada & Despliegue
                 ├── Playwright test: tests/seo-geo-optimization.spec.js
                 ├── node -c en archivos modificados
                 └── Git commit + Push + Vercel deploy --prod
```

---

## 2. Estrategia de Implementación Quirúrgica

### Fase 1: SEO Técnico & Limpieza de Redirecciones 308
1. **`public/sitemap.xml`:** Modificar `<loc>https://www.cuatropuntas.com/blog/</loc>` por `<loc>https://www.cuatropuntas.com/blog</loc>`.
2. **`public/robots.txt`:** Asegurar URLs canónicas con `www.cuatropuntas.com`.
3. **`public/blog/index.html`:** Cambiar canónico a `https://www.cuatropuntas.com/blog`.
4. **Barrido de Enlaces Internos:** Actualizar todos los `href="/servicios/casas-nuevas/"`, `href="/servicios/segundos-pisos/"`, `href="/servicios/quinchos/"`, `href="/servicios/remodelaciones/"` y `href="/blog/"` en:
   - `public/index.html`
   - `public/precios.html`
   - `public/blog/index.html`
   - `public/subsidio-minvu-sitio-propio.html`
   - `public/politicas.html`
   - `public/servicios/*.html`
   - `public/blog/posts/*.html`
5. **Optimización de Snippets en Páginas de Servicios:**
   - Ajustar `title` y `meta description` para cumplir con las longitudes óptimas para Desktop y Mobile SERP sin cortar texto.

### Fase 2: Local GEO (Chile & Región Metropolitana)
1. **Metadatos Geo en 17 Artículos del Blog:**
   Inyectar en el bloque `<head>`:
   ```html
   <!-- Geo Tags (Local SEO Chile / RM) -->
   <meta name="geo.region" content="CL-RM">
   <meta name="geo.placename" content="Santiago">
   <meta name="geo.position" content="-33.448890;-70.669265">
   <meta name="ICBM" content="-33.448890, -70.669265">
   ```
2. **Actualización de `scripts/publish-blog.js`:**
   Asegurar que la plantilla de generación incluya estas metaetiquetas en todos los artículos futuros.
3. **Ampliación de `areaServed` en `public/index.html`:**
   Agregar comunas de alto valor: Chicureo, Vitacura, Lo Barnechea, Providencia, Ñuñoa, Pirque, Buin, Paine, Calera de Tango, Padre Hurtado.

### Fase 3: Generative Engine Optimization (GEO) & Schema
1. **Sincronización SSOT en `public/precios.html` y `public/index.html`:**
   Corregir `lowPrice` de `"8"` / `"12"` a `"11"` (remodelaciones ligeras en Metalcom desde 11 UF/m²).
2. **Ampliación de `public/llms.txt` y `public/llms-full.txt`:**
   - Incorporar enlaces canónicos al Blog Técnico (`https://www.cuatropuntas.com/blog`) y sus artículos pilar.
   - Enlace oficial a visitas técnicas en terreno (`https://cal.com/cuatropuntas.com/visita-tecnica`).
   - Citas expresas a garantías según Art. 18 de la LGUC (10 años fundaciones y estructura, 5 años instalaciones, 3 años terminaciones).
   - Estándar térmico Art. 4.1.10 OGUC y Ley 21.305 en Zona 3 RM.
3. **Schema `publisher` y `speakable` en Artículos del Blog:**
   Incorporar en el JSON-LD `TechArticle` de los posts y en `scripts/publish-blog.js`.

### Fase 4: Pruebas Automatizadas y Despliegue
1. Desarrollar suite de pruebas Playwright en `tests/seo-geo-optimization.spec.js`.
2. Validar que la suite corra localmente con 100% de éxito.
3. Validar sintaxis en scripts y APIs.
4. Desplegar en producción mediante Vercel CLI y verificar status HTTP 200.
