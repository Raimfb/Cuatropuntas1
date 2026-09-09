# Plan Técnico de Arquitectura: Spec 013 - Lógica Condicional y Alcance Específico para Remodelaciones
**Feature ID:** `013_remodeling_conditional_scope`  
**Estado:** IMPLEMENTED  

---

## 1. Arquitectura General del Flujo

```text
       ┌────────────────────────────────────────────────────────┐
       │   Paso 1 del Wizard (public/quote-wizard.js)           │
       │   Selector #qTipo: 'Remodelacion'                      │
       └───────────────────────────┬────────────────────────────┘
                                   │ Evento 'change' en #qTipo
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   Contenedor Dinámico: #espacios-remodelar-container   │
       │   Input: #espacios-remodelar                           │
       │   Placeholder: "Ej: Cocina y baño, o dormitorio..."    │
       └───────────────────────────┬────────────────────────────┘
                                   │ Avance Paso 2 y Paso 3
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   Paso 3 del Wizard & Envío de Payload                 │
       │   - Preview de recintos y notas de alcance             │
       │   - Payload HTTP POST /api/quote con espacios_remodelar│
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   Backend: api/quote.js -> analyzeRemodelingSpaces()   │
       ├────────────────────────────────────────────────────────┤
       │   CASO A: Húmedo Puro (Solo baño/cocina, sin secos)    │
       │   - Baño: 75 UF + IVA (ignora m²)                      │
       │   - Cocina: 110 UF + IVA (ignora m²)                   │
       │   - Ambos: 185 UF + IVA (ignora m²)                    │
       │                                                        │
       │   CASO B: Mixto / Seco (Incluye dormitorios, etc.)     │
       │   - Cálculo por m²: Superficie * 11 UF (Metalcon)      │
       │   - Inyección de Cláusula Técnica: Baño/Cocina Básico  │
       └───────────────────────────┬────────────────────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
       ┌────────────────────────┐  ┌────────────────────────┐
       │ Persistencia Google    │  │ Generación PDF & Email │
       │ Sheets (Columna Extra) │  │ Cláusulas de Alcance   │
       └────────────────────────┘  └────────────────────────┘
```

---

## 2. Componentes y Modificaciones Detalladas

### 2.1. Frontend Modular: `public/quote-wizard.js`
1. **Markup del Paso 1:**
   Inyectar un contenedor con identificador `#espaciosRemodelarContainer` justo debajo del selector `#qTipo`:
   ```html
   <div id="espaciosRemodelarContainer" class="hidden transition-all duration-300">
       <label for="espacios-remodelar" class="block text-sm font-medium text-gray-700 mb-1">
           Espacio o espacios a remodelar
       </label>
       <input type="text" id="espacios-remodelar" name="espacios_remodelar"
           class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition"
           placeholder="Ej: Cocina y baño, o dormitorio y living, o baño y comedor...">
       <span class="text-xs text-gray-500 mt-1 block">
           Indícanos si incluye zonas húmedas (baño, cocina) o recintos secos para ajustar el alcance técnico.
       </span>
   </div>
   ```
2. **Controlador de Visibilidad:**
   En `initQuoteWizard()` y en el evento `change` de `#qTipo`:
   * Si `qTipo.value === 'Remodelacion'`, remover la clase `hidden`.
   * Si es otro tipo, añadir `hidden` y limpiar `document.getElementById('espacios-remodelar').value = ''`.
3. **Soporte en `calcularCon(tipo, sistema)`:**
   Al invocar `calcularCon('Remodelacion', ...)`, activar la visibilidad del contenedor de forma automática.
4. **Soporte en `prefillFromURL()`:**
   Leer parámetro `espacios` o `espacios_remodelar` desde la URL.
5. **Inyección en el Payload de Envío:**
   Añadir al objeto JSON enviado a `/api/quote`:
   ```javascript
   espacios_remodelar: document.getElementById('espacios-remodelar')?.value || ''
   ```

### 2.2. Motor de Cotización y Backend: `api/quote.js`
1. **Función de Clasificación Semántica (`analyzeRemodelingSpaces`):**
   ```javascript
   function analyzeRemodelingSpaces(espaciosInput) {
       if (!espaciosInput || typeof espaciosInput !== 'string') {
           return { isHumedoPuro: false, hasBano: false, hasCocina: false, hasSeco: false, partidaFijaUF: 0, tipoHumedo: null, notasAlcance: [] };
       }
       const clean = espaciosInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
       
       const hasBano = /\b(bano|banos|wc|toilette|ducha|sanitario)\b/.test(clean);
       const hasCocina = /\b(cocina|cocinas|kitchen|kitchenette)\b/.test(clean);
       const hasSeco = /\b(dormitorio|dormitorios|habitacion|habitaciones|living|comedor|estar|sala|pasillo|escritorio|pieza|piezas|casa|depto|departamento|oficina|terraza|logia|hall)\b/.test(clean);

       let isHumedoPuro = false;
       let partidaFijaUF = 0;
       let tipoHumedo = null;

       if ((hasBano || hasCocina) && !hasSeco) {
           isHumedoPuro = true;
           if (hasBano && hasCocina) {
               partidaFijaUF = 185;
               tipoHumedo = 'Baño y Cocina';
           } else if (hasCocina) {
               partidaFijaUF = 110;
               tipoHumedo = 'Cocina';
           } else if (hasBano) {
               partidaFijaUF = 75;
               tipoHumedo = 'Baño';
           }
       }

       const notasAlcance = [];
       if (hasBano) {
           notasAlcance.push("Nota de alcance (Baño incluido): Considera artefactos en línea estándar (inodoro tradicional y lavamanos simple sin vanitorio de diseño), receptáculo de ducha en obra o tina estándar con cortina/barra, cerámicos nacionales y grifería monomando básica. No incluye showerdoor de cristal templado, vanitorios a medida en cuarzo ni artefactos suspendidos.");
       }
       if (hasCocina) {
           notasAlcance.push("Nota de alcance (Cocina incluida): Considera muebles modulares en melamina estándar de 15 mm con tiradores básicos, cubierta postformada resistente a humedad, lavaplatos sobrepuesto de acero inoxidable y grifería estándar. No incluye cubiertas de cuarzo o granito, muebles a medida de piso a cielo, herrajes de cierre suave ni electrodomésticos empotrados (encimera, horno, campana).");
       }

       return { isHumedoPuro, hasBano, hasCocina, hasSeco, partidaFijaUF, tipoHumedo, notasAlcance };
   }
   ```
2. **Integración en `calculateQuote`:**
   * Recibir parámetro opcional `espacios` o `espacios_remodelar`.
   * Si `isRemodelacion && analysis.isHumedoPuro`:
     `totalEstimado = analysis.partidaFijaUF;` (ignora m² y escala fija).
   * Si `isRemodelacion && !analysis.isHumedoPuro`:
     Calcula $\text{m}^2 \times \text{baseUFm2} \dots$ (para $40\text{ m}^2$ Metalcon $11\text{ UF} = 440\text{ UF}$).
   * Retornar en el resultado: `analysis`, `notasAlcance`, `tipoHumedo`, `isHumedoPuro`.
3. **Propagación en PDF (`pdfkit`) y Plantilla de Email:**
   * En el email HTML al prospecto y al administrador, desplegar el bloque de notas de alcance cuando existan.
   * En el PDF adjunto, añadir una sección ejecutiva con el alcance técnico detallado.

---

## 3. Plan de Verificación y Pruebas (`tests/remodeling-scope.spec.js`)

Se creará una suite completa con los siguientes contratos ejecutables:
1. **T01.1 (DOM & Visibilidad):** Al seleccionar "Remodelación" en `#qTipo`, `#espaciosRemodelarContainer` se hace visible y `#espacios-remodelar` está habilitado. Al cambiar a "Casa Nueva", se oculta y limpia.
2. **T01.2 (Cálculo Partida Fija Pura):**
   * "Baño y cocina" $\to$ $185\text{ UF}$ exactas.
   * "Solo baño" o "baño principal" $\to$ $75\text{ UF}$ exactas.
   * "Solo cocina" $\to$ $110\text{ UF}$ exactas.
3. **T01.3 (Cálculo Mixto por m² y Cláusula):**
   * "Comedor y baño" de $40\text{ m}^2$ $\to$ $440\text{ UF}$ (con sistema Metalcon a $11\text{ UF/m}^2$).
   * Valida presencia de la cláusula de baño básico.
4. **T01.4 (Integración Backend /api/quote):**
   * Simulación de request POST con `espacios_remodelar` y verificación de respuesta exitosa (200 OK) con los campos de desglose.
5. **T01.5 (Cero Regresiones):**
   * Ejecución de `npx playwright test` sobre la totalidad de la suite (82 tests preexistentes + suite nueva).
