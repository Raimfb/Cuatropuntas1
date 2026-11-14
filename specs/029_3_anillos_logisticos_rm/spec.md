# Especificación de Requerimientos: Spec 029.3 - Calibración de Anillos Logísticos y Mercado RM
**Feature ID:** `029_3_anillos_logisticos_rm`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  
**Relación:** Extensión territorial de `Spec 001` y `Spec 029` (`029.2`)

---

## 1. Resumen Ejecutivo y Diagnóstico

### 1.1. Diagnóstico del Problema
Actualmente, la función `getFactorComuna(comunaVal)` en [`api/quote.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/api/quote.js#L177-L187) aplica únicamente dos niveles de diferenciación sobre el factor base (`1.00`):
1. **Sector Oriente (`1.22`):** `vitacura`, `las condes`, `lo barnechea`, `providencia`, `la reina`, `tier1`.
2. **Periferia / Rural Antiguo (`0.98`, -2%):** Agrupaba en un descuento plano de `-2%` comunas de alta exigencia técnica y condominios consolidados (`colina` / `chicureo`), comunas colindantes a la base operativa en Puente Alto (`pirque`) y comunas del cordón lejano de la RM (`buin`, `paine`, `talagante`, `melipilla`, `curacavi`, `lampa`, `tiltil`, `isla de maipo`, `el monte`).

Este descuento heredado (`0.98`) distorsiona la estructura de costos reales:
* **Chicureo / Colina (`1.18`):** Presenta exigencias de condominios cerrados (Piedra Roja, Chamisero, Chicureo), control de acceso vehicular, estándares arquitectónicos de alto ticket y traslados diarios que requieren un factor de `+18%`, nunca un descuento de `-2%`.
* **Cordón Lejano RM (`1.08`):** Los traslados de cuadrillas, fletes de materiales, supervisión de ingeniería y logística hacia comunas periféricas distantes implican un sobrecosto operativo real del `+8%`.
* **Pirque (`1.02`):** Por su cercanía colindante al centro operativo en Puente Alto pero con flete rural menor, requiere un ajuste leve de `+2%` (`1.02`).
* **Puente Alto, La Florida y Santiago Urbano (`1.00`):** Constituyen el radio operativo directo sin recargo territorial (`0%`).

### 1.2. Objetivo
Reemplazar el obsoleto factor periférico `0.98` en `getFactorComuna(comunaVal)` por un modelo paramétrico de **5 Anillos Logísticos y de Mercado RM**, sincronizar los catálogos técnicos para agentes IA (`public/llms.txt` y `public/llms-full.txt`) y actualizar la suite de pruebas TDD (`tests/quote-engine.spec.js`), preservando intactas las tarifas base en UF/m², el factor `+8%` de etapa `Idea` y el frontend `public/quote-wizard.js`.

---

## 2. Matriz de 5 Anillos Logísticos y de Mercado RM

| Anillo | Nombre Territorial | Factor | Variación | Comunas / Sectores Incluidos (Normalizados sin tildes, minúsculas) |
| :--- | :--- | :---: | :---: | :--- |
| **Anillo 5** | Sector Oriente | `1.22` | `+22%` | `las condes`, `vitacura`, `lo barnechea`, `la reina`, `providencia` (y clave heredada `tier1`) |
| **Anillo 4** | Chicureo / Colina | `1.18` | `+18%` | `colina`, `chicureo`, `piedra roja`, `chamisero` |
| **Anillo 3** | Cordón Lejano RM | `1.08` | `+8%` | `buin`, `paine`, `calera de tango`, `talagante`, `penaflor`, `isla de maipo`, `el monte`, `padre hurtado`, `melipilla`, `curacavi`, `lampa`, `tiltil` |
| **Anillo 2** | Colindante Base Puente Alto | `1.02` | `+2%` | `pirque` |
| **Anillo 1** | Base Local y Santiago Urbano | `1.00` | `0%` | `puente alto`, `la florida` y resto de comunas urbanas de la RM (fallback general) |

---

## 3. Requerimientos Funcionales en Notación EARS

### 3.1. Motor de Cotización (`api/quote.js`)

- **[EARS-029.3-01] Normalización de Entrada en `getFactorComuna`:**  
  * **Cuando** se invoque `getFactorComuna(comunaVal)` con un valor vacío, `null` o `undefined`, el sistema **DEBE** retornar `1.00`.  
  * **Cuando** se reciba una cadena de texto, el sistema **DEBE** normalizarla a minúsculas y eliminar diacríticos (`String(comunaVal).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")`) antes de evaluar coincidencias.

- **[EARS-029.3-02] Anillo 5 — Sector Oriente (`1.22`, +22%):**  
  * **Cuando** el nombre normalizado de la comuna contenga `'las condes'`, `'vitacura'`, `'lo barnechea'`, `'la reina'`, `'providencia'` o sea exactamente `'tier1'`, `getFactorComuna` **DEBE** retornar `1.22`.

- **[EARS-029.3-03] Anillo 4 — Chicureo / Colina (`1.18`, +18%):**  
  * **Cuando** el nombre normalizado de la comuna contenga `'colina'`, `'chicureo'`, `'piedra roja'` o `'chamisero'`, `getFactorComuna` **DEBE** retornar `1.18`.

- **[EARS-029.3-04] Anillo 3 — Cordón Lejano RM (`1.08`, +8%):**  
  * **Cuando** el nombre normalizado de la comuna contenga `'buin'`, `'paine'`, `'calera de tango'`, `'talagante'`, `'penaflor'`, `'isla de maipo'`, `'el monte'`, `'padre hurtado'`, `'melipilla'`, `'curacavi'`, `'lampa'` o `'tiltil'`, `getFactorComuna` **DEBE** retornar `1.08`.

- **[EARS-029.3-05] Anillo 2 — Colindante Base Puente Alto (`1.02`, +2%):**  
  * **Cuando** el nombre normalizado de la comuna contenga `'pirque'`, `getFactorComuna` **DEBE** retornar `1.02`.

- **[EARS-029.3-06] Anillo 1 — Base Local y Santiago Urbano (`1.00`, 0%):**  
  * **Cuando** el nombre normalizado de la comuna corresponda a `'puente alto'`, `'la florida'` o cualquier otra comuna de la Región Metropolitana no listada en los Anillos 2, 3, 4 o 5, `getFactorComuna` **DEBE** retornar `1.00`.  
  * El antiguo factor `0.98` **DEBE** quedar completamente eliminado del motor de cálculo.

### 3.2. Garantías de Invariabilidad (No-Regresión Comercial y Técnica)

- **[EARS-029.3-07] Invariabilidad de Matriz Base en UF/m²:**  
  * El sistema **NO DEBE** modificar ninguna tarifa base por metro cuadrado en `calculateQuote` (Casas Nuevas: `19 / 21 / 25 UF/m²`; Segundos Pisos y Ampliaciones: `22 / 24 / 27 UF/m²`; Quinchos: `12 / 14 / 15 UF/m²`; Remodelaciones: `11 / 13 UF/m²`; Recintos Húmedos Puros: `75 / 110 / 185 UF`).

- **[EARS-029.3-08] Invariabilidad del Recargo `+8%` en Etapa `Idea`:**  
  * El sistema **NO DEBE** alterar `getPermisosData(permisosKey, tipo)`, preservando el factor `1.08` (+8%) para etapa `'Idea'` en `Casa Nueva` y `Ampliación`, el factor `1.00` en `Quincho` y `Remodelación`, y los descuentos técnicos por planos (`0.97`) o permiso aprobado (`0.94`).

- **[EARS-029.3-09] Invariabilidad del Frontend (`public/quote-wizard.js`):**  
  * El sistema **NO DEBE** modificar `public/quote-wizard.js`. El selector `#qComuna` conserva intacta su lista `COMUNAS_RM` (incluyendo `"Colina (Chicureo)"`, `"Lampa (Batuco)"`, `"Peñaflor"`, `"Curacaví"`, `"Pirque"`, `"Puente Alto"`, `"La Florida"`, etc.), las cuales son resueltas transparentemente en el backend mediante coincidencia de subcadenas normalizadas.

### 3.3. Sincronización de Documentación GEO / LLMs (`public/llms.txt` y `public/llms-full.txt`)

- **[EARS-029.3-10] Sincronización de Factores Territoriales en Catálogos LLM:**  
  * Los archivos `public/llms.txt` y `public/llms-full.txt` **DEBEN** reflejar los 5 Anillos Logísticos y de Mercado RM (`1.22` Sector Oriente, `1.18` Chicureo/Colina, `1.08` Cordón Lejano RM, `1.02` Pirque, `1.00` Base Local Puente Alto / La Florida y Santiago Urbano) para mantener consistencia SSOT ante motores de búsqueda generativos.

---

## 4. Criterios de Aceptación y Casos de Prueba TDD (`T029.3`)

1. **Verificación Exhaustiva de los 5 Anillos en `getFactorComuna`:**
   - **Anillo 5 (`1.22`):** `'Las Condes'`, `'VITACURA'`, `'Lo Barnechea'`, `'La Reina'`, `'Providencia'`, `'Tier1'` $\rightarrow$ `1.22`.
   - **Anillo 4 (`1.18`):** `'Colina (Chicureo)'`, `'Chicureo'`, `'Piedra Roja'`, `'Chamisero'`, `'colina'` $\rightarrow$ `1.18`.
   - **Anillo 3 (`1.08`):** `'Buin'`, `'Paine'`, `'Calera de Tango'`, `'Talagante'`, `'Peñaflor'`, `'Isla de Maipo'`, `'El Monte'`, `'Padre Hurtado'`, `'Melipilla'`, `'Curacaví'`, `'Lampa (Batuco)'`, `'Tiltil'` $\rightarrow$ `1.08`.
   - **Anillo 2 (`1.02`):** `'Pirque'`, `'pirque'` $\rightarrow$ `1.02`.
   - **Anillo 1 (`1.00`):** `'Puente Alto'`, `'La Florida'`, `'Santiago Centro'`, `'Ñuñoa'`, `'Maipú'`, `''` $\rightarrow$ `1.00`.
2. **Cálculo Integral por Anillo en `calculateQuote` (Casa Nueva 100 m², Metalcon 19 UF/m², Estándar, `Idea` 1.08):**
   - **Anillo 5 (`Las Condes`):** `19 * 100 * 1.22 * 1.08 = 2503.44 UF` (`minUF: '2.403'`, `maxUF: '2.629'`).
   - **Anillo 4 (`Colina (Chicureo)`):** `19 * 100 * 1.18 * 1.08 = 2421.36 UF` (`minUF: '2.325'`, `maxUF: '2.542'`).
   - **Anillo 3 (`Buin` / `Talagante`):** `19 * 100 * 1.08 * 1.08 = 2216.16 UF` (`minUF: '2.128'`, `maxUF: '2.327'`).
   - **Anillo 2 (`Pirque`):** `19 * 100 * 1.02 * 1.08 = 2093.04 UF` (`minUF: '2.009'`, `maxUF: '2.198'`).
   - **Anillo 1 (`Puente Alto` / `La Florida`):** `19 * 100 * 1.00 * 1.08 = 2052.00 UF` (`minUF: '1.970'`, `maxUF: '2.155'`).
3. **Regresión Cero:** Compilación limpia (`node -c api/quote.js`) y el 100% de la suite de Playwright (177+ tests) en verde.
