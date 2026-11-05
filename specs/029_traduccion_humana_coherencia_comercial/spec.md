# Especificación de Requerimientos: Spec 029 - Traducción Humana de Parámetros y Coherencia Comercial en Correos, PDF y Agente IA
**Feature ID:** `029_traduccion_humana_coherencia_comercial`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Diagnóstico

### 1.1. Diagnóstico del Problema
Al cotizar un proyecto en la web (ej. un Quincho o una Remodelación), el frontend (`public/quote-wizard.js`) despliega opciones amigables y acordes a la tipología:
* En **Quinchos y Terrazas**: el selector muestra *"Estructura en Pino Oregón / Madera Seleccionada"*, *"Estructura Mixta con Cubierta Termoaislada"* y *"Perfilería de Acero y Albañilería a la Vista"*. Además, el campo de pisos está oculto porque no aplica a un cobertizo.
* En **Remodelaciones**: muestra *"Intervención en Tabiquería Liviana"* o *"Intervención en Muros Sólidos"*, y el campo de pisos también está oculto.

Sin embargo, para calcular los precios según la matriz tarifaria sin romper esquemas preexistentes, el wizard envía las claves internas: `sistema: "Metalcon"`, `pisos: 1`, etc.
El backend (`api/quote.js`) actualmente concatena e imprime estas claves crudas directamente en:
1. El **correo al prospecto** (HTML).
2. El **documento PDF adjunto** (PDFKit).
3. El **correo interno de aviso prioritario a Cuatropuntas** (HTML).
4. El mensaje pre-redactado en el enlace de **WhatsApp 1-Touch** (`wa.me`).
5. La persistencia en la máquina de estados del lead (`lib/leads-state.js`) leída por el **Agente IA de WhatsApp** (`lib/agent-consultor.js`).

Como consecuencia:
* Un cliente que cotizó un quincho en pino oregón recibe un correo y PDF que dicen: `Proyecto: Quincho (36 m², 1 piso, Metalcon)`.
* Para un quincho o remodelación con permiso en estado `'Idea'`, se imprime el badge intimidante `"PROYECTO COMPLETO (Diseño + DOM + Construcción)"`, generando ansiedad innecesaria sobre trámites municipales mayores para obras menores o remodelaciones interiores.
* El administrador recibe una alerta confusa, creyendo que el formulario falló o que el usuario seleccionó un quincho de 1 piso en Metalcon.
* El Agente Consultor de WhatsApp le habla al cliente de "su quincho en Metalcon", generando desconexión comercial.

### 1.2. Objetivo
Implementar una capa de traducción semántica y comercial centralizada (`resolveCommercialLabels`) que mapee transparentemente las claves técnicas a etiquetas humanas de alta coherencia comercial en todos los canales de salida, suprima la mención a "pisos" en Quinchos y Remodelaciones, flexibilice el badge DOM en estado "Idea" para dichas categorías y alimente con los nombres correctos al Agente IA de WhatsApp, manteniendo el 100% de la suite de pruebas en verde y el PDF en 1 sola página Letter.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Traductor Centralizado `resolveCommercialLabels`

- **[EARS-029-01] Función de Mapeo Comercial Centralizado:**  
  * El módulo `api/quote.js` **DEBE** exportar una función pura `resolveCommercialLabels({ tipo, sistema, area, pisos, terminaciones, permisos, espacios_remodelar })`.
  * La función **DEBE** retornar un objeto con:
    - `tipoComercial`: Nombre legible de la tipología (ej. "Quincho y Terraza", "Remodelación Integral", "Construcción Casa Nueva", "Ampliación / Segundo Piso").
    - `sistemaComercial`: Nombre técnico-comercial exacto según el `tipo`.
    - `proyectoResumen`: Frase descriptiva concisa del proyecto que suprima "X piso(s)" cuando no corresponda.
    - `pisosComercial`: Texto descriptivo de pisos o `null` si no aplica.
    - `estadoDomComercial`: Etiqueta contextualizada del estado de planos y permisos.
    - `estadoDomBadge`: Badge administrativo ajustado (desescalado para Quinchos/Remodelación en estado 'Idea').

- **[EARS-029-02] Reglas de Traducción de `sistema` por `tipo`:**  
  * **Si** `tipo` es `Quincho`:
    * `Metalcon` $\rightarrow$ `"Estructura en Pino Oregón / Madera Seleccionada"`
    * `SIP` $\rightarrow$ `"Estructura Mixta con Cubierta Termoaislada"`
    * `Albanileria` $\rightarrow$ `"Perfilería de Acero y Albañilería a la Vista"`
  * **Si** `tipo` es `Remodelacion`:
    * `Metalcon` $\rightarrow$ `"Intervención en Tabiquería Liviana"`
    * `Albanileria` $\rightarrow$ `"Intervención en Muros Sólidos / Albañilería"`
    * `SIP` $\rightarrow$ `"Intervención Mixta"`
  * **Si** `tipo` es `Casa Nueva` o `Ampliacion`:
    * `Metalcon` $\rightarrow$ `"Metalcom Estructural"`
    * `SIP` $\rightarrow$ `"Panel SIP Termoacústico"`
    * `Albanileria` $\rightarrow$ `"Albañilería Tradicional / Hormigón"`
    * `Covintec` $\rightarrow$ `"Panel SIP / Covintec Termoacústico"`
    * `Mixto` $\rightarrow$ `"Construcción Mixta"`
  * Si el valor ya viene formateado o no coincide con las claves base, se debe preservar de forma segura.

- **[EARS-029-03] Supresión de "X Piso(s)" en Quinchos y Remodelaciones:**  
  * **Cuando** `tipo` sea `Quincho` o `Remodelacion`:
    * El sistema **NO DEBE** concatenar `1 piso` ni `X pisos` en ningún resumen de proyecto ni texto público/administrativo.
    * Para `Quincho`: `proyectoResumen` **DEBE** formatearse como `"${tipoComercial} (${areaNum} m² · ${sistemaComercial})"`.
    * Para `Remodelacion` con recintos especificados: `proyectoResumen` **DEBE** formatearse como `"Remodelación: ${espacios_remodelar} (${areaNum} m² · ${sistemaComercial})"`.
    * Para `Remodelacion` sin recintos especificados: `proyectoResumen` **DEBE** formatearse como `"Remodelación (${areaNum} m² · ${sistemaComercial})"`.
  * **Cuando** `tipo` sea `Casa Nueva` o `Ampliacion`:
    * El sistema **DEBE** conservar la especificación de pisos: `"${tipoComercial} (${areaNum} m², ${pisosNum} piso${pisosNum > 1 ? 's' : ''} · ${sistemaComercial})"`.

- **[EARS-029-04] Ajuste Desescalado de Estado DOM en Quinchos y Remodelaciones:**  
  * **Cuando** `(isQuincho || isRemodelacion)` y `permisos === 'Idea'`:
    * El sistema **DEBE** reemplazar el texto `"PROYECTO COMPLETO (Diseño + DOM + Construcción)"` por:
      `"Evaluación de Factibilidad y Diseño en Terreno (Permiso municipal opcional según evaluación)"`.
    * El badge corto para administración **DEBE** ser `"Eval. en Terreno"`.

---

### 2.2. Aplicación en Canales de Salida

- **[EARS-029-05] Correo HTML al Cliente (`generateEmailData`):**  
  * En la tabla de resumen, la fila "Proyecto:" debe mostrar `proyectoResumen`.
  * La fila "Sistema Constructivo:" debe mostrar `sistemaComercial`.
  * En Quinchos y Remodelaciones, no debe aparecer mención a "1 piso".

- **[EARS-029-06] Documento PDF Adjunto (`generatePdfBuffer`):**  
  * La ficha de parámetros técnicos debe desplegar `sistemaComercial`.
  * En Quinchos y Remodelaciones, la línea de superficie debe indicar `${areaNum} m²` sin añadir `(1 piso)`.
  * El documento PDF resultante debe mantenerse estrictamente en 1 sola página Letter.

- **[EARS-029-07] Correo Interno de Alerta a Cuatropuntas (`mailToAdmin`):**  
  * La fila "Proyecto:" debe reflejar `proyectoResumen` con el `sistemaComercial`.
  * La fila "Estado DOM / Planos:" debe reflejar el `estadoDomBadge` ajustado.
  * El enlace de WhatsApp (`wa.me`) para el administrador debe contener el saludo pre-redactado citando `sistemaComercial` y suprimiendo `1 piso`.

- **[EARS-029-08] Sincronización con Agente IA WhatsApp (`lib/leads-state.js` y `lib/agent-consultor.js`):**  
  * Al llamar a `setLeadState` desde `api/quote.js`, se debe guardar `sistemaComercial` junto con las claves técnicas.
  * `lib/agent-consultor.js` (tanto en su prompt para Gemini como en su fallback determinista) debe priorizar `sistemaComercial` sobre `sistema` crudo para hablarle al cliente de su materialidad exacta (ej. "Estructura en Pino Oregón").

---

## 4. Spec 029.1: Cierre de Coherencia en Ampliaciones y Selector de Remodelación

### 4.1. Diagnóstico y Necesidad
En proyectos de **Ampliación**, el parámetro `pisos` en el formulario representa la **ubicación** física de la intervención, no el número total de pisos de la casa:
- `pisos: 2` = Sobreelevación en segundo piso sobre estructura preexistente.
- `pisos: 1` = Extensión en primer piso hacia el patio o terreno.
Expresar `Ampliación (40 m², 2 pisos)` confundía a los clientes, sugiriendo una ampliación de dos plantas completas.

Asimismo, en **Remodelación**, el formulario web (`public/quote-wizard.js`) requería que las etiquetas visibles del selector `#qSistema` se sincronizaran con el vocabulario de intervención y materialidad actual ("Intervención en Tabiquería Liviana", "Intervención en Muros Sólidos", "Intervención en Estructura Mixta / Evaluar en terreno").

### 4.2. Requerimientos Funcionales EARS (Spec 029.1)
- **[EARS-029.1-01] Ubicación en Ampliaciones:**  
  * **Cuando** `tipo === 'Ampliacion'`:
    * Si `pisos == 2`: `pisosComercial` **DEBE** ser `"2º Piso (Sobreelevación)"` y `proyectoResumen` **DEBE** ser `"Ampliación en 2º Piso / Sobreelevación (${areaNum} m² · ${sistemaComercial})"`.
    * Si `pisos == 1`: `pisosComercial` **DEBE** ser `"1º Piso (Extensión)"` y `proyectoResumen` **DEBE** ser `"Ampliación en 1º Piso (${areaNum} m² · ${sistemaComercial})"`.
    * En correos y PDF, la ficha técnica debe desplegar `"Ubicación: ${pisosComercial}"` y jamás `"2 pisos"`.
- **[EARS-029.1-02] Opciones del Selector de Remodelación:**  
  * En `public/quote-wizard.js`, las opciones de `#qSistema` para Remodelación deben ser:
    * `Metalcon`: `"Intervención en Tabiquería Liviana (Volcanita / Metalcom / Madera)"`
    * `Albanileria`: `"Intervención en Muros Sólidos (Ladrillo / Hormigón)"`
    * `SIP`: `"Intervención en Estructura Mixta / Evaluar en terreno"`

---

## 5. Plan de Verificación y Criterios de Aceptación
1. **Prueba Unitaria de Traducción Semántica**: Un Quincho con `sistema: "Metalcon"`, `pisos: 1` y `permisos: "Idea"` produce `sistemaComercial: "Estructura en Pino Oregón / Madera Seleccionada"`, sin "1 piso", y con badge DOM desescalado.
2. **Prueba de Remodelación**: Una remodelación con recintos "Baño y Cocina" genera `"Remodelación: Baño y Cocina (30 m² · Intervención en Tabiquería Liviana)"` sin "1 piso".
3. **Prueba de Ampliación (Spec 029.1)**: Una ampliación con `pisos: 2` genera `"Ampliación en 2º Piso / Sobreelevación (40 m² · Metalcom Estructural)"`, ficha técnica con `"Ubicación: 2º Piso (Sobreelevación)"` y nunca `"2 pisos"`.
4. **Prueba de Integridad PDF**: Los 4 tipos de proyecto generan PDFs de exactamente 1 página Letter sin romper layout.
5. **Prueba del Agente Consultor**: El fallback y prompt del agente mencionan "Estructura en Pino Oregón" y no "Metalcon" ante un lead de quincho.
6. **Regresión Cero**: El 100% de la suite Playwright se mantiene en verde.
