# Especificación de Requerimientos: Spec 016 - Formulario Dinámico y Polimórfico por Tipología de Proyecto
**Feature ID:** `016_polymorphic_quote_wizard`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Problema de UX / Comercial

En la versión actual del cotizador multi-paso (`public/quote-wizard.js`), el **Paso 1** presenta campos estáticos e invariables:
- Selector `Tipo de Proyecto` (`#qTipo`).
- Selector `Sistema Constructivo` (`#qSistema`).
- Input `Superficie Estimada` (`#qArea`).

Esto genera una severa fricción de usuario y merma la autoridad técnica:
1. **Remodelaciones:** Preguntar por "Metalcon", "Panel SIP" o "Albañilería" a un cliente que desea remodelar su cocina, baño o cambiar pisos desorienta al prospecto, ya que dichos sistemas son para obras gruesas/estructurales.
2. **Segundos Pisos / Ampliaciones:** Mostrar la opción de "Albañilería pesada en todo el proyecto" contradice las buenas prácticas de ingeniería y las normas estructurales de sobreelevación liviana (riesgo de sobrecarga en fundaciones existentes).
3. **Quinchos y Terrazas:** Un quincho de alto estándar se estructura en torno a pilares y vigas de madera noble (pino oregón/roble) o perfiles de acero/fierro electrosoldado, no en tabiquerías perimetrales ciegas residenciales de SIP o Metalcon.

El objetivo de la Spec 016 es convertir el Paso 1 en un **componente dinámico y polimórfico**: adapta sus labels, opciones visibles, campos condicionales y textos de ayuda en tiempo real según la tipología elegida, manteniendo total compatibilidad con el motor de cálculo `/api/quote` y las fuentes de verdad de `AGENTS.md`.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Requerimientos Basados en Estado y Tipología (State-Driven Requirements)

- **[EARS-016-01] Polimorfismo para Casas Nuevas (`Casa Nueva`):**  
  **Mientras** el tipo seleccionado sea `Casa Nueva`:
  * El sistema **DEBE** mostrar el contenedor `#qSistemaContainer` con el label *"Sistema Constructivo"*.
  * El sistema **DEBE** listar las 3 opciones estructurales completas:
    1. `Metalcon`: *"Metalcom Estructural (desde 19 UF/m² +IVA)"*
    2. `SIP`: *"Panel SIP Térmico (desde 21 UF/m² +IVA)"*
    3. `Albanileria`: *"Albañilería Confinada / Mixto (desde 25 UF/m² +IVA)"*
  * El sistema **DEBE** ocultar el contenedor `#espaciosRemodelarContainer` y limpiar su input.
  * El sistema **DEBE** mantener el campo `#qArea` con placeholder residencial (ej: *"Ej: 50 o 120"*).

- **[EARS-016-02] Polimorfismo para Segundos Pisos y Ampliaciones (`Ampliacion`):**  
  **Mientras** el tipo seleccionado sea `Ampliacion` o `Segundo Piso`:
  * El sistema **DEBE** mostrar el contenedor `#qSistemaContainer` con el label *"Estructura Liviana de Sobreelevación"*.
  * El sistema **DEBE** restringir las opciones exclusivamente a estructuras livianas de bajo peso por m²:
    1. `Metalcon`: *"Metalcom Estructural Liviano (desde 22 UF/m² +IVA)"*
    2. `SIP`: *"Panel SIP Aislante (desde 24 UF/m² +IVA)"*
  * El sistema **DEBE** excluir taxativamente la opción de albañilería pesada.
  * El sistema **DEBE** ocultar `#espaciosRemodelarContainer` y limpiar su input.

- **[EARS-016-03] Polimorfismo para Remodelaciones (`Remodelacion`):**  
  **Mientras** el tipo seleccionado sea `Remodelacion`:
  * El sistema **DEBE** ocultar por completo el contenedor `#qSistemaContainer` (`display: none` y clase `hidden`).
  * El sistema **DEBE** desactivar la obligatoriedad (`required`) en `#qSistema` para prevenir bloqueos de formulario nativo, y asignar internamente `qSistema.value = 'Metalcon'` para garantizar compatibilidad con el motor de cálculo (11 UF/m² base general).
  * El sistema **DEBE** mostrar `#espaciosRemodelarContainer` con el input `#espacios-remodelar` y placeholder descriptivo.
  * El sistema **DEBE** mostrar un texto de apoyo contextual `#qAreaHelpText` informando que recintos húmedos puros (baño/cocina) se tarifican por paquete cerrado según partidas.

- **[EARS-016-04] Polimorfismo para Quinchos y Terrazas (`Quincho`):**  
  **Mientras** el tipo seleccionado sea `Quincho`:
  * El sistema **DEBE** mostrar el contenedor `#qSistemaContainer` con el label *"Estructura y Techumbre del Cobertizo"*.
  * El sistema **DEBE** listar las opciones específicas de cobertizos de alto estándar:
    1. `Metalcon`: *"Madera Tratada / Pino Oregón (desde 12 UF/m² +IVA)"*
    2. `Albanileria`: *"Perfilería de Acero / Fierro Electrosoldado (desde 15 UF/m² +IVA)"*
  * El sistema **DEBE** ocultar `#espaciosRemodelarContainer`.
  * El sistema **DEBE** mostrar texto de ayuda aclarando el alcance base (cobertizo, radier, parrilla refractaria elevable y campana).

---

### 2.2. Requerimientos Basados en Eventos (Event-Driven Requirements)

- **[EARS-016-05] Mutación Reactiva ante Cambio de Tipo:**  
  **Cuando** el usuario cambie el valor del selector `#qTipo` (evento `change`), el sistema **DEBE** reconfigurar inmediatamente el DOM del Paso 1 sincronizando labels, opciones, visibilidad y textos de ayuda sin recargar la página ni perder el progreso en otros pasos.

- **[EARS-016-06] Inicialización y Pre-llenado Polimórfico:**  
  **Cuando** la página se cargue con un servicio predeterminado vía atributo `data-default-tipo` o parámetros de URL (`?tipo=...`), el sistema **DEBE** ejecutar la sincronización polimórfica inmediatamente durante la inicialización de `initQuoteWizard()`.

- **[EARS-016-07] Compatibilidad con `calcularCon`:**  
  **Cuando** una página externa o tabla comparativa invoque `window.calcularCon(tipo, sistema)`, el sistema **DEBE** mutar la tipología polimórfica, seleccionar el sistema adecuado y enfocar el Paso 1 de forma transparente.

---

### 2.3. Requerimientos No Deseados y Manejo de Errores (Fail-Safe)

- **[EARS-016-08] Integridad de Payload hacia `/api/quote`:**  
  El sistema **DEBE** garantizar que en todos los casos el objeto enviado al backend contenga claves de `sistema` compatibles (`Metalcon`, `SIP`, `Albanileria`), evitando fallos en `api/quote.js` o roturas en la persistencia con Google Sheets.

---

## 3. Criterios de Aceptación Técnicos

1. En `public/quote-wizard.js`, el selector `#qSistema` está envuelto en `#qSistemaContainer` con su label `#qSistemaLabel`.
2. Al seleccionar `Remodelacion`, `#qSistemaContainer` desaparece de la vista y no bloquea el botón "Siguiente" hacia el Paso 2 (`nextStep(2)`).
3. Al seleccionar `Ampliacion`, las opciones de `#qSistema` solo contemplan Metalcom Liviano y Panel SIP.
4. Al seleccionar `Quincho`, las opciones corresponden a Cobertizo de Madera (12 UF) y Cobertizo de Acero/Fierro (15 UF), enviando `Metalcon` y `Albanileria` respectivamente.
5. Al seleccionar `Casa Nueva`, se ofrecen las 3 opciones completas alineadas con `AGENTS.md`.
6. En `servicios/remodelaciones.html`, el wizard arranca con `#qSistemaContainer` oculto y `#espaciosRemodelarContainer` visible.
7. En `servicios/quinchos.html`, el wizard arranca con las opciones de Madera y Acero.
8. La suite `tests/polymorphic-wizard.spec.js` valida el 100% de los estados polimórficos.
9. La suite global de regresión (`npx playwright test`) conserva 97/97 tests pasando en verde.
