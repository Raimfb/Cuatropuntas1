# Feature Specification: 010 - Cumplimiento Térmico OGUC (Art. 4.1.10), Estándar de Precios y Artículo Técnico de Autoridad

**Feature ID:** `010_oguc_thermal_compliance_and_blog`  
**Estado:** APROBADO / IMPLEMENTADO  
**Fecha:** Septiembre 2026  
**Área:** Cumplimiento Normativo, Estrategia Comercial, SEO & Blog Editorial

---

## 1. Contexto y Justificación Comercial

En el mercado residencial de Santiago (Región Metropolitana), la Dirección de Obras Municipales (DOM) ha intensificado las fiscalizaciones de Recepción Final definitiva exigiendo el cumplimiento estricto del **Artículo 4.1.10 de la Ordenanza General de Urbanismo y Construcciones (OGUC)** relativo al acondicionamiento térmico de la envolvente (Zona Térmica 3) y la **Ley N° 21.305** de Eficiencia Energética.

Comercialmente, muchos prospectos dudan de si el precio base de **19 UF/m² +IVA** incluye la aislación legal requerida para obtener la Recepción Final en la DOM o si se trata de una obra "en bruto" que requerirá sobrecostos sorpresa.

Esta especificación tiene por objetivo:
1. **Blindar el precio gancho oficial:** Reafirmar con total transparencia que el estándar base de **19 UF/m² +IVA** (Metalcom) incluye el 100% de la aislación térmica obligatoria para recepción DOM en Santiago ($U \le 0.38\ \text{W/m}^2\text{K}$, $R_{100} \ge 260$ en techumbre, barrera de vapor continua y aislación en muros).
2. **Estructurar 3 niveles térmicos transparentes:** Base Normativo (19 UF/m²), Confort & Eficiencia (22-24 UF/m² con termopaneles) y Premium EIFS (26-29 UF/m² sin puentes térmicos).
3. **Publicar un artículo técnico de autoridad SEO:** Convertir esta exigencia técnica en una palanca de confianza y captura de leads calificados en el blog institucional.
4. **Actualizar el SSOT (`AGENTS.md`):** Consolidar los parámetros térmicos oficiales para que los agentes y el cron semanal de contenidos generen información alineada.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Blindaje Comercial y Niveles de Precios en Portada y Páginas de Precios
- **[EARS-010-01] Ubiquitous:** El sistema **DEBE** mantener el precio base oficial de **19 UF/m² +IVA** para Casas Nuevas en Metalcom y **22 UF/m² +IVA** para Segundos Pisos como estándar llave en mano habitable con cumplimiento normativo de la OGUC.
- **[EARS-010-02] When:** Cuando un usuario consulta las tablas o secciones de precios en `public/index.html` y `public/precios.html`, el sistema **DEBE** presentar una glosa explicativa clara que distinga los tres niveles de confort térmico:
  - *Nivel Base Normativo (19 UF/m² +IVA):* Aislación reglamentaria obligatoria para Recepción Final DOM (techumbre $U \le 0.38\ \text{W/m}^2\text{K}$, $R_{100} \ge 260$ en cielo, barrera de humedad/vapor continua y ventanas estándar).
  - *Nivel Confort & Eficiencia (22 a 24 UF/m² +IVA):* Incorporación de ventanas termopanel (doble vidriado hermético DVH) en recintos habitables y mayor densidad aislante.
  - *Nivel Premium / EIFS (26 a 29 UF/m² +IVA):* Envolvente térmica exterior continua (EIFS) o Panel SIP de alta densidad, eliminación de puentes térmicos y estándar apto para Calificación Energética de Viviendas (CEV).

### 2.2. Enriquecimiento Técnico en Fichas de Servicios
- **[EARS-010-03] State-Driven:** Mientras el usuario visualiza las tarjetas y páginas de detalle de *Casas Nuevas* (`public/servicios/casas-nuevas.html`), *Segundos Pisos* (`public/servicios/segundos-pisos.html`) y la portada (`public/index.html`), el sistema **DEBE** destacar en las especificaciones técnicas:
  - Cumplimiento estricto del Art. 4.1.10 de la OGUC (Zona 3 RM).
  - Elaboración de memoria de cálculo térmico y expediente para Recepción Final definitiva en la DOM (Art. 5.1.6 OGUC).
  - Estructura liviana en Metalcom con barreras hidrófugas y de vapor continuas.

### 2.3. Publicación del Artículo Técnico de Autoridad en el Blog
- **[EARS-010-04] Event-Driven:** Al ejecutarse el pipeline de publicación (`scripts/publish-blog.js`), el sistema **DEBE** compilar y publicar en `public/blog/posts/` el artículo:
  - **Título:** *Nueva Reglamentación Térmica OGUC en Santiago: Qué exige la DOM para aprobar tu casa o ampliación*
  - **Slug:** `normativa-aislacion-termica-oguc-santiago-precios`
  - **Contenido Técnico:** Explicación práctica de las razones por las que la aislación antigua es rechazada en la DOM, cálculo de transmitancia $U \le 0.38$ y resistencia $R_{100} \ge 260$, comparativa constructiva (Metalcom vs. SIP vs. EIFS), análisis de amortización del termopanel en climatización y cuadro de rangos de precios (19, 22-24 y 26-29 UF/m²).
  - **Metadata & SEO:** Marcado Schema.org `TechArticle` con entidad `FAQPage` integrada, meta tags Open Graph y Twitter Cards.
  - **Conversión & Comunidad:** Contenedor reactivo `#blog-comments-container` con `data-slug="normativa-aislacion-termica-oguc-santiago-precios"`, enlace directo al cotizador en línea y botón de WhatsApp oficial (`+56 9 2738 4075`).
  - **Sincronización:** Registro automático en `public/blog/posts.json`, `public/blog/index.html` y `public/sitemap.xml`.

### 2.4. Consolidación de Parámetros en SSOT (`AGENTS.md`)
- **[EARS-010-05] Ubiquitous:** El sistema **DEBE** documentar en la Sección 3 de `AGENTS.md` los parámetros térmicos oficiales y la definición de los 3 niveles para que todos los prompts de IA, cotizadores y publicaciones editoriales mantengan una única fuente de verdad inalterable.

### 2.5. Verificación Automatizada y Regresión Cero
- **[EARS-010-06] Ubiquitous:** El sistema **DEBE** certificar mediante la suite Playwright `tests/normative-compliance.spec.js` que las fichas técnicas, precios, artículo del blog y marcado Schema.org cumplen con los requisitos, garantizando que los 72 tests globales existentes sigan en verde (76+ tests en total).

---

## 3. Criterios de Aceptación Técnicos
1. `tests/normative-compliance.spec.js` creado y pasando al 100%.
2. `public/index.html`, `public/precios.html`, `public/servicios/casas-nuevas.html` y `public/servicios/segundos-pisos.html` actualizados quirúrgicamente sin alterar precios gancho (19 UF y 22 UF).
3. `public/blog/posts/normativa-aislacion-termica-oguc-santiago-precios.html` generado y accesible con su imagen, metadata Schema.org, widget de comentarios y enlace a WhatsApp oficial `+56 9 2738 4075`.
4. `AGENTS.md` actualizado en su sección de parámetros técnicos.
5. Suite global de pruebas ejecutada con 0 fallos (`npx playwright test`).
