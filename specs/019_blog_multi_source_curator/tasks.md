# Desglose de Tareas: Spec 019 - Motor de Curaduría Multi-Fuente y Respaldo Evergreen para el Blog

**Feature ID:** `019_blog_multi_source_curator`  
**Estado:** COMPLETED  

---

## Tareas de Implementación

- [x] **T01: Crear suite automatizada TDD `tests/multi-source-curation.spec.js` (Red Phase)**
  - Validar que `loadEvergreenCatalog()` lee el archivo y retorna al menos 25 temas válidos con id, title, category, service y keywords.
  - Validar cascada de resolución:
    * Cuando YouTube provee tema no duplicado -> Selecciona Fuente 1 (`source: 'youtube'`).
    * Cuando YouTube falla (array vacío o 404) y RSS de arquitectura provee tema -> Selecciona Fuente 2 (`source: 'architecture_rss'`).
    * Cuando YouTube y RSS fallan o son duplicados -> Selecciona Fuente 3 (`source: 'evergreen_catalog'`).
  - Validar deduplicación semántica estricta contra entradas de `posts.json`.
  - Validar función `markEvergreenTopicAsUsed()` marcando el tema como `used: true`.
  - *Comando de verificación:* `npx playwright test tests/multi-source-curation.spec.js` (certificar fase roja controlada).

- [x] **T02: Crear Catálogo Evergreen en `content/evergreen-topics.json`**
  - Redactar al menos 25 temas comerciales de alto valor para Cuatropuntas:
    * 6 temas de Casas Nuevas (Metalcom, SIP, Albañilería, radieres H-20, recepciones DOM).
    * 6 temas de Segundos Pisos y Ampliaciones (Sobreelevación liviana, cálculo estructural, regularización).
    * 5 temas de Remodelaciones (Recintos húmedos, cañerías, baños, cocinas, vicios ocultos).
    * 5 temas de Quinchos y Terrazas (Cobertizos, asadores refractarios, exclusiones sanitarias, permisos DOM).
    * 3 temas de Eficiencia Térmica y Normativa (Zona 3 RM, OGUC 4.1.10, Art. 18 LGUC).
  - Incluir campos: `id`, `title`, `category`, `service`, `keywords`, `intent`, `used: false`, `lastUsedDate: null`.

- [x] **T03: Implementar Módulo de Curaduría Multi-Fuente en `scripts/auto-curate-and-publish.js`**
  - Implementar `fetchArchitectureRssFeed(url, timeoutMs)` y `extractArchitectureTopics(xmlContent)`.
  - Implementar `loadEvergreenCatalog(catalogPath)` y `markEvergreenTopicAsUsed(catalogPath, topicId)`.
  - Implementar `selectNextTopicMultiSource({ youtubeTopics, rssTopics, evergreenCatalog, existingPosts })`.
  - Conectar el selector en cascada en `autoCurateAndPublish()`, marcando el tema evergreen como usado al publicarse.
  - Mantener compatibilidad de exportaciones y proxy en `selectNextTopic()`.

- [x] **T04: Ejecutar Suite TDD (Green Phase) y Simulación Dry-Run**
  - Ejecutar `npx playwright test tests/multi-source-curation.spec.js` (pasar de rojo a verde, 100% aprobado).
  - Probar ejecución por terminal: `node scripts/auto-curate-and-publish.js --dry-run` para validar el selector en vivo.
  - Ejecutar `npx playwright test tests/blog-automation.spec.js tests/blog-image-generation.spec.js`.

- [x] **T05: Validación Global de No-Regresión, Documentación y Despliegue**
  - Ejecutar la suite global `npx playwright test` (garantizar los 109 tests preexistentes + nuevos en verde).
  - Actualizar `specs/019_blog_multi_source_curator/spec.md` y `tasks.md` a `COMPLETED`.
  - Actualizar `walkthrough.md`.
  - Commit: `feat(spec-019): motor de curaduria multi-fuente y respaldo evergreen para el blog`.
  - Push a `origin/main`.
