# Feature Specification: 002 - Modular Quote Wizard (Cotizador Web Modular)
**Feature ID:** `002_modular_quote_wizard`  
**Estado:** DRAFT / PENDING APPROVAL  
**Autor:** Lead QA Auditor & Software Architect  
**Metodología:** SDD (EARS Notation - Easy Approach to Requirements Syntax)

---

## 1. Resumen Ejecutivo y Alcance
Esta especificación define los requisitos funcionales y de diseño para la extracción, modularización DRY y estandarización del cotizador multi-paso del frontend. Se consolida la lógica de renderizado del formulario, validación de pasos, formateo telefónico chileno, pre-llenado vía URL, honeypots y despacho hacia `POST /api/quote` en un único componente reutilizable (`public/quote-wizard.js`), eliminando más de 1.500 líneas de código duplicado en los 7 archivos HTML del sitio y purgando cualquier residuo del número telefónico de pruebas obsoleto.

---

## 2. Requisitos del Sistema (Notación EARS)

### 2.1. Ubiquitous Requirements (Requisitos Generales del Sistema)
* **REQ-UBI-01:** El script del componente [`public/quote-wizard.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/quote-wizard.js) DEBE parsear y compilar sin ningún error sintáctico (`node -c public/quote-wizard.js` debe retornar código de salida 0).
* **REQ-UBI-02:** Toda vista pública que incluya el cotizador DEBE montarlo a través de un contenedor unificado (`<div id="quote-wizard-container" ...></div>`), delegando el ciclo de vida y eventos a `public/quote-wizard.js`.
* **REQ-UBI-03:** El componente DEBE mantener compatibilidad estricta con los identificadores del DOM preexistentes (`#quoteForm`, `#step1`, `#step2`, `#step3`, `#stepSuccess`, `#qTipo`, `#qSistema`, `#qArea`, `#qPisos`, `#qTerminaciones`, `#qComuna`, `#qPermisos`, `#qNombre`, `#qEmail`, `#qTelefono`, `#quoteSubmitBtn`, `#quoteStatus`, `#calendarCTAContainer`, `#calendarBtnLink`, `#fallbackCTAContainer`, `#progressBar`, `#stepIndicatorTitle`, `#stepIndicatorProg`).
* **REQ-UBI-04:** Queda estrictamente PROHIBIDO el uso del número obsoleto `+56 9 6348 2439`; todos los enlaces, llamadas y metadatos WebMCP DEBEN apuntar al número oficial de prospección `+56 9 2738 4075`.
* **REQ-UBI-05:** El componente DEBE exportar en el ámbito global `window` las funciones `nextStep(step)`, `prevStep(step)` y `calcularCon(tipo, sistema)` para garantizar retrocompatibilidad absoluta con botones de tablas de precios y scripts en línea.

### 2.2. Event-Driven Requirements (Comportamiento ante Eventos Válidos)
* **REQ-EVT-01 [Auto-Montaje]:** CUANDO el evento `DOMContentLoaded` ocurra (o inmediatamente si el DOM ya está listo), `quote-wizard.js` DEBE localizar `#quote-wizard-container`, leer los atributos de configuración (`data-default-tipo`, `data-default-sistema`, `data-tipos`, `data-sistemas`, `data-placeholder-area`) e inyectar la estructura DOM completa del cotizador.
* **REQ-EVT-02 [Pre-llenado vía Parámetros de URL]:** CUANDO el usuario acceda a la página con parámetros de consulta en la URL (`?nombre=...&telefono=...&email=...&tipo=...&sistema=...&area=...&comuna=...` o alias en inglés `name`, `phone`), el asistente DEBE extraerlos, sanitizarlos y pre-poblar los campos respectivos de forma transparente.
* **REQ-EVT-03 [Validación de Paso 1]:** CUANDO el usuario presione "Siguiente" en el Paso 1 (o ejecute `nextStep(2)`), el asistente DEBE validar que `qArea` contenga un número válido ≥ 3 m². SI el valor es menor o está vacío, DEBE enfocar el campo y alertar al usuario impidiendo el avance.
* **REQ-EVT-04 [Validación de Paso 2]:** CUANDO el usuario presione "Siguiente" en el Paso 2 (o ejecute `nextStep(3)`), el asistente DEBE comprobar que `qPisos`, `qTerminaciones`, `qComuna` y `qPermisos` posean selección válida antes de transicionar al Paso 3.
* **REQ-EVT-05 [Formateo Telefónico Chileno]:** CUANDO el usuario ingrese o pegue texto en `qTelefono`, el asistente DEBE filtrar caracteres no numéricos y normalizar el número a formato nacional/internacional (`+56 9 XXXX XXXX`), validando que cuente con los 9 dígitos móviles requeridos.
* **REQ-EVT-06 [Interacción desde Tablas `calcularCon`]:** CUANDO se invoque `calcularCon(tipo, sistema)` desde cualquier botón de la página, el asistente DEBE establecer dichos valores en los selectores correspondientes, reiniciar el asistente al Paso 1 y realizar un desplazamiento suave (*smooth scroll*) hacia el ancla `#contacto`.
* **REQ-EVT-07 [Despacho y Estado de Carga]:** CUANDO se envíe el formulario (`submit` en `#quoteForm`), el asistente DEBE:
  1. Validar los campos de honeypot (`#website_url`, `#_hp_check`).
  2. Generar las marcas temporales y token anti-bot (`_ts`, `_token`).
  3. Deshabilitar `#quoteSubmitBtn` y cambiar su texto a `"Generando Cotización..."` con estado visual de carga.
  4. Enviar el payload JSON mediante `fetch` hacia `POST /api/quote`.
* **REQ-EVT-08 [Éxito y CTA de Agendamiento]:** CUANDO `POST /api/quote` responda con HTTP 200:
  1. Ocultar los pasos de formulario y barra de progreso.
  2. Mostrar `#stepSuccess`.
  3. Si la respuesta incluye `calendarUrl`, asignar dicho enlace a `#calendarBtnLink` y hacer visible `#calendarCTAContainer`. Si no incluye URL, mostrar `#fallbackCTAContainer`.
  4. Resetear el formulario.

### 2.3. Unwanted Behavior Requirements (Manejo de Errores y Casos Límite)
* **REQ-ERR-01 [Fallo en Despacho]:** SI la petición hacia `POST /api/quote` retorna un error HTTP (4xx o 5xx) o falla por red, ENTONCES el asistente DEBE reactivar el botón de envío, restaurar el texto `"Obtener Cotización →"` y exhibir un mensaje de error claro y visible en `#quoteStatus` (clase `text-red-600`).
* **REQ-ERR-02 [Trampa de Honeypot]:** SI los campos ocultos `#website_url` o `#_hp_check` son completados por un bot, ENTONCES el asistente DEBE enviar el payload manteniendo la respuesta silenciosa del servidor sin notificar al atacante.
* **REQ-ERR-03 [Resiliencia ante Carga en Protocolo `file:///`]:** SI los archivos HTML son cargados mediante el protocolo `file:///` durante la ejecución de pruebas automatizadas locales, ENTONCES las etiquetas de script DEBEN resolver la ruta mediante fallback relativo (`onerror="this.onerror=null;this.src='../quote-wizard.js';"`) para evitar fallos de resolución en la raíz del sistema de archivos.
* **REQ-ERR-04 [Fallback sin JavaScript]:** SI el navegador del usuario tiene JavaScript deshabilitado, ENTONCES el contenedor DEBE exhibir un bloque `<noscript>` con enlace directo al WhatsApp oficial `+56 9 2738 4075`.

---

## 3. Criterios de Aceptación Técnicos
1. **Reducción de Código Duplicado:** Eliminación de más de 1.500 líneas redundantes en los 7 archivos HTML afectados.
2. **Validación Sintáctica:** `node -c public/quote-wizard.js` retorna código 0.
3. **Compatibilidad de Suite Previa:** Los 31 tests actuales (`tests/verify.spec.js`, `tests/quote-engine.spec.js`, `tests/agent-readiness.spec.js`) deben pasar al 100% sin modificaciones que degraden su rigurosidad.
4. **Nueva Suite de Pruebas Unitarias de Frontend:** Creación y aprobación de `tests/quote-wizard.spec.js` verificando renderizado, navegación, validación de teléfono, pre-llenado de URL y puente `calcularCon`.
5. **Higiene Total de Teléfonos:** Búsqueda global de `63482439` en `public/` retorna 0 coincidencias.
