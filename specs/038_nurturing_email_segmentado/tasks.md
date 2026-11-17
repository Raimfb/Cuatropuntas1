# Tareas Técnicas 038: Secuencia Automatizada de Nurturing por Email (4 Perfiles)

**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-17  

---

## Desglose de Tareas

- [x] **Tarea 1: Auditoría y Documentación SDD**
  - [x] 1.1 Auditar en solo lectura `lib/leads-state.js`, `api/quote.js`, `api/_leadMagnet.js`, `api/contact.js`, `api/webhooks/calcom.js` y `vercel.json`.
  - [x] 1.2 Ejecutar revisión EGM Goldfish (`egm-design`, `egm-zoom-out`, `egm-implementation-readiness`).
  - [x] 1.3 Redactar `specs/038_nurturing_email_segmentado/spec.md`, `plan.md` y `tasks.md`.

- [x] **Tarea 2: Capa de Persistencia KV Aislada y Sincronización (`lib/leads-state.js`, `api/quote.js`, `api/webhooks/calcom.js`)**
  - [x] 2.1 Implementar transporte Upstash REST JSON (`kvCommand`), `scanAllLeadRecords()`, `unsub:<email>` (TTL 180d), `nurturing:<email>` (TTL 14d) y mutex `nurturing:lock` con espejos en memoria.
  - [x] 2.2 Corregir `hasQuoted` en `_buildAndStoreEmailLead`, preservación de `estado`/`permisosKey`/`quotedAt` en `setLeadState` y `{ bypassCache: true }` en `hydrateLeadState`.
  - [x] 2.3 Actualizar `api/quote.js` (`quotedAt`, `permisosKey`, hidratación previa y sync con `lead:email:<email>`) y `api/webhooks/calcom.js` (hidratación dual y marcado `VISITA_AGENDADA` en ambos registros).

- [x] **Tarea 3: Motor de Nurturing, Plantillas y Enrutamiento (`api/_emailNurturing.js`, `api/contact.js`, `vercel.json`)**
  - [x] 3.1 Implementar `api/_emailNurturing.js` con consolidación, clasificación en 4 perfiles exclusivos, cadencia 72h/168h, plantillas Día 3/Día 7 (HTML + texto plano) y escaping HTML.
  - [x] 3.2 Implementar auth fail-closed `CRON_SECRET`, baja en 2 pasos + RFC 8058 con HMAC `timingSafeEqual`, kill-switch, pooling SMTP, lock distribuido y `dryRun`.
  - [x] 3.3 Delegar `nurturing-cron` y `unsubscribe` en `api/contact.js` antes del chequeo `405` y configurar rewrites + cron diario en `vercel.json` manteniendo `12/12` funciones.

- [x] **Tarea 4: Suite TDD (`tests/spec-038-email-nurturing.spec.js`), Verificación y Despliegue**
  - [x] 4.1 Implementar pruebas `T038.1` a `T038.6` en `tests/spec-038-email-nurturing.spec.js`.
  - [x] 4.2 Validar sintaxis (`node -c`) y JSON de `vercel.json`.
  - [x] 4.3 Ejecutar suite completa de Playwright (`npx playwright test --workers=1 --reporter=dot`) confirmando 100% Green sin regresiones.
  - [x] 4.4 Marcar `spec.md` como `IMPLEMENTED`, cerrar `tasks.md`, commit, push a `origin/main`, desplegar con `npx vercel --prod --yes` y correr `node scripts/seo-geo-guardian.js --dry-run`.
