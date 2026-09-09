# Technical Implementation Plan: 010 - Cumplimiento Térmico OGUC, Estándar de Precios y Artículo Técnico

**Feature ID:** `010_oguc_thermal_compliance_and_blog`  
**Estado:** DRAFT / PENDING USER APPROVAL  
**Metodología:** SDD (Spec-Driven Development) & TDD  

---

## 1. Arquitectura Técnica y Estrategia de Implementación

### 1.1. Principio Comercial: Blindaje de Precio Gancho con Transparencia Normativa
* El precio de **19 UF/m² +IVA** para Casas Nuevas y **22 UF/m² +IVA** para Segundos Pisos es el gancho de prospección principal y **no se incrementa ni se modifica**.
* Se añade una aclaración técnica explícita: dicho precio base **ya incluye** la aislación térmica obligatoria para obtener la Recepción Final municipal (DOM) bajo el Artículo 4.1.10 de la OGUC en la Zona 3 (Santiago).
* Se crea un cuadro comparativo de **3 Niveles de Desempeño Térmico** tanto en `public/index.html` como en `public/precios.html`:
  1. **Nivel Base Normativo (Desde 19 UF/m² +IVA):** Aislación reglamentaria obligatoria DOM ($U \le 0.38\ \text{W/m}^2\text{K}$, $R_{100} \ge 260$ en techumbre con lana mineral continua, barrera de vapor/humedad y vanos estándar).
  2. **Nivel Confort & Eficiencia (Desde 22 a 24 UF/m² +IVA):** Ventanas termopanel (doble vidriado hermético DVH) en recintos habitables, mayor densidad aislante y sellos herméticos.
  3. **Nivel Premium / EIFS (Desde 26 a 29 UF/m² +IVA):** Envolvente térmica exterior continua (EIFS) o Panel SIP de alta densidad, eliminación total de puentes térmicos y estándar Calificación Energética (CEV).

### 1.2. Modificaciones Quirúrgicas en Fichas de Servicios
* En `public/index.html` (Servicio 1: Casas Nuevas y Servicio 2: Segundos Pisos):
  - Actualizar los bullets para destacar el cumplimiento del Art. 4.1.10 de la OGUC y la tramitación del expediente de Recepción Final DOM (Art. 5.1.6).
* En `public/servicios/casas-nuevas.html` y `public/servicios/segundos-pisos.html`:
  - Enriquecer las descripciones de Metalcom y SIP detallando la barrera de vapor continua en cara cálida, espesores normativos y aptitud para recepción DOM.

### 1.3. Pipeline Editorial y Generación del Post Técnico
* **Fuente Markdown:** `content/drafts/normativa-aislacion-termica-oguc-santiago-precios.md`.
* **Procesamiento:** `node scripts/publish-blog.js content/drafts/normativa-aislacion-termica-oguc-santiago-precios.md`.
* **Destinos generados automáticamente:**
  - `public/blog/posts/normativa-aislacion-termica-oguc-santiago-precios.html`
  - `public/blog/posts.json`
  - `public/blog/index.html`
  - `public/sitemap.xml`
* **Elementos clave del post:**
  - Schema.org `TechArticle` y `FAQPage`.
  - Contenedor reactivo de comentarios `#blog-comments-container` con `data-slug="normativa-aislacion-termica-oguc-santiago-precios"`.
  - Teléfono oficial de WhatsApp: `+56 9 2738 4075` (E.164: `56927384075`).
  - Tabla comparativa de los 3 niveles térmicos y enlace al cotizador web `/precios` y `#contacto`.

### 1.4. Actualización del SSOT Editorial (`AGENTS.md`)
* Agregar el ítem 7 en la Sección 3 de `AGENTS.md` con los parámetros técnicos obligatorios de acondicionamiento térmico (Zona 3 RM, $U \le 0.38\ \text{W/m}^2\text{K}$, $R_{100} \ge 260$, Ley 21.305 y los 3 niveles comerciales).

---

## 2. Plan de Pruebas Automatizadas (TDD)

Archivo de prueba: `tests/normative-compliance.spec.js`

### Aserciones Planificadas:
1. **T01.1: Niveles de confort térmico y precio base en `index.html` y `precios.html`:**
   - Verifica que `index.html` y `precios.html` mencionen el precio base de 19 UF/m² y el cumplimiento de la OGUC Zona 3 RM.
   - Verifica la presencia del desglose de niveles (Base Normativo, Confort & Eficiencia, Premium EIFS).
2. **T01.2: Especificaciones técnicas en servicios (`casas-nuevas.html` y `segundos-pisos.html`):**
   - Verifica mención de Art. 4.1.10 OGUC y expediente de Recepción Final DOM (Art. 5.1.6).
3. **T01.3: Artículo técnico en el Blog (`normativa-aislacion-termica-oguc-santiago-precios.html`):**
   - Verifica existencia física del archivo.
   - Verifica título h1, Schema.org `TechArticle`, presencia de `#blog-comments-container` con el slug exacto.
   - Verifica ausencia de número prohibido y presencia del WhatsApp oficial `+56 9 2738 4075`.
4. **T01.4: Integridad de `AGENTS.md`:**
   - Verifica que `AGENTS.md` contenga los parámetros técnicos oficiales de la OGUC Zona 3 RM ($U \le 0.38$, $R_{100} \ge 260$).
