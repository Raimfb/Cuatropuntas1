# Constitución de Ingeniería del Software
**Proyecto:** Constructora Cuatropuntas (`cuatropuntas-secure`)  
**Nivel de Exigencia:** Metodología Estricta SDD (Spec-Driven Development)  
**Vigencia:** 2026 en adelante

Este documento establece los **5 Principios Innegociables de Ingeniería** que rigen todas las decisiones de arquitectura, desarrollo y despliegue en este proyecto. Ningún cambio, pull request o automatización de agentes puede vulnerar estos mandatos.

---

## 🏛️ Principio I: Cero Código Roto en Producción (Zero Broken Code)
1. **Comprobación de Sintaxis Previa:** Ningún archivo de código (`.js`, `.html`, `.css`, etc.) puede ser integrado al repositorio sin haber superado una validación sintáctica estricta en tiempo de desarrollo (`node -c <archivo>`).
2. **Prohibido el Merge Ciego:** Las pruebas automatizadas no deben enmascarar errores de carga o parseo de módulos.
3. **Resiliencia ante Fallos en Serverless:** Toda Serverless Function (`api/`) debe contar con bloques `try/catch` globales, registro estructurado de errores y respuestas HTTP semánticas consistentes (200 con envelope `{ success, data, error }` o códigos 4xx/5xx limpios), evitando que una excepción no capturada deje el worker colgado o arroje una pantalla en blanco en el cliente.

---

## 🔒 Principio II: Sanitización Estricta de Secretos (Secret Hygiene)
1. **Cero Secretos Hardcodeados:** Queda terminantemente prohibido incluir tokens, contraseñas, claves privadas o cadenas de conexión en el código fuente, incluso como valores de fallback.
   - Todo secreto debe residir exclusivamente en variables de entorno seguras (`.env`, `.env.local` y Vercel Environment Variables).
   - En el código, los fallbacks deben lanzar advertencias o errores controlados (`throw new Error('CONFIG_ERROR: VARIABLE_NAME is missing')`), nunca exponer credenciales reales de prueba o producción.
2. **Revocación Inmediata de Secretos Expuestos:** Si un secreto es detectado en el historial de control de versiones, debe considerarse comprometido y ser revocado en el proveedor (Meta Cloud API, Zoho, Gemini) de forma prioritaria.

---

## 🧪 Principio III: Pruebas Reales sin Mocks Ciegos (No Blind Mocks)
1. **Prohibición de Mocks Falsificadores de Salud:** No se tolerarán pruebas E2E o de integración que mockeen ciegamente endpoints rotos para reportar "tests passing".
2. **Pirámide de Pruebas Obligatoria:**
   - **Pruebas Unitarias de Lógica de Negocio:** La matriz de precios, cálculos de m², recintos pequeños y validaciones de `_botGuard.js` deben contar con tests unitarios reales que se ejecuten contra el código de backend real sin simular la función completa.
   - **Pruebas de Integración y Contrato:** Los contratos de entrada y salida de las APIs deben validarse con esquemas estrictos.
   - **Pruebas E2E de Flujo Crítico:** Los tests de Playwright deben verificar la experiencia de usuario de extremo a extremo, alertando si el backend o las interfaces presentan discrepancias.

---

## 💾 Principio IV: Persistencia Fail-Safe antes de Despacho Externo (Persist Before Dispatch)
1. **Tolerancia Cero a la Pérdida de Leads:** En un negocio de construcción habitacional (High-Ticket), cada lead calificado tiene un alto costo de adquisición y valor potencial.
2. **Regla de Persistencia Inmediata:** Ningún flujo transaccional puede depender exclusivamente de servicios de entrega volátil (como SMTP o llamadas externas a APIs de mensajería).
   - Todo prospecto que complete un formulario o cotizador debe ser **registrado y persistido primero** (en Google Sheets, base de datos o almacenamiento permanente seguro).
   - Solo tras asegurar la persistencia se procede al despacho secundario de correos electrónicos vía Zoho Mail o alertas vía WhatsApp. Si el servicio de correo falla o sufre timeouts, el lead ya se encuentra a salvo y puede ser gestionado manualmente.

---

## 📐 Principio V: Tipado Estricto y Alineación Omnicanal de Datos (Strict Schema & Omni-Consistency)
1. **Contratos Estrictos de Entrada/Salida:** Todo endpoint debe validar exhaustivamente sus parámetros de entrada (tipos de datos, rangos numéricos de m², formatos de email y teléfonos válidos en Chile) antes de procesar cálculos o persistir información.
2. **Consistencia de Información Absoluta:**
   - No pueden existir divergencias en precios, materialidades, teléfonos o políticas entre lo publicado en la web visual (`index.html`, `precios.html`), la capa de agentes (`api/markdown.js`, `api/mcp.js`), los prompts de IA (`api/chat.js`, `api/whatsapp.js`) y la documentación (`llms.txt`, `llms-full.txt`, `AGENTS.md`).
   - Toda actualización en la matriz de precios o canales comerciales debe aplicarse de manera integral en todo el ecosistema.
