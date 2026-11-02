# Tareas Técnicas 026: Optimización SEO Técnico, Local GEO y Generative Engine Optimization (GEO)
**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-02  

---

## Desglose de Tareas de Ejecución

- [x] **Tarea 1: SEO Técnico Canónico y Redirecciones 308**
  - [x] 1.1 Modificar `public/sitemap.xml`: reemplazar `<loc>https://www.cuatropuntas.com/blog/</loc>` por `<loc>https://www.cuatropuntas.com/blog</loc>`.
  - [x] 1.2 Actualizar `public/robots.txt`: normalizar directivas a `https://www.cuatropuntas.com`.
  - [x] 1.3 Modificar `public/blog/index.html`: actualizar etiqueta canónica a `https://www.cuatropuntas.com/blog`.
  - [x] 1.4 Eliminar trailing slashes en enlaces internos de `public/index.html`, `public/precios.html`, `public/blog/index.html`, `public/subsidio-minvu-sitio-propio.html`, `public/politicas.html`, `public/servicios/*.html` y `public/blog/posts/*.html` (318 enlaces saneados).
  - [x] 1.5 Optimizar meta descriptions y títulos en `public/servicios/*.html` y `public/precios.html` para cumplir con los límites de longitud SERP sin truncamiento.

- [x] **Tarea 2: Local GEO (Chile & Región Metropolitana)**
  - [x] 2.1 Inyectar metaetiquetas geográficas (`geo.region`, `geo.placename`, `geo.position`, `ICBM`) en los 17 artículos de `public/blog/posts/*.html`.
  - [x] 2.2 Actualizar la función generadora de HTML en `scripts/publish-blog.js` para asegurar la inclusión automática de etiquetas GEO en futuros artículos.
  - [x] 2.3 Ampliar `areaServed` en `public/index.html` con las comunas de alta demanda residencial (Chicureo, Lo Barnechea, Vitacura, Providencia, Ñuñoa, Pirque, Buin, Paine, Calera de Tango, Padre Hurtado).

- [x] **Tarea 3: Generative Engine Optimization (GEO) & Schema**
  - [x] 3.1 Corregir `lowPrice` a `"11"` en Schema `AggregateOffer` en `public/precios.html` y `public/index.html`.
  - [x] 3.2 Actualizar `public/llms.txt` y `public/llms-full.txt` con enlaces canónicos al blog técnico, link de agendamiento Cal.com y citas a la LGUC Art. 18 / OGUC 4.1.10.
  - [x] 3.3 Enriquecer el Schema `TechArticle` en `scripts/publish-blog.js` y en los 17 posts con `publisher` y especificación `speakable`.

- [x] **Tarea 4: Verificación Automatizada & Despliegue**
  - [x] 4.1 Crear la suite de pruebas `tests/seo-geo-optimization.spec.js`.
  - [x] 4.2 Ejecutar suite Playwright y comprobar 100% de aserciones en verde (8/8 passed).
  - [x] 4.3 Ejecutar verificación de sintaxis con `node -c`.
  - [x] 4.4 Realizar commit en Git, push a `origin/main` y desplegar a producción con `vercel deploy --prod`.
  - [x] 4.5 Verificar endpoints y entregar reporte final.
