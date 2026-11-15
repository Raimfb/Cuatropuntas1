# Spec 034: Priorización de Enlace Web en Buscadores y Motores de IA (Sin Alterar el Pie de Página)

**Estado:** IMPLEMENTED (2026-11-15) — T034 5/5 · suite completa 200/200  
**Fecha:** 2026-11-14  
**Alcance:** Superficies máquina-legibles (JSON-LD, `llms*.txt`, `api/markdown.js`, `auth.md`). El `<footer>` visual y las páginas legales NO se tocan.

## 1. Contexto y Objetivo
Los buscadores (Schema.org/JSON-LD) y motores generativos (ChatGPT, Perplexity, Gemini) exponen `contacto@cuatropuntas.com` como canal directo, saltándose el embudo. Se busca canalizar el 100% del tráfico hacia `https://www.cuatropuntas.com/` (Hero → Lead Magnets `#guias-dom` → Cotizador `#contacto`) y WhatsApp oficial `+56 9 2738 4075`, sin quitar el correo del pie de página visible.

## 2. Auditoría (solo lectura, 2026-11-14)

### 2.1 JSON-LD (`"email"`)
| Archivo | Línea | Hallazgo |
|---|---|---|
| `public/index.html` | 66 | `"email": "contacto@cuatropuntas.com"` en `GeneralContractor` → **REMOVER** |
| `public/precios.html`, `public/servicios/*.html`, `public/blog/index.html`, `scripts/publish-blog.js` | — | Sin propiedad `"email"` en JSON-LD (OK, sin cambios) |

### 2.2 Superficies de IA / agentes
| Archivo | Línea | Hallazgo |
|---|---|---|
| `public/llms.txt` | 50 | `- **Correo Electrónico:** contacto@...` → **REEMPLAZAR** |
| `public/llms-full.txt` | 101 | `- **Correo Electrónico:** contacto@...` → **REEMPLAZAR** |
| `api/markdown.js` | 151, 289, 366 | `- **Email:** contacto@...` → **REEMPLAZAR** |
| `api/markdown.js` | 317 | `Contacto: contacto@... / WhatsApp: ...` → **REEMPLAZAR** |
| `public/auth.md` | 48 | `- **Support Email:** contacto@...` (hallazgo adicional, superficie para agentes) → **REEMPLAZAR** |
| `api/whatsapp.js`, `api/chat.js`, `lib/agent-consultor.js`, `public/.well-known/**` | — | Sin menciones (OK) |

### 2.3 Fuera de alcance (se preservan intencionalmente)
- Footers visuales: `index.html:1184`, `precios.html:658`, `servicios/*.html`, `subsidio-minvu-sitio-propio.html:473`, `blog/index.html:685`.
- Legales: `politicas.html:196,219`, `privacidad.html:195,325`.
- Transporte SMTP / destinatarios internos: `api/contact.js`, `api/notify.js`, `api/quote.js`, `api/_leadMagnet.js`, `scripts/seo-geo-guardian.js`.
- PDFs generados: `api/quote.js:634,661`, `scripts/build-lead-magnets.js:87` (documentos entregados post-captura).
- `scripts/update_whatsapp_profile.js:34` (perfil de WhatsApp Business, no indexable por buscadores).

### 2.4 Tests existentes
- Ningún test valida `"email"` en JSON-LD ni correo en `llms.txt` / `api/markdown.js`.
- `tests/privacy-compliance.spec.js:21` exige el correo en página de privacidad → debe seguir pasando (legales intactos).
- `tests/quote-high-ticket-presentation.spec.js:225` exige el correo en el PDF de cotización → fuera de alcance, sigue pasando.

## 3. Requisitos (EARS)
- **R1 (Ubicuo):** El sistema SHALL mantener `contacto@cuatropuntas.com` visible en el `<footer>` de las páginas HTML públicas y en `politicas.html` / `privacidad.html`.
- **R2 (Ubicuo):** Los bloques `<script type="application/ld+json">` de `public/**/*.html` y las plantillas de `scripts/publish-blog.js` SHALL NOT contener la propiedad `"email"` ni la cadena `contacto@cuatropuntas.com`.
- **R3 (Ubicuo):** El esquema `GeneralContractor` SHALL conservar `"url": "https://www.cuatropuntas.com/"` y `"telephone": "+56927384075"` como vías de contacto.
- **R4 (Evento):** WHEN un agente IA lee `public/llms.txt`, `public/llms-full.txt` o `public/auth.md`, el contenido SHALL NOT incluir `contacto@cuatropuntas.com` y SHALL incluir `https://www.cuatropuntas.com/`, `https://www.cuatropuntas.com/#guias-dom`, `https://www.cuatropuntas.com/#contacto` y WhatsApp `+56 9 2738 4075`.
- **R5 (Evento):** WHEN se solicita `GET /api/markdown` (cualquier ruta), la respuesta SHALL NOT incluir `contacto@cuatropuntas.com` y SHALL incluir el enlace al sitio web oficial.
- **R6 (No deseado):** IF se introduce un correo en una superficie máquina-legible, THEN la prueba `T034` SHALL fallar.

## 4. Prueba TDD `T034` (`tests/spec-034-canalizacion-buscadores-ia.spec.js`)
1. **T034-A JSON-LD:** para cada `public/**/*.html`, parsear todos los `ld+json` y verificar recursivamente que no exista clave `email` ni la cadena del correo; `index.html` mantiene `url` y `telephone`.
2. **T034-B publish-blog:** `scripts/publish-blog.js` no contiene `"email"` dentro de plantillas JSON-LD.
3. **T034-C llms/auth:** `llms.txt`, `llms-full.txt`, `auth.md` sin correo y con `#guias-dom`, `#contacto` y `56927384075`.
4. **T034-D markdown API:** invocar el handler de `api/markdown.js` con las rutas existentes (home, blog post, precios, subsidio, servicios) y verificar ausencia del correo + presencia de `https://www.cuatropuntas.com/`.
5. **T034-E Footer intacto:** `index.html`, `precios.html`, `servicios/*.html`, `politicas.html`, `privacidad.html` siguen conteniendo `contacto@cuatropuntas.com` fuera de los `ld+json`.

## 5. Criterios de Aceptación
- `node -c api/markdown.js` exit 0.
- `npx playwright test tests/spec-034-*.spec.js tests/privacy-compliance.spec.js tests/agent-readiness.spec.js tests/seo-geo-optimization.spec.js` en verde.
