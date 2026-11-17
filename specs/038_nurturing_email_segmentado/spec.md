# Spec 038: Secuencia Automatizada de Nurturing por Email (3 Correos Segmentados en 4 Perfiles)

**Estado:** IMPLEMENTED  
**Fecha:** 2026-11-17  
**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Alcance Previsto (Fase de Implementación):** `lib/leads-state.js`, `api/_emailNurturing.js`, `api/contact.js`, `api/quote.js`, `api/webhooks/calcom.js`, `vercel.json` y `tests/spec-038-email-nurturing.spec.js`.

---

## 1. Contexto y Auditoría de Arquitectura Previa (Solo Lectura)

1. **Almacenamiento Actual en Redis/KV (`lib/leads-state.js`):**
   - Los leads del cotizador web (`api/quote.js:1098`) se almacenan bajo `lead:<telefono_e164>` (TTL 14 días = `1.209.600 s`) con `estado: 'COTIZADO'`, `hasQuoted: true`, `tipo`, `areaNum`, `comunaHuman`, `sistemaComercial`, `minUF`, `maxUF` y `permisos`.
   - **Brecha #1 (`permisos` vs `permisosKey` en `api/quote.js:1111`):** `api/quote.js` persiste `permisosData.adminBadge` (ej. `'PROYECTO COMPLETO (Diseño + DOM + Construcción)'`, `'PERMISO DOM APROBADO (Listo para inicio inmediato)'`, `'ARQUITECTO PROPIO (Solo requiere Construcción)'`) en lugar de la clave cruda (`Idea`, `Planos`, `PermisoAprobado`, `ArquitectoPropio`). Se añadirá `permisosKey` preservando `permisos: adminBadge` (exigido por `Spec 035` `T035-D`), y el clasificador soportará ambos formatos.
   - **Brecha #2 (`hasQuoted` y `createdAt` vs `quotedAt`):** Los leads de Guías Técnicas DOM (`api/_leadMagnet.js:165`) viven en `lead:email:<email_normalizado>` sin propiedad `hasQuoted` explícita (`undefined`). A su vez, si un lead frío de WhatsApp (`lead:<phone>` con `hasQuoted: false` creado días antes) luego cotiza en la web, `api/quote.js` no hidrata previamente desde KV ni registra un timestamp independiente `quotedAt`, por lo que usar `createdAt` dispararía el correo Día 3 el mismo día de cotizar, y una re-cotización en frío sobrescribiría `VISITA_AGENDADA` o `conversationHistory`.
   - **Brecha #3 (Doble identidad en `api/webhooks/calcom.js:93-107`):** Cuando un usuario agenda cita en Cal.com, `calcom.js` solo hidrata `clientEmail` si falta `targetPhone`, no respalda `email` en `lead:<phone>`, y si encuentra un registro `lead:email:<email>` sin `.phone`, `updateLeadState(existingLead.phone, ...)` retorna `null` sin persistir `VISITA_AGENDADA`.
   - **Decisión de Descubrimiento KV (`SCAN` + `MGET` sin índice SET secundario):** Dado el TTL estricto de 14 días en `lead:*` y el volumen operativo del negocio (3–4 obras/mes, decenas a pocos cientos de leads activos simultáneos), se utilizará **`SCAN` paginado (`MATCH lead:*`, `COUNT 100`) + `MGET` por lotes vía Upstash REST JSON** (`POST ${kvUrl}`) como ruta única y autolimpiante, evitando dual-writes y deriva entre `lead:<phone>`, `lead:email:<email>` y un `SET` sin TTL.
   - **Aislamiento de Claves de Nurturing y Bajas:** Las bajas voluntarias (`unsub:<email>`, TTL 180 días = `15.552.000 s`) y el estado de envíos (`nurturing:<email>`, TTL 14 días = `1.209.600 s`) se almacenarán **fuera del prefijo `lead:*`**. Esto evita contaminar el `SCAN` de `lead:*`, previene carreras de escritura con `calcom.js`/`quote.js` y no extiende artificialmente el TTL de 14 días de `lead:<phone>`.
2. **Cuota de Funciones Serverless (`vercel.json` / `api/`):**
   - El directorio `api/` contiene actualmente **12 Serverless Functions** activas (límite máximo del plan Vercel Hobby).
   - El motor de nurturing y el manejador de bajas se alojarán en `api/_emailNurturing.js` (prefijo `_` excluido del conteo de funciones) y se enrutarán desde `api/contact.js` antes de la compuerta `if (req.method !== 'POST')` (línea 27), agregando los rewrites y el cron diario en `vercel.json` y manteniendo el total en **12/12 funciones**.

---

## 2. Requisitos Funcionales (Notación EARS)

### 2.1. Segmentación Exclusiva en 4 Perfiles

- **EARS-038-01 (Consolidación por Email Normalizado y Precedencia):**  
  `THE` motor de segmentación en `api/_emailNurturing.js` `SHALL` agrupar todos los registros `lead:*` activos por `normalizeEmail(lead.email)` (descartando registros sin email válido), evaluando si existe bloqueo global (`VISITA_AGENDADA` en cualquiera de sus registros o `unsub:<email>`). Cuando existan múltiples cotizaciones válidas para un mismo email, prevalecerá la más reciente según `quotedAt || updatedAt || createdAt`. Si no hay bloqueo, asignará exactamente **uno y solo uno** de los 4 perfiles exclusivos.

- **EARS-038-02 (`PERFIL_GUIA_DOM`):**  
  `WHEN` un correo consolidado posea un registro con `estado === 'LEAD_GUIA_DOM'` y ninguno de sus registros cumpla criterio de cotización (`hasQuoted === true || estado === 'COTIZADO' || Number(areaNum) > 0 || Boolean(minUF)`), `THE` clasificador `SHALL` asignarlo a `PERFIL_GUIA_DOM`, diferenciando el contenido según su última guía (`lead.guia`):
  - `permiso-edificacion`: foco en factibilidad previa (CIP, Art. 55 LGUC, SEREMI si aplica), evitar observaciones/rechazos en la DOM y derivar al cotizador (`https://www.cuatropuntas.com/#cotizador`) o diagnóstico en terreno (`https://cal.com/cuatropuntas.com/visita-tecnica`).
  - `recepcion-final`: foco en evitar bloqueos bancarios/tasación y regularizaciones costosas (SEC TE1/TC6, Libro de Obras, Art. 5.2.6 / 5.8.3 OGUC) y la advertencia de exclusión de recepciones parciales sobre obras anexas o preexistencias sin regularizar.

- **EARS-038-03 (`PERFIL_OBRA_MAYOR_INTEGRAL`):**  
  `WHEN` un correo consolidado haya cotizado (`hasQuoted === true` o equivalente) una obra habitacional mayor (`tipo` normalizado incluye `casa` o `segundo` / `amplia`) y su estado de planos corresponda a `Idea`, `Planos` o ausencia de calificación (`!permisos` o distinto a `PermisoAprobado` / `ArquitectoPropio`), `THE` clasificador `SHALL` asignarlo a `PERFIL_OBRA_MAYOR_INTEGRAL`, destacando el contrato a **Suma Alzada**, garantías Art. 18 LGUC (10/5/3 años), la gestión DOM completa hasta el **Certificado de Recepción Final Definitiva** sobre lo ejecutado por Cuatropuntas (derechos `1,5%` MINVU y empalmes aparte al costo real) y la **cláusula taxativa de exclusión** por obras anexas no contratadas o construcciones preexistentes sin regularizar.

- **EARS-038-04 (`PERFIL_OBRA_MAYOR_EJECUCION`):**  
  `WHEN` un correo consolidado haya cotizado una obra habitacional mayor (Casa Nueva o Segundo Piso/Ampliación) cuyo `permisosKey` o `permisos` corresponda a `PermisoAprobado` (`PERMISO DOM APROBADO`) o `ArquitectoPropio` (`ARQUITECTO PROPIO`), `THE` clasificador `SHALL` asignarlo a `PERFIL_OBRA_MAYOR_EJECUCION`, destacando la modalidad de **solo ejecución material de obra** (`-6%` aplicado), apego fiel a planos aprobados, **Libro de Obras** al día (Art. 1.2.9 OGUC), seguridad y faena limpia (Art. 5.8.3 OGUC), informes de calidad y entrega de **certificados SEC (TE1/TC6)** empaquetados en la **Carpeta Técnica del Constructor** para que su arquitecto patrocinante tramite la Recepción Final.

- **EARS-038-05 (`PERFIL_QUINCHO_REMODELACION`):**  
  `WHEN` un correo consolidado haya cotizado un Quincho (`tipo` normalizado incluye `quincho`) o Remodelación (`remodela`), `THE` clasificador `SHALL` asignarlo a `PERFIL_QUINCHO_REMODELACION`, adaptando el bloque técnico a su tipología:
  - Común: protocolos de **faena limpia y ejecución por etapas** en casa habitada (sin prometer habitabilidad ininterrumpida), plazos orientativos realistas y **visita técnica de cubicación en terreno**.
  - Quinchos (`12`/`15` UF/m² +IVA): detalle de alcance base incluido vs. exclusiones taxativas a cubicar (empalmes sanitarios, canalización eléctrica, muebles cerrados bajo mesón, cubiertas de piedra natural).
  - Remodelaciones (`11`–`13` UF/m² +IVA >25 m²; baños `65–95 UF +IVA`; cocinas `90–160 UF +IVA`): inspección de redes preexistentes y protocolo transparente ante vicios ocultos.

### 2.2. Cadencia Temporal, Idempotencia y Reglas de Parada

- **EARS-038-06 (Cadencia Día 0 / Día 3 / Día 7, Timestamps e Idempotencia):**  
  `THE` secuencia constará de 3 correos totales:
  - **Día 0:** Ya enviado de forma transaccional al cotizar (`api/quote.js`) o descargar guía (`api/_leadMagnet.js`). El cron jamás reenvía Día 0.
  - **Origen Temporal (`originTs`):** Para perfiles cotizados se usará `quotedAt || createdAt || updatedAt`; para `PERFIL_GUIA_DOM` se usará `createdAt || Date.parse(timestamp) || updatedAt`.
  - **Día 3 (`elapsedMs >= 72h && elapsedMs < 168h`):** Elegible si el estado `nurturing:<email>` del perfil vigente tiene `lastSentDay < 3`.
  - **Día 7 (`elapsedMs >= 168h && elapsedMs < 336h`):** Elegible si el estado `nurturing:<email>` del perfil vigente tiene `lastSentDay < 7`. Si por indisponibilidad previa no se envió Día 3 antes de cumplirse `168h`, se enviará únicamente el correo de **Día 7** fijando `lastSentDay = 7` (evitando envíos múltiples en un mismo día).
  - Tras cada envío SMTP exitoso, el sistema `SHALL` persistir de inmediato `nurturing:<email>` (`{ profile, lastSentDay, lastSentAt, originTs, failures: 0 }`) antes de procesar el siguiente lead.

- **EARS-038-07 (Reglas de Parada, Transición de Perfil y Baja Segura):**  
  `THE` sistema `SHALL` detener o suprimir envíos en cualquiera de los siguientes escenarios:
  1. **Visita Agendada (`VISITA_AGENDADA`):** Si cualquier registro asociado al email/teléfono tiene `estado === 'VISITA_AGENDADA'` (o al agendarse vía `api/webhooks/calcom.js`, sincronizando ambos `lead:<phone>` y `lead:email:<email>`), se detiene toda secuencia de nurturing.
  2. **Transición de Perfil:** Si un lead en `PERFIL_GUIA_DOM` cotiza posteriormente en la web (`hasQuoted === true`), prevalece el perfil de cotización, reiniciando la ventana de 72h/168h desde `quotedAt` porque `nurturing.profile` difiere del nuevo perfil. Si re-cotiza cambiando de perfil, también reinicia para el nuevo perfil sin duplicar envíos dentro del mismo perfil.
  3. **Baja Voluntaria Segura (`unsubscribe`):** Todo correo Día 3 y Día 7 incluirá enlace HMAC-SHA256 hacia `https://www.cuatropuntas.com/api/unsubscribe?email=...&token=...` firmado con `NURTURING_UNSUB_SECRET || CRON_SECRET` (fail-closed si falta secreto; verificación con digest fijo + `crypto.timingSafeEqual`). Para prevenir bajas accidentales por *pre-fetchers* de seguridad (Outlook SafeLinks, Mimecast), `GET /api/unsubscribe` renderizará página de confirmación HTML escapada sin mutar estado, y `POST /api/unsubscribe` (incluyendo soporte RFC 8058 `List-Unsubscribe-Post: List-Unsubscribe=One-Click`) persistirá `unsub:<email>` (`EX=15552000`, 180 días).
  4. **Modo `dryRun`:** Cuando `dryRun === true` (`?dryRun=true` o `{ dryRun: true }`), el handler calculará elegibles, perfiles, asuntos y contenido sin enviar SMTP ni escribir en Redis/KV.

### 2.3. Resiliencia Serverless, Seguridad SMTP y Cumplimiento SSOT

- **EARS-038-08 (Lock Distribuido, Presupuesto Serverless Hobby y Resiliencia SMTP):**  
  `THE` dispatcher tomará un lock distribuido `SET nurturing:lock <id> NX EX 30` (liberado en `finally`), creará **un único transporter Zoho SMTP reutilizable** (`pool: true`, timeouts `<= 3000 ms`, sin `bcc`) y procesará como máximo `MAX_BATCH = 12` envíos o hasta superar `6000 ms` transcurridos antes del límite de 10 s de Vercel Hobby. Ante error SMTP permanente (`5xx`, ej. `550`), incrementará `failures` en `nurturing:<email>` y suspenderá reintentos al acumular 2 rebotes permanentes; ante errores transitorios o de autenticación (`421`/`454`/`535`), abortará el lote inmediatamente (*circuit breaker*).

- **EARS-038-09 (Autenticación Fail-Closed, Kill-Switch y Cuota de Funciones):**  
  `THE` endpoint `api/contact.js` `SHALL` enrutar `/api/nurturing-cron` (`?action=nurturing-cron`) y `/api/unsubscribe` (`?action=unsubscribe`) hacia `api/_emailNurturing.js` **antes** del bloqueo de método `POST`, manteniendo `<= 12` Serverless Functions en `api/`. El cron exigirá `Authorization: Bearer <CRON_SECRET>` validado con digest SHA-256 + `crypto.timingSafeEqual` (HTTP `401` si falta secreto o no coincide) y respetará `NURTURING_ENABLED === 'false'` como kill-switch inmediato.

- **EARS-038-10 (Cumplimiento Comercial, Escaping HTML y SSOT):**  
  Todos los correos de Día 3 y Día 7 `SHALL` escapar HTML en datos dinámicos del lead (`nombre`, `comunaHuman`, `espacios_remodelar`, `proyectoResumen`, `email`), cumplir con tarifas netas `+IVA`, prohibición total de mencionar anillos logísticos o porcentajes territoriales (Spec 036), prohibición de sobrepromesas de habitabilidad o aprobaciones garantizadas (Spec 011 / Spec 035), uso exclusivo del WhatsApp `+56 9 2738 4075` (cero `63482439`, y sin exponer `79092027` antes de agendar en Cal.com) y enlaces canónicos (`https://www.cuatropuntas.com/#cotizador`, `https://cal.com/cuatropuntas.com/visita-tecnica`).
