# Feature Specification: 011 - Simplificación Comercial y Desescalada de Tecnicismos Térmicos

**Feature ID:** `011_commercial_copy_simplification`  
**Estado:** APROBADO / IMPLEMENTADO  
**Fecha:** Septiembre 2026  
**Área:** Estrategia de Marca, Copywriting Comercial, UX Conversión & Cumplimiento Normativo  

---

## 1. Contexto y Justificación Comercial

En la iteración previa (Spec 010), se incorporaron salvaguardas técnicas esenciales para transparentar que el precio base oficial de **19 UF/m² +IVA** cumple con las exigencias de aislación reglamentaria en Santiago para obtener la Recepción Final en la DOM.

No obstante, la implementación introdujo citas directas a decretos y fórmulas matemáticas complejas ("Art. 4.1.10 OGUC", "U &le; 0.38 W/m²K", "R100 &ge; 260", "Art. 5.1.6") directamente en el embudo comercial principal (`public/index.html`, `public/precios.html` y `public/servicios/*`).

### Diagnóstico de Fricción Comercial:
1. **Distorsión de Posicionamiento de Marca:** La sobrecarga de fórmulas genera la percepción equívoca de que Cuatropuntas es un laboratorio de aislación térmica o un subcontratista de revestimientos, en lugar de una **Constructora General Integral Llave en Mano** especializada en casas, segundos pisos y quinchos.
2. **Fricción Cognitiva en el Cliente Particular:** El comprador residencial busca certidumbre sobre dos necesidades humanas: *"¿mi casa será cómoda en invierno y verano?"* y *"¿obtendré la recepción municipal sin multas ni problemas legales?"*. Las fórmulas numéricas generan confusión y dudas innecesarias en la fase de cotización inicial.
3. **Rigidez ante Cambios Regulatorios:** Anclar números de artículos legales en el diseño de tarjetas de venta expone al sitio a desactualización ante modificaciones reglamentarias de la OGUC o decretos del MINVU.

### Solución Estratégica:
- **Páginas de Venta (`/`, `/precios`, `/servicios/*`):** Traducir los tecnicismos a **certezas y beneficios directos de habitabilidad** (confort térmico para el clima de Santiago, ahorro energético tangible y carpeta técnica completa lista para aprobación municipal en la DOM).
- **Blog Técnico (`/blog/posts/*`):** Conservar y potenciar el artículo técnico como el canal exclusivo de autoridad y SEO técnico donde conviven las fórmulas de transmitancia, cálculos y referencias normativas profundas.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Desescalada de Copys en Portada y Catálogo de Precios
- **[EARS-011-01] Ubiquitous:** El sistema **DEBE** mantener inalterados los valores base oficiales (**19 UF/m² +IVA** para Casas Nuevas y **22 UF/m² +IVA** para Segundos Pisos) y la estructura de **3 Niveles de Inversión** en todo el sitio web.
- **[EARS-011-02] State-Driven:** Mientras el usuario visualiza las tarjetas de servicios y la sección de precios en `public/index.html` y `public/precios.html`, el sistema **DEBE** presentar los niveles de terminación en términos de confort habitable y garantía municipal, sin incluir citas textuales a artículos reglamentarios ni fórmulas de laboratorio:
  - *Nivel Base Normativo (Desde 19 UF/m² +IVA):* Obra habitable llave en mano con aislación térmica reglamentaria completa en techumbre y muros, garantizando la aprobación de la carpeta técnica en la DOM.
  - *Nivel Confort & Eficiencia (Desde 22 a 24 UF/m² +IVA):* Incorpora ventanas termopanel (DVH) en recintos habitables, mayor aislación acústica del entorno urbano y ahorro de hasta 40% en climatización.
  - *Nivel Premium / EIFS (Desde 26 a 29 UF/m² +IVA):* Envolvente térmica continua exterior de alta densidad, eliminación de pérdidas de calor y estándar de calificación energética superior.

### 2.2. Humanización de Especificaciones en Fichas de Servicios
- **[EARS-011-03] State-Driven:** Mientras el usuario consulta las páginas de detalle de servicios (`public/servicios/casas-nuevas.html` y `public/servicios/segundos-pisos.html`), el sistema **DEBE** comunicar las características de los sistemas constructivos (Metalcom y SIP) y las fases de obra enfocadas en durabilidad, control de humedad y tramitación municipal:
  - Casas Nuevas: Aislación integral adaptada al clima de Santiago, barreras de vapor/humedad para evitar condensaciones y tramitación de carpeta técnica completa hasta la entrega formal de llaves.
  - Segundos Pisos: Montaje liviano en seco sin recargar cimientos, losas con aislación termoacústica de entrepiso y expediente municipal para regularización definitiva.

### 2.3. Preservación del Rigor Técnico en el Blog de Autoridad
- **[EARS-011-04] Ubiquitous:** El sistema **DEBE** mantener intacto el contenido y marcado estructurado del artículo `public/blog/posts/normativa-aislacion-termica-oguc-santiago-precios.html`, preservando las explicaciones matemáticas de transmitancia ($U \le 0.38\ \text{W/m}^2\text{K}$, $R_{100} \ge 260$), marcado Schema.org `TechArticle`, contenedor `#blog-comments-container` y enlace a WhatsApp oficial (`+56 9 2738 4075`).

### 2.4. Sincronización del SSOT Operativo
- **[EARS-011-05] Ubiquitous:** El archivo `AGENTS.md` **DEBE** documentar la coexistencia entre la base técnica normativa de ingeniería (como respaldo técnico) y la directriz comercial de traducción a beneficios de cliente en el frontend comercial.

### 2.5. Verificación Automatizada y Regresión Cero
- **[EARS-011-06] Ubiquitous:** El sistema **DEBE** actualizar la suite de pruebas `tests/normative-compliance.spec.js` para certificar que el nuevo lenguaje de beneficios está presente en la web de ventas y que el blog retiene su rigor técnico, garantizando que el 100% de la suite Playwright (77+ pruebas) continúe en verde con 0 fallos.

---

## 3. Criterios de Aceptación Técnicos

1. `public/index.html` actualizado en bullets de servicios y sección `#precios` con redacción orientada a confort y habitabilidad.
2. `public/precios.html` actualizado en `#niveles-termicos` eliminando fórmulas de transmitancia de las tarjetas y manteniendo la claridad de los 3 niveles.
3. `public/servicios/casas-nuevas.html` y `public/servicios/segundos-pisos.html` actualizados con foco en habitabilidad, control de humedad y carpeta técnica DOM.
4. `public/blog/posts/normativa-aislacion-termica-oguc-santiago-precios.html` preservado al 100% con su Schema `TechArticle` y fórmulas.
5. `tests/normative-compliance.spec.js` refactorizado para validar beneficios en ventas y rigor en blog.
6. Suite global de regresión (`npx playwright test`) ejecutada con 100% de éxito (77/77 tests aprobados).
