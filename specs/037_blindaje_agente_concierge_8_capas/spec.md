# Spec 037: Blindaje del Agente Concierge / Setter y Consultor en sus 8 Capas Arquitectónicas

**Estado:** IMPLEMENTED  
**Fecha:** 2026-11-16  
**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Alcance:** `lib/leads-state.js`, `lib/knowledge-retriever.js`, `lib/agent-guardrails.js`, `lib/agent-observability.js`, `lib/intent-router.js`, `lib/agent-consultor.js`, `api/whatsapp.js`, `api/webhooks/whatsapp.js`, `api/chat.js`, `api/mcp.js`, `api/quote.js`, `api/webhooks/calcom.js` y `tests/spec-037-conversational-concierge-evals.spec.js`.

---

## 1. Contexto y Propósito

Tras una auditoría técnica forense sobre las 8 capas del agente concierge / setter y consultor de Cuatropuntas, se detectaron brechas críticas de sincronización y resiliencia serverless:
- Prompts sin visibilidad hacia el portal de Guías Técnicas DOM (`#guias-dom`) y sin tarifas base en `lib/agent-consultor.js`.
- Ausencia de recuperación dinámica de conocimiento (Mini-RAG sobre `posts.json`, `_leadMagnet.js` y `api/quote.js`).
- Desconexión entre los agentes Gemini internos y el motor paramétrico `calculateQuote()`, además de un handler faltante en `POST /api/mcp` para `consultar_subsidio_minvu`.
- Persistencia Write-Only hacia KV/Redis en `lib/leads-state.js` (sin hidratación en lectura ni `await` en funciones serverless) y ausencia del flag `hasQuoted` e historial acotado.
- Falta de validación de entrada, rate-limit, anti-prompt-injection y sanitización post-generación en `api/chat.js` y WhatsApp.
- Cuello de botella por `fetch` repetitivo a `/v1beta/models` en cada turno y ausencia de caché LRU de respuestas canónicas.
- Falso positivo en el router de `api/webhooks/whatsapp.js` (un lead frío en `EN_CONVERSACION` sin cotización previa pasaba al agente consultor en su segundo mensaje recibiendo enlace de Cal.com sin pasar por `#cotizador`) y falsos positivos en `classifyIntent`.
- Falta de logging estructurado JSON y suite automatizada de Evals comportamentales sobre las 8 capas.

---

## 2. Requisitos Funcionales (Notación EARS)

- **EARS-037-01 (Capa 1 — Prompt Sincronizado y Libre de Fugas):**  
  `THE` prompts de sistema en `api/whatsapp.js`, `api/chat.js` y `lib/agent-consultor.js` `SHALL` mantener sincronizada la matriz oficial de precios SSOT (+IVA), las políticas de alcance DOM hasta el Certificado de Recepción Final Definitiva (`+8%` Idea / `-3%` Planos / `-6%` solo ejecución) con su cláusula de exclusión por obras anexas y preexistencias sin regularizar, la prohibición explícita de revelar anillos logísticos o porcentajes territoriales, la Regla SDR de 3 pasos, el tenor exacto de Graceful Pivot e incluir el enlace a las Guías Técnicas DOM (`https://www.cuatropuntas.com/#guias-dom`). `api/whatsapp.js` `SHALL` dirigir enlaces particulares al cotizador (`https://www.cuatropuntas.com/#cotizador`) y usar exclusivamente asterisco simple (`*`) en su matriz oficial.

- **EARS-037-02 (Capa 2 — Mini-RAG Local Determinista):**  
  `WHEN` un usuario formule una consulta en cualquier canal conversacional (`whatsapp`, `web`), `THE` módulo `lib/knowledge-retriever.js` `SHALL` recuperar dinámicamente en memoria (0 ms de red) hasta 2 artículos relevantes desde `public/blog/posts.json`, el catálogo de guías DOM desde `api/_leadMagnet.js` (`#guias-dom`) y notas de alcance oficiales desde `api/quote.js` para enriquecer el contexto del agente sin texto duplicado obsoleto.

- **EARS-037-03 (Capa 3 — Herramientas Internas y Endpoint MCP):**  
  `WHEN` un usuario entregue superficie (m²) y tipología de proyecto en el chat o WhatsApp, `THE` sistema `SHALL` invocar determinísticamente `calculateQuote()` de `api/quote.js` vía `executeParametricQuoteTool()` exponiendo únicamente el rango referencial (`minUF`–`maxUF`), tipología, sistema, alcance DOM y nota territorial neutra, `WITHOUT` exponer `factorComuna`, multiplicadores ni nombres de anillos. Adicionalmente, `api/mcp.js` `SHALL` exponer e implementar la herramienta `consultar_subsidio_minvu` tanto en `GET` como en `POST` (`tools/list` y `tools/call`).

- **EARS-037-04 (Capa 4 — Accesos y Persistencia KV Bilateral):**  
  `THE` módulo `lib/leads-state.js` `SHALL` preservar 100% síncronas sus funciones actuales (`setLeadState`, `getLeadState`, `updateLeadState`, `deleteLeadState`, `findLeadByPhoneOrEmail`, `canBotReply`) para compatibilidad con pruebas existentes, e incorporar hidratación remota asíncrona desde Upstash/Vercel KV (`hydrateLeadState`, `fetchRemoteKv`), escritura con `await` (`flushLeadState`) con TTL de 14 días, flag booleano explícito `hasQuoted` e historial acotado `conversationHistory` (máx. 6 turnos). Los endpoints serverless (`api/quote.js`, `api/webhooks/whatsapp.js`, `api/whatsapp.js`, `api/webhooks/calcom.js`) `SHALL` hidratar y/o hacer flush de estado con `await` cuando existan credenciales KV.

- **EARS-037-05 (Capa 5 — Guardrails de Entrada y Salida):**  
  `WHEN` ingrese texto al agente, `THE` módulo `lib/agent-guardrails.js` `SHALL` validar tipo y longitud (máx. 800 caracteres), aplicar rate-limiting por cliente/IP y bloquear intentos de prompt injection o extracción de reglas internas retornando el tenor mandatario de Graceful Pivot sin consumir tokens del LLM. `WHEN` el agente genere una respuesta antes de enviarla al cliente, `THE` sistema `SHALL` aplicar `enforceOutputGuardrails()` sanitizando cualquier fuga de anillos o porcentajes territoriales, promesas prohibidas (`aprobación garantizada`, `sin interrumpir la habitabilidad`), el número purgado `63482439`, el teléfono del Director Técnico (`79092027`) si no está autorizado por visita agendada, y normalizar formato `*` simple en canal WhatsApp.

- **EARS-037-06 (Capa 6 — Caché y Eliminación de Doble Fetch):**  
  `THE` canales `api/whatsapp.js` y `api/chat.js` `SHALL NOT` ejecutar peticiones `fetch` a `/v1beta/models` en cada mensaje; `resolveGeminiModelName()` `SHALL` memoizar el modelo seleccionado a nivel de módulo con TTL de 1 hora. `THE` módulo `lib/agent-guardrails.js` `SHALL` proveer una caché LRU en memoria (máx. 100 entradas, TTL 30 minutos) para respuestas canónicas frecuentes por canal e intención.

- **EARS-037-07 (Capa 7 — Router Unificado y Multi-Turno sin Falsos Positivos):**  
  `THE` módulo `lib/intent-router.js` `SHALL` enrutar determinísticamente según el estado real del lead (`VISITA_AGENDADA` -> silencio IA; `hasQuoted === true` -> Consultor con Cal.com; `hasQuoted === false` -> Setter/SDR hacia `#cotizador` o `#guias-dom` prohibiendo saltar a Cal.com en leads fríos aunque su estado sea `EN_CONVERSACION`). `classifyIntent()` `SHALL` corregir los falsos positivos previos clasificando *"no tengo subsidio, quiero construir particular"* como `ROUTE_2`, *"quiero saber cómo trabajan"* como `ROUTE_2`, consultas de requisitos/checklist DOM como `GUIA_DOM_LEAD_MAGNET`, regiones fuera de RM o ausencia de terreno como `FUERA_DE_RM_O_SIN_TERRENO`, postulaciones sin adjudicación como `ROUTE_3` y menciones a correos/campañas pasadas como `GRACEFUL_PIVOT`.

- **EARS-037-08 (Capa 8 — Observabilidad Estructurada y Evals Automatizadas):**  
  `THE` módulo `lib/agent-observability.js` `SHALL` emitir registros JSON estructurados por cada turno (`channel`, `intent`, `leadState`, `hasQuoted`, `latencyMs`, `cacheHit`, `ragArticlesUsed`, `parametricQuoteUsed`, `guardrailTriggered`, `fallbackUsed`) y mantener un buffer consultable para verificación. La suite `tests/spec-037-conversational-concierge-evals.spec.js` `SHALL` validar de forma ejecutable y determinista las 8 capas sin regresiones sobre las 205 pruebas existentes.

---

## 3. Restricciones Arquitectónicas

1. **Límite de 12 Funciones Serverless en Vercel Hobby:** No se crearán archivos nuevos dentro de `api/`. Todos los nuevos módulos se alojan en `lib/`.
2. **Reserva Territorial Absoluta (Spec 036):** Ningún archivo modificado en `api/` o `lib/` contendrá referencias literales prohibidas sobre anillos o porcentajes territoriales en respuestas o comentarios expuestos.
3. **Preservación de Regresiones:** Todas las pruebas vigentes (`tests/conversational-advisor.spec.js`, `tests/conversational-sdr.spec.js`, `tests/spec-031`, `tests/spec-033`, `tests/spec-035`, `tests/spec-036`) deben mantenerse 100% en verde.
