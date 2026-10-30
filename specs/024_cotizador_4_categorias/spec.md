# Especificación de Requerimientos: Spec 024 - Segmentación Visual de 4 Tipologías, Preselección Web y Chips de Remodelación ("Zero-Breakage")
**Feature ID:** `024_cotizador_4_categorias`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Diagnóstico

Durante las pruebas de usuario del cotizador modular (`#cotizador`), se detectó una fricción de percepción comercial:
1. **Confusión entre Ampliaciones y Obras Menores (Quinchos/Pérgolas):**
   - Varios prospectos buscan cotizar un quincho, cobertizo o pérgola exterior pero seleccionan "Ampliación" o entran directamente al cotizador viendo las tarifas de una Casa Nueva (19 UF/m²) o Ampliación (22 a 27 UF/m²). Esto generaba la falsa sensación de sobreprecio, dado que las obras menores exteriores comienzan desde 12 UF/m² en madera o 15 UF/m² en acero.
2. **Falta de Preselección desde la Web (`index.html`):**
   - Aunque las páginas internas de servicios (`/servicios/*.html`) ya preconfiguraban el tipo, la página principal (`index.html`) enviaba todos los clics de "Cotizar" a `#contacto` sin preseleccionar el tipo, iniciando siempre en "Casa Nueva" (19 UF/m²).
3. **Desaprovechamiento de los Paquetes Fijos de Remodelación:**
   - El backend (`api/quote.js`) posee un algoritmo de detección de recintos húmedos (`analyzeRemodelingSpaces`) que cotiza a suma alzada paquetes cerrados de **75 UF** (Baño), **110 UF** (Cocina) y **185 UF** (Ambos). Los prospectos no siempre escribían las palabras clave exactas en el campo de texto libre.
4. **Ansiedad en Permisos DOM para Quinchos:**
   - La obligatoriedad de declarar permisos de edificación DOM para cobertizos generaba inquietud en usuarios que solo tienen una idea y desconocen la exigencia municipal de m² techados.

Esta especificación implementa una solución visual de 4 categorías en la cabecera del Paso 1, deep-linking desde los botones de la web, chips de selección rápida para remodelación y notas calmantes en permisos DOM, bajo el principio estricto de **Zero-Breakage** para preservar intactos los 139+ tests de Playwright y el motor matemático de `api/quote.js`.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Selector Visual de 4 Categorías (Paso 1)

- **[EARS-024-01] Renderizado de Tarjetas de Tipología:**  
  **Mientras** el usuario se encuentre en el Paso 1 (`#step1`):
  * El sistema **DEBE** desplegar una grilla de 4 tarjetas/botones interactivos sobre el contenedor del selector de tipo:
    1. 🏠 **Construcción Casa Nueva** *(Vivienda desde cero · desde 19 UF/m²)* -> Valor: `Casa Nueva`
    2. 📐 **Ampliación / 2º Piso** *(Recintos habitables cerrados · desde 22 UF/m²)* -> Valor: `Ampliacion`
    3. 🛠️ **Remodelación Integral** *(Cocinas, baños o interiores)* -> Valor: `Remodelacion`
    4. 🔥 **Quinchos y Terrazas** *(Cobertizos y obras exteriores · desde 12 UF/m²)* -> Valor: `Quincho`
  * El sistema **DEBE** marcar visualmente con borde y fondo activo la tarjeta correspondiente al tipo seleccionado actualmente.

- **[EARS-024-02] Sincronización Bidireccional con `#qTipo` (Zero-Breakage Contract):**  
  * **Cuando** el usuario haga clic en una de las 4 tarjetas visuales:
    * El sistema **DEBE** actualizar el valor de `<select id="qTipo">`.
    * El sistema **DEBE** disparar un evento nativo `new Event('change')` sobre `#qTipo` para gatillar toda la lógica polimórfica preexistente (`syncPolymorphicStep1` y `syncPolymorphicStep2`).
  * **Cuando** el valor de `#qTipo` cambie programáticamente o mediante el `<select>` nativo:
    * El sistema **DEBE** sincronizar inmediatamente el estado visual activo de las 4 tarjetas.
  * El sistema **DEBE** mantener el elemento `<select id="qTipo">` presente en el DOM con sus 4 `<option>` y valores contractuales exactos para garantizar compatibilidad con Playwright y lectores de pantalla.

---

### 2.2. Chips de Selección Rápida en Remodelación

- **[EARS-024-03] Chips para Detección de Recintos Húmedos y Secos:**  
  **Mientras** el tipo de proyecto sea `Remodelacion`:
  * El sistema **DEBE** desplegar dentro de `#espaciosRemodelarContainer` un grupo de 4 chips o botones de clic rápido:
    * `[🚿 Baño Completo]` -> Rellena con *"Baño completo"* (activa paquete 75 UF).
    * `[🍳 Cocina]` -> Rellena con *"Cocina integral"* (activa paquete 110 UF).
    * `[🚿+🍳 Baño y Cocina]` -> Rellena con *"Baño y Cocina"* (activa paquete 185 UF).
    * `[🛋️ Living / Dormitorios]` -> Rellena con *"Living y dormitorios"* (partida lineal seca).
  * **Cuando** el usuario pulse un chip, el sistema **DEBE** escribir el texto en `#espacios-remodelar` sin borrar la posibilidad de que el usuario lo edite libremente.

---

### 2.3. Mensaje Explicativo de Permisos DOM en Quinchos

- **[EARS-024-04] Clarificación Legal y Calma al Prospecto:**  
  **Mientras** el tipo de proyecto sea `Quincho`:
  * El sistema **DEBE** mantener `#qPermisosContainer` visible y `#qPermisos` con el atributo `required` activo (para cumplir el test de Playwright `full-funnel.spec.js`).
  * El sistema **DEBE** renderizar debajo del selector de permisos un texto de ayuda orientativo:
    > *"Tranquilo: si aún no tienes permisos municipales, selecciona 'Solo tengo la idea' y evaluamos la exigencia de tu comuna durante la visita técnica a terreno."*

---

### 2.4. Preselección y Deep-Linking desde la Web (`index.html`)

- **[EARS-024-05] Conexión de Botones de Servicio hacia el Cotizador:**  
  * **Cuando** el usuario haga clic en cualquier botón de servicio o llamado a la acción en `index.html`:
    * El sistema **DEBE** interpretar el atributo `data-quote-tipo` (o el llamado `calcularCon(tipo)`).
    * El sistema **DEBE** realizar un desplazamiento suave (`scrollIntoView`) hacia `#contacto`.
    * El sistema **DEBE** seleccionar de forma automática la categoría indicada en el cotizador, actualizando tanto la tarjeta visual activa como `#qTipo`.
  * Si la URL contiene parámetros o hash (ej. `#contacto?tipo=Quincho` o `?tipo=Ampliacion`), el sistema **DEBE** inicializarse en dicha categoría al cargar la página.

---

### 2.5. Refinamiento Corporativo y Eliminación de Precios Prematuros (Spec 024.1 y 024.2)

- **[EARS-024-06] Iconografía Vectorial Arquitectónica:**  
  * El sistema **DEBE** prescindir totalmente de emojis en las tarjetas de tipología y chips de remodelación.
  * El sistema **DEBE** renderizar iconos técnicos SVG monocromáticos limpios (`stroke="currentColor"`, `stroke-width="1.75"`):
    - Casa Nueva: Icono de vivienda estructurada.
    - Ampliación / 2º Piso: Icono de capas arquitectónicas y elevación.
    - Remodelación Integral: Icono de compás / trazado técnico de interiores.
    - Quinchos y Terrazas: Icono de pérgola / estructura de cubierta.
- **[EARS-024-07] Eliminación de Fricción por Precios Prematuros:**  
  * Para evitar comparaciones prematuras que frenen la conversión de prospectos antes de la captura del lead:
    - Las tarjetas de tipología en `#step1` **DEBEN** omitir badges de precio en UF/m², mostrando únicamente el icono técnico, título y alcance.
    - Las opciones de `#qSistema` **DEBEN** desplegar nombres técnicos descriptivos claros sin tarifas en UF entre paréntesis.
    - Los chips de remodelación **DEBEN** mostrar etiquetas limpias (`Baño Completo`, `Cocina Integral`, `Baño y Cocina`, `Living / Dormitorios`) sin UF entre paréntesis.
  * El motor matemático del backend (`api/quote.js`) permanece 100% inalterado y entrega el presupuesto detallado por correo y WhatsApp tras completar el formulario.

---

## 3. Criterios de Aceptación y Validación

1. **Pruebas de Unidad y E2E (Playwright):**
   * Los 139 tests preexistentes deben ejecutarse y pasar al 100% en verde (`0 failed`).
   * Nuevos tests específicos de la Spec 024 deben verificar:
     - Clic en cada una de las 4 tarjetas visuales altera `#qTipo` y dispara el polimorfismo correspondiente.
     - Clic en chips de remodelación rellena `#espacios-remodelar`.
     - Clic en los botones de servicios de la home (`index.html`) desplaza y preselecciona la tipología.
2. **Compilación y Sintaxis:**
   * `node -c public/quote-wizard.js` sin errores.
3. **Despliegue Productivo:**
   * Commit, push a `origin/main` y despliegue en Vercel exitoso.
