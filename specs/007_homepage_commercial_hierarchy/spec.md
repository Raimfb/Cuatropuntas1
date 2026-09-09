# Feature Specification: 007 - Homepage Commercial Hierarchy & Service Decoupling
**Feature ID:** `007_homepage_commercial_hierarchy`  
**Estado:** DRAFT / PENDING REVIEW  
**Autor:** Antigravity (Lead AI Solutions Architect)  
**Metodología:** SDD (EARS Notation - Easy Approach to Requirements Syntax)  
**Documento Fuente:** [`AGENTS.md`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/AGENTS.md)

---

## 1. Resumen Ejecutivo y Alcance
Esta especificación define la reestructuración de la jerarquía visual y comercial en la portada ([`public/index.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/index.html)) de Constructora Cuatropuntas SpA. 

### Problema Comercial
La auditoría técnica reveló que menciones prominentes a subsidios MINVU (10 impactos, incluyendo badge superior en el Hero, tarjeta azul gigante a ancho completo y pilar 03 institucional de garantía) provocan una percepción errónea en los prospectos privados: asumen que la constructora opera exclusivamente como entidad social o EGIS/EP. Al mismo tiempo, servicios clave de alto margen como "Segundos Pisos y Ampliaciones" se encontraban fusionados y canibalizados dentro de "Casas Nuevas".

### Objetivo
1. Desacoplar y jerarquizar los 4 servicios privados troncales de la empresa en una cuadrícula simétrica de alto impacto visual.
2. Limpiar el Hero Section de cualquier referencia a subsidios, reforzando la propuesta de valor llave en mano y gestión municipal.
3. Reemplazar el pilar 03 de Garantía Técnica institucional por un atributo privado de transparencia contractual y cumplimiento de plazos.
4. Confinar la mención de subsidios a un sello de acreditación técnico y secundario con filtro estricto de calificación previa (subsidio adjudicado + terreno propio) antes de la conversión final.

---

## 2. Requisitos del Sistema (Notación EARS)

### 2.1. Ubiquitous Requirements (Requisitos Generales del Sistema)
* **REQ-UBI-01 [Integridad Sintáctica]:** Todo archivo HTML y JS modificado DEBE compilar o validar sin errores sintácticos (`node -c` en scripts asociados y sintaxis HTML5 válida en `public/index.html`).
* **REQ-UBI-02 [Preservación de SSOT de Precios]:** Todo precio referencial expuesto en la portada DEBE concordar estrictamente con la matriz oficial de [`AGENTS.md`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/AGENTS.md):
  - Casas Nuevas: desde **19 UF/m² +IVA**
  - Segundos Pisos / Ampliaciones: desde **22 UF/m² +IVA**
  - Quinchos y Terrazas: desde **12 UF/m² +IVA**
  - Remodelaciones Integrales: desde **11 UF/m² +IVA** (Baños: 65 a 95 UF, Cocinas: 90 a 160 UF).
* **REQ-UBI-03 [Preservación de Telefonía y Canales]:** Queda terminantemente PROHIBIDO alterar o reintroducir números obsoletos. Los CTAs de contacto deben preservar el WhatsApp oficial `+56 9 2738 4075` y el enlace Cal.com oficial `https://cal.com/cuatropuntas.com/visita-tecnica`.
* **REQ-UBI-04 [Imágenes y Rendimiento LCP/CLS]:** Todas las imágenes de las tarjetas de servicios DEBEN servirse con etiquetas `<picture>` que incluyan formato `.webp` optimizado, dimensiones explícitas (`width`, `height`) y atributo `loading="lazy"` para prevenir desplazamientos de diseño acumulado (CLS).

### 2.2. Event-Driven & State-Driven Requirements (Comportamiento Específico por Sección)

#### Hero Section (`#inicio`)
* **REQ-EVT-01 [Hero Value Proposition]:** CUANDO el visitante visualice el Hero Section sobre el pliegue inicial (*above the fold*), la línea de valor destacada bajo el subtítulo DEBE mostrar textualmente:
  ```text
  Precios desde 19 UF/m² +IVA · Construcción Llave en Mano · Trámites DOM Incluidos
  ```
  y NO DEBE contener la frase `"Trabajamos con subsidios MINVU"`.

#### Sección Autoridad / "¿Por qué elegirnos?"
* **REQ-EVT-02 [Eliminación de Tarjeta Azul L450]:** CUANDO se renderice la sección de autoridad, el bloque destacado de ancho completo correspondiente a la tarjeta azul de subsidios (`bg-blue-50 border-blue-100`) NO DEBE existir en el DOM.
* **REQ-EVT-03 [Badge Superior de Autoridad]:** CUANDO se rendericen los badges superiores bajo el título "¿Por qué elegirnos?", el badge secundario DEBE sustituir `"Trabajamos con Subsidios MINVU"` por `"Construcción Llave en Mano"` o `"Garantía y Plazos Cerrados"`.

#### Grilla de Servicios (`#servicios`)
* **REQ-EVT-04 [Desacoplamiento a 4 Tarjetas Sólidas]:** CUANDO se renderice la sección `#servicios`, el contenedor principal DEBE exhibir exactamente cuatro (4) tarjetas de servicios independientes, presentadas en alternancia visual o cuadrícula simétrica:
  1. **Tarjeta 1 - Casas Nuevas Llave en Mano:**
     - Título: `Casas Nuevas Llave en Mano`
     - Sistemas: Metalcom, SIP y Albañilería Armada.
     - Destacado: Desde 19 UF/m² +IVA. Gestión DOM completa hasta entrega.
     - Imagen: `/casa_solida_moderna_1770071499659.webp`.
     - Enlace: `/servicios/casas-nuevas/`.
  2. **Tarjeta 2 - Segundos Pisos y Ampliaciones:**
     - Título: `Segundos Pisos y Ampliaciones`
     - Propuesta: Estructuras livianas (Metalcom y SIP) sin sobrecarga estructural en el 1er piso, manteniendo la habitabilidad continua de la vivienda durante la obra.
     - Destacado: Desde 22 UF/m² +IVA.
     - Imagen: `/ampliacion_antes_despues_realista.webp` (o `/material_semi_ligero_sip_1770072450181.webp`).
     - Enlace: `/servicios/segundos-pisos/`.
  3. **Tarjeta 3 - Remodelaciones Integrales:**
     - Título: `Remodelaciones Integrales`
     - Propuesta: Transformación de baños (65-95 UF), cocinas de alto estándar (90-160 UF) y renovaciones completas de recintos residenciales (>25 m² desde 11 UF/m²).
     - Imagen: `/ampliacion_antes_despues_etiquetada.webp`.
     - Enlace: `/servicios/remodelaciones/`.
  4. **Tarjeta 4 - Quinchos y Terrazas de Alto Estándar:**
     - Título: `Quinchos y Terrazas de Alto Estándar`
     - Propuesta: Parrillas en obra con tiraje dimensionado, hornos empotrados, cubiertas, iluminación LED y estructuras para exterior.
     - Destacado: Desde 12 UF/m² +IVA.
     - Imagen: `/quincho_premium_chile_1770071485791.webp`.
     - Enlace: `/servicios/quinchos/`.

#### Sección Garantía Técnica (`#garantia`)
* **REQ-EVT-05 [Pilar 03 de Garantía]:** CUANDO se renderice la lista de garantías ("Partidas que pueden formar parte del proyecto"), el ítem `03` DEBE sustituir `"Subsidios MINVU"` por:
  - Título: `Presupuesto Cerrado y Plazos de Entrega`
  - Descripción: `Cronograma y partidas garantizadas por contrato, sin costos imprevistos.`
  - Iconografía/Estilo: Coherente con los ítems 01 y 02 (acento cálido o neutro institucional).

#### Sello de Acreditación Secundaria MINVU
* **REQ-EVT-06 [Banner Secundario de Calificación]:** CUANDO el visitante recorra la página previo al cotizador (`#contacto`), DEBE presentarse un bloque sobrio y secundario que funcione como sello de acreditación y filtro de prospección:
  - Título/Badge: `Acreditación Técnica MINVU`
  - Copy estricto: `"Acreditados ante el MINVU para Construcción en Sitio Propio (DS1 y DS49). Requisito: Terreno propio y subsidio adjudicado en mano."`
  - CTA/Enlace: Botón o enlace discreto hacia `/subsidio-minvu-sitio-propio` (`Conoce los requisitos →`).

### 2.3. Unwanted Behavior Requirements (Comportamientos No Permitidos)
* **REQ-ERR-01:** NO SE DEBE eliminar la página `/subsidio-minvu-sitio-propio.html` ni romper su ruta canónica.
* **REQ-ERR-02:** NO SE DEBE alterar el funcionamiento ni los identificadores de campo del cotizador `#quote-wizard-container`.
* **REQ-ERR-03:** NO SE DEBE desbalancear la jerarquía visual de la grilla en dispositivos móviles (`viewport < 768px`).

---

## 3. Criterios de Aceptación Técnicos
1. **Verificación Automatizada (`tests/verify.spec.js`):**
   - Comprueba que la línea de valor del Hero contiene `Precios desde 19 UF/m² +IVA · Construcción Llave en Mano · Trámites DOM Incluidos`.
   - Comprueba que no existe el texto `Trabajamos con subsidios MINVU` en el Hero.
   - Comprueba la existencia de los 4 encabezados H3 en `#servicios`:
     1. `Casas Nuevas Llave en Mano`
     2. `Segundos Pisos y Ampliaciones`
     3. `Remodelaciones Integrales`
     4. `Quinchos y Terrazas de Alto Estándar`
   - Comprueba que el pilar `03` de `#garantia` contiene `Presupuesto Cerrado y Plazos de Entrega`.
   - Comprueba la presencia del banner de acreditación técnica con el texto estricto de terreno propio y subsidio en mano.
2. **Pruebas de Regresión:**
   - La suite completa de Playwright (`tests/verify.spec.js`, `tests/quote-engine.spec.js`, `tests/agent-readiness.spec.js`, `tests/quote-wizard.spec.js`) debe pasar con 100% de éxito.
3. **Validación de Enlaces e Imágenes:**
   - Todas las 4 imágenes de servicios existen en disco y cargan sin errores 404.
