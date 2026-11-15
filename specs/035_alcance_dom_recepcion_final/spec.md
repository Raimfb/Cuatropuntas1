# Spec 035: Clarificación Explícita del Alcance DOM hasta Recepción Final Definitiva y Cláusula de Exclusión por Obras Anexas del Mandante

**Estado:** IMPLEMENTED (2026-11-15) — T035 5/5 · suite completa 205/205  
**Fecha:** 2026-11-15  
**Alcance:** Alineación SSOT integral (web pública, cotizador, contratos/políticas, PDFs de cotización y Lead Magnets, superficies IA/agentes y `AGENTS.md`). Bloques `<script type="application/ld+json">` se preservan intactos sin cambios.

---

## 1. Contexto y Objetivo

El monitoreo AEO/GEO (`seo-geo-guardian.js` sobre `llms.txt`) advirtió ambigüedad respecto de qué cubre exactamente *"tramitación DOM"* en nuestros proyectos llave en mano. Comercial y contractualmente, en proyectos integrales de **Casas Nuevas y Ampliaciones / Segundos Pisos**, la gestión DOM incluida (etapas `Idea` `+8%` y `Planos` `-3%`) abarca **todo el ciclo municipal: desde el expediente de Permiso de Edificación hasta la obtención del Certificado de Recepción Final Definitiva**.

Al mismo tiempo, es crítico explicitar la **Cláusula de Exclusión por Obras No Participadas**: dicha cobertura aplica única y exclusivamente a las obras ejecutadas y dirigidas por Constructora Cuatropuntas según los planos aprobados. Si el mandante ejecuta por cuenta propia o con terceros **obras anexas no contratadas** (quinchos, piscinas, ampliaciones adicionales, paisajismo u obras exteriores no contratadas) o mantiene **construcciones preexistentes sin regularizar** en el predio, Constructora Cuatropuntas **no tramitará la Recepción Final**, al estar legal y técnicamente impedida de patrocinar o certificar obras ajenas a su ejecución.

---

## 2. Regla de Negocio Oficial (SSOT Definida en `/grill-me`)

1. **Etapas `Idea` (`+8%`) y `Planos` (`-3%`) en Casa Nueva y Ampliación / Segundo Piso:**
   - **Cobertura Municipal Completa:** Desde el expediente técnico de **Permiso de Edificación** (con diseño + cálculo en `Idea`, o ingeniería de cálculo sobre planos existentes en `Planos`) hasta la tramitación y obtención del **Certificado de Recepción Final Definitiva**.
   - **Derechos y Empalmes:** Derechos municipales (`1,5%` tabla MINVU) y empalmes definitivos de servicios básicos se transparentan por separado al costo real del servicio según presupuesto formal.
   - **Realismo Comercial (Regla Anti-Sobrepromesas, `AGENTS.md` §3.8):** Nunca prometer *"aprobación garantizada"*; la obtención de permisos y recepción queda siempre sujeta a revisión DOM, normativa OGUC/LGUC y condiciones del predio.
2. **Etapas `PermisoAprobado` y `ArquitectoPropio` (`-6%` — Solo Ejecución de Obra):**
   - Aplican exclusivamente a ejecución material de obra. Cuatropuntas entrega la **carpeta técnica del constructor** (Libro de Obras, informes de calidad constructiva y certificados SEC) para que el arquitecto patrocinante externo tramite la Recepción Final ante la DOM (salvo contratación expresa del patrocinio por separado).
3. **Quinchos y Remodelaciones (`0%` recargo automático):**
   - Evaluación técnica en terreno sobre pertinencia de trámite DOM conforme a superficie, materialidad y categoría de obra menor según OGUC.
4. **Cláusula Taxativa de Exclusión por Obras Anexas del Mandante o Preexistencias Irregulares:**
   - Cubre únicamente las obras ejecutadas y dirigidas por Cuatropuntas según planos aprobados.
   - Si el mandante o terceros ejecutan obras anexas sin participación de Cuatropuntas (**quinchos, piscinas, ampliaciones adicionales o paisajismo/obras exteriores no contratadas**) o existen **construcciones preexistentes sin regularizar** en el lote, Cuatropuntas **no tramitará la Recepción Final**.

---

## 3. Auditoría de Superficies (Solo Lectura, 2026-11-15)

| Superficie | Archivo | Líneas Relevantes | Hallazgo / Brecha Actual | Acción Planificada |
|---|---|---|---|---|
| **Web Home** | `public/index.html` | L475-482, L501, L631, L811, L862-863, L1032-1054, L1297 | Menciona *"hasta la recepción final"* (L476) y *"Permiso de Edificación y Recepción Final"* (L811, L863), pero sin explicitar el *Certificado de Recepción Final Definitiva*, la diferencia frente a ejecución con permiso/arquitecto propio, ni la exclusión por obras anexas o preexistencias irregulares. L366 Hero y `ld+json` protegidos. | Actualizar textos comerciales y nota WebMCP (`L1297`) preservando `L366`, `ld+json`, meta desc y exclusión de artículos OGUC numéricos (`Spec 011`). |
| **Precios** | `public/precios.html` | L286, L322, L443, L538-539 | Explica factor `+8% / -3% / -6%`, sin explicitar ciclo completo hasta Certificado de Recepción Final Definitiva ni exclusión por obras anexas / preexistencias. | Clarificar `#factores` (`L538-539`), intro Casas Nuevas (`L286`) y pies de tabla (`L322`, `L443`), preservando `ld+json` y `Spec 011`. |
| **Servicio Casas Nuevas** | `public/servicios/casas-nuevas.html` | L258, L349, L370-381 | Solo indica *"carpeta/expediente para Permisos y Recepción Final"* sin aclarar ciclo completo vs `-6%` solo ejecución ni exclusión por obras de terceros. | Precisar ciclo completo en `Idea`/`Planos`, rol solo ejecución en `-6%` y exclusión por obras anexas/preexistencias. Preservar `+8% desde cero`, `Valores netos (+IVA)`, `ld+json`. |
| **Servicio Segundos Pisos** | `public/servicios/segundos-pisos.html` | L256, L347, L378-379 | Habla genéricamente de *"gestión municipal según el proyecto"* y *"expediente para tramitación"*. | Precisar ciclo completo hasta Certificado de Recepción Final Definitiva para `Idea`/`Planos`, solo ejecución en `-6%`, y exclusión por obras anexas/preexistencias. |
| **Subsidio MINVU** | `public/subsidio-minvu-sitio-propio.html` | L363-364, L377-378 | Dice *"cuando corresponde"* sin detallar que obras anexas no contratadas o preexistencias impiden tramitar Recepción Final. | Alinear paso 02 (`L364`) y paso 04 (`L378`) con ciclo completo y exclusión por obras anexas / preexistencias. |
| **Términos Legales** | `public/politicas.html` | L205-210 | §2.1 trata solo el ajuste paramétrico de precios; carece de cláusula contractual expresa sobre alcance DOM y exclusión por obras anexas / preexistencias irregulares. | Actualizar `L205` e insertar nueva subsección **`2.2 Alcance de Tramitación Municipal DOM, Recepción Final y Exclusiones`** (renumerando `2.2`→`2.3` y `2.3`→`2.4`). Preservar strings de `T031.3`. |
| **Cotizador UI** | `public/quote-wizard.js` | L399-402 | Las etiquetas de `<select id="qPermisos">` no distinguen explícitamente que `Idea`/`Planos` llegan hasta *Recepción Final Definitiva* ni que `-6%` es solo ejecución. | Afinar copy de `<option value="Idea|Planos|PermisoAprobado|ArquitectoPropio">`. |
| **API Cotización / PDF** | `api/quote.js` | L25, L30, L34, L39, L43, L48, L63-68 | `getPermisosData()` indica *"gestión DOM"* sin explicitar *Certificado de Recepción Final Definitiva*, derechos/empalmes aparte ni exclusión por obras anexas/preexistencias. | Actualizar `label` y `notePdf` en `getPermisosData`, preservando exactamente `adminBadge: 'PROYECTO COMPLETO (Diseño + DOM + Construcción)'` (`L65`). Verificar durante ejecución consistencia con pie de PDF/email. |
| **Superficies IA / Agentes** | `public/llms.txt`, `public/llms-full.txt`, `api/markdown.js`, `SKILL.md` + `index.json` | `llms.txt:30,44`; `llms-full.txt:65`; `markdown.js:270-280,346`; `SKILL.md:24`; `index.json:9` | No responden explícitamente la duda detectada por AEO/GEO (si DOM llega hasta Recepción Final ni la exclusión por obras anexas/preexistencias). `llms.txt` tiene límite operativo de 4.500 caracteres en `seo-geo-guardian.js:432`. | Incorporar regla completa y concisa en todas las superficies manteniendo `llms.txt <= 4500` caracteres, tokens `T031.4/T031.5` intactos y actualizando el digest `sha256` en `index.json:9`. |
| **Prompts SDR / Consultor** | `api/whatsapp.js`, `api/chat.js`, `lib/agent-consultor.js` | `whatsapp.js:147`; `chat.js:100`; `agent-consultor.js:118` | Faltan precisiones de ciclo completo hasta Recepción Final y cláusula de exclusión en el bloque de matriz/reglas. | Incluir alcance hasta Recepción Final Definitiva y exclusión por obras anexas/preexistencias manteniendo single `*` obligatorio en `whatsapp.js` (cero `**`) y substrings de `T031.4` / `conversational-sdr.spec.js`. |
| **Lead Magnets PDF** | `scripts/build-lead-magnets.js` | PDF 1 (`L335, L345, L377`), PDF 2 (`L572-573`) | No mencionan la exclusión expresa por obras anexas de terceros ni preexistencias irregulares. Ambos PDFs deben conservar exactamente `pageCount === 2` (`T033.1`). | Incorporar ciclo completo, rol solo ejecución en `-6%` y cláusula de exclusión en bloque 4 de ambos PDFs con texto compacto para mantener estrictamente **2 páginas por PDF**. |
| **SSOT Repo** | `AGENTS.md` | L71 (y §3) | Línea 71 solo habla de *"expediente técnico completo... listo para tramitación y recepción"*. | Precisar alcance DOM completo y agregar cláusula de exclusión en `AGENTS.md` §3.8 / §3.10. |

### Guardrails y Textos Protegidos que NO Se Deben Alterar
- Todos los bloques `<script type="application/ld+json">` y `<meta name="description">` en `public/**/*.html`.
- `public/index.html:366`: `'Precios desde 19 UF/m² +IVA · Construcción Llave en Mano · Trámites DOM Incluidos'` (`tests/verify.spec.js:230`).
- `api/quote.js:65`: `adminBadge: 'PROYECTO COMPLETO (Diseño + DOM + Construcción)'` (`tests/spec-029`).
- Tokens exactos de calibración y negrita única `*` en `api/whatsapp.js:147` (`tests/spec-031`), así como regla SDR de 3 pasos y *Graceful Pivot* (`tests/conversational-sdr.spec.js`).
- Prohibición de citas numéricas de artículos OGUC (`Art. 4.1.10`, `Art. 5.1.6`) y fórmulas térmicas (`W/m²K`) en páginas de venta (`tests/normative-compliance.spec.js`).
- Prohibición de la frase `'aprobación garantizada'` (`tests/spec-033`) y cumplimiento estricto de `pageCount === 2` en los dos Lead Magnets PDF.

---

## 4. Requisitos (EARS)

- **R1 (Ubicuo — Ciclo Completo DOM):** Las superficies comerciales, cotizador, APIs Markdown/JSON y prompts de agentes SHALL establecer que, en **Casas Nuevas y Ampliaciones / Segundos Pisos** contratados desde cero (`Idea`, `+8%`) o con planos de arquitectura existentes (`Planos`, `-3%`), la tramitación DOM incluida cubre el **ciclo municipal completo desde el Permiso de Edificación hasta la obtención del Certificado de Recepción Final Definitiva**, con derechos municipales (`1,5%` tabla MINVU) y empalmes definitivos transparentados al costo real según presupuesto formal.
- **R2 (Estado / Modalidad — Solo Ejecución y Obras Menores):** WHEN el proyecto se cotiza o contrata con permiso municipal ya aprobado (`PermisoAprobado`, `-6%`) o con arquitecto propio (`ArquitectoPropio`, `-6%`), la documentación y el cotizador SHALL indicar que el alcance es de **solo ejecución de obra** con entrega de carpeta técnica del constructor (Libro de Obras, informes de calidad constructiva y certificados de instalaciones SEC), permaneciendo la gestión ante la DOM bajo el arquitecto patrocinante externo salvo contratación separada; y en **Quinchos y Remodelaciones** (`0%`) rige evaluación técnica en terreno.
- **R3 (No Deseado / Cláusula de Exclusión):** IF el mandante ejecuta por cuenta propia o con terceros **obras anexas no contratadas** en la propiedad (tales como **quinchos, piscinas, ampliaciones adicionales o paisajismo/obras exteriores no contratadas**), OR IF existen **construcciones preexistentes sin regularizar** en el lote, THEN las políticas contractuales (`public/politicas.html`), cotizador (`api/quote.js`), guías PDF (`scripts/build-lead-magnets.js`), web pública y agentes de IA SHALL establecer explícitamente que **Constructora Cuatropuntas no tramitará la Recepción Final**, al no poder patrocinar ni certificar técnicamente edificaciones ajenas a su ejecución.
- **R4 (Ubicuo — Anti-Sobrepromesas e Integridad de Guardrails):** Ninguna página, PDF o prompt SHALL prometer *"aprobación garantizada"*, ni modificar los bloques `<script type="application/ld+json">`, ni romper las aserciones de `verify.spec.js`, `normative-compliance.spec.js`, `spec-029`, `spec-031`, `spec-033` o `conversational-sdr.spec.js`.
- **R5 (Restricción Técnica — Límite AEO y PDFs):** `public/llms.txt` SHALL mantenerse por debajo de `4.500` caracteres (`seo-geo-guardian.js:432`), ambos PDFs generados por `scripts/build-lead-magnets.js` SHALL mantenerse exactamente en **2 páginas** cada uno, y el hash `sha256` de `public/.well-known/agent-skills/cotizar-proyecto/SKILL.md` SHALL mantenerse sincronizado en `public/.well-known/agent-skills/index.json`.

---

## 5. Diseño de Prueba TDD `T035` (`tests/spec-035-alcance-dom-recepcion-final.spec.js`)

1. **T035-A (Web Pública y Políticas):** Verifica en `public/index.html`, `public/precios.html`, `public/servicios/casas-nuevas.html`, `public/servicios/segundos-pisos.html`, `public/subsidio-minvu-sitio-propio.html` y `public/politicas.html` la presencia explícita del ciclo completo hasta *Certificado de Recepción Final Definitiva* (o *Recepción Final Definitiva*), el alcance de solo ejecución para `-6%`, y la **cláusula de exclusión** (obras anexas de terceros/mandante como quinchos, piscinas o paisajismo/ampliaciones no contratadas + construcciones preexistentes sin regularizar), sin contener `"aprobación garantizada"` ni alterar `index.html:366` ni sus `ld+json`.
2. **T035-B (Superficies IA / Agentes y AEO `< 4500` chars):** Verifica `public/llms.txt` (longitud `<= 4500`), `public/llms-full.txt`, `api/markdown.js` (invocando las rutas `/` y `/precios`) y `public/.well-known/agent-skills/cotizar-proyecto/SKILL.md` (más coincidencia exacta de `sha256` en `index.json`), comprobando la presencia de Recepción Final Definitiva + exclusión por obras anexas y preexistencias.
3. **T035-C (Prompts Conversacionales SDR):** Verifica `api/whatsapp.js` (conservando formato de negrita única `*` en `### MATRIZ OFICIAL` sin `**`), `api/chat.js` y `lib/agent-consultor.js`, asegurando que explican el ciclo completo hasta Recepción Final Definitiva (`Idea`/`Planos`), modalidad solo ejecución (`-6%`) y la exclusión por obras anexas / preexistencias irregulares.
4. **T035-D (Cotizador `quote-wizard.js` y `api/quote.js`):** Verifica opciones `#qPermisos` en `quote-wizard.js` y evalúa `getPermisosData()` en `api/quote.js` para `Idea`, `Planos`, `PermisoAprobado` y `ArquitectoPropio`, confirmando el ciclo completo + exclusión en `Idea`/`Planos`, solo ejecución en `-6%` y preservación intacta de `adminBadge === 'PROYECTO COMPLETO (Diseño + DOM + Construcción)'`.
5. **T035-E (Lead Magnets PDF — `pageCount === 2`):** Parsea ambos PDFs en `public/assets/guias/` verificando exactamente **2 páginas** por documento y presencia textual de la cobertura hasta Recepción Final Definitiva + cláusula de exclusión por obras anexas del mandante / preexistencias irregulares.

---

## 6. Criterios de Aceptación

- `node scripts/build-lead-magnets.js` (o `npm run build:guias`) ejecuta sin errores y genera ambos PDFs con `2` páginas exactas.
- `node -c api/markdown.js && node -c api/quote.js && node -c api/whatsapp.js && node -c api/chat.js && node -c lib/agent-consultor.js && node -c scripts/build-lead-magnets.js && node -c public/quote-wizard.js` salen con código `0`.
- `npx playwright test` pasa al **100%** (incluyendo `spec-035`, `verify`, `normative-compliance`, `conversational-sdr`, `spec-029`, `spec-031`, `spec-033`, `spec-034`, `seo-geo-optimization`).
- `node scripts/seo-geo-guardian.js --dry-run` reporta `0` errores críticos.
