# Feature Specification: 009 - Privacy Policy & Personal Data Compliance
**Feature ID:** `009_privacy_and_data_compliance`  
**Estado:** DRAFT / PENDING REVIEW  
**Autor:** Antigravity (Lead AI Solutions Architect)  
**Metodología:** SDD (EARS Notation - Easy Approach to Requirements Syntax)  
**Documento Fuente:** [`AGENTS.md`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/AGENTS.md)

---

## 1. Resumen Ejecutivo y Alcance
Esta especificación define la arquitectura e implementación del marco de cumplimiento normativo en protección de datos personales de Constructora Cuatropuntas SpA, en estricto apego a la Ley N° 19.628 sobre Protección de la Vida Privada (Chile).

### Contexto y Problema
El sitio web captura datos de contacto sensibles (nombre, correo, teléfono celular chileno, comuna y características de propiedad) en dos puntos neurálgicos de captación:
1. El cotizador multi-paso ([`public/quote-wizard.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/quote-wizard.js)).
2. El sistema de comentarios y lead capture del blog ([`public/blog-comments.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/blog-comments.js)).

Actualmente, no existe una página canónica dedicada e independiente en `/privacidad` (la información estaba subsumida en una sección genérica dentro de `politicas.html`), el cotizador carece de un micro-copy de consentimiento explícito en el paso final de contacto y el checkbox comercial del blog no vincula directamente al documento legal.

### Objetivo
1. Crear la página legal canónica [`public/privacidad.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/privacidad.html) con el diseño institucional oficial de Cuatropuntas (Navbar, Footer, Tailwind CSS), detallando:
   - Identificación del responsable (Constructora Cuatropuntas SpA, Santiago, Chile).
   - Datos capturados y finalidades legítimas de cotización y visitas a terreno.
   - Protocolos de seguridad (HTTPS, almacenamiento cifrado, cero venta a terceros).
   - Procedimiento transparente para el ejercicio de **Derechos ARCO** (Acceso, Rectificación, Cancelación y Oposición) vía `contacto@cuatropuntas.com`.
2. Integrar micro-copy de consentimiento informado en el Paso 3 de contacto del cotizador modular (`public/quote-wizard.js`).
3. Actualizar el checkbox comercial en el componente de comentarios del blog (`public/blog-comments.js`) vinculando formalmente a `/privacidad`.
4. Añadir el enlace `"Privacidad"` en el pie de página de `public/index.html` y en la plantilla de generación de artículos en `scripts/publish-blog.js`.
5. Certificar todo el ecosistema mediante una nueva suite de pruebas automatizadas en Playwright ([`tests/privacy-compliance.spec.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/tests/privacy-compliance.spec.js)).

---

## 2. Requisitos del Sistema (Notación EARS)

### 2.1. Ubiquitous Requirements (Requisitos Generales del Sistema)
* **REQ-UBI-01 [Página Canónica de Privacidad]:** El archivo [`public/privacidad.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/privacidad.html) DEBE existir físicamente, ser accesible vía URL `/privacidad` (y `/privacidad.html`), estructurado con HTML5 semántico válido y responder con código HTTP 200.
* **REQ-UBI-02 [Identificación Institucional]:** La política de privacidad DEBE identificar explícitamente a **Constructora Cuatropuntas SpA** como responsable del tratamiento, con domicilio en Santiago, Región Metropolitana, Chile, y canal de atención formal en `contacto@cuatropuntas.com`.
* **REQ-UBI-03 [Cláusula ARCO]:** La política de privacidad DEBE contener un apartado específico que detalle los derechos **ARCO** (Acceso, Rectificación, Cancelación y Oposición) conforme a la Ley N° 19.628 de Chile, indicando los plazos y el procedimiento formal para ejercerlos vía correo electrónico.
* **REQ-UBI-04 [Higiene de Canales Oficiales]:** Todos los enlaces y metadatos de contacto en la página de privacidad DEBEN respetar la SSOT de telefonía (`+56 9 2738 4075`) y agendamiento (`https://cal.com/cuatropuntas.com/visita-tecnica`), prohibiendo cualquier número obsoleto.

### 2.2. Event-Driven & State-Driven Requirements (Comportamiento Específico por Componente)

#### Cotizador Modular ([`public/quote-wizard.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/quote-wizard.js))
* **REQ-EVT-01 [Micro-copy de Consentimiento]:** CUANDO el usuario se encuentre en el Paso 3 (`#step3`) del cotizador, el formulario DEBE renderizar una cláusula legal informativa visible antes del botón `#quoteSubmitBtn`:
  ```text
  Al solicitar tu presupuesto, aceptas el tratamiento de tus datos para coordinar el contacto técnico conforme a nuestra Política de Privacidad.
  ```
  donte el texto `"Política de Privacidad"` sea un hipervínculo que abra `/privacidad` en una nueva pestaña (`target="_blank"`).

#### Comentarios del Blog ([`public/blog-comments.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/blog-comments.js))
* **REQ-EVT-02 [Vínculo en Checkbox Comercial]:** CUANDO se renderice el formulario manual de autenticación (`#comment-manual-auth-form`), el label asociado a `#comment-marketing-consent` DEBE contener un enlace explícito a `/privacidad`:
  ```text
  Acepto recibir novedades técnicas y estimaciones de costos conforme a la Política de Privacidad.
  ```

#### Navegación y Footers
* **REQ-EVT-03 [Footer de Portada]:** CUANDO se renderice el pie de página de `public/index.html`, la sección de enlaces legales DEBE incluir el enlace canónico a `/privacidad`.
* **REQ-EVT-04 [Plantilla de Publicación de Blog]:** CUANDO `scripts/publish-blog.js` compile un nuevo artículo de blog, el pie de página generado DEBE incluir un enlace operativo a `/privacidad`.

### 2.3. Unwanted Behavior Requirements (Comportamientos Prohibidos)
* **REQ-ERR-01 [No Regresión de Términos]:** NO SE DEBE eliminar ni alterar la validez del archivo [`public/politicas.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/politicas.html), el cual continuará sirviendo como repositorio de Términos y Condiciones generales y aviso de cookies.
* **REQ-ERR-02 [No Bloqueo en Formulario]:** La adición de la leyenda legal en el cotizador NO DEBE alterar la validación técnica de campos ni interferir con la máquina de estados de `nextStep()` ni con el despacho hacia `POST /api/quote`.
* **REQ-ERR-03 [Prohibición de Venta de Datos]:** La política DEBE declarar de manera terminante e inequívoca que Cuatropuntas SpA jamás comercializará, transferirá ni cederá datos personales a terceros con fines publicitarios o comerciales ajenos a la obra contratada.

---

## 3. Criterios de Aceptación Técnicos
1. **Suite Automatizada (`tests/privacy-compliance.spec.js`):**
   - Comprueba existencia física y contenido de `public/privacidad.html` (menciones de "Constructora Cuatropuntas SpA", "Ley N° 19.628", "ARCO", "Acceso", "Rectificación", "Cancelación", "Oposición", "contacto@cuatropuntas.com").
   - Comprueba que el cotizador modular renderiza el micro-copy con el enlace `/privacidad`.
   - Comprueba que el componente de comentarios del blog renderiza el enlace a `/privacidad`.
   - Comprueba que el footer de `public/index.html` posee el enlace funcional hacia `/privacidad`.
2. **Suite Global sin Regresiones:**
   - Los 68 tests existentes de Playwright deben continuar pasando al 100% en verde (total proyectado: 72+ tests).
3. **Validación Sintáctica:**
   - `node -c public/quote-wizard.js` y `node -c public/blog-comments.js` retornan código 0.
