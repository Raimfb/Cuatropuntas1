# Especificación de Requerimientos: Spec 023 - Agente Asesor Consultivo y Orquestación de Estados

**Feature ID:** `023_conversational_advisor_agent`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** COMPLETED  

---

## 1. Resumen Ejecutivo y Visión Arquitectónica

### 1.1. Contexto y Oportunidad
En el embudo de ventas de Constructora Cuatropuntas SpA, los clientes que cotizan a través del cotizador web (`api/quote.js`) reciben una estimación referencial inmediata y su Ficha Técnica en PDF. Sin embargo, para cerrar la venta hacia el Diagnóstico Técnico en Terreno en Cal.com (`https://cal.com/cuatropuntas.com/visita-tecnica`), muchos prospectos calificados requieren resolver dudas técnicas profundas y de constructibilidad (ej. tipo de radier, factibilidad de ampliaciones sobre losa existente, aislación según OGUC, permisos DOM y alcance de quinchos).

Actualmente, las respuestas automáticas de WhatsApp eran estáticas o meramente derivativas a la web. Esta especificación introduce un **Agente Asesor Consultivo de Ingeniería y Arquitectura**, respaldado por un modelo de lenguaje avanzado (Gemini Flash) y gobernado por una **Máquina de Estados de Leads** determinista y desacoplada.

### 1.2. Ciclo de Vida y Transición de Estados del Prospecto
El lead transita exclusivamente por tres estados controlados:
```text
[Cotizador Web]
       │
       ▼
   [COTIZADO] ────────► Primer mensaje entrante WhatsApp
                            │
                            ▼
                    [EN_CONVERSACION] ───► Conversación técnica consultiva con IA
                                                │
                                                ▼ (Reserva en Cal.com)
                                         [VISITA_AGENDADA] ───► Silencio IA (100% Humano)
```

1. **`COTIZADO`**: Sembrado automáticamente por `api/quote.js` cuando el usuario genera una cotización válida. Almacena nombre, teléfono E.164, tipo de proyecto, superficie en m², comuna y parámetros técnicos.
2. **`EN_CONVERSACION`**: Se activa en cuanto el lead escribe al canal de WhatsApp. El Agente Consultor IA interviene respondiendo con criterio constructivo y contexto del proyecto.
3. **`VISITA_AGENDADA`**: Se activa cuando el webhook de Cal.com recibe el evento `BOOKING_CREATED`. En este instante, se despacha un mensaje de confirmación que formaliza el número directo del Director Técnico (`+56 9 7909 2027`) y el bot entra en **silencio absoluto (`canBotReply === false`)**, transfiriendo el 100% de la relación a los directores humanos.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Persistencia y Máquina de Estados (`lib/leads-state.js`)

- **[EARS-023-01] Gestión de Ciclo de Vida de Leads:**  
  **Cuando** un lead interactúe con el sistema en cualquier punto del embudo:
  * El sistema **DEBE** gestionar su estado dentro del conjunto finito: `['COTIZADO', 'EN_CONVERSACION', 'VISITA_AGENDADA']`.
  * Toda persistencia **DEBE** normalizar los números telefónicos chilenos al estándar E.164 (`569XXXXXXXX`).
  * El módulo **DEBE** exponer las funciones: `setLeadState(phone, data)`, `getLeadState(phone)`, `updateLeadState(phone, newState, patchData)`, `findLeadByPhoneOrEmail(identifier)` y `canBotReply(phone)`.

- **[EARS-023-02] Siembra Automática en Cotización Web (`api/quote.js`):**  
  **Cuando** `api/quote.js` complete con éxito el cálculo y el despacho del correo transaccional:
  * El sistema **DEBE** sembrar el estado del cliente en `COTIZADO`.
  * La siembra **DEBE** incluir: `phone` (normalizado), `name`, `email`, `tipo`, `areaNum`, `comunaHuman`, `sistema`, `minUF`, `maxUF` y timestamp `createdAt`.

- **[EARS-023-03] Regla de Silencio Comercial y Handoff Humano (`canBotReply`):**  
  **Cuando** el sistema consulte `canBotReply(phone)`:
  * El sistema **DEBE** retornar `false` si el lead no existe en el registro de estados.
  * El sistema **DEBE** retornar `false` si el estado actual es `VISITA_AGENDADA`.
  * El sistema **DEBE** retornar `true` única y exclusivamente si el estado es `COTIZADO` o `EN_CONVERSACION`.

- **[EARS-023-04] Adaptador de Almacenamiento Desacoplado:**  
  **En cualquier entorno de ejecución:**
  * El sistema **DEBE** utilizar un almacenamiento en memoria (`Map`) como adaptador por defecto para ejecución local y suites de tests.
  * Si están definidas las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` (o `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`), el sistema **DEBE** sincronizar y persistir el estado de forma asíncrona mediante peticiones REST nativas (`fetch`) sin requerir dependencias externas pesadas.

---

### 2.2. Webhook de Meta WhatsApp Cloud API (`api/webhooks/whatsapp.js`)

- **[EARS-023-05] Verificación de Handshake Meta (GET):**  
  **Cuando** Meta envíe una petición HTTP GET con `hub.mode === 'subscribe'` y `hub.verify_token`:
  * Si `hub.verify_token` coincide con `WHATSAPP_VERIFY_TOKEN` (o default institucional), el endpoint **DEBE** responder HTTP 200 con el valor de `hub.challenge`.
  * Si el token no coincide, el endpoint **DEBE** responder HTTP 403 Forbidden.

- **[EARS-023-06] Recepción y Bifurcación de Mensajes Entrantes (POST):**  
  **Cuando** Meta notifique un mensaje de texto entrante vía HTTP POST:
  * El sistema **DEBE** extraer el remitente (`from`) y el texto del mensaje (`messages[0].text.body`).
  * El sistema **DEBE** invocar `canBotReply(from)`.
  * Si `canBotReply(from)` es `false`, el sistema **DEBE** responder inmediatamente HTTP 200 `EVENT_RECEIVED` y **NO DEBE** emitir ninguna respuesta automática (silencio IA total).
  * Si `canBotReply(from)` es `true`, el sistema **DEBE** transicionar el estado a `EN_CONVERSACION`, generar la respuesta mediante el Agente Asesor Consultivo (`lib/agent-consultor.js`) y despachar el mensaje por WhatsApp.

---

### 2.3. Webhook de Cal.com (`api/webhooks/calcom.js`)

- **[EARS-023-07] Procesamiento de Agendamiento en Cal.com:**  
  **Cuando** Cal.com despache un webhook con evento `BOOKING_CREATED` o `booking.created`:
  * El sistema **DEBE** extraer los datos de la reserva: nombre, teléfono, email, fecha formateada y título.
  * El sistema **DEBE** buscar al lead por teléfono o email y transicionar su estado a `VISITA_AGENDADA`.
  * El sistema **DEBE** despachar un mensaje de confirmación al cliente por WhatsApp explicitando:
    * La fecha y hora de la cita.
    * El número directo del Director Técnico terminado en 2027 (`+56 9 7909 2027`) para coordinar accesos, portones y llegada al terreno.
  * El sistema **DEBE** enviar una alerta interna al `+56 9 7909 2027` con el resumen del agendamiento y antecedentes del proyecto.
  * El endpoint **DEBE** responder HTTP 200 `{ success: true, message: 'Visita agendada y bot silenciado' }`.

---

### 2.4. Agente Asesor Consultivo (`lib/agent-consultor.js`)

- **[EARS-023-08] Personalidad y Criterio Técnico Consultivo:**  
  **Cuando** el Agente Asesor genere una respuesta para el lead:
  * El agente **DEBE** adoptar el rol de Ingeniero Civil / Arquitecto Asesor de Constructora Cuatropuntas SpA.
  * El tono **DEBE** ser técnico, sereno, fundamentado y empático, dominando normativas chilenas (OGUC, aislación térmica Zona 3, permisos DOM, Art. 18 LGUC, suma alzada).
  * El agente **DEBE** personalizar la conversación con el contexto del lead previamente sembrado (tipo de obra, m², comuna).
  * Si la duda técnica del cliente requiere inspección física, cálculo estructural o verificación in situ, el agente **DEBE** proponer de forma natural el Diagnóstico Técnico en Terreno con el enlace: `https://cal.com/cuatropuntas.com/visita-tecnica`.
  * El formato del mensaje **DEBE** ceñirse a las restricciones de WhatsApp: solo un asterisco para negrita (`*texto*`), sin dobles asteriscos ni etiquetas HTML.

---

### 2.5. Cliente Meta Resiliente y Modo Mock (`lib/meta-client.js`)

- **[EARS-023-09] Conmutación Automática a Mock en Entornos de Test:**  
  **Cuando** se invoque el despacho de un mensaje por WhatsApp:
  * Si la variable de entorno `WHATSAPP_TOKEN` no está configurada, el cliente **DEBE** operar en modo emulado (Mock), registrando el mensaje en memoria (`getSentMessages()`) y retornando `{ success: true, mocked: true }`.
  * Si `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` están presentes, el cliente **DEBE** ejecutar la petición POST a Meta Graph API (`https://graph.facebook.com/v20.0/...`).
  * Bajo ninguna circunstancia los tests automatizados deben fallar por falta de credenciales de Meta o servicios externos.

---

## 3. Criterios de Aceptación Técnicos

1. **Máquina de Estados Conforme:** `lib/leads-state.js` ejecuta la transición `COTIZADO` ➔ `EN_CONVERSACION` ➔ `VISITA_AGENDADA` con normalización E.164.
2. **Silencio Total Post-Agendamiento:** Todo mensaje entrante a un lead en `VISITA_AGENDADA` responde HTTP 200 a Meta sin generar llamadas a Gemini ni mensajes salientes.
3. **Formalización del Director Técnico:** El mensaje de Cal.com contiene explícitamente el teléfono `+56 9 7909 2027` para coordinación operativa de acceso.
4. **Respuesta Consultiva Contextualizada:** El Agente Asesor incorpora en su razonamiento los metros cuadrados y la tipología cotizada por el cliente.
5. **Suite de Pruebas Automatizadas:** Creación de `tests/conversational-advisor.spec.js` con cobertura total de los flujos de estado y webhooks.
6. **Cero Regresiones:** Los 129 tests preexistentes en Playwright se mantienen al 100% en verde.
