# Technical Plan: 009 - Privacy Policy & Personal Data Compliance
**Feature ID:** `009_privacy_and_data_compliance`  
**Estado:** DRAFT / PENDING REVIEW  
**Ficheros Objetivo:**  
- [`public/privacidad.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/privacidad.html) (Nueva página legal canónica)
- [`public/quote-wizard.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/quote-wizard.js) (Micro-copy de consentimiento en Paso 3)
- [`public/blog-comments.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/blog-comments.js) (Hipervínculo a privacidad en checkbox comercial)
- [`public/index.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/index.html) (Enlace en barra de pie de página)
- [`scripts/publish-blog.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/scripts/publish-blog.js) (Enlace en footer de plantilla canónica de posts)
- [`tests/privacy-compliance.spec.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/tests/privacy-compliance.spec.js) (Nueva suite de pruebas automatizadas)

---

## 1. Arquitectura de `public/privacidad.html`

### 1.1. Especificación del Layout y Metadatos
* **Doctype y Head:** HTML5, UTF-8, `es-CL`, viewport responsive, Tailwind CSS, fuentes Inter y Playfair Display.
* **Canonical URL:** `https://www.cuatropuntas.com/privacidad`.
* **Title:** `Política de Privacidad y Protección de Datos Personales | Cuatropuntas SpA`.
* **Description:** `Conoce la política de privacidad, tratamiento de datos personales y ejercicio de derechos ARCO de Constructora Cuatropuntas SpA en Santiago de Chile.`.
* **Estructura Semántica:**
  - `<nav>` oficial con logo SVG/picture, menú de servicios, precios, blog y CTA cotizar.
  - `<main>` con contenedor centrado (`max-w-4xl mx-auto px-4 py-16`), tarjetas de contenido con bordes suaves y tipografía legible.
  - `<footer>` con copyright institucional y enlaces legales.

### 1.2. Secciones Normativas Obligatorias
1. **Identificación del Responsable:**
   - Razón Social: Constructora Cuatropuntas SpA.
   - Domicilio: Santiago, Región Metropolitana, Chile.
   - Correo electrónico de privacidad: `contacto@cuatropuntas.com`.
   - Teléfono oficial: `+56 9 2738 4075`.
2. **Marco Regulatorio:**
   - Ley N° 19.628 sobre Protección de la Vida Privada (Chile).
3. **Datos Personales Recopilados:**
   - En el Cotizador Web: Nombre y apellido, correo electrónico, número de teléfono móvil (+56 9), comuna de la obra, tipo de proyecto, superficie estimada y detalles técnicos.
   - En Comentarios del Blog: Nombre o alias, correo electrónico y consultas técnicas.
   - Navegación técnica y Cookies: Datos técnicos de sesión para prevención de fraudes y anti-bot.
4. **Finalidades Legítimas del Tratamiento:**
   - Confección de presupuestos y estimaciones referenciales en UF/m² y pesos chilenos.
   - Coordinación técnica de visitas a terreno por profesionales de la constructora.
   - Notificaciones de avance de presupuestos y seguimiento de cotizaciones.
   - Novedades técnicas y análisis de costos (únicamente con consentimiento previo).
5. **Seguridad y Confidencialidad:**
   - Tránsito seguro cifrado mediante protocolos HTTPS / TLS.
   - Prohibición estricta de comercialización, cesión o transferencia de bases de datos a terceros.
6. **Procedimiento de Ejercicio de Derechos ARCO:**
   - **Acceso:** Conocer la información almacenada.
   - **Rectificación:** Corregir datos inexactos o incompletos.
   - **Cancelación:** Solicitar la eliminación total de sus registros.
   - **Oposición:** Oponerse al uso de datos para fines no esenciales.
   - *Canal y Plazo:* Solicitud formal a `contacto@cuatropuntas.com` con respuesta en un plazo no superior a 10 días hábiles.
7. **Fecha de Vigencia y Actualizaciones:**
   - Versión oficial actualizada a Septiembre 2026.

---

## 2. Modificaciones en Componentes Frontend

### 2.1. Cotizador Modular (`public/quote-wizard.js`)
* **Ubicación:** Dentro de la función `createWizardHTML(config)` en el contenedor `#step3`.
* **Inserción de Micro-copy:**
  ```javascript
  <p class="text-xs text-gray-500 mt-2 leading-relaxed">
      Al solicitar tu presupuesto, aceptas el tratamiento de tus datos para coordinar el contacto técnico conforme a nuestra <a href="/privacidad" target="_blank" rel="noopener noreferrer" class="text-secondary hover:underline font-medium">Política de Privacidad</a>.
  </p>
  ```

### 2.2. Comentarios del Blog (`public/blog-comments.js`)
* **Ubicación:** Dentro de `renderGateBox()`, modificando el label del checkbox `#comment-marketing-consent`:
  ```javascript
  <label for="comment-marketing-consent" class="text-xs text-gray-600 leading-snug">
      Acepto recibir novedades técnicas y estimaciones de costos conforme a la <a href="/privacidad" target="_blank" rel="noopener noreferrer" class="text-secondary hover:underline font-medium">Política de Privacidad</a>.
  </label>
  ```

### 2.3. Pie de Página (`public/index.html`)
* **Ubicación:** Sección de enlaces legales en el footer (L1030-1035):
  ```html
  <div class="mt-2 space-x-4">
      <a href="/privacidad" class="hover:text-gray-300 transition">Política de Privacidad</a>
      <a href="/politicas" class="hover:text-gray-300 transition">Términos y Condiciones</a>
  </div>
  ```

### 2.4. Plantilla de Publicación de Blog (`scripts/publish-blog.js`)
* **Ubicación:** Footer de la plantilla de posts generados (L644-648):
  ```html
  <footer class="bg-primary text-gray-400 py-12 border-t border-gray-800">
      <div class="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500">
          &copy; 2026 Constructora Cuatropuntas SpA. Todos los derechos reservados. | <a href="/blog/" class="text-secondary hover:underline">Volver al Blog</a> | <a href="/privacidad" class="text-gray-400 hover:text-white transition">Privacidad</a>
      </div>
  </footer>
  ```

---

## 3. Nueva Suite de Pruebas Automatizadas (`tests/privacy-compliance.spec.js`)

Se creará una suite con 4 casos de prueba:
1. **Verificación de `public/privacidad.html`:**
   - Comprueba existencia física en disco.
   - Comprueba carga HTTP 200 / DOM ready.
   - Valida la presencia de `"Constructora Cuatropuntas SpA"`, `"19.628"`, `"ARCO"`, `"Acceso"`, `"Rectificación"`, `"Cancelación"`, `"Oposición"` y `"contacto@cuatropuntas.com"`.
2. **Verificación del Cotizador Modular:**
   - Comprueba que en el paso 3 de `quote-wizard.js` existe el micro-copy y contiene un enlace `a[href*="/privacidad"]`.
3. **Verificación de Comentarios del Blog:**
   - Comprueba que el label del checkbox `#comment-marketing-consent` contiene un enlace `a[href*="/privacidad"]`.
4. **Verificación de Enlaces en Footer de Portada:**
   - Comprueba que el footer de `public/index.html` contiene el enlace hacia `/privacidad`.

---

## 4. Plan de Reversión (Rollback)
Si cualquier prueba falla o se detecta anomalía visual:
- Los cambios en `quote-wizard.js`, `blog-comments.js` e `index.html` son adiciones hiper-localizadas y pueden revertirse quirúrgicamente sin afectar la funcionalidad existente.
- `public/politicas.html` permanece intacto para garantizar compatibilidad total con la suite previa de 68 tests.
