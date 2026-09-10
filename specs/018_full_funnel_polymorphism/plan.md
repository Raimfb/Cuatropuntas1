# Plan Técnico de Arquitectura: Spec 018 - Polimorfismo Integral del Paso 2 y Sincronización del Funnel
**Feature ID:** `018_full_funnel_polymorphism`  
**Estado:** APPROVED  

---

## 1. Arquitectura de Estados del Funnel Completo (Paso 1, 2 y 3)

El wizard en `public/quote-wizard.js` opera mediante un modelo declarativo donde el cambio en el selector de tipología (`#qTipo`) orquesta la reconfiguración sincronizada del Paso 1 y del Paso 2:

```text
                               ┌────────────────────────────────┐
                               │  Usuario cambia #qTipo         │
                               │  (o se monta vía data-default) │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │  syncPolymorphicStep1(tipoVal)   │
                              │  syncPolymorphicStep2(tipoVal)   │
                              └────────────────┬─────────────────┘
                                               │
          ┌───────────────────────────┬────────┴──────────────────┬───────────────────────────┐
          ▼                           ▼                           ▼                           ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  Casa Nueva      │        │  Ampliación      │        │  Remodelación    │        │  Quincho         │
│  [Paso 1]        │        │  [Paso 1]        │        │  [Paso 1]        │        │  [Paso 1]        │
│  • minArea = 10  │        │  • minArea = 10  │        │  • minArea = 3   │        │  • minArea = 10  │
│  • 3 Sistemas    │        │  • 3 Sistemas    │        │  • #qSistema OFF │        │  • Madera /      │
│  • #espacios OFF │        │  • #espacios OFF │        │  • #espacios ON  │        │    Fierro        │
│  [Paso 2]        │        │  [Paso 2]        │        │  [Paso 2]        │        │  [Paso 2]        │
│  • #qPisos: ON   │        │  • #qPisos: ON   │        │  • #qPisos: OFF  │        │  • #qPisos: OFF  │
│    (1 ó 2 pisos) │        │    (Ubicación 1º │        │    (val = '1')   │        │    (val = '1')   │
│  • Terminaciones │        │     ó 2º piso)   │        │  • #qPermisos:   │        │  • #qPermisos:   │
│    Habitacionales│        │  • Terminaciones │        │    OFF           │        │    OFF           │
│  • #qPermisos: ON│        │    Habitacionales│        │    (val='Idea')  │        │    (val='Idea')  │
│  • Comuna: ON    │        │  • #qPermisos: ON│        │  • Terminaciones │        │  • Terminaciones │
│                  │        │  • Comuna: ON    │        │    Interiores    │        │    Pavimentos/   │
│                  │        │                  │        │  • Comuna: ON    │        │    Cubiertas     │
│                  │        │                  │        │                  │        │  • Comuna: ON    │
└──────────────────┘        └──────────────────┘        └──────────────────┘        └──────────────────┘
```

---

## 2. Diccionario de Configuración Declarativo (`CONFIG_POR_TIPO`)

Extendemos `CONFIG_POR_TIPO` en `public/quote-wizard.js` para centralizar la metadata del Paso 1 y Paso 2:

```javascript
const CONFIG_POR_TIPO = {
    'Casa Nueva': {
        // Paso 1
        sistemaLabel: 'Sistema Constructivo',
        showSistema: true,
        sistemas: [
            { value: "Metalcon", label: "Metalcom Estructural (desde 19 UF/m² +IVA)" },
            { value: "SIP", label: "Panel SIP Térmico (desde 21 UF/m² +IVA)" },
            { value: "Albanileria", label: "Albañilería Confinada / Mixto (desde 25 UF/m² +IVA)" }
        ],
        defaultSistema: 'Metalcon',
        areaPlaceholder: 'Ej: 50 o 120',
        areaHelpText: '',
        showEspacios: false,
        minArea: 10,

        // Paso 2
        showPisos: true,
        pisosLabel: 'Número de Pisos',
        pisosOptions: [
            { value: '1', label: '1 Piso' },
            { value: '2', label: '2 o más Pisos' }
        ],
        defaultPisos: '1',

        terminacionesLabel: 'Nivel de Terminaciones',
        terminacionesOptions: [
            { value: 'Basico', label: 'Básico (Habitable, ventanas estándar, revestimientos estándar)' },
            { value: 'Estandar', label: 'Estándar (Buenas terminaciones superficiales)' },
            { value: 'Premium', label: 'Premium (Termopanel, pisos flotantes, revestimientos)' }
        ],
        defaultTerminaciones: 'Estandar',

        showPermisos: true,
        defaultPermisos: 'Idea'
    },
    'Ampliacion': {
        // Paso 1
        sistemaLabel: 'Sistema Constructivo (Ampliación 1º piso o Sobreelevación 2º piso)',
        showSistema: true,
        sistemas: [
            { value: "Metalcon", label: "Metalcom Estructural Liviano (desde 22 UF/m² +IVA)" },
            { value: "SIP", label: "Panel SIP Aislante (desde 24 UF/m² +IVA)" },
            { value: "Albanileria", label: "Albañilería Confinada / Tradicional (desde 27 UF/m² +IVA)" }
        ],
        defaultSistema: 'Metalcon',
        areaPlaceholder: 'Ej: 30 o 60',
        areaHelpText: '',
        showEspacios: false,
        minArea: 10,

        // Paso 2
        showPisos: true,
        pisosLabel: 'Ubicación de la Obra',
        pisosOptions: [
            { value: '1', label: 'Primer Piso (Extensión hacia patio o terreno)' },
            { value: '2', label: 'Segundo Piso (Sobreelevación estructural liviana)' }
        ],
        defaultPisos: '1',

        terminacionesLabel: 'Nivel de Terminaciones',
        terminacionesOptions: [
            { value: 'Basico', label: 'Básico (Habitable, ventanas estándar, revestimientos estándar)' },
            { value: 'Estandar', label: 'Estándar (Buenas terminaciones superficiales)' },
            { value: 'Premium', label: 'Premium (Termopanel DVH, pisos fotolaminados, aislación perimetral)' }
        ],
        defaultTerminaciones: 'Estandar',

        showPermisos: true,
        defaultPermisos: 'Idea'
    },
    'Remodelacion': {
        // Paso 1
        sistemaLabel: 'Sistema Constructivo',
        showSistema: false,
        sistemas: [
            { value: "Metalcon", label: "Remodelación Estándar" }
        ],
        defaultSistema: 'Metalcon',
        areaPlaceholder: 'Ej: 4 (baño), 15 (cocina) o 50 (casa)',
        areaHelpText: 'Los recintos húmedos puros (baño o cocina) se cotizan por paquete cerrado con partidas integrales.',
        showEspacios: true,
        minArea: 3,

        // Paso 2
        showPisos: false,
        pisosLabel: 'Número de Pisos',
        pisosOptions: [{ value: '1', label: '1 Piso' }],
        defaultPisos: '1',

        terminacionesLabel: 'Nivel de Terminaciones de Interiores',
        terminacionesOptions: [
            { value: 'Estandar', label: 'Estándar (Cerámicas/porcelanatos tradicionales, grifería estándar, pintura lavable)' },
            { value: 'Premium', label: 'Alta Gama / Premium (Porcelanatos rectificados, grifería empotrada, cubiertas cuarzo/silestone)' }
        ],
        defaultTerminaciones: 'Estandar',

        showPermisos: false,
        defaultPermisos: 'Idea'
    },
    'Quincho': {
        // Paso 1
        sistemaLabel: 'Estructura y Techumbre del Cobertizo',
        showSistema: true,
        sistemas: [
            { value: "Metalcon", label: "Madera Tratada / Pino Oregón (desde 12 UF/m² +IVA)" },
            { value: "Albanileria", label: "Perfilería de Acero / Fierro Electrosoldado (desde 15 UF/m² +IVA)" }
        ],
        defaultSistema: 'Metalcon',
        areaPlaceholder: 'Ej: 20 o 35',
        areaHelpText: 'Tarifa base contempla cobertura, radier, asador refractario con manivela y campana.',
        showEspacios: false,
        minArea: 10,

        // Paso 2
        showPisos: false,
        pisosLabel: 'Número de Pisos',
        pisosOptions: [{ value: '1', label: '1 Piso' }],
        defaultPisos: '1',

        terminacionesLabel: 'Nivel de Terminaciones y Pavimentos',
        terminacionesOptions: [
            { value: 'Estandar', label: 'Estándar (Radier afinado / Porcelanato rústico, mesón y parrilla en obra)' },
            { value: 'Premium', label: 'Premium (Porcelanato antideslizante, cubiertas granito/cuarzo, iluminación empotrada)' }
        ],
        defaultTerminaciones: 'Estandar',

        showPermisos: false,
        defaultPermisos: 'Idea'
    }
};
```

---

## 3. Contenedores Semánticos del Paso 2 en el DOM

El template de `createWizardHTML` estructura el Paso 2 con contenedores identificables:

```html
<!-- Step 2: Diseño y Ubicación -->
<div id="step2" class="step-container hidden transition-opacity duration-300 opacity-0">
    <h3 class="text-lg font-bold mb-4">Diseño y Ubicación</h3>
    <div class="space-y-4">
        <div id="qPisosContainer">
            <label id="qPisosLabel" for="qPisos" class="block text-sm font-medium text-gray-700 mb-1">Número de Pisos</label>
            <select id="qPisos" aria-label="Seleccionar número de pisos" title="Seleccionar número de pisos" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                <option value="1">1 Piso</option>
                <option value="2">2 o más Pisos</option>
            </select>
        </div>
        <div id="qTerminacionesContainer">
            <label id="qTerminacionesLabel" for="qTerminaciones" class="block text-sm font-medium text-gray-700 mb-1">Nivel de Terminaciones</label>
            <select id="qTerminaciones" aria-label="Seleccionar nivel de terminaciones" title="Seleccionar nivel de terminaciones" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                <!-- Opciones polimórficas -->
            </select>
        </div>
        <div id="qComunaContainer">
            <label id="qComunaLabel" for="qComuna" class="block text-sm font-medium text-gray-700 mb-1">Comuna de la Obra (Región Metropolitana)</label>
            <select id="qComuna" aria-label="Seleccionar comuna de la obra" title="Seleccionar comuna de la obra" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                <option value="">Selecciona tu comuna...</option>
                ${comunaOptions}
            </select>
        </div>
        <div id="qPermisosContainer">
            <label id="qPermisosLabel" for="qPermisos" class="block text-sm font-medium text-gray-700 mb-1">Estado de Planos y Permiso Municipal (DOM)</label>
            <select id="qPermisos" aria-label="Seleccionar estado de planos y permisos" title="Seleccionar estado de planos y permisos" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                <option value="Idea">Solo tengo la idea (Requiero diseño de planos y gestión DOM completa)</option>
                <option value="Planos">Tengo planos de arquitectura (Falta cálculo estructural y permiso DOM)</option>
                <option value="PermisoAprobado">Tengo Permiso de Edificación DOM Aprobado (Listo para construir)</option>
                <option value="ArquitectoPropio">Tengo arquitecto propio que tramita la DOM (Solo requiero construcción)</option>
            </select>
        </div>
    </div>
    <div class="mt-6 flex justify-between">
        <button type="button" onclick="nextStep(1)" class="px-6 py-3 border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-50 transition">&larr; Anterior</button>
        <button type="button" onclick="nextStep(3)" class="px-6 py-3 bg-primary text-white font-bold rounded-md hover:bg-gray-800 transition shadow-md">Siguiente &rarr;</button>
    </div>
</div>
```

---

## 4. Fallback y Contrato con `api/quote.js`

Para garantizar cero regresiones y compatibilidad total con `/api/quote`:
1. `pisos`: Si `#qPisosContainer` está oculto, `#qPisos` tiene valor `1` y el payload envía `1`.
2. `permisos`: Si `#qPermisosContainer` está oculto, `#qPermisos` tiene valor `'Idea'` y el payload envía `'Idea'`.
3. `terminaciones`: Las opciones de interiores y quinchos usan values `'Estandar'` y `'Premium'`, que son reconocidos por `calculateQuote` para aplicar el recargo del 10% o la tarifa base.
4. `comuna`: Siempre obligatoria.
5. `espacios_remodelar`: Enviado en el payload para el resumen y la persistencia en Google Sheets.
