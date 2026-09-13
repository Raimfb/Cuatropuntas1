# Especificación de Requerimientos: Spec 019 - Motor de Curaduría Multi-Fuente y Respaldo Evergreen para el Blog

**Feature ID:** `019_blog_multi_source_curator`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** COMPLETED  

---

## 1. Resumen Ejecutivo y Diagnóstico de Resiliencia

El pipeline autónomo de publicación del blog (`scripts/auto-curate-and-publish.js`) opera como un motor editorial programado semanalmente vía GitHub Actions. Sin embargo, su arquitectura de ingesta presenta una vulnerabilidad crítica de punto único de falla (SPOF):

1. **Dependencia Monofuente:**
   - Depende exclusivamente de un feed RSS de YouTube. Si el canal no publica material afín a la construcción en Santiago, repite conceptos o su endpoint responde con errores (ej. HTTP 404 por cambios de ID de canal), el pipeline queda desabastecido.
2. **Banco de Contingencia Limitado:**
   - Posee un array estático de sólo 5 temas de contingencia hardcodeados en memoria (`CONTINGENCY_TOPIC_POOL`), que tras pocas semanas se agotan o entran en conflicto de deduplicación con artículos ya publicados.
3. **Falta de Catálogo Temático Evergreen Comercial:**
   - No existe un repositorio estructurado de temas perennes ("evergreen") de alta intención transaccional enfocado en los 4 servicios estratégicos de Constructora Cuatropuntas SpA: Casas Nuevas, Segundos Pisos / Ampliaciones, Remodelaciones y Quinchos de Alto Estándar, además del marco regulatorio DOM/OGUC.

El objetivo de la **Spec 019** es transformar el mecanismo de selección en un **Motor de Curaduría Multi-Fuente con Cascada Jerárquica** (YouTube -> RSS Especializado de Arquitectura Chilena -> Catálogo Evergreen Local de 25+ temas), asegurando una cadencia semanal 100% ininterrumpida, variedad editorial y cero fallas operativas.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Ingestión y Normalización de Fuentes

- **[EARS-019-01] Ingestión Prioritaria de Video (Fuente 1 - YouTube):**  
  **Cuando** el piloto automático inicie la búsqueda de temas:
  * El sistema **DEBE** consultar el feed RSS de YouTube con un timeout de 6000 ms y User-Agent identificado.
  * Si la respuesta es exitosa (HTTP 200), el sistema **DEBE** extraer títulos, enlaces y fechas, filtrando shorts y hashtags.
  * Si la fuente devuelve error (HTTP 404, 5xx o timeout), el sistema **DEBE** capturar la excepción con un log de advertencia (`[CURATOR WARNING]`) y delegar inmediatamente a la Fuente 2 sin abortar el proceso.

- **[EARS-019-02] Ingestión de Medios Especializados (Fuente 2 - RSS Arquitectura y Construcción Chile):**  
  **Mientras** no se disponga de un tema viable de la Fuente 1:
  * El sistema **DEBE** consultar feeds RSS de medios especializados chilenos (Plataforma Arquitectura / ArchDaily Chile `https://www.plataformaarquitectura.cl/cl/feed` y/o Madera21).
  * El sistema **DEBE** parsear la estructura XML (RSS 2.0 / Atom), extrayendo `title`, `link`, `description`/`summary` y `pubDate`.
  * El sistema **DEBE** aplicar filtros temáticos para priorizar artículos aplicables a vivienda unifamiliar, sistemas estructurales, aislación, madera/acero y trámites en Chile, descartando eventos efímeros, proyectos internacionales lejanos o noticias institucionales ajenas.
  * Si la Fuente 2 falla o no produce candidatos viables, el sistema **DEBE** delegar fluidamente a la Fuente 3.

- **[EARS-019-03] Catálogo Evergreen de Respaldo Inagotable (Fuente 3 - Local JSON):**  
  **El sistema DEBE** disponer de un archivo `content/evergreen-topics.json` con un mínimo de 25 temas técnicos y comerciales balanceados entre las 5 categorías clave de la empresa:
  1. *Casas Nuevas Llave en Mano* (Metalcom, SIP, Albañilería, radieres, fundaciones).
  2. *Segundos Pisos y Ampliaciones* (Sobreelevación liviana, cálculo estructural, regularización DOM).
  3. *Remodelaciones Integrales* (Recintos húmedos, baños, cocinas, partidas cerradas vs m²).
  4. *Quinchos y Terrazas de Alto Estándar* (Cobertizos, asadores refractarios, exclusiones sanitarias, permisos DOM).
  5. *Ingeniería, Eficiencia Térmica y Normativa* (OGUC Art. 4.1.10 Zona 3 RM, Ley 21.305, Art. 18 LGUC).
  * Cada registro **DEBE** estructurarse con: `id`, `title`, `category`, `service`, `keywords`, `intent` y estado `used: false`.

---

### 2.2. Cascada de Selección y Deduplicación Estricta

- **[EARS-019-04] Cascada Jerárquica de Selección:**  
  **Cuando** se invoque la función `selectNextTopicMultiSource()`:
  * El sistema **DEBE** evaluar secuencialmente:
    1. Candidatos no duplicados de la Fuente 1 (YouTube).
    2. Candidatos no duplicados de la Fuente 2 (RSS Arquitectura).
    3. Temas no duplicados del Catálogo Evergreen (Fuente 3).
    4. Fallback de emergencia último recurso.
  * El sistema **DEBE** retornar un objeto con `{ title, category, keywords, source, link? }`.

- **[EARS-019-05] Deduplicación Semántica Bidireccional:**  
  **Antes** de aceptar un tema candidato de cualquier fuente:
  * El sistema **DEBE** contrastarlo contra todos los artículos registrados en `public/blog/posts.json`.
  * La comparación **DEBE** normalizar cadenas eliminando acentos, puntuación y palabras vacías (*stop-words*).
  * Si el candidato coincide en título, slug o presenta 2 o más palabras clave discriminantes con un post existente, el sistema **DEBE** descartarlo como duplicado.

- **[EARS-019-06] Marcado de Consumo Evergreen:**  
  **Cuando** se seleccione y publique con éxito un tema proveniente del catálogo Evergreen:
  * El sistema **DEBE** marcar dicho registro como consumido (`used: true`, `lastUsedDate: YYYY-MM-DD`) en `content/evergreen-topics.json` para garantizar alternancia y evitar reutilizaciones consecutivas.

---

### 2.3. Cumplimiento Editorial y Calidad Visual (SSOT `AGENTS.md`)

- **[EARS-019-07] Alineación Comercial y Normativa Inviolable:**  
  **Independientemente** de la fuente seleccionada:
  * La redacción generada por Gemini **DEBE** cumplir taxativamente la matriz de precios oficial (19 UF/m² Casas, 22 UF/m² Segundos Pisos, 12 UF/m² Quinchos, 65-95 UF Baños, 90-160 UF Cocinas).
  * Debe incluir el ecosistema oficial de telefonía (+56 9 2738 4075 y agendamiento Cal.com) y omitir bajo toda circunstancia el número purgado 63482439.
  * Debe incorporar CTA directo a `https://www.cuatropuntas.com/#cotizador`.

- **[EARS-019-08] Portada Visual WebP Dedicada (<100 KB):**  
  **El sistema DEBE** compilar la portada en `public/blog/images/[slug].webp` con relación de aspecto 16:9 (1200x675 px) y peso estricto menor a 100 KB, garantizando métricas óptimas de Core Web Vitals (LCP).

---

## 3. Criterios de Aceptación Técnicos

1. `content/evergreen-topics.json` existe físicamente y contiene $\ge 25$ temas válidos con cobertura balanceada de los 4 servicios.
2. `tests/multi-source-curation.spec.js` valida de forma aislada y mockeada la cascada de 3 niveles, asegurando que si YouTube y RSS fallan, el catálogo Evergreen entregue un tema válido.
3. El pipeline no rompe retrocompatibilidad con `scripts/publish-blog.js` ni con el workflow de GitHub Actions.
4. Los 109 tests preexistentes del repositorio se mantienen al 100% en verde.
