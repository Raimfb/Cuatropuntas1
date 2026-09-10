# Especificación de Requerimientos: Spec 018 - Polimorfismo Integral del Paso 2 y Sincronización del Funnel
**Feature ID:** `018_full_funnel_polymorphism`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Diagnóstico del Funnel

Tras la implementación exitosa de la Spec 016, el **Paso 1** del cotizador (`public/quote-wizard.js`) se convirtió en un componente polimórfico adaptado a las 4 tipologías de servicio (Casa Nueva, Ampliación, Remodelación y Quincho). Sin embargo, una auditoría exhaustiva del flujo de usuario evidenció fricciones críticas en el **Paso 2** y en la sincronización de validaciones entre frontend y backend:

1. **Fricción en Paso 2 para Remodelación y Quinchos:**
   - A un usuario que cotiza la remodelación de un baño/cocina o un quincho en patio se le fuerza a contestar si el proyecto tiene "1 o 2 pisos" (`#qPisos`) y cuál es el estado de su "Permiso de Edificación DOM" (`#qPermisos`), preguntas que carecen de sentido constructivo para estas tipologías.
2. **Ambigüedad en Segundos Pisos / Ampliaciones:**
   - La pregunta "¿1 o 2 pisos?" resulta redundante o confusa. Para ampliaciones, la variable crítica es si se trata de una extensión en 1º piso (patio) o una sobreelevación estructural en 2º piso.
3. **Discrepancia de Superficie Mínima (Step 1 -> Backend):**
   - El frontend validaba `areaVal >= 3` indistintamente para todas las tipologías en `nextStep(2)`. Sin embargo, `api/quote.js` rechaza con `HTTP 400` proyectos menores a 10 m² para Casa Nueva, Ampliación y Quincho (`minAllowedArea = isRemodelacion ? 3 : 10`). Esto provocaba que un usuario avanzara los 3 pasos sólo para toparse con un error bloqueante al final.
4. **Validación de Espacios en Remodelación:**
   - Para remodelaciones se permitía avanzar a Paso 2 dejando vacío `#espacios-remodelar`.

La Spec 018 aborda el polimorfismo integral del Paso 2, adapta terminaciones a cada tipología, sincroniza las reglas de validación en Paso 1 y garantiza que el payload enviado a `/api/quote` mantenga el 100% de compatibilidad contractual.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Sincronización y Validación de Superficie (Paso 1)

- **[EARS-018-01] Validación de Superficie y Espacios para Remodelación:**  
  **Mientras** el tipo seleccionado sea `Remodelacion`, **cuando** el usuario intente avanzar al Paso 2 (`nextStep(2)`):
  * El sistema **DEBE** verificar que `#espacios-remodelar` contenga texto no vacío. Si está vacío, debe detener la navegación, alertar *"Por favor, especifica qué espacios deseas remodelar (ej: cocina, baño, living)."* y enfocar dicho campo.
  * El sistema **DEBE** verificar que la superficie ingresada en `#qArea` sea $\ge 3\ \text{m}^2$. Si es inferior o inválida, debe alertar *"Por favor, ingresa una superficie estimada válida (mínimo 3 m²)."* y enfocar `#qArea`.

- **[EARS-018-02] Validación de Superficie Mínima para Obras Mayores:**  
  **Mientras** el tipo seleccionado sea `Casa Nueva`, `Ampliacion` o `Quincho`, **cuando** el usuario intente avanzar al Paso 2 (`nextStep(2)`):
  * El sistema **DEBE** verificar que la superficie ingresada en `#qArea` sea $\ge 10\ \text{m}^2$. Si es inferior a 10 o inválida, debe detener la navegación, alertar *"Por favor, ingresa una superficie estimada válida (mínimo 10 m²)."* y enfocar `#qArea`.
  * El sistema **DEBE** sincronizar dinámicamente el atributo `min` de `#qArea` (`min="3"` para Remodelación, `min="10"` para los demás).

---

### 2.2. Polimorfismo Integral de Paso 2 por Tipología

- **[EARS-018-03] Paso 2 para Remodelación (`Remodelacion`):**  
  **Mientras** el tipo sea `Remodelacion`:
  * El sistema **DEBE** ocultar el contenedor `#qPisosContainer` (`display: none;` y clase `hidden`), remover el atributo `required` de `#qPisos` y asegurar internamente el valor `1`.
  * El sistema **DEBE** ocultar el contenedor `#qPermisosContainer` (`display: none;` y clase `hidden`), remover el atributo `required` de `#qPermisos` y asegurar internamente el valor `'Idea'`.
  * El sistema **DEBE** mostrar el contenedor `#qTerminacionesContainer` con el label *"Nivel de Terminaciones de Interiores"* y ofrecer las opciones:
    1. `Estandar`: *"Estándar (Cerámicas/porcelanatos tradicionales, grifería estándar, pintura lavable)"*
    2. `Premium`: *"Alta Gama / Premium (Porcelanatos rectificados, grifería empotrada, cubiertas cuarzo/silestone)"*
  * El sistema **DEBE** mantener visible y obligatorio el selector de comuna (`#qComunaContainer`).

- **[EARS-018-04] Paso 2 para Quinchos y Terrazas (`Quincho`):**  
  **Mientras** el tipo sea `Quincho`:
  * El sistema **DEBE** ocultar el contenedor `#qPisosContainer`, remover `required` de `#qPisos` y asegurar internamente el valor `1`.
  * El sistema **DEBE** ocultar el contenedor `#qPermisosContainer`, remover `required` de `#qPermisos` y asegurar internamente el valor `'Idea'`.
  * El sistema **DEBE** mostrar el contenedor `#qTerminacionesContainer` con el label *"Nivel de Terminaciones y Pavimentos"* y ofrecer las opciones:
    1. `Estandar`: *"Estándar (Radier afinado / Porcelanato rústico, parrilla y mesón en obra)"*
    2. `Premium`: *"Premium (Porcelanato antideslizante, cubiertas granito/cuarzo, iluminación empotrada)"*
  * El sistema **DEBE** mantener visible y obligatorio el selector de comuna (`#qComunaContainer`).

- **[EARS-018-05] Paso 2 para Segundos Pisos y Ampliaciones (`Ampliacion`):**  
  **Mientras** el tipo sea `Ampliacion`:
  * El sistema **DEBE** mostrar el contenedor `#qPisosContainer` con el label *"Ubicación de la Obra"* y las opciones:
    1. `1`: *"Primer Piso (Extensión hacia patio o terreno)"*
    2. `2`: *"Segundo Piso (Sobreelevación estructural liviana)"*
  * El sistema **DEBE** mostrar `#qTerminacionesContainer` con el label *"Nivel de Terminaciones"* y las opciones:
    1. `Basico`: *"Básico (Habitable, ventanas estándar, revestimientos estándar)"*
    2. `Estandar`: *"Estándar (Buenas terminaciones superficiales)"*
    3. `Premium`: *"Premium (Termopanel DVH, pisos fotolaminados, aislación perimetral)"*
  * El sistema **DEBE** mantener visibles y obligatorios `#qComunaContainer` y `#qPermisosContainer` (con sus 4 alternativas de tramitación municipal DOM).

- **[EARS-018-06] Paso 2 para Casas Nuevas (`Casa Nueva`):**  
  **Mientras** el tipo sea `Casa Nueva`:
  * El sistema **DEBE** mostrar `#qPisosContainer` con el label *"Número de Pisos"* y opciones `1`: *"1 Piso"*, `2`: *"2 o más Pisos"*.
  * El sistema **DEBE** mostrar `#qTerminacionesContainer` con sus 3 niveles habitacionales (`Basico`, `Estandar`, `Premium`).
  * El sistema **DEBE** mostrar `#qComunaContainer` y `#qPermisosContainer` con el catálogo completo.

---

### 2.3. Transición de Pasos, Integridad de Payload y Resiliencia

- **[EARS-018-07] Navegación Segura en `nextStep(3)`:**  
  **Cuando** el usuario presione "Siguiente" en el Paso 2:
  * El sistema **DEBE** validar únicamente los campos visualmente activos según la tipología.
  * Si la comuna no está seleccionada, el sistema **DEBE** alertar *"Por favor, selecciona la comuna de la obra."* y enfocar `#qComuna`.
  * Los campos ocultos (`#qPisos` y `#qPermisos`) **NO DEBEN** bloquear el avance a Paso 3.

- **[EARS-018-08] Integridad del Contrato con `/api/quote`:**  
  El sistema **DEBE** garantizar que en el evento `submit` el objeto payload contenga:
  * `tipo`: Tipología seleccionada.
  * `sistema`: Sistema constructivo asignado o seleccionado.
  * `area`: Número flotante $\ge 3$ (o $\ge 10$).
  * `pisos`: Entero (1 a 4). En Remodelación y Quincho asegurado en `1`.
  * `terminaciones`: `'Basico'`, `'Estandar'` o `'Premium'`.
  * `comuna`: String válido de comuna RM.
  * `permisos`: En Remodelación y Quincho garantizado en `'Idea'`, en Casa/Ampliación el seleccionado.
  * `espacios_remodelar`: Texto descriptivo (obligatorio en Remodelación).

---

## 3. Criterios de Aceptación Técnicos

1. En `public/quote-wizard.js`, los campos del Paso 2 están estructurados en contenedores semánticos: `#qPisosContainer`, `#qTerminacionesContainer`, `#qComunaContainer` y `#qPermisosContainer`.
2. Al seleccionar `Remodelacion`, en Paso 2 solo se solicitan Terminaciones de Interiores y Comuna. `#qPisos` y `#qPermisos` están ocultos con valores predeterminados `1` e `'Idea'`.
3. Al seleccionar `Quincho`, en Paso 2 solo se solicitan Terminaciones de Quincho y Comuna. `#qPisos` y `#qPermisos` están ocultos con valores predeterminados `1` e `'Idea'`.
4. Al seleccionar `Ampliacion`, `#qPisos` ofrece la bifurcación "Primer Piso" vs "Segundo Piso (Sobreelevación)" y se solicitan permisos DOM.
5. Al seleccionar `Casa Nueva`, se mantienen las 4 preguntas habitacionales completas.
6. En Paso 1, `nextStep(2)` bloquea proyectos de Casa, Ampliación y Quincho con menos de 10 m². Para Remodelación permite desde 3 m² pero exige especificar recintos.
7. Suite de integración `tests/full-funnel.spec.js` creada y cubriendo el 100% de los flujos de navegación y payloads.
8. La suite global de regresión (`npx playwright test`) conserva 103/103 tests en verde sin roturas.
