# Especificación de Requerimientos: Spec 015 - Asistente Conversacional como SDR de Embudo y Derivación al Cotizador
**Feature ID:** `015_conversational_sdr_funnel`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Problema Comercial

Los asistentes conversacionales de Constructora Cuatropuntas SpA operan en dos canales principales:
1. **WhatsApp Meta Cloud API (`api/whatsapp.js`):** Canal de captura para prospectos móviles (`+56 9 2738 4075`).
2. **Web / Agent Chat (`api/chat.js`):** Canal interactivo para visitantes web y agentes autónomos.

Actualmente, ambos bots corren el riesgo de transformarse en "enciclopedias abiertas" que entregan consultas técnicas interminables sin guiar activamente al prospecto hacia la conversión comercial. Su KPI primordial de negocio no es responder infinitamente en el chat, sino operar como un **Sales Development Representative (SDR) de embudo**:
- Filtrar la viabilidad (terreno/propiedad en la RM).
- Responder con concisión técnica de alto valor apoyándose en el SSOT de `AGENTS.md`.
- **Derivar de forma obligatoria y sistemática al Cotizador Web (`https://www.cuatropuntas.com/#cotizador`)** para que el prospecto configure su proyecto, capturemos sus datos en el CRM (Google Sheets) y agende la Visita Técnica en terreno.

Adicionalmente, cuando un usuario menciona que recibió un correo de email marketing, pregunta por una campaña promocional anterior o plantea una consulta fuera de catálogo, el bot no debe responder "no tengo esa información" ni inventar condiciones; debe ejecutar un **Protocolo de Salida Elegante (*Graceful Pivot*)** que redirija hacia el cotizador como paso estructurado para que el equipo humano revise su caso.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Requerimientos Ubicuos (Ubiquitous Requirements)

- **[EARS-015-01] Estructura de Respuesta en 3 Pasos (Regla SDR Obligatoria):** En toda respuesta comercial o técnica sobre proyectos de construcción, el sistema **DEBE** estructurar la interacción siguiendo estrictamente la regla de 3 pasos:
  * **Paso 1 (Respuesta Concreta):** Resolver la duda en máximo 2 a 3 líneas apoyándose en los parámetros de la matriz oficial de precios (`AGENTS.md`).
  * **Paso 2 (Puente de Calificación / Bridge):** Justificar técnicamente la necesidad de dimensionar la superficie, comuna y sistema constructivo en valores reales antes de especular.
  * **Paso 3 (Llamado a la Acción / CTA Canónico):** Proveer el enlace directo al cotizador web oficial (`https://www.cuatropuntas.com/#cotizador`) para emitir la estimación referencial con ficha PDF.

- **[EARS-015-02] Mapa de Rutas Canónicas en System Prompt:** El sistema **DEBE** incorporar en los prompts de contexto tanto de `api/whatsapp.js` como de `api/chat.js` el mapa oficial de URLs canónicas de Cuatropuntas:
  * Cotizador oficial: `https://www.cuatropuntas.com/#cotizador`
  * Casas Nuevas (desde 19 UF/m²): `https://www.cuatropuntas.com/servicios/casas-nuevas.html`
  * Segundos Pisos (desde 22 UF/m²): `https://www.cuatropuntas.com/servicios/segundos-pisos.html`
  * Remodelaciones (11 UF/m² base; 75 UF baño, 110 UF cocina): `https://www.cuatropuntas.com/servicios/remodelaciones.html`
  * Quinchos (12 y 15 UF/m² base; estructura, parrilla elevable, campana): `https://www.cuatropuntas.com/servicios/quinchos.html`
  * Precios y Estándar Térmico: `https://www.cuatropuntas.com/precios.html`
  * Agendamiento Directo: `https://cal.com/cuatropuntas.com/visita-tecnica`

- **[EARS-015-03] Blindaje de Políticas Previas (Specs 011, 013 y 014):** El sistema **DEBE** preservar en todo momento:
  * Cero promesas de habitabilidad ininterrumpida en segundos pisos ni aprobaciones DOM garantizadas.
  * Respaldo legal bajo el Art. 18 de la LGUC y modalidad de contrato cerrado a suma alzada con itemizado.
  * Discriminación de recintos húmedos (baños 65-95 UF, cocinas 90-160 UF) sin tarificar por metro cuadrado lineal.
  * Exclusión taxativa de empalmes sanitarios (agua/desagüe), canalización eléctrica y muebles cerrados en el quincho base.

### 2.2. Requerimientos Basados en Eventos (Event-Driven Requirements)

- **[EARS-015-04] Protocolo de Salida Elegante (*Graceful Pivot*):** **Cuando** el usuario mencione que recibió un correo electrónico, consulte por promociones o campañas pasadas, o plantee dudas que escapen al catálogo oficial, el sistema **DEBE** abstenerse de declarar ignorancia ("no sé", "no tengo datos") o inventar condiciones, y responder con el tenor oficial de pivote:
  > *"Para revisar en detalle lo que conversaste o recibiste por correo y aplicar las condiciones exactas a tu proyecto, te invito a generar tu presupuesto preliminar en nuestro cotizador: https://www.cuatropuntas.com/#cotizador. Con esos datos, nuestro equipo técnico y de ventas toma tu requerimiento de inmediato para coordinar la visita a terreno."*

- **[EARS-015-05] Adaptación de Canal para Enlaces:**
  * **En WhatsApp (`api/whatsapp.js`):** El sistema **DEBE** emitir las URLs en texto plano completo (para auto-linking nativo de WhatsApp) y utilizar negritas estrictas con un solo asterisco (`*texto*`).
  * **En Web Chat (`api/chat.js`):** El sistema **DEBE** emitir enlaces con etiquetas clicables que apunten a `https://www.cuatropuntas.com/#cotizador` (o anclas equivalentes).

### 2.3. Requerimientos No Deseados y Manejo de Errores (Fail-Safe)

- **[EARS-015-06] Prevención de Enlaces Huérfanos o Secciones Inexistentes:** **Si** un usuario navega hacia `https://www.cuatropuntas.com/#cotizador`, el documento HTML principal `public/index.html` **DEBE** contar con el ancla identificadora `id="cotizador"` sobre la sección de cotización para asegurar el desplazamiento (scroll) directo y fluido.

---

## 3. Criterios de Aceptación Técnicos

1. `api/whatsapp.js` incluye en su prompt de sistema la regla de 3 pasos (Respuesta Concreta $\to$ Puente $\to$ CTA al cotizador), el mapa canónico de URLs y la cláusula obligatoria de Graceful Pivot.
2. `api/chat.js` incluye en su prompt de sistema la regla de 3 pasos, el mapa canónico de URLs y la cláusula de Graceful Pivot.
3. El ancla `id="cotizador"` está presente en `public/index.html` sobre el cotizador modular.
4. La suite `tests/conversational-sdr.spec.js` valida que ambos módulos incorporen:
   - Derivación al cotizador (`#cotizador`).
   - Cláusula de salida elegante ante correos/promociones.
   - Mapa canónico completo de servicios.
   - Respeto a las reglas de quinchos (Spec 014), remodelaciones (Spec 013) y honestidad comercial (Spec 011).
5. La suite global de regresión (`npx playwright test`) conserva 100% de éxito (mínimo 93 tests en verde).
