# Especificación de Requerimientos: Spec 005 - Sistema de Comentarios y Captura de Leads para Email Marketing
**Feature ID:** `005_blog_comments_and_leads`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** PENDING APPROVAL  

---

## 1. Resumen Ejecutivo y Propósito
Convertir la sección inferior de cada artículo del blog de Constructora Cuatropuntas SpA en un motor de interacción comunitaria y captura calificada de prospectos para Email Marketing (Lead Magnet). El sistema restringe la publicación de comentarios exclusivamente a usuarios identificados mediante autenticación dual (Google Identity Services "Continuar con Google" o formulario alternativo Nombre + Email con consentimiento de comunicaciones comerciales). Cada interacción registrada se persiste de forma no bloqueante (fail-safe con timeout de 3.5s) en Google Sheets (pestaña `suscriptores_blog`) y se publica en el post tras sanitización estricta contra ataques Cross-Site Scripting (XSS).

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Requerimientos Ubicuos (Ubiquitous Requirements)
- **UB-01 (Gating de Conversión y Acceso Exclusivo):** El sistema **deberá** exigir que todo usuario esté plenamente identificado y suscrito antes de permitirle redactar y publicar un comentario en cualquier artículo del blog.
- **UB-02 (Cumplimiento de Marca y SSOT de Canales):** Todo elemento del widget y respuestas oficiales de la empresa **deberán** cumplir con las directrices de `AGENTS.md`:
  * Cero menciones al número purgado `63482439`.
  * Canal oficial de WhatsApp: `+56 9 2738 4075` (`https://wa.me/56927384075`).
  * Enlace oficial de agendamiento: `https://cal.com/cuatropuntas.com/visita-tecnica`.
- **UB-03 (Sanitización Estricta contra XSS):** El sistema **deberá** escapar y neutralizar todo carácter especial potencialmente peligroso (`<`, `>`, `&`, `"`, `'`, `/`) en nombres y textos de comentarios antes de almacenarlos o renderizarlos en el navegador.
- **UB-04 (Captura para Email Marketing):** El sistema **deberá** registrar los datos del suscriptor (`nombre`, `email`, `auth_provider`, `post_slug`, `fecha`) como lead activo para campañas informativas y boletines de costos habitacionales en Santiago.
- **UB-05 (Integración Canónica en el Blog):** El compilador `scripts/publish-blog.js` **deberá** incluir automáticamente el contenedor `<div id="blog-comments-container" data-slug="${postData.slug}"></div>` y el script del widget en todos los artículos generados.

### 2.2. Requerimientos Basados en Eventos (Event-Driven Requirements)
- **EV-01 (Autenticación con Google Identity Services):** **Cuando** el usuario haga clic en el botón oficial "Continuar con Google" y autorice sus credenciales, el sistema **deberá** decodificar de forma segura el ID Token JWT (`name`, `email`, `picture`), persistir la sesión localmente y desbloquear la interfaz activa de comentarios.
- **EV-02 (Identificación Alternativa con Formulario Tradicional):** **Cuando** el usuario opte por registrarse manualmente mediante Nombre + Email, el sistema **deberá** validar la estructura del correo, exigir la aceptación explícita de comunicaciones comerciales y desbloquear el formulario de comentarios.
- **EV-03 (Publicación de Comentario - POST /api/blog-comments):** **Cuando** un usuario autenticado envíe su comentario, el sistema **deberá**:
  1. Validar la integridad de los datos (longitud mínima 10 caracteres, máxima 1.000).
  2. Ejecutar filtros anti-spam y honeypots de `api/_botGuard.js`.
  3. Despachar el registro a Google Sheets con timeout estricto de 3.5 segundos.
  4. Almacenar el comentario en el catálogo público asociado al `slug`.
  5. Retornar el comentario sanitizado para inserción reactiva inmediata en la vista.
- **EV-04 (Consulta de Comentarios - GET /api/blog-comments?slug=[slug]):** **Cuando** el navegador cargue la página de un post, el widget **deberá** consultar los comentarios existentes asociados al `slug` y renderizarlos ordenados cronológicamente.
- **EV-05 (Cierre de Sesión / Cambio de Usuario):** **Cuando** el usuario haga clic en "Cambiar usuario" o "Cerrar sesión", el sistema **deberá** purgar la sesión local y retornar al estado de invitación/bloqueado.

### 2.3. Requerimientos de Estado (State-Driven Requirements)
- **ST-01 (Estado Bloqueado / Invitación a Suscribirse):** **Mientras** el usuario no se encuentre identificado, el widget **deberá** mostrar el mensaje persuasivo ("*Únete a la conversación técnica. Identifícate para dejar tu consulta a nuestros constructores y recibir novedades de costos en Santiago*"), el botón oficial de Google y el formulario alternativo.
- **ST-02 (Estado Activo de Redacción):** **Mientras** el usuario tenga una sesión válida, el widget **deberá** mostrar su tarjeta de perfil (avatar/inicial, nombre, email), el campo de texto con contador dinámico de caracteres y el botón "Publicar Consulta".
- **ST-03 (Estado de Envío en Progreso):** **Mientras** la solicitud `POST` esté en vuelo, el widget **deberá** deshabilitar el botón de envío y desplegar un indicador visual de carga (spinner o texto "Publicando...").

### 2.4. Requerimientos No Deseados y Fallbacks (Unwanted Behavior / Fail-Safe)
- **UN-01 (Fallo o Timeout en Google Sheets):** **Si** el webhook de Google Sheets no responde antes de 3.5 segundos o devuelve un código de error HTTP, el endpoint **deberá** registrar la advertencia en consola pero completar con éxito el almacenamiento público del comentario sin arrojar error al usuario.
- **UN-02 (Detección de Bots o Envío Ultrarrápido):** **Si** la solicitud activa honeypots o proviene de patrones identificados por `_botGuard.js`, el backend **deberá** responder con HTTP 200 simulado o descartar el registro sin almacenarlo en la base ni en Sheets.
- **UN-03 (Bloqueo de Scripts de Terceros / Adblockers):** **Si** la librería de Google Identity Services es bloqueada por el navegador del usuario o falla la red externa, el widget **deberá** mantener 100% visible y operativo el formulario alternativo (Nombre + Email) sin romper la página.
- **UN-04 (Intento de Comentario Vacío o Corto):** **Si** el usuario intenta enviar un texto inferior a 10 caracteres o compuesto solo de espacios en blanco, el frontend y backend **deberán** rechazar la acción con un mensaje de validación descriptivo.

---

## 3. Criterios de Aceptación Técnicos
1. El archivo `api/blog-comments.js` exporta un handler serverless compatible con Vercel que procesa `GET` y `POST` con código de sintaxis 0 (`node -c api/blog-comments.js`).
2. El componente `public/blog-comments.js` se monta de forma autónoma en `#blog-comments-container`, inicializa Google Identity Services si está disponible y provee fallback limpio a formulario manual.
3. La persistencia en Google Sheets implementa `AbortController` con timeout de 3.500 ms idéntico al patrón probado en `api/quote.js`.
4. El compilador `scripts/publish-blog.js` inyecta automáticamente el contenedor de comentarios y los scripts en cada nuevo artículo generado.
5. Los 8 artículos preexistentes en `public/blog/posts/` incorporan el contenedor y script de comentarios.
6. La suite de pruebas Playwright `tests/blog-comments.spec.js` valida el renderizado, validación de campos, prevención XSS, simulación de autenticación y resiliencia de endpoints.
