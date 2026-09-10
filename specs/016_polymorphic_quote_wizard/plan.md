# Plan Técnico de Arquitectura: Spec 016 - Formulario Dinámico y Polimórfico por Tipología de Proyecto
**Feature ID:** `016_polymorphic_quote_wizard`  
**Estado:** APPROVED / IMPLEMENTED  

---

## 1. Arquitectura de Estados y Mapeo Polimórfico

El wizard opera en el cliente (`public/quote-wizard.js`) con una arquitectura declarativa basada en un diccionario de configuración por tipología:

```text
                               ┌────────────────────────────────┐
                               │  Usuario cambia #qTipo         │
                               │  (o se monta vía data-default) │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │    syncPolymorphicStep1(tipoVal) │
                              └────────────────┬─────────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
    ┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
    │  Casa Nueva          │        │  Ampliacion          │        │  Remodelacion        │
    │  • Label: Sistema    │        │  • Label: Estructura │        │  • #qSistema: OCULTO │
    │    Constructivo      │        │    Liviana Sobreelev.│        │  • req=false, val=   │
    │  • Metalcom (19 UF)  │        │  • Metalcom (22 UF)  │        │    "Metalcon"        │
    │  • SIP (21 UF)       │        │  • SIP (24 UF)       │        │  • #espaciosRemodelar│
    │  • Albañilería (25)  │        │  • NO Albañilería    │        │    VISIBLE           │
    │  • #espacios: OCULTO │        │  • #espacios: OCULTO │        │  • HelpText activo   │
    └──────────────────────┘        └──────────────────────┘        └──────────────────────┘
                                               ▲
                                               │
                                    ┌──────────────────────┐
                                    │  Quincho             │
                                    │  • Label: Estructura │
                                    │    y Techumbre Cobert│
                                    │  • Madera (12 UF)    │
                                    │    [val="Metalcon"]  │
                                    │  • Fierro/Acero (15) │
                                    │    [val="Albanileria]│
                                    │  • #espacios: OCULTO │
                                    └──────────────────────┘
```

---

## 2. Diccionario de Configuración por Tipología (`CONFIG_POR_TIPO`)

```javascript
const CONFIG_POR_TIPO = {
    'Casa Nueva': {
        sistemaLabel: 'Sistema Constructivo',
        showSistema: true,
        sistemas: [
            { value: 'Metalcon', label: 'Metalcom Estructural (desde 19 UF/m² +IVA)' },
            { value: 'SIP', label: 'Panel SIP Térmico (desde 21 UF/m² +IVA)' },
            { value: 'Albanileria', label: 'Albañilería Confinada / Mixto (desde 25 UF/m² +IVA)' }
        ],
        defaultSistema: 'Metalcon',
        areaPlaceholder: 'Ej: 50 o 120',
        areaHelpText: '',
        showEspacios: false
    },
    'Ampliacion': {
        sistemaLabel: 'Estructura Liviana de Sobreelevación',
        showSistema: true,
        sistemas: [
            { value: 'Metalcon', label: 'Metalcom Estructural Liviano (desde 22 UF/m² +IVA)' },
            { value: 'SIP', label: 'Panel SIP Aislante (desde 24 UF/m² +IVA)' }
        ],
        defaultSistema: 'Metalcon',
        areaPlaceholder: 'Ej: 30 o 60',
        areaHelpText: '',
        showEspacios: false
    },
    'Remodelacion': {
        sistemaLabel: 'Sistema Constructivo',
        showSistema: false,
        sistemas: [
            { value: 'Metalcon', label: 'Remodelación Estándar' }
        ],
        defaultSistema: 'Metalcon',
        areaPlaceholder: 'Ej: 4 (baño), 15 (cocina) o 50 (integral)',
        areaHelpText: 'Los recintos húmedos puros (baño/cocina) se cotizan por paquete cerrado con partidas integrales.',
        showEspacios: true
    },
    'Quincho': {
        sistemaLabel: 'Estructura y Techumbre del Cobertizo',
        showSistema: true,
        sistemas: [
            { value: 'Metalcon', label: 'Madera Tratada / Pino Oregón (desde 12 UF/m² +IVA)' },
            { value: 'Albanileria', label: 'Perfilería de Acero / Fierro Electrosoldado (desde 15 UF/m² +IVA)' }
        ],
        defaultSistema: 'Metalcon',
        areaPlaceholder: 'Ej: 20 o 35',
        areaHelpText: 'Tarifa base contempla cobertura, radier, asador refractario con manivela y campana.',
        showEspacios: false
    }
};
```

---

## 3. Contratos de Compatibilidad con Backend (`api/quote.js`)

1. **Quinchos:**
   - Opción *"Madera Tratada / Pino Oregón"* $\to$ emite `value="Metalcon"`.
   - Opción *"Perfilería de Acero / Fierro Electrosoldado"* $\to$ emite `value="Albanileria"`.
   - En `api/quote.js`: `isQuincho && sistema === 'Metalcon'` aplica base 12 UF/m²; `isQuincho && sistema === 'Albanileria'` aplica base 15 UF/m². Cumplimiento exacto sin alterar la API.
2. **Remodelaciones:**
   - Al estar oculto el selector, se fija internamente `qSistema.value = 'Metalcon'`.
   - En `api/quote.js`: `isRemodelacion && sistema === 'Metalcon'` aplica base 11 UF/m² (o partidas cerradas de 75 UF / 110 UF para baños/cocinas puras).
3. **Casas Nuevas y Segundos Pisos:**
   - Emite `Metalcon`, `SIP`, `Albanileria` preservando la compatibilidad de cálculo, PDF y correo al administrador.

---

## 4. Modificaciones en el Marcado HTML de `createWizardHTML`

```html
<div id="qSistemaContainer">
    <label id="qSistemaLabel" for="qSistema" class="block text-sm font-medium text-gray-700 mb-1">Sistema Constructivo</label>
    <select id="qSistema" aria-label="Seleccionar sistema constructivo" title="Seleccionar sistema constructivo" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
        ${sistemaOptions}
    </select>
</div>
<div id="qAreaContainer">
    <label for="qArea" class="block text-sm font-medium text-gray-700 mb-1">Superficie Estimada (m²)</label>
    <input type="number" id="qArea" min="3" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition" placeholder="${placeholderArea}" required>
    <span id="qAreaHelpText" class="text-xs text-gray-500 mt-1 block hidden"></span>
</div>
```

---

## 5. Estrategia de Verificación y TDD

1. **Test TDD (`tests/polymorphic-wizard.spec.js`):**
   - Transiciones interactivas en `public/index.html` alternando entre las 4 tipologías.
   - Comprobación de visibilidad de `#qSistemaContainer` y `#espaciosRemodelarContainer`.
   - Comprobación de etiquetas de options para cada tipología.
   - Avance exitoso al Paso 2 en Remodelación con el selector de sistema oculto.
   - Verificación de montaje inicial en `servicios/remodelaciones.html` y `servicios/quinchos.html`.
2. **Suite Global:**
   - Confirmar que los 97 tests existentes continúan pasando en verde.
