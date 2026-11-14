# Especificación de Requerimientos: Spec 031 - Coherencia Total de Precios y Anillos Territoriales en Sitio Principal, Servicios y Agentes
**Feature ID:** `031_coherencia_precios_sitio_global`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  
**Relación:** Consolidación global de [`AGENTS.md`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/AGENTS.md) (Sección 3), `Spec 011`, `Spec 013`, `Spec 014`, `Spec 015` y [`Spec 029.3`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/specs/029_3_anillos_logisticos_rm/spec.md) fuera de `public/blog/`

---

## 1. Resumen Ejecutivo y Diagnóstico

Tras la calibración del motor paramétrico [`api/quote.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/quote.js) en la `Spec 029.3` (reemplazando el antiguo descuento `0.98` por los **5 Anillos Logísticos y de Mercado RM** y manteniendo el recargo **`+8%` (`1.08`) por modalidad desde cero — etapa `Idea` con arquitectura, cálculo y gestión DOM** en Casa Nueva y Ampliación), se realizó un barrido exhaustivo de coherencia comercial fuera de `public/blog/`.

### 1.1. Principales Brechas Detectadas
1. **Tarifas obsoletas críticas en servidor MCP ([`api/mcp.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/mcp.js#L77-L86)):** Calcula presupuestos con valores desactualizados (`metalcom: 13.5`, `sip: 15.5`, `albanileria: 20`, fallback `15` UF/m²), sin distinguir `tipo_proyecto`, sin expresar `+IVA` ni considerar los 5 anillos logísticos ni la etapa DOM.
2. **Residuo del antiguo modelo periférico (`0.98`) y omisión del `+8%` DOM en `/precios` ([`public/precios.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/precios.html#L538-L555)):** La sección *"Accesibilidad de la faena"* (`L554`) sigue afirmando que existen *"zonas donde el costo es más accesible"*, y *"Permisos municipales"* (`L539`) no transparenta los factores reales de etapa (`+8%` desde cero vs. `-3%` con planos vs. `-6%` con permiso aprobado o arquitecto propio). Además, WebMCP (`L748–L749`) tiene `quincho.sip: 15` (vs. `14` en `api/quote.js`) y `remodelacion.sip: 12` (vs. `13` en `api/quote.js`).
3. **Falta de transparencia sobre valores netos (`+IVA`), anillos logísticos y etapa DOM bajo tablas/tarjetas comerciales:** En [`public/index.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/index.html), [`public/precios.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/precios.html), las cuatro páginas de [`public/servicios/*`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/servicios/casas-nuevas.html), [`public/subsidio-minvu-sitio-propio.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/subsidio-minvu-sitio-propio.html) y [`public/politicas.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/politicas.html), varios textos muestran *"Desde X UF/m²"* sin explicitar al usuario que la tarifa base rige para **Anillo 1 (Puente Alto, La Florida y Santiago Urbano)** en valores **netos (+IVA)** y varía según anillo logístico (`+2%`, `+8%`, `+18%`, `+22%`), escala (`<40 m²: +8%`) y alcance de arquitectura/DOM (`+8%` en etapa `Idea`).
4. **Prompts de agentes IA y endpoints de lectura automática sin calibración territorial ni DOM:** [`api/markdown.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/markdown.js), [`api/whatsapp.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/whatsapp.js), [`api/chat.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/chat.js), [`lib/agent-consultor.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/lib/agent-consultor.js), [`cotizar-proyecto/SKILL.md`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/.well-known/agent-skills/cotizar-proyecto/SKILL.md) y [`scripts/auto-curate-and-publish.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/scripts/auto-curate-and-publish.js) mencionan las tarifas base UF/m², pero omiten la regla de los **5 Anillos Logísticos RM** y el **`+8%` por modalidad desde cero (arquitectura, cálculo y DOM)**.

---

## 2. Única Fuente de Verdad (SSOT) Aplicable

| Dimensión | Parámetros Oficiales SSOT |
| :--- | :--- |
| **Tarifas Base (UF/m² Netas +IVA)** | • **Casas Nuevas (1 Piso):** Metalcom `19` \| Panel SIP `21` \| Albañilería `25`<br>• **Segundos Pisos y Ampliaciones:** Metalcom `22` \| Panel SIP `24` \| Albañilería `27`<br>• **Quinchos:** Metalcom `12` \| Panel SIP/Covintec `14` \| Albañilería `15`<br>• **Remodelaciones (>25 m²):** Ligera Metalcom `11` \| Sólida Albañilería `13`<br>• **Recintos Húmedos Puros:** Baño Completo `65–95 UF` (motor `75 UF`) \| Cocina Integral `90–160 UF` (motor `110 UF`) \| Ambos `185 UF` |
| **5 Anillos Logísticos RM** | • **Anillo 5 (`1.22`, `+22%`):** Las Condes, Vitacura, Lo Barnechea, La Reina, Providencia<br>• **Anillo 4 (`1.18`, `+18%`):** Colina, Chicureo, Piedra Roja, Chamisero<br>• **Anillo 3 (`1.08`, `+8%`):** Buin, Paine, Calera de Tango, Talagante, Peñaflor, Isla de Maipo, El Monte, Padre Hurtado, Melipilla, Curacaví, Lampa, Tiltil<br>• **Anillo 2 (`1.02`, `+2%`):** Pirque<br>• **Anillo 1 (`1.00`, `0%`):** Puente Alto, La Florida y resto de comunas urbanas de la RM |
| **Planos y Permisos DOM** | • **Etapa `Idea` (desde cero: diseño, cálculo y DOM):** `1.08` (`+8%`) en `Casa Nueva` y `Ampliación`; `1.00` (`0%`, evaluación en terreno) en `Quincho` y `Remodelación`<br>• **Planos listos (`Planos`):** `0.97` (`-3%`)<br>• **Permiso aprobado / Arquitecto propio:** `0.94` (`-6%`) |
| **Escala y Terminaciones** | • Superficie `<40 m²`: `+8%` \| Terminaciones `Premium`: `+10%` |

---

## 3. Requerimientos Funcionales en Notación EARS

### 3.1. Endpoints de Agentes, MCP y Markdown

- **[EARS-031-01] Sincronización SSOT del Servidor MCP (`api/mcp.js`):**  
  * **Cuando** se consulte `GET /api/mcp` o `POST /api/mcp` (`tools/list` y `tools/call` de `cotizar_construccion`), el endpoint **DEBE** utilizar las tarifas base SSOT de [`api/quote.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/quote.js) (`19/21/25` Casa Nueva; `22/24/27` Segundo Piso; `12/14/15` Quincho; `11/13` Remodelación), soportar parámetros opcionales `tipo_proyecto`, `comuna` y `permisos`, aplicar `getFactorComuna(comuna)` (los 5 Anillos Logísticos RM) y `getPermisosData(permisos, tipo)`, e indicar explícitamente en su respuesta que los valores son **netos (+IVA)** junto al factor territorial y alcance DOM aplicados.
- **[EARS-031-02] Sincronización del Endpoint Markdown (`api/markdown.js`):**  
  * **Cuando** se solicite `?page=precios` o la vista por defecto (`/`), `api/markdown.js` **DEBE** incluir una sección explícita de **Calibración Territorial (5 Anillos Logísticos RM: `0%`, `+2%`, `+8%`, `+18%`, `+22%`)** y **Gestión de Arquitectura, Cálculo y DOM (`+8%` desde cero en Casa Nueva y Ampliación; `-3%` con planos; `-6%` con permiso aprobado/arquitecto propio)**, además de reflejar `11 a 13 UF/m²` para remodelaciones en la portada, conservando todas las cadenas requeridas por [`tests/agent-readiness.spec.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/tests/agent-readiness.spec.js).

### 3.2. Sitio Web Principal, `/precios`, `/servicios/*`, `/subsidio-minvu-sitio-propio` y `/politicas`

- **[EARS-031-03] Transparencia en `/precios` y Corrección de Factores (`public/precios.html`):**  
  * **Cuando** un usuario o agente lea [`public/precios.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/precios.html), las tres tablas de tarifas y sus pies legales **DEBEN** indicar explícitamente que los precios son **netos (+IVA)** referenciales para el **Anillo 1 (Puente Alto, La Florida y Santiago Urbano)** y varían según anillo logístico comunal, escala (`<40 m²: +8%`) y alcance de arquitectura/DOM (`+8%` en proyectos desde cero).  
  * La tarjeta *"Accesibilidad de la faena"* (`#factores`) **DEBE** reemplazar la frase obsoleta *"hay zonas donde el costo es más accesible"* por el desglose explícito de los **5 Anillos Logísticos RM** (`0%`, `+2%`, `+8%`, `+18%`, `+22%`), y *"Permisos municipales"* **DEBE** transparentar el `+8%` por modalidad desde cero vs. `-3%` con planos y `-6%` con permiso aprobado o arquitecto propio.  
  * El script WebMCP `cotizar_construccion` (`L745–L770`) **DEBE** corregir `quincho.sip` a `14` y `remodelacion.sip` a `13` y añadir `nota_condiciones` sobre anillos logísticos y etapa DOM.
- **[EARS-031-04] Transparencia en Portada (`public/index.html`):**  
  * **Cuando** se visualice la matriz de precios (`#precios`), sus pies legales, la FAQ visible/JSON-LD (`¿Cuánto cuesta construir una casa en Santiago?`) y la respuesta de WebMCP en [`public/index.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/index.html), el sistema **DEBE** explicitar `UF/m² +IVA`, aclarar que la tarifa base rige para **Anillo 1** y señalar los ajustes por los **5 Anillos Logísticos RM** (`+2%` a `+22%`) y **`+8%` por proyecto desde cero (arquitectura, cálculo y DOM)**.
- **[EARS-031-05] Notas de Transparencia en Páginas de Servicios, Subsidio y Políticas:**  
  * **Cuando** se muestren tarifas *"Desde X UF/m²"* en [`casas-nuevas.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/servicios/casas-nuevas.html), [`segundos-pisos.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/servicios/segundos-pisos.html), [`remodelaciones.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/servicios/remodelaciones.html), [`quinchos.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/servicios/quinchos.html) y [`subsidio-minvu-sitio-propio.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/subsidio-minvu-sitio-propio.html), el sistema **DEBE** incluir una nota comercial visible aclarando que todos los valores son **netos (+IVA)** base en Anillo 1 y se ajustan según anillo logístico comunal, superficie/sistema y alcance de planimetría/DOM (`+8%` desde cero en Casas Nuevas y Segundos Pisos; evaluación DOM en terreno `0%` y recargo `<40 m²` en Quinchos y Remodelaciones).  
  * [`public/politicas.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/politicas.html) (Sección `2.1 Valores Referenciales`) **DEBE** precisar que las cifras en UF/m² y UF son **netas (+IVA)** y se calibran paramétricamente por anillo logístico RM y alcance de arquitectura/DOM.

### 3.3. Prompts de Agentes Conversacionales, Agent Skills y Curador de Blog

- **[EARS-031-06] Prompts SDR y Consultor (`api/whatsapp.js`, `api/chat.js`, `lib/agent-consultor.js`):**  
  * Los prompts del sistema en [`api/whatsapp.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/whatsapp.js), [`api/chat.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/chat.js) y [`lib/agent-consultor.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/lib/agent-consultor.js) **DEBEN** incluir explícitamente: (a) que todas las tarifas son **netas (+IVA)** sobre base **Anillo 1**, (b) la escala completa de los **5 Anillos Logísticos RM** (`0%`, `+2%`, `+8%`, `+18%`, `+22%`), y (c) el ajuste **`+8%` por modalidad desde cero (`Idea`: arquitectura, cálculo y gestión DOM)** en Casa Nueva y Ampliación.
- **[EARS-031-07] Agent Skill y Hash Criptográfico + Script Curador:**  
  * [`public/.well-known/agent-skills/cotizar-proyecto/SKILL.md`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/.well-known/agent-skills/cotizar-proyecto/SKILL.md) **DEBE** documentar los 5 Anillos Logísticos RM y el factor `+8%` DOM (`Idea`), actualizando exactamente su digest SHA-256 en [`public/.well-known/agent-skills/index.json`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/.well-known/agent-skills/index.json).  
  * [`scripts/auto-curate-and-publish.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/scripts/auto-curate-and-publish.js) **DEBE** incluir en su prompt SSOT los 5 Anillos Logísticos RM y el factor `+8%` DOM.

### 3.4. Restricciones de No-Regresión y Seguridad Normativa

- **[EARS-031-08] Invariabilidad de Guardrails Existentes:**  
  * **NO SE DEBEN** modificar los precios `lowPrice` / `highPrice` de ningún `AggregateOffer` en `JSON-LD` auditados por [`scripts/seo-geo-guardian.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/scripts/seo-geo-guardian.js) y [`tests/seo-geo-optimization.spec.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/tests/seo-geo-optimization.spec.js).  
  * **NO SE DEBE** alterar la longitud de `<meta name="description">` fuera del rango `120–165` caracteres en páginas de servicio ni `/precios`.  
  * **NO SE DEBE** introducir jerga matemática térmica (`Art. 4.1.10`, `Art. 5.1.6`, `W/m²K`, `U <= 0.38`) en páginas comerciales (`index.html`, `precios.html`, `servicios/*`), preservando `Spec 011` ([`tests/normative-compliance.spec.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/tests/normative-compliance.spec.js)).  
  * **NO SE DEBE** alterar el bloque `MAPA OFICIAL DE URLS CANÓNICAS` ni el texto literal del `Graceful Pivot` validados por [`tests/conversational-sdr.spec.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/tests/conversational-sdr.spec.js).  
  * **Exclusión explícita:** Ningún archivo dentro de `public/blog/` forma parte del alcance de esta Spec.

---

## 4. Criterios de Aceptación y Pruebas TDD (`T031`)

1. **`T031.1` — Motor MCP (`api/mcp.js`):** Verificar que `cotizar_construccion` calcula con tarifas SSOT (`19/21/25`, `22/24/27`, `12/14/15`, `11/13`), aplica los 5 anillos (`1.22` Las Condes, `1.18` Chicureo, `1.08` Buin/Talagante, `1.02` Pirque, `1.00` Puente Alto) y `+8%` DOM (`Idea`), informando explícitamente `+IVA` sin contener jamás `13.5` ni `15.5`.
2. **`T031.2` — Coherencia HTML en `/precios` e `index.html`:** Verificar eliminación de *"zonas donde el costo es más accesible"*, presencia de los 5 anillos logísticos RM, transparencia de `+IVA`, ajuste `+8%` DOM desde cero y sincronización de WebMCP (`quincho.sip: 14`, `remodelacion.sip: 13`) conservando intacto `AggregateOffer` y `<meta description>`.
3. **`T031.3` — Transparencia en `/servicios/*`, `subsidio-minvu-sitio-propio.html` y `politicas.html`:** Verificar notas visibles de valores netos (`+IVA`), 5 anillos logísticos RM y alcance DOM/escala en todas las fichas comerciales.
4. **`T031.4` — Sincronización de Agentes (`api/markdown.js`, `api/whatsapp.js`, `api/chat.js`, `lib/agent-consultor.js`):** Verificar presencia de los 5 anillos RM (`+22%`, `+18%`, `+8%`, `+2%`, `0%`), `+8%` DOM y valores netos (`+IVA`), preservando intactas las aserciones de `Spec 015` y `Spec 025`.
5. **`T031.5` — Agent Skills + Hash SHA-256 (`index.json` / `cotizar-proyecto/SKILL.md`):** Verificar digest SHA-256 válido y cobertura de anillos/DOM.
6. **`T031.6` — Verificación Integral (`npx playwright test` + `seo-geo-guardian.js --dry-run`):** 100% de la suite Playwright (180+ tests) en verde y `0` errores críticos en el guardián SEO/GEO.
