# Spec 036: Ocultamiento Público de los 5 Anillos Logísticos RM y Nota Prudente en Cotizaciones

**Estado:** Aprobada por Mandante (Ejecución Inmediata)  
**Fecha:** 2026-11-15  
**Alcance:** Toda la capa pública y conversacional (`public/`, `api/markdown.js`, `api/mcp.js`, `api/chat.js`, `api/whatsapp.js`, `lib/agent-consultor.js`, `scripts/build-lead-magnets.js`, `scripts/auto-curate-and-publish.js`) + ajuste de salida condicional en `api/quote.js`.

---

## 1. Contexto y Objetivo Comercial

El mandante ha resuelto retirar de forma total toda explicación pública, comparativa territorial y desglose porcentual sobre los **"5 Anillos Logísticos RM"** (`Anillo 1` a `Anillo 5`, `Base Anillo 1`, `Base Local`, `Cordón Lejano`, `+2%`, `+8%`, `+18%`, `+22%`). Los clientes comprenden naturalmente los costos asociados al valor del suelo y distancia en la visita a terreno; exponer públicamente porcentajes de recargo por comuna genera fricción innecesaria antes del contacto técnico.

La lógica de calibración territorial (`getFactorComuna` en `api/quote.js`) **se mantiene estrictamente como desarrollo interno de cálculo** para calcular los valores referenciales del cotizador y del endpoint MCP, explicándose personalmente en la visita técnica en terreno.

---

## 2. Requisitos Funcionales (EARS)

- **REQ-036.1 (Conservación de Lógica Interna de Cálculo):**  
  `THE` motor de cálculo `calculateQuote` y `getFactorComuna` en `api/quote.js` `SHALL` mantener exactamente intactos sus factores territoriales internos (`1.22`, `1.18`, `1.08`, `1.02`, `1.00`), sin alterar sus totales matemáticos ni sus pruebas unitarias en `tests/quote-engine.spec.js`.

- **REQ-036.2 (Nota Prudente en Cotizaciones con Alza Territorial):**  
  `WHEN` `generatePdfBuffer` o `generateEmailData` en `api/quote.js` genere una cotización cuyo factor territorial aplicado sea mayor a `1.00` (`factorComuna > 1`), `THE` sistema `SHALL` incluir una nota escrita breve y prudente indicando que los valores del presupuesto son estimativos y han sido calculados en base al tipo de obra, tipo de terreno, valor de suelo y lejanía de la urbe de Santiago, `WITHOUT` mencionar porcentajes, nombres de anillos ni comparaciones numéricas con Santiago o comunas vecinas. `quoteHandler` `SHALL` pasar `comuna` y `factorComuna` explícitamente a ambos generadores, manteniendo el PDF estrictamente en **1 página tamaño Letter**.

- **REQ-036.3 (Eliminación de Tarjeta en `#factores` de Precios):**  
  `THE` archivo `public/precios.html` `SHALL` eliminar íntegramente la tarjeta *"Accesibilidad de la faena y 5 Anillos Logísticos RM"* de la sección `#factores`.

- **REQ-036.4 (Purga Total en Superficies Públicas Web, PDFs y Metadatos WebMCP):**  
  `THE` páginas HTML (`public/index.html`, `public/precios.html`, `public/politicas.html`, `public/servicios/casas-nuevas.html`, `public/servicios/segundos-pisos.html`, `public/servicios/quinchos.html`, `public/servicios/remodelaciones.html`, `public/subsidio-minvu-sitio-propio.html`), incluyendo el FAQ en JSON-LD (`index.html`), herramientas WebMCP (`index.html`, `precios.html`) y el generador de guías PDF descargables (`scripts/build-lead-magnets.js` → `public/guias/*.pdf`), `SHALL NOT` mencionar `"Anillo 1"` a `"Anillo 5"`, `"5 Anillos"`, `"Base Anillo 1"`, `"Cordón Lejano"` ni porcentajes territoriales (`+2%`, `+8%` territorial, `+18%`, `+22%`). En su lugar indicarán de forma neutra que los valores son estimativos base netos (+IVA) sujetos a evaluación técnica según tipo de obra, condiciones del terreno, sector y alcance DOM. Los Lead Magnets en PDF `SHALL` mantener estrictamente 2 páginas por documento.

- **REQ-036.5 (Purga en Canales IA, Catálogos Agénticos, MCP y Curador de Blog):**  
  `THE` endpoints y archivos agénticos (`public/llms.txt`, `public/llms-full.txt`, `api/markdown.js`, `api/mcp.js`, `public/.well-known/agent-skills/cotizar-proyecto/SKILL.md` + hash SHA-256 en `index.json`), los prompts conversacionales (`api/chat.js`, `api/whatsapp.js`, `lib/agent-consultor.js`) y `scripts/auto-curate-and-publish.js` `SHALL NOT` exponer etiquetas de anillos ni porcentajes territoriales. `api/mcp.js` `SHALL` seguir aplicando `getFactorComuna(args.comuna)` internamente en el cálculo numérico de `totalUF`, describiendo de forma prudente los parámetros sin revelar escalas ni porcentajes internos. `api/whatsapp.js` `SHALL` instruir explícitamente nunca revelar porcentajes internos por comuna y usar exclusivamente asterisco simple (`*`) en su matriz oficial. `public/llms.txt` `SHALL` mantenerse `<= 4500` caracteres.

---

## 3. Auditoría de Superficies y Guardrails Preservados

| Superficie | Acción | Guardrail Preservado |
| :--- | :--- | :--- |
| `api/quote.js` | Pasar `comuna` y `factorComuna` desde `quoteHandler`; agregar nota prudente si `factorComuna > 1` en PDF y email | `getFactorComuna` intacto; PDF estricto 1 página Letter; no mostrar comparaciones ni `%` |
| `api/mcp.js` | Eliminar `describeAnilloRM` y texto de anillos/porcentajes en esquema y respuesta | Cálculo interno `getFactorComuna` intacto (`2052/2093/2216/2421/2503 UF`) |
| `api/markdown.js` | Reemplazar sección `## 7` (`/precios`) y viñeta territorial (`/`) por descripción prudente | Preservar tokens `agent-readiness` y alcance DOM Spec 035 |
| `api/whatsapp.js`, `api/chat.js`, `lib/agent-consultor.js` | Retirar Anillos y `%` territoriales; añadir instrucción de reserva interna | Mantener `### MATRIZ OFICIAL` con `*` simple en WhatsApp, Regla 3 pasos y Graceful Pivot |
| `scripts/auto-curate-and-publish.js` | Retirar Anillos y `%` territoriales del prompt curador | Mantener matriz SSOT neta +IVA y reglas DOM |
| `public/llms.txt`, `public/llms-full.txt`, `SKILL.md`, `index.json` | Limpiar sección territorial y regenerar `sha256` en `index.json` | `llms.txt <= 4500` chars; `index.json` consistente |
| HTML (`index`, `precios`, `politicas`, `servicios/*`, `subsidio`) | Eliminar tarjeta en `precios.html`; limpiar notas al pie, JSON-LD FAQ y WebMCP | Preservar `areaServed` JSON-LD, Hero `index.html`, cero `Art. 4.1.10`/`W/m²K` en ventas, teléfonos SSOT |
| `scripts/build-lead-magnets.js` | Reemplazar líneas de Anillos por nota estimativa neutra y regenerar `public/guias/*.pdf` | Mantener estrictamente 2 páginas por PDF |

**Nota de exclusión (falso positivo conocido):** `public/blog/posts/guia-precios-construccion-chile.html:324` menciona `10% y un 18%` referido al costo técnico de muros de contención en terrenos con pendiente `>15%`; no guarda relación con anillos territoriales y se preserva intacto.

---

## 4. Plan de Verificación (TDD)

1. Sintaxis limpia (`node -c`) en todos los `.js` modificados.
2. Regeneración exitosa de guías (`npm run build:guias`) con exactamente 2 páginas por PDF.
3. Actualización de `tests/spec-031-coherencia-precios-global.spec.js` y `tests/spec-033-lead-magnets-pdf.spec.js` alineando las aserciones de coherencia global sin exigir etiquetas públicas de anillos.
4. Creación y ejecución de `tests/spec-036-ocultar-anillos-publicos.spec.js` verificando:
   - Cero fugas de `Anillo 1`–`5`, `5 Anillos`, `Base Anillo`, `Cordón Lejano`, `+22%`, `+18%` en todas las superficies externas.
   - Preservación intacta del motor interno `calculateQuote` (Las Condes `1.22` vs Puente Alto `1.00`).
   - Inclusión condicional de la nota prudente en PDF y email solo cuando `factorComuna > 1` (Las Condes / Pirque), ausencia de comparaciones o `%` en dicha nota, y estrictamente 1 página en el PDF generado.
5. Ejecución de `node scripts/seo-geo-guardian.js --dry-run` y suite Playwright completa de especificaciones (`normative-compliance`, `quote-engine`, `quote-high-ticket-presentation`, `conversational-sdr`, `agent-readiness`, `spec-029`, `spec-031`, `spec-033`, `spec-035`, `spec-036`).
