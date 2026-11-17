# Plan Técnico 038: Secuencia Automatizada de Nurturing por Email (4 Perfiles)

**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-17  

---

## 1. Arquitectura de Datos y Ejecución (Vercel Hobby <= 12 Funciones)

```text
[Vercel Cron (0 13 * * *) / Manual POST] ──GET/POST──> /api/nurturing-cron (rewrite)
                                                               │
[Usuario clic "Darme de baja"] ─────────────GET/POST──> /api/unsubscribe (rewrite)
                                                               │
                                                               ▼
                                                        api/contact.js (router antes de 405)
                                                               │ lazy-require
                                                               ▼
                                                     api/_emailNurturing.js (0 cuota función)
                                                               │
       ┌───────────────────────────────────────────────────────┴──────────────────────┐
       ▼                                                                              ▼
 [lib/leads-state.js + Upstash REST JSON]                              [Nodemailer Pool Zoho SMTP]
  • SCAN lead:* + MGET (descubrimiento sin índice SET)                  • pool: true, timeouts <= 3000ms
  • unsub:<email> (EX 180d, fuera de lead:*)                            • MAX_BATCH = 12 / 6000ms cutoff
  • nurturing:<email> (EX 14d, fuera de lead:*)                         • Escaping HTML + List-Unsubscribe
  • nurturing:lock (NX EX 30s)                                          • Circuit breaker 421/454/535 + 5xx
```

---

## 2. Componentes y Cambios por Archivo

1. **`lib/leads-state.js`:**
   - Añadir transporte Upstash REST JSON (`kvCommand(argsArray)`) + espejos en memoria (`unsubStore`, `nurturingStore`, `lockStore`) limpiados por `resetStateStore()`.
   - Preservar `existing.estado`, `existing.permisosKey` y `existing.quotedAt` en `setLeadState`; fijar `hasQuoted` explícito en `_buildAndStoreEmailLead` (default `false`); añadir `{ bypassCache: true }` a `hydrateLeadState`.
   - Exportar `scanAllLeadRecords()`, `getUnsubMap(emails)`, `isUnsubscribed(email)`, `markUnsubscribed(email)`, `getNurturingStatesMap(emails)`, `saveNurturingState(email, state)`, `acquireNurturingLock(ttlSec)`, `releaseNurturingLock(lockId)`.

2. **`api/quote.js` y `api/webhooks/calcom.js`:**
   - En `api/quote.js`: normalizar `email`, ejecutar `await hydrateLeadState(formattedClientPhone, { bypassCache: true })`, preservar `VISITA_AGENDADA` si existía, persistir `quotedAt: Date.now()` y `permisosKey: permisos || 'Idea'` (conservando intacto `permisos: permisosData.adminBadge`), y sincronizar `hasQuoted: true` en `lead:email:<email>` si existía.
   - En `api/webhooks/calcom.js`: normalizar `clientEmail`, hidratar siempre tanto `targetPhone` como `clientEmail`, guardar `email` normalizado en `lead:<phone>`, y marcar `VISITA_AGENDADA` en ambos registros (`lead:<phone>` y `lead:email:<email>`).

3. **`api/_emailNurturing.js`:**
   - Autenticación cron (`Authorization: Bearer <CRON_SECRET>`) con SHA-256 + `crypto.timingSafeEqual` (fail-closed HTTP 401).
   - Kill-switch `NURTURING_ENABLED === 'false'`.
   - Baja en 2 pasos: `GET /api/unsubscribe` muestra formulario HTML de confirmación seguro frente a *link pre-fetchers*; `POST /api/unsubscribe` (incluyendo RFC 8058 `List-Unsubscribe-Post`) valida HMAC con `NURTURING_UNSUB_SECRET || CRON_SECRET` y persiste `unsub:<email>` (EX 180d).
   - Consolidación de registros por email, tie-breaking por cotización más reciente (`quotedAt || updatedAt || createdAt`), clasificación exclusiva en los 4 perfiles (`PERFIL_GUIA_DOM`, `PERFIL_OBRA_MAYOR_INTEGRAL`, `PERFIL_OBRA_MAYOR_EJECUCION`, `PERFIL_QUINCHO_REMODELACION`), plantillas HTML/texto plano Día 3 y Día 7 escapadas contra XSS, batching (`MAX_BATCH = 12` / `6000 ms`) y soporte `dryRun`.

4. **`api/contact.js` y `vercel.json`:**
   - Delegar `action=nurturing-cron` (`/api/nurturing-cron`) y `action=unsubscribe` (`/api/unsubscribe`) antes del bloqueo `405` en `api/contact.js`.
   - Configurar rewrites y cron diario `0 13 * * *` en `vercel.json`.

5. **`tests/spec-038-email-nurturing.spec.js`:**
   - Suite TDD `T038.1`–`T038.6` validando perfiles, ventanas 72h/168h, transiciones, paradas (`VISITA_AGENDADA`, `unsubscribe`, `dryRun`), auth/XSS/resiliencia SMTP y auditoría SSOT.
