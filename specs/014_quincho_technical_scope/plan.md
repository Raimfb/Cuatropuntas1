# Plan Técnico de Arquitectura: Spec 014 - Delimitación de Alcance Técnico y Transparencia para Quinchos
**Feature ID:** `014_quincho_technical_scope`  
**Estado:** IMPLEMENTED  

---

## 1. Arquitectura del Flujo de Datos

```text
       ┌────────────────────────────────────────────────────────┐
       │   Paso 1 del Wizard (public/quote-wizard.js)           │
       │   Selector #qTipo: 'Quincho'                           │
       └───────────────────────────┬────────────────────────────┘
                                   │ Avance Paso 2 y Paso 3
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   Paso 3 del Wizard (Resumen Técnico)                  │
       │   - Contenedor dinámico: #step3QuinchoResumen          │
       │   - Card visual: Partidas Incluidas vs. Exclusiones    │
       │   - Payload HTTP POST /api/quote con tipo: 'Quincho'   │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   Backend: api/quote.js -> calculateQuote()            │
       ├────────────────────────────────────────────────────────┤
       │   Detección isQuincho:                                 │
       │   - Inyección automática de notasAlcance [2 notas]:    │
       │     1. Alcance Base (cobertizo, radier, parrilla, etc.)│
       │     2. Exclusiones (sanitarias, electricidad, muebles) │
       │   - Retorno JSON: notasAlcance poblado                 │
       └───────────────────────────┬────────────────────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
       ┌────────────────────────┐  ┌────────────────────────┐
       │ Ficha Técnica PDF      │  │ Email Transaccional    │
       │ (pdfkit - Notas Alcance│  │ (Cliente y Admin)      │
       │ específicas Quincho)   │  │ (Cláusulas destacadas) │
       └────────────────────────┘  └────────────────────────┘
```

---

## 2. Componentes y Modificaciones Detalladas

### 2.1. Backend: `api/quote.js`
1. **Lógica de Inyección de `notasAlcance` en `calculateQuote`:**
   Actualmente:
   ```javascript
   const spacesAnalysis = isRemodelacion ? analyzeRemodelingSpaces(espaciosInput) : {
       hasBano: false,
       hasCocina: false,
       hasSeco: false,
       isHumedoPuro: false,
       tipoHumedo: null,
       notasAlcance: []
   };
   ```
   Evolución a:
   ```javascript
   let notasAlcance = spacesAnalysis.notasAlcance;
   if (isQuincho) {
       notasAlcance = [
           "Quincho Base Incluye: Cobertizo o techumbre (madera o acero según diseño), radier de hormigón afinado, asador tradicional en obra revestido en ladrillos refractarios con mecanismo elevable y manivela frontal, campana de hojalatería con ducto de tiraje y mesón de apoyo lateral básico.",
           "Partidas Adicionales (a presupuestar en terreno tras visita técnica): No contempla conexiones sanitarias (empalmes de agua potable, grifería, lavacopas ni canalización de desagües a alcantarillado), canalización eléctrica desde tablero general o iluminación decorativa, muebles cerrados bajo mesón (puertas/cajoneras) ni cubiertas en piedra natural (granito o cuarzo)."
       ];
   }
   ```
2. **Plantilla de Correo al Cliente:**
   En la sección de notas de alcance:
   ```javascript
   <h4 style="margin: 0 0 8px 0; color: #9c4221; font-size: 14px;">
       Alcance Técnico de Partidas (${isQuincho ? 'Quincho / Terraza' : 'Remodelación'})
   </h4>
   ```
3. **Ficha PDF (`pdfkit`):**
   Ya renderiza `notasAlcance` dinámicamente si el arreglo no está vacío. Se verificará que las dos notas de quinchos no desborden la página Carta (LETTER).
4. **Respuesta JSON:**
   Garantizar que `/api/quote` retorne `notasAlcance` con las dos notas oficiales para quinchos.

### 2.2. Frontend: `public/quote-wizard.js`
1. **Markup del Paso 3:**
   Incorporar contenedor `#step3QuinchoResumen` adyacente a `#step3RemodelacionResumen`:
   ```html
   <div id="step3QuinchoResumen" class="hidden mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg text-xs text-gray-800 leading-relaxed">
       <div class="font-bold text-orange-900 mb-1 flex items-center gap-1.5">
           <span>Alcance de la Estimación para Quincho:</span>
       </div>
       <div class="space-y-1.5">
           <p><strong class="text-green-800">✓ Incluye:</strong> Cobertizo o techumbre, radier afinado, parrilla en obra con refractarios y manivela frontal, campana con ducto y mesón de apoyo.</p>
           <p><strong class="text-amber-800">⚠ No incluye (adicionales):</strong> Conexiones de agua potable, desagües a alcantarillado, canalización eléctrica ni muebles cerrados bajo mesón (se presupuestan en terreno según factibilidad).</p>
       </div>
   </div>
   ```
2. **Controlador en `nextStep(3)`:**
   - Si `tipoVal === 'Quincho'`, mostrar `#step3QuinchoResumen` y ocultar `#step3RemodelacionResumen`.
   - Si es otro tipo, ocultar `#step3QuinchoResumen`.

### 2.3. Página Comercial: `public/servicios/quinchos.html`
1. **Metadatos SEO & JSON-LD:**
   - Meta description: remover "Incluye parrillas, hornos y conexiones hidráulicas y eléctricas." Reemplazar por formulación transparente: "Estructuras en Metalcom desde 12 UF/m² y Albañilería en obra desde 15 UF/m² con parrilla en obra, refractarios y campana. Instalaciones sanitarias y eléctricas a cubicar en terreno."
   - Schema.org JSON-LD: eliminar afirmaciones de que redes de agua y luz vienen incluidas por defecto en la tarifa base.
2. **Sección "Equipamiento e Instalaciones":**
   - Actualizar título a: "Equipamiento Base y Partidas a Medida".
   - Tarjetas 1 y 2 (Parrilla y Campana): se mantienen como Equipamiento Base Incluido.
   - Tarjetas 3 y 4 (Mueble Barra/Lavacopas e Iluminación): etiquetar claramente como "Partidas Adicionales a Presupuestar en Terreno" (redes de agua/desagüe, canalización eléctrica y cubiertas en granito/cuarzo).

### 2.4. SSOT: `AGENTS.md`
- Actualizar el ítem 3 de la Matriz Oficial de Precios en `AGENTS.md` registrando el desglose taxativo de quinchos (Alcance Base vs. Exclusiones Taxativas).

---

## 3. Plan de Verificación y Pruebas (`tests/quincho-scope.spec.js`)

Se diseñará una suite de pruebas con Playwright cubriendo:
1. **T01.1 (Cálculo Unitario `calculateQuote`):**
   - Quinchos con Metalcom (12 UF/m²) y Albañilería (15 UF/m²).
   - Verificación de que `notasAlcance` contenga exactamente 2 cláusulas con el tenor mandatario.
2. **T01.2 (Endpoint HTTP `/api/quote`):**
   - POST simulado con `tipo: 'Quincho'`.
   - Validación de respuesta 200 OK con `notasAlcance` pobladas.
3. **T01.3 (UI Paso 3 Wizard):**
   - Selección de Quincho en el Paso 1, avance al Paso 3.
   - Verificación de visibilidad de `#step3QuinchoResumen` con los textos de inclusiones y exclusiones.
   - Cambio a otro tipo (ej. "Casa Nueva") y verificación de ocultamiento.
4. **T01.4 (Saneamiento Web en `quinchos.html`):**
   - Verificación estática de ausencia de afirmaciones de inclusión universal de redes sanitarias/eléctricas gratuitas en copys y meta tags.
5. **T01.5 (Regresión Global):**
   - Ejecución de `npx playwright test` asegurando 100% de éxito en toda la suite.
