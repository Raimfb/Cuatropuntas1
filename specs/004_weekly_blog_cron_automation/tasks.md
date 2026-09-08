# Tasks Breakdown: 004 - Piloto Automático de Blog (Cron GitHub Actions)
**Feature ID:** `004_weekly_blog_cron_automation`  
**Estado:** COMPLETED  
**Regla Estricta:** No marcar ninguna tarea como completada sin su comando de verificación ejecutado con éxito.

---

## Fase 1: Pruebas Automatizadas Primero (TDD / Red Phase)
- [x] **T01: Crear suite de pruebas de curaduría y automatización (`tests/blog-cron-automation.spec.js`)**
  - Archivo: `tests/blog-cron-automation.spec.js`
  - Diseñar tests para:
    1. Parseo y extracción de entradas del feed RSS de YouTube de `@ConstruirSimple`.
    2. Filtrado de videos shorts/hashtags y detección de temas duplicados contra `public/blog/posts.json`.
    3. Selección transparente del banco de contingencia ante fallos de conexión o falta de temas nuevos.
    4. Validación del prompt de Gemini (inyección del SSOT: teléfono `+56 9 2738 4075`, precios 19, 21, 25 UF, purga de `63482439`).
    5. Validación sintáctica y de triggers del workflow `.github/workflows/weekly-blog.yml`.
  - *Comando de verificación:* `npx playwright test tests/blog-cron-automation.spec.js` (Fase roja comprobada con 5 fallos iniciales).

---

## Fase 2: Script de Curaduría y Generación Gemini (Green Phase)
- [x] **T02: Implementar módulo extractor de temas y feed RSS en `scripts/auto-curate-and-publish.js`**
  - Implementar consulta al feed RSS del canal `@ConstruirSimple` (`UCigCwSjY7u0zslMU1iMAGPA`) con timeout de 6s.
  - Implementar lógica de descarte de hashtags/shorts y detector anti-duplicados contra `posts.json`.
  - Implementar banco de temas técnicos de contingencia de arquitectura y construcción en Chile.
  - Exportar funciones utilitarias `fetchCuratedTopics`, `filterDuplicateTopics` y `selectNextTopic`.
  - *Comando de verificación:* `node -c scripts/auto-curate-and-publish.js` (Código de salida 0).

- [x] **T03: Implementar generador de artículos con Gemini y puente con `publish-blog.js`**
  - Integrar `@google/generative-ai` con soporte dual para `GOOGLE_GENERATIVE_AI_API_KEY` y `GEMINI_API_KEY`.
  - Diseñar el System Prompt con el protocolo editorial estricto de Cuatropuntas.
  - Guardar el borrador en `content/drafts/[slug].md`.
  - Conectar con `compileAndPublishPost` para generar el HTML y actualizar catálogos.
  - Implementar soporte para flags CLI (`--dry-run`, `--force-topic="..."`).
  - *Comando de verificación:* `node scripts/auto-curate-and-publish.js --dry-run` (Simulación exitosa con código de salida 0).

---

## Fase 3: Workflow de GitHub Actions y Configuración
- [x] **T04: Implementar workflow `.github/workflows/weekly-blog.yml` y actualizar `.env.example`**
  - Crear el workflow con trigger cron para todos los viernes a las 12:00 UTC (09:00 CL) y trigger manual `workflow_dispatch`.
  - Configurar permisos de escritura `permissions: { contents: write }`.
  - Configurar ejecución de `scripts/auto-curate-and-publish.js`, pruebas Playwright y `git commit` / `git push` condicional.
  - Actualizar `.env.example` documentando `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` para GitHub Secrets.
  - *Comando de verificación:* `npx playwright test tests/blog-cron-automation.spec.js -g "Workflow"` (Validación de estructura CI/CD en verde).

---

## Fase 4: Verificación Integral y Certificación Final
- [x] **T05: Ejecución completa de pruebas unitarias y regresión total**
  - Ejecutar `tests/blog-cron-automation.spec.js` validando el 100% de los casos (5/5 en verde).
  - Ejecutar `npx playwright test` confirmando que todas las suites (Spec 001, Spec 002, Spec 003, Spec 004 y Verificación) sigan pasando al 100% en verde.
  - *Comando de verificación:* `npx playwright test` (51 passed en 19.4s).
