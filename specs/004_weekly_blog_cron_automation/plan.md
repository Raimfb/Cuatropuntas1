# Plan Técnico de Arquitectura: Spec 004 - Piloto Automático de Blog (Cron GitHub Actions)
**Feature ID:** `004_weekly_blog_cron_automation`  
**Estado:** PENDING APPROVAL  

---

## 1. Arquitectura del Sistema

```text
       ┌────────────────────────────────────────────────────────┐
       │   GitHub Actions (Cron Viernes 12:00 UTC / 09:00 CL)   │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │  Curaduría de Contenido (auto-curate-and-publish)│
          ├──────────────────────────────────────────────────┤
          │ 1. YouTube RSS Feed (@ConstruirSimple: UCigCw...) │
          │ 2. Filtrado de Shorts / Hashtags                 │
          │ 3. Filtro Anti-Duplicados vs public/posts.json   │
          │ 4. Fallback a Banco Técnico de Arquitectura CL   │
          └────────────────────────┬─────────────────────────┘
                                   │ Tema seleccionado
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │  Generación con Gemini 1.5/2.5 Pro/Flash         │
          ├──────────────────────────────────────────────────┤
          │ - Inyección del SSOT Cuatropuntas (AGENTS.md)    │
          │ - Normativa chilena: OGUC, DOM, Zona 3 RM        │
          │ - Matriz de precios (19 Metalcom, 21 SIP, 25 Alb)│
          │ - Estructura Markdown + YAML Frontmatter + FAQs  │
          └────────────────────────┬─────────────────────────┘
                                   │ Markdown generado
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │  Pipeline de Publicación (scripts/publish-blog)  │
          ├──────────────────────────────────────────────────┤
          │ 1. Guardar en content/drafts/[slug].md           │
          │ 2. Compilar HTML en public/blog/posts/[slug].html│
          │ 3. Actualizar public/blog/posts.json             │
          │ 4. Inyectar tarjeta SSR en public/blog/index.html│
          │ 5. Sincronizar public/sitemap.xml                │
          └────────────────────────┬─────────────────────────┘
                                   │
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │  Verificación de Calidad (Playwright)            │
          ├──────────────────────────────────────────────────┤
          │ - npx playwright test tests/blog-automation.spec │
          │ - Si falla: Rollback y abortar git push          │
          │ - Si pasa: git commit & push automático a main   │
          └──────────────────────────────────────────────────┘
```

---

## 2. Componentes Técnicos Detallados

### 2.1. Módulo de Curaduría y Generación (`scripts/auto-curate-and-publish.js`)
- **Feed YouTube Primario:**  
  URL: `https://www.youtube.com/feeds/videos.xml?channel_id=UCigCwSjY7u0zslMU1iMAGPA`
- **Filtro de Calidad de Entrada:**
  * Descarte de cadenas que comiencen con `#` o contengan más de 3 hashtags.
  * Extracción de títulos significativos (ej: *"El Error Que Calienta Tu Casa en Verano"*, *"Desde 2025 Ya No Puedes Construir Igual En Chile"*).
- **Control Anti-Duplicados:**
  * Carga `public/blog/posts.json`.
  * Compara similitud semántica y coincidencia de palabras clave (ej: si ya existe un post sobre "aislacion termica", prioriza temas de fundaciones, normativas DOM, techumbres o presupuestos).
- **Banco de Contingencia (Fallback Pool):**
  * Temas pre-calificados de alta intención de búsqueda en Chile:
    1. *Radier vs Sobrecimiento: Cuándo usar H-20 y cómo evitar fisuras por retracción plástica en Santiago*.
    2. *Ventanas Termopanel y Doble Vidriado: Por qué el marco de PVC o aluminio RPT es decisivo en la RM*.
    3. *Construcción en Pendiente y Muros de Contención: Requisitos estructurales y cálculo NCh*.
    4. *Techos de Teja Asfáltica vs Zinc vs Panel Teja: Comparativa de durabilidad e impermeabilización*.
- **Integración con Gemini:**
  * Utiliza `@google/generative-ai` con soporte para `process.env.GOOGLE_GENERATIVE_AI_API_KEY` o `process.env.GEMINI_API_KEY`.
  * Auto-descubre modelos disponibles (prioriza `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash`).
  * Prompt estricto del sistema: prohíbe inventar precios, impone la matriz oficial de `AGENTS.md`, exige vocabulario técnico chileno y salida en formato Markdown limpio con Frontmatter YAML y bloque de `faq`.
- **Sanitización y Teardown:**
  * Pasa el texto generado por `sanitizeContent` para erradicar cualquier número no autorizado.
  * Escribe el borrador en `content/drafts/[slug].md`.
  * Llama a `compileAndPublishPost` exportada por `scripts/publish-blog.js`.

---

### 2.2. Flujo de Automatización GitHub Actions (`.github/workflows/weekly-blog.yml`)
- **Configuración de Permisos:** `permissions: { contents: write }` para permitir al bot empujar los cambios compilados a `main`.
- **Triggers:**
  ```yaml
  on:
    schedule:
      - cron: '0 12 * * 5' # Todos los viernes a las 12:00 UTC (09:00 AM hora de Chile)
    workflow_dispatch:
      inputs:
        force_topic:
          description: 'Tema forzado para el artículo (opcional)'
          required: false
          default: ''
  ```
- **Pasos de Ejecución:**
  1. `actions/checkout@v4` con `fetch-depth: 0`.
  2. `actions/setup-node@v4` con Node 20.
  3. `npm ci` para instalación determinista.
  4. Ejecución del script:
     ```bash
     node scripts/auto-curate-and-publish.js ${{ github.event.inputs.force_topic && format('--force-topic="{0}"', github.event.inputs.force_topic) || '' }}
     ```
  5. Instalación de navegadores y pruebas Playwright:
     ```bash
     npx playwright install --with-deps chromium
     npx playwright test tests/blog-automation.spec.js
     ```
  6. Git Commit & Push:
     ```bash
     git config --local user.email "github-actions[bot]@users.noreply.github.com"
     git config --local user.name "github-actions[bot]"
     git add public/blog/ content/drafts/ public/sitemap.xml
     git diff-index --quiet HEAD || git commit -m "chore(blog): auto-publish weekly article [skip ci]"
     git push origin main
     ```

---

### 2.3. Suite de Pruebas Automatizadas (`tests/blog-cron-automation.spec.js`)
- Prueba 1: Parseo correcto del feed RSS de YouTube de `@ConstruirSimple` y extracción de items válidos.
- Prueba 2: Detección y filtrado de shorts y duplicados contra `public/blog/posts.json`.
- Prueba 3: Activación del fallback ante desconexión o agotamiento de temas.
- Prueba 4: Verificación de estructura del prompt de Gemini y cumplimiento estricto del SSOT de Cuatropuntas.
- Prueba 5: Validación de sintaxis YAML y estructura del workflow `.github/workflows/weekly-blog.yml`.
