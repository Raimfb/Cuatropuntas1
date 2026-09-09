# Especificación de Requerimientos: Spec 013 - Lógica Condicional y Alcance Específico para Remodelaciones
**Feature ID:** `013_remodeling_conditional_scope`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Problema de Negocio
En el cotizador actual (`public/quote-wizard.js` y `api/quote.js`), el cálculo para "Remodelación" aplica una tasa plana por metro cuadrado ($11\text{ UF/m}^2$ en estructura ligera o $13\text{ UF/m}^2$ en sólida) con un piso para áreas pequeñas ($< 8\text{ m}^2$). Esta simplificación genera dos distorsiones comerciales graves:

1. **Subvaloración en Obras Húmedas Puras:** Si un cliente cotiza solo baño ($4\text{ m}^2$) o solo cocina ($10\text{ m}^2$), la cotización por metro cuadrado lineal no absorbe el costo intensivo de demolición, redes de fontanería, gasfitería, impermeabilización con manta elastomérica, enchape de cerámicos y artefactos sanitarios.
2. **Sobreexpectativa en Remodelaciones Mixtas:** Si un cliente cotiza una vivienda completa de $40\text{ m}^2$ o $70\text{ m}^2$ que incluye dormitorios, living y también baño o cocina, asume falsamente que el valor por metro cuadrado ($11\text{ UF/m}^2$) incluye artefactos de lujo, vanitorios a medida, cubiertas de cuarzo o mamparas de cristal (showerdoors), provocando fricciones comerciales y desestimación de presupuestos.

La **Spec 013** introduce:
1. Un campo dinámico condicional en el **Paso 1** del Wizard (`#espacios-remodelar`) visible exclusivamente cuando se selecciona *"Remodelación"*.
2. Un motor híbrido de cálculo en `api/quote.js` capaz de discriminar entre **Recintos Húmedos Puros** (partidas fijas de 75 UF para baño, 110 UF para cocina y 185 UF para ambos) y **Remodelaciones Mixtas/Secas** ($11\text{ UF/m}^2$), inyectando automáticamente cláusulas de alcance técnico para evitar sobreexpectativas en baños y cocinas.
3. Propagación de los recintos y notas de alcance a través del Paso 3, el endpoint `/api/quote`, la persistencia en Google Sheets y el PDF/email oficial enviado al cliente.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Requerimientos Ubicuos (Ubiquitous Requirements)
- **[EARS-013-01] Matriz de Precios de Partidas Húmedas Puras:** El sistema **DEBE** aplicar las partidas cerradas de referencia oficiales cuando se solicite exclusivamente recintos húmedos sin superficies secas:
  * Solo Baño: **75 UF + IVA** (referencial, rango 65 a 95 UF según terminación/comuna).
  * Solo Cocina: **110 UF + IVA** (referencial, rango 90 a 160 UF según terminación/comuna).
  * Baño y Cocina combinados: **185 UF + IVA** ($75 + 110 = 185\text{ UF}$).
- **[EARS-013-02] Tarifa Base para Remodelaciones Mixtas o Secas:** Cuando la remodelación incluya recintos secos (dormitorio, living, comedor, sala, etc.) o una superficie general de vivienda, el sistema **DEBE** calcular el costo a base de metro cuadrado: $\text{Superficie (m}^2) \times 11\text{ UF + IVA}$ (o $13\text{ UF}$ en sistema sólido), aplicando los factores correspondientes por comuna y terminaciones.
- **[EARS-013-03] Cláusulas de Alcance Técnico Obligatorias:** El sistema **DEBE** anexar notas de alcance claras e inequívocas para evitar malentendidos:
  * **Si incluye Baño:** Especificar que contempla artefactos estándar (WC tradicional, lavamanos simple, receptáculo en obra con cortina, cerámico nacional y grifería básica). Excluir explícitamente showerdoors de cristal templado, vanitorios en cuarzo y artefactos suspendidos.
  * **Si incluye Cocina:** Especificar que contempla muebles modulares de melamina estándar 15 mm, cubierta postformada, lavaplatos sobrepuesto y grifería monomando. Excluir explícitamente cubiertas de granito o cuarzo, muebles de piso a cielo a medida, herrajes de cierre suave y electrodomésticos empotrados.

### 2.2. Requerimientos Basados en Eventos (Event-Driven Requirements)
- **[EARS-013-04] Despliegue Condicional en Interfaz:** **Cuando** el usuario seleccione *"Remodelación"* (`value="Remodelacion"`) en el selector `#qTipo` del Paso 1, el sistema **DEBE** mostrar dinámicamente el campo de texto con identificador `#espacios-remodelar`.
- **[EARS-013-05] Ocultamiento y Limpieza del Campo:** **Cuando** el usuario cambie el selector `#qTipo` a *"Casa Nueva"*, *"Ampliacion"* o *"Quincho"*, el sistema **DEBE** ocultar el contenedor de `#espacios-remodelar` y limpiar su valor para no contaminar el payload.
- **[EARS-013-06] Invocación desde Tablas de Precios (`calcularCon`):** **Cuando** el usuario presione el botón de cotizar remodelación desde tablas comparativas (`calcularCon('Remodelacion', ...)`), el sistema **DEBE** inicializar el wizard con el campo `#espacios-remodelar` visible.

### 2.3. Requerimientos de Estado (State-Driven Requirements)
- **[EARS-013-07] Presentación en Paso 3 y Resumen:** **Mientras** el usuario se encuentre en el Paso 3 del wizard para un proyecto de remodelación, el sistema **DEBE** reflejar los recintos seleccionados y las notas de alcance técnico pertinentes antes de enviar el formulario.

### 2.4. Requerimientos No Deseados y Manejo de Errores (Unwanted Behavior / Fail-Safe)
- **[EARS-013-08] Resiliencia ante Entrada Vacía de Espacios:** **Si** el usuario envía una cotización de remodelación con `#espacios-remodelar` vacío o no provisto, el sistema **DEBE** operar en modo retrocompatible aplicando el cálculo por metro cuadrado con el piso técnico vigente para áreas pequeñas ($< 8\text{ m}^2 \to 60\text{ UF}$) sin arrojar error 400 ni interrumpir el flujo.

---

## 3. Criterios de Aceptación Técnicos
1. El campo `#espacios-remodelar` se renderiza en el Paso 1 de `public/quote-wizard.js` y responde a eventos de cambio en `#qTipo`.
2. `api/quote.js` exporta o integra la función de análisis semántico `analyzeRemodelingSpaces(espacios)` y clasifica adecuadamente los casos puros húmedos y mixtos.
3. Un payload `{ tipo: 'Remodelacion', espacios_remodelar: 'Baño y cocina' }` arroja `totalEstimado = 185 UF`.
4. Un payload `{ tipo: 'Remodelacion', area: 40, espacios_remodelar: 'Comedor y baño' }` arroja `totalEstimado = 440 UF` e incorpora la nota de alcance de baño estándar.
5. El correo al prospecto, el correo al administrador y el PDF adjunto incluyen el detalle de recintos remodelados y sus respectivas notas de alcance.
6. La suite automatizada `tests/remodeling-scope.spec.js` valida todos los flujos condicionales.
7. La suite global de regresión (`npx playwright test`) conserva 0 fallos (82/82 tests pasando).
