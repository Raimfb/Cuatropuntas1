# Especificación de Requerimientos: Spec 004 - Piloto Automático de Blog (Cron GitHub Actions)
**Feature ID:** `004_weekly_blog_cron_automation`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** PENDING APPROVAL  

---

## 1. Resumen Ejecutivo y Propósito
Automatizar al 100% el ciclo de curaduría, redacción, compilación, prueba y publicación de contenido semanal en el blog de Constructora Cuatropuntas SpA mediante un flujo desatendido ejecutado por GitHub Actions. El sistema rastreará los temas más recientes de fuentes de construcción en Chile (incluyendo el feed RSS público de `@ConstruirSimple`), generará artículos técnicos de alto valor pedagógico y comercial usando modelos Gemini (`GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`), sincronizará el catálogo estático del blog y publicará los cambios mediante commits automatizados todos los viernes por la mañana.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Requerimientos Ubicuos (Ubiquitous Requirements)
- **UB-01 (Fuente Primaria de Curaduría):** El sistema **deberá** consultar el feed RSS público de YouTube del canal `@ConstruirSimple` (`https://www.youtube.com/feeds/videos.xml?channel_id=UCigCwSjY7u0zslMU1iMAGPA`) para extraer títulos y descripciones recientes.
- **UB-02 (Anti-Duplicidad e Historial):** El sistema **deberá** cotejar cualquier tema candidato contra los títulos, slugs y tags registrados en `public/blog/posts.json` para evitar generar artículos redundantes o repetidos.
- **UB-03 (Cumplimiento de Protocolo Editorial SSOT):** Todo artículo generado **deberá** cumplir estrictamente con las directrices de `AGENTS.md` y de la skill `blog-publisher`:
  * Telefonía oficial: `+56 9 2738 4075` (`https://wa.me/56927384075`).
  * Agendamiento oficial: `https://cal.com/cuatropuntas.com/visita-tecnica`.
  * Purga estricta: Cero menciones al número obsoleto `63482439`.
  * Matriz oficial de costos: Precios netos vigentes (Metalcom 19 UF, SIP 21 UF, Albañilería 25 UF).
  * Estructura: Título, resumen, tabla de costos GFM, FAQs con Schema.org `FAQPage` y `TechArticle`/`Article`.
- **UB-04 (Compilador Oficial):** El sistema **deberá** invocar a `scripts/publish-blog.js` (`compileAndPublishPost`) para materializar el artículo y sincronizar atómicamente `posts/[slug].html`, `posts.json`, `index.html` y `sitemap.xml`.

### 2.2. Requerimientos Basados en Eventos (Event-Driven Requirements)
- **EV-01 (Disparo Programado Cron):** **Cuando** el reloj del planificador de GitHub Actions alcance las 12:00 UTC (09:00 AM hora de Chile) de cada viernes, el flujo de trabajo `.github/workflows/weekly-blog.yml` **deberá** iniciar su ejecución desatendida.
- **EV-02 (Disparo Manual Dispatch):** **Cuando** un administrador o desarrollador ejecute el evento `workflow_dispatch` desde GitHub o la API, el sistema **deberá** permitir la ejecución inmediata con o sin parámetro opcional de tema forzado (`topic`).
- **EV-03 (Publicación Exitosa con Tests Verificados):** **Cuando** el artículo haya sido generado y la suite de pruebas `tests/blog-automation.spec.js` pase al 100% en verde, el flujo de trabajo **deberá** ejecutar `git commit` y `git push` a la rama `main` con la firma `github-actions[bot]`.

### 2.3. Requerimientos de Estado (State-Driven Requirements)
- **ST-01 (Filtro de Contenido no Apto):** **Mientras** se procesen las entradas del feed RSS de YouTube, el sistema **deberá** descartar videos clasificados como "Shorts" o títulos compuestos exclusivamente de hashtags (ej: `#arquitectura #casas...`) o con menos de 4 palabras sustantivas.
- **ST-02 (Modo Dry-Run Local):** **Mientras** el script se ejecute con el flag `--dry-run`, el sistema **deberá** simular la curaduría y generación con Gemini sin escribir archivos en `public/` ni alterar `posts.json`.

### 2.4. Requerimientos No Deseados y Fallbacks (Unwanted Behavior / Fail-Safe)
- **UN-01 (Fallo de Conexión al Feed RSS):** **Si** el feed de YouTube no responde o supera el timeout de 6 segundos, el sistema **deberá** activar de forma transparente el banco de temas técnicos de contingencia de arquitectura y construcción en Chile sin abortar el proceso.
- **UN-02 (Agotamiento de Temas Nuevos en YouTube):** **Si** todos los videos recientes del canal ya fueron cubiertos en publicaciones previas de `posts.json`, el sistema **deberá** seleccionar el siguiente tema prioritario del banco de contingencia.
- **UN-03 (Fallo de API Key de Gemini):** **Si** no se detecta `GOOGLE_GENERATIVE_AI_API_KEY` ni `GEMINI_API_KEY` o la cuota de la API está excedida, el sistema **deberá** arrojar un error semántico explícito en los logs de GitHub Actions y fallar el job de forma segura sin corromper el repositorio.
- **UN-04 (Fallo en Pruebas de Calidad):** **Si** tras la generación alguna prueba de Playwright falla, el flujo **deberá** abortar el `git push`, descartar los cambios sucios y registrar el fallo para auditoría humana.

---

## 3. Criterios de Aceptación Técnicos
1. El script `scripts/auto-curate-and-publish.js` puede ejecutarse por CLI con código de salida 0.
2. El flujo detecta correctamente el feed de `@ConstruirSimple` (`UCigCwSjY7u0zslMU1iMAGPA`) y extrae temas reales.
3. El prompt de generación inyecta automáticamente el SSOT de Cuatropuntas y genera un documento Markdown válido con frontmatter.
4. El archivo `.github/workflows/weekly-blog.yml` contiene la sintaxis válida de GitHub Actions con cron `0 12 * * 5`, permisos de escritura de contenido y secretos de Gemini.
5. Existe una suite de pruebas Playwright (`tests/blog-cron-automation.spec.js`) que valida la lógica de curaduría, anti-duplicidad, fallback y sintaxis del workflow.
