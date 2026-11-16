# Tareas Técnicas 037: Blindaje del Agente Concierge / Setter y Consultor en 8 Capas

**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-16  

---

## Desglose de Tareas

- [x] **Tarea 1: Documentación SDD**
  - [x] 1.1 Crear `specs/037_blindaje_agente_concierge_8_capas/spec.md` (notación EARS para las 8 capas).
  - [x] 1.2 Crear `specs/037_blindaje_agente_concierge_8_capas/plan.md`.
  - [x] 1.3 Crear `specs/037_blindaje_agente_concierge_8_capas/tasks.md`.

- [x] **Tarea 2: Capa 4 — Persistencia Bilateral KV/Redis y Memoria Conversacional (`lib/leads-state.js`)**
  - [x] 2.1 Incorporar `hasQuoted` explícito y `conversationHistory` (máx. 6 turnos) en `setLeadState` y `updateLeadState`.
  - [x] 2.2 Implementar `fetchRemoteKv`, `hydrateLeadState`, `flushLeadState` y `appendConversationTurn` con TTL de 14 días (`EX`).
  - [x] 2.3 Mantener compatibilidad 100% síncrona de `getLeadState`, `setLeadState`, `updateLeadState`, `deleteLeadState`, `findLeadByPhoneOrEmail` y `canBotReply`.

- [x] **Tarea 3: Capas 2 y 3 — Mini-RAG Local, Tools Internas y MCP (`lib/knowledge-retriever.js`, `api/mcp.js`)**
  - [x] 3.1 Crear `lib/knowledge-retriever.js` cargando en memoria `public/blog/posts.json`, catálogo de guías DOM y funciones de `api/quote.js`.
  - [x] 3.2 Implementar `retrieveRelevantContext(userQuery)` y `executeParametricQuoteTool(paramsOrText)` sin exponer multiplicadores territoriales.
  - [x] 3.3 Completar `consultar_subsidio_minvu` en `POST /api/mcp` (`tools/list` y `tools/call`).

- [x] **Tarea 4: Capas 5, 6 y 8 — Guardrails, Caché y Observabilidad (`lib/agent-guardrails.js`, `lib/agent-observability.js`)**
  - [x] 4.1 Crear `lib/agent-guardrails.js` con `validateAgentInput` (longitud, rate-limit, anti-prompt-injection), `enforceOutputGuardrails` (anti-fugas, anti-sobrepromesas, teléfonos, `*` simple), `resolveGeminiModelName` y caché LRU (TTL 30 min).
  - [x] 4.2 Crear `lib/agent-observability.js` con logging JSON estructurado y buffer consultable para Evals.

- [x] **Tarea 5: Capas 1 y 7 — Router Unificado y Endpoints (`lib/intent-router.js`, `lib/agent-consultor.js`, `api/whatsapp.js`, `api/webhooks/whatsapp.js`, `api/chat.js`, `api/quote.js`, `api/webhooks/calcom.js`)**
  - [x] 5.1 Crear `lib/intent-router.js` corrigiendo falsos positivos de subsidio y ruteo multi-turno de leads fríos (`!hasQuoted`).
  - [x] 5.2 Sincronizar `api/whatsapp.js`, `api/chat.js` y `lib/agent-consultor.js` con `#guias-dom`, matriz SSOT `+IVA` y guardrails/caché/RAG/tools.
  - [x] 5.3 Actualizar `api/webhooks/whatsapp.js`, `api/quote.js` y `api/webhooks/calcom.js` con hidratación/flush KV (`await`) y ruteo por `hasQuoted`.

- [x] **Tarea 6: Verificación, Suite de Evals, Despliegue y Cierre SDD**
  - [x] 6.1 Crear `tests/spec-037-conversational-concierge-evals.spec.js` validando las 8 capas.
  - [x] 6.2 Ejecutar `node -c` en todos los `.js` nuevos/modificados.
  - [x] 6.3 Ejecutar `npx playwright test --workers=1 --reporter=dot` verificando 100% Green.
  - [x] 6.4 Ejecutar `node scripts/seo-geo-guardian.js --dry-run` confirmando 0 errores críticos.
  - [x] 6.5 Marcar `spec.md` como `IMPLEMENTED`, `tasks.md` completado, hacer commit, push a `origin/main` y desplegar con `npx vercel --prod --yes`.
