# Plan Técnico de Arquitectura: Spec 015 - Asistente Conversacional como SDR de Embudo y Derivación al Cotizador
**Feature ID:** `015_conversational_sdr_funnel`  
**Estado:** APPROVED / IMPLEMENTED  

---

## 1. Arquitectura del Flujo SDR y Derivación Conversacional

```text
               ┌────────────────────────────────────────────────────────┐
               │    Mensaje Entrante del Usuario (WhatsApp o Web Chat)  │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │  Evaluación de Intención & Detección de Casos Especiales│
               ├────────────────────────────────────────────────────────┤
               │  A) ¿Menciona correo, campaña o promoción desconocida? │
               │     ──► PROTOCOLO DE SALIDA ELEGANTE (Graceful Pivot)   │
               │     Respuesta oficial fija derivando al Cotizador      │
               │                                                        │
               │  B) ¿Consulta técnica / comercial de catálogo?         │
               │     ──► ESTRUCTURA SDR EN 3 PASOS                      │
               │     1. Respuesta concreta (2-3 líneas, SSOT AGENTS.md) │
               │     2. Puente (justificar dimensionamiento exacto)     │
               │     3. CTA obligatorio con enlace canónico al cotizador│
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │         Entrega del Enlace Canónico Contextual         │
               ├────────────────────────────────────────────────────────┤
               │ • Cotizador: https://www.cuatropuntas.com/#cotizador   │
               │ • Fichas por servicio (casas, ampliación, etc.)        │
               │ • Formato WhatsApp: URL plana + negrita con *asterisco*│
               │ • Formato Web Chat: Enlace interactivo con ancla       │
               └────────────────────────────────────────────────────────┘
```

---

## 2. Modificaciones Detalladas por Módulo

### 2.1. Backend WhatsApp: `api/whatsapp.js`
1. **Regla de 3 Pasos en System Instruction:**
   - Inyectar sección explícita:
     ```markdown
     ### ESTRUCTURA OBLIGATORIA DE RESPUESTA SDR (3 PASOS):
     1. PASO 1 (Respuesta Concreta): Responde la duda técnica o de precio en máximo 2 a 3 líneas apoyándote en la Matriz Oficial.
     2. PASO 2 (Puente Comercial): Explica que para un valor real es imprescindible dimensionar m², comuna y requerimientos de la propiedad.
     3. PASO 3 (Llamado a la Acción Canónico): Concluye invitando siempre a calcular la referencia preliminar en el cotizador oficial: https://www.cuatropuntas.com/#cotizador
     ```
2. **Protocolo de Salida Elegante (*Graceful Pivot*):**
   - Incorporar directriz taxativa para correos, promociones o dudas no catalogadas:
     ```markdown
     ### PROTOCOLO DE SALIDA ELEGANTE (GRACEFUL PIVOT ANTE EMAILS O DUDAS FUERA DE CATÁLOGO):
     Si el cliente menciona que le llegó un correo, pregunta por promociones de email marketing o plantea situaciones no especificadas en la matriz:
     - NUNCA digas "no sé", "no tengo esa información" ni inventes acuerdos.
     - Aplica esta respuesta oficial de pivote:
       "Para revisar en detalle lo que conversaste o recibiste por correo y aplicar las condiciones exactas a tu proyecto, te invito a generar tu presupuesto preliminar en nuestro cotizador: https://www.cuatropuntas.com/#cotizador. Con esos datos, nuestro equipo técnico y de ventas toma tu requerimiento de inmediato para coordinar la visita a terreno."
     ```
3. **Mapa de URLs Canónicas:**
   - Explicitar las 7 rutas oficiales de navegación y cotización en el prompt.

### 2.2. Backend Web Chat: `api/chat.js`
1. **Sincronización de System Instruction:**
   - Homologar con la regla de 3 pasos y el protocolo de salida elegante de `api/whatsapp.js`.
   - Mantener el renderizado de enlaces interactivos orientados a la navegación en el sitio.
2. **Mapa de URLs Canónicas:**
   - Inyectar la matriz canónica idéntica para asegurar total consistencia entre canales.

### 2.3. Frontend & Navegación: `public/index.html`
1. **Soporte de Ancla `#cotizador`:**
   - En `public/index.html`, la sección del cotizador modular actualmente porta `id="contacto"`.
   - Incorporar el identificador `id="cotizador"` sobre el contenedor para garantizar que `https://www.cuatropuntas.com/#cotizador` desplace al usuario directamente al formulario.

---

## 3. Plan de Verificación Automatizada (`tests/conversational-sdr.spec.js`)

Se creará una suite con los siguientes contratos ejecutables:
1. **T01.1 (Estructura de System Prompt en `api/whatsapp.js`):**
   - Verificar presencia de la regla de 3 pasos (Respuesta Concreta, Puente, CTA).
   - Verificar inclusión de la cláusula y tenor literal del Graceful Pivot.
   - Verificar presencia de las 7 URLs canónicas oficiales.
2. **T01.2 (Estructura de System Prompt en `api/chat.js`):**
   - Verificar presencia de la regla de 3 pasos y la derivación canónica al cotizador.
   - Verificar inclusión de la cláusula de Graceful Pivot.
   - Verificar presencia del mapa de URLs canónicas.
3. **T01.3 (Ancla `#cotizador` en `public/index.html`):**
   - Verificar mediante Playwright que `index.html#cotizador` existe en el DOM y ubica al usuario sobre el Wizard.
4. **T01.4 (Preservación de Políticas Blindadas Specs 011, 013, 014):**
   - Verificar que ambos prompts mantienen activas las restricciones de quinchos (redes sanitarias excluidas), baños/cocinas (partidas cerradas) y contrato a suma alzada (Art. 18 LGUC).
5. **T01.5 (Cero Regresiones):**
   - Ejecución de `npx playwright test` sobre la totalidad de la suite (93 tests preexistentes + suite nueva).
