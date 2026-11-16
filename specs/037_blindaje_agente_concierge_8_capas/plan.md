# Plan Técnico 037: Blindaje del Agente Concierge / Setter y Consultor en 8 Capas

**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-16  

---

## 1. Arquitectura Modular (Sin Aumentar Funciones Serverless en `api/`)

```text
[WhatsApp Cloud API / Chat Web / MCP]
          │
          ├──> api/whatsapp.js | api/webhooks/whatsapp.js | api/chat.js
          │         │
          │         ├── 1. Capa 4: lib/leads-state.js
          │         │      ├── hydrateLeadState() (KV GET) + flushLeadState() (KV SETEX)
          │         │      ├── hasQuoted (boolean explícito)
          │         │      └── conversationHistory (máx. 6 turnos)
          │         │
          │         ├── 2. Capa 5 & 6: lib/agent-guardrails.js
          │         │      ├── validateAgentInput() (longitud, rate-limit, anti-injection)
          │         │      ├── resolveGeminiModelName() (memoización sin fetch por request)
          │         │      ├── LRU Cache (TTL 30 min para FAQs canónicas)
          │         │      └── enforceOutputGuardrails() (fugas territoriales, DOM, teléfonos, *)
          │         │
          │         ├── 3. Capa 7: lib/intent-router.js
          │         │      ├── classifyIntent() (ROUTE_1/2/3, GUIA_DOM_LEAD_MAGNET, FUERA_DE_RM, GRACEFUL_PIVOT)
          │         │      └── routeAndGenerateReply() (Cold Lead !hasQuoted -> SDR; Quoted -> Consultor)
          │         │
          │         ├── 4. Capa 2 & 3: lib/knowledge-retriever.js + api/mcp.js
          │         │      ├── retrieveRelevantContext() (posts.json + _leadMagnet.js + quote.js)
          │         │      ├── executeParametricQuoteTool() (calculateQuote seguro sin factorComuna)
          │         │      └── api/mcp.js -> cotizar_construccion + consultar_subsidio_minvu
          │         │
          │         └── 5. Capa 8: lib/agent-observability.js + tests/spec-037-*.spec.js
          │                └── logAgentEvent() JSON estructurado + buffer de Evals
```

---

## 2. Decisiones Técnicas Clave

1. **Compatibilidad Síncrona + Persistencia KV Asíncrona en `lib/leads-state.js`:**  
   Las pruebas unitarias existentes (`tests/conversational-advisor.spec.js`) invocan `setLeadState`, `getLeadState`, `updateLeadState` y `canBotReply` sin `await`. Por ello, el mapa en memoria `stateStore` permanece síncrono y se añaden métodos asíncronos (`hydrateLeadState`, `flushLeadState`, `fetchRemoteKv`) invocados con `await` por los handlers HTTP serverless en producción.
2. **Separación Estricta Lead Frío vs. Lead Cotizado (`hasQuoted`):**  
   `api/webhooks/whatsapp.js` guarda leads fríos en `EN_CONVERSACION` con `hasQuoted: false`. Mientras `hasQuoted === false`, mensajes subsecuentes permanecen en el flujo **SDR / Setter** (`routeAndGenerateReply`) derivando a `https://www.cuatropuntas.com/#cotizador` o `https://www.cuatropuntas.com/#guias-dom`, sin saltar al enlace de Cal.com reservado para leads ya cotizados.
3. **Regex Safe Design (Spec 036):**  
   Para evitar cualquier falso positivo de las reglas de Spec 036 sobre código fuente de prompts (`api/whatsapp.js`, `api/chat.js`, `lib/agent-consultor.js`, `api/mcp.js`), los patrones defensivos en `lib/agent-guardrails.js` se construyen sin violar las aserciones de `spec-036` y nunca exponen nombres de anillos en los archivos auditados por `T036.2`.
