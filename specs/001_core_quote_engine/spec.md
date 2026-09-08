# Feature Specification: 001 - Core Quote Engine (Motor Central de Cotizaciones)
**Feature ID:** `001_core_quote_engine`  
**Estado:** DRAFT / PENDING APPROVAL  
**Autor:** Lead QA Auditor & Software Architect  
**Metodología:** SDD (EARS Notation - Easy Approach to Requirements Syntax)

---

## 1. Resumen Ejecutivo y Alcance
Esta especificación define los requisitos funcionales y no funcionales para la estabilización, corrección sintáctica, normalización paramétrica de precios y persistencia fail-safe del motor de cotizaciones del backend (`api/quote.js`), asegurando cero tiempo de caída, tipado de entrada riguroso y almacenamiento previo de prospectos antes del despacho de correos.

---

## 2. Requisitos del Sistema (Notación EARS)

### 2.1. Ubiquitous Requirements (Requisitos Generales del Sistema)
* **REQ-UBI-01:** El motor `api/quote.js` DEBE compilar y parsear en Node.js 18+ sin ninguna excepción de sintaxis (`node -c api/quote.js` debe salir con código 0).
* **REQ-UBI-02:** El motor DEBE emplear como número de contacto para el cliente el canal oficial de prospección `+56 9 2738 4075` y el enlace de agendamiento `https://cal.com/cuatropuntas.com/visita-tecnica`.
* **REQ-UBI-03:** El motor DEBE dirigir todas las alertas prioritarias internas de nuevos prospectos exclusivamente al número del administrador `+56 9 7909 2027`.
* **REQ-UBI-04:** Queda estrictamente PROHIBIDO el uso de credenciales o tokens en texto plano dentro del código del motor; todo acceso a servicios externos DEBE consumir variables de entorno seguras (`process.env.*`).

### 2.2. Event-Driven Requirements (Comportamiento ante Eventos Válidos)
* **REQ-EVT-01:** CUANDO un cliente envíe una solicitud HTTP `POST` a `/api/quote` con payload válido, el sistema DEBE evaluar los datos mediante `_botGuard.isBotSubmission`.
* **REQ-EVT-02:** CUANDO la solicitud supere las verificaciones anti-bot y de validación de campos, el sistema DEBE calcular el rango de inversión en UF según la Matriz Oficial Cuatropuntas:
  - **Casas Nuevas (1 Piso):** Metalcom = 19 UF/m² | SIP/Covintec = 21 UF/m² | Mixto = 23 UF/m² | Albañilería = 25 UF/m².
  - **Segundos Pisos y Ampliaciones (o pisos ≥ 2):** Metalcom = 22 UF/m² | SIP/Covintec = 24 UF/m² | Mixto = 25 UF/m² | Albañilería = 27 UF/m².
  - **Quinchos:** Metalcom = 12 UF/m² | SIP = 14 UF/m² | Albañilería = 15 UF/m².
  - **Remodelaciones Integrales:** Metalcom = 11 UF/m² | Albañilería = 13 UF/m².
  - **Remodelaciones de Recintos Pequeños:**
    - Baños (área ≤ 8 m²): Base mínima técnica fija de 60 a 70 UF según sistema y terminaciones.
    - Cocinas / Medianos (8 m² < área < 20 m²): Base mínima técnica fija de 85 a 98 UF según sistema y terminaciones.
  - **Factores de Ajuste:** Escala pequeña (<40 m²: +8%), Terminaciones Premium (+10%), Comuna (Oriente: 1.05, Periferia: 0.98, General: 1.00), Permisos DOM (Idea: 1.0, Planos: 0.97, PermisoAprobado: 0.94, ArquitectoPropio: 0.94).
  - **Rango Comercial:** Min UF = Math.round(Total * 0.96), Max UF = Math.round(Total * 1.05).
* **REQ-EVT-03 [Fail-Safe Persist]:** TRAS calcular la cotización y ANTES de intentar el despacho SMTP, el sistema DEBE registrar de forma permanente los datos del lead en Google Sheets a través de una integración segura (Webhook HTTPS o Google Sheets API).
* **REQ-EVT-04:** CUANDO la persistencia fail-safe haya sido confirmada o procesada, el sistema DEBE generar el documento PDF referencial en memoria mediante `pdfkit` conteniendo la ficha técnica, desglose y botón interactivo hacia Cal.com.
* **REQ-EVT-05:** CUANDO el PDF esté generado, el sistema DEBE despachar dos correos electrónicos transaccionales vía Nodemailer (Zoho Mail):
  1. Correo al cliente con PDF adjunto y llamado a agendar visita técnica en Cal.com.
  2. Correo al administrador (`contacto@cuatropuntas.com`) con ficha técnica y botón de contacto inmediato por WhatsApp hacia el cliente.
* **REQ-EVT-06:** TRAS completar el despacho, el sistema DEBE responder al cliente con HTTP 200 y JSON:
  ```json
  {
    "success": true,
    "message": "Cotización generada y enviada correctamente",
    "calendarUrl": "https://cal.com/cuatropuntas.com/visita-tecnica"
  }
  ```

### 2.3. Unwanted Behavior Requirements (Manejo de Errores y Casos Límite)
* **REQ-ERR-01:** SI la solicitud es identificada como envío de bot por `_botGuard` (honeypot activado, velocidad <1.5s, token inválido o patrón de texto fraudulento), ENTONCES el sistema DEBE registrar el incidente en logs y responder con HTTP 200 simulado para desincentivar reintentos de bots.
* **REQ-ERR-02:** SI la solicitud carece de campos obligatorios (`tipo`, `sistema`, `area`, `pisos`, `terminaciones`, `comuna`, `nombre`, `email`, `telefono`), ENTONCES el sistema DEBE responder inmediatamente con HTTP 400 y mensaje explicativo en español.
* **REQ-ERR-03:** SI los metros cuadrados ingresados son menores a 3 m² (o 10 m² para obras no-remodelación) o mayores a 5000 m², ENTONCES el sistema DEBE responder con HTTP 400 indicando el rango permitido.
* **REQ-ERR-04:** SI el correo no cumple con un formato sintáctico RFC válido o el teléfono no posee entre 8 y 12 dígitos, ENTONCES el sistema DEBE responder con HTTP 400.
* **REQ-ERR-05:** SI el servicio externo de Google Sheets experimenta latencia o error, ENTONCES el sistema DEBE registrar el fallo en los logs con nivel de alerta, continuar con el flujo transaccional de correo y notificaciones sin abortar la experiencia del usuario, garantizando entrega del PDF.
* **REQ-ERR-06:** SI la variable de entorno `ZOHO_PASS` no se encuentra configurada, ENTONCES el sistema DEBE registrar un error crítico en el servidor, no exponer detalles de configuración en la respuesta pública y devolver HTTP 500 informando al usuario la vía de contacto alternativa por WhatsApp.

---

## 3. Criterios de Aceptación Técnicos
1. **Comprobación Sintáctica:** `node -c api/quote.js` termina con código de salida `0` en todas las plataformas.
2. **Pruebas de Cálculo Unitarias:** Cobertura demostrable con suite de pruebas ejecutables de cálculos de m², casos límite (baños 4 m², quinchos 25 m², casas 120 m²) sin invocar APIs externas de correo.
3. **Persistencia Verificada:** El payload del lead ingresa con éxito a la hoja de Google Sheets designada.
4. **Respuesta Frontend:** El cotizador de `index.html` pasa de Paso 3 a `stepSuccess` mostrando el botón de Cal.com sin mostrar textos en rojo ni errores en consola.
