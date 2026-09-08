# Plan Técnico de Arquitectura: Spec 005 - Sistema de Comentarios y Captura de Leads para Email Marketing
**Feature ID:** `005_blog_comments_and_leads`  
**Estado:** PENDING APPROVAL  

---

## 1. Arquitectura General del Sistema

```text
  ┌───────────────────────────────────────────────────────────────────────────┐
  │                           Navegador del Usuario                           │
  │                  (public/blog/posts/[slug].html)                          │
  └─────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                                        ▼
             ┌──────────────────────────────────────────────────────┐
             │       Widget Reactivo: public/blog-comments.js       │
             │   (Montado en <div id="blog-comments-container">)    │
             ├──────────────────────────────────────────────────────┤
             │ 1. Consulta inicial: GET /api/blog-comments?slug=... │
             │ 2. Autenticación Dual (Gating de Leads):             │
             │    a. Google Identity Services (GIS JWT ID Token)    │
             │    b. Formulario tradicional: Nombre + Email + OptIn │
             │ 3. Sesión recordada en localStorage                  │
             │ 4. Formulario de redacción (10 a 1.000 caracteres)   │
             │ 5. Envío reactivo: POST /api/blog-comments           │
             └──────────────────────────┬───────────────────────────┘
                                        │
                                        ▼
             ┌──────────────────────────────────────────────────────┐
             │      API Serverless Vercel: api/blog-comments.js     │
             ├──────────────────────────────────────────────────────┤
             │ 1. Anti-Bot / Honeypot Filter (api/_botGuard.js)     │
             │ 2. Sanitización estricta XSS (HTML escaping)         │
             │ 3. Validación de campos (slug, name, email, comment) │
             └──────────┬────────────────────────────────┬──────────┘
                        │                                │
      Persistencia Leads│(Asíncrona Fail-Safe 3.5s)      │Almacenamiento Público
                        ▼                                ▼
  ┌───────────────────────────┐        ┌───────────────────────────────┐
  │   Google Sheets Webhook   │        │     Catálogo de Comentarios   │
  │ (Pestaña: suscriptores_   │        │   (data/blog-comments.json)   │
  │           blog)           │        │   Retorno JSON al Frontend    │
  └───────────────────────────┘        └───────────────────────────────┘
```

---

## 2. Componentes Técnicos Detallados

### 2.1. Backend Serverless (`api/blog-comments.js`)
- **Métodos Aceptados:** `GET`, `POST`, `OPTIONS`.
- **CORS:** Encabezados permisivos para navegación interna y preflight requests.
- **GET (`/api/blog-comments?slug=[slug]`):**
  * Parámetro `slug` requerido.
  * Lee `data/blog-comments.json`. Si no existe el archivo, retorna colección vacía `[]`.
  * Filtra comentarios por `slug`, ordenados cronológicamente descendente (más recientes primero).
  * Retorna `{ success: true, count: N, comments: [...] }`.
- **POST (`/api/blog-comments`):**
  * **Payload entrante:**
    ```json
    {
      "slug": "guia-precios-construccion-chile",
      "name": "Ignacio Pérez",
      "email": "ignacio@ejemplo.cl",
      "comment": "¿Cuánto varía el costo si el terreno tiene pendiente moderada?",
      "auth_provider": "google", // o "email"
      "picture": "https://...", // opcional de Google
      "opt_in": true,
      "website_url": "", // honeypot
      "_hp_check": ""    // honeypot
    }
    ```
  * **Filtro Anti-Bot:**
    * Evalúa `isBotSubmission(req.body)` con el motor existente en `api/_botGuard.js`. Si es bot, retorna HTTP 200 silencioso.
  * **Validación Semántica:**
    * `slug`: texto no vacío alfanumérico con guiones.
    * `name`: entre 2 y 80 caracteres, validado con `validateName`.
    * `email`: formato válido de correo, validado con `validateEmail`.
    * `comment`: texto recortado de entre 10 y 1.000 caracteres.
    * `auth_provider`: `'google'` | `'email'`.
  * **Sanitización Anti-XSS:**
    * Función `escapeHtml(str)` que convierte `&`, `<`, `>`, `"`, `'`, `/` en entidades seguras (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#x27;`, `&#x2F;`).
  * **Persistencia Fail-Safe en Google Sheets:**
    * Invoca función `persistCommentLeadToGoogleSheets(leadData)` con `fetch` nativo y `AbortController` (timeout 3.500 ms).
    * Estructura de fila para pestaña `suscriptores_blog`:
      - `timestamp`: ISO String.
      - `fecha_hora_chile`: Fecha formateada en zona `America/Santiago`.
      - `tipo`: `"Comentario Blog"`.
      - `nombre`: Nombre del usuario.
      - `email`: Correo electrónico.
      - `auth_provider`: `'google'` o `'email'`.
      - `post_slug`: Slug del artículo comentado.
      - `comentario`: Texto del comentario.
      - `opt_in`: `true` (Aceptación de novedades de costos).
      - `origen`: `"Blog Post Cuatropuntas"`.
    * En caso de fallo o timeout de red en Google Sheets, registra `console.warn` y continúa el flujo sin bloquear al usuario.
  * **Almacenamiento Local / Catálogo:**
    * Guarda el nuevo comentario en `data/blog-comments.json` con id único (`crypto.randomUUID()`), fecha ISO, nombre sanitizado, avatar/picture, y contenido sanitizado.
    * Retorna HTTP 201 `{ success: true, message: "Comentario publicado con éxito", comment: newComment }`.

---

### 2.2. Componente Frontend (`public/blog-comments.js`)
- **Montaje Autónomo:**
  * Busca el contenedor `<div id="blog-comments-container">`.
  * Extrae el atributo `data-slug` del contenedor (o lo infiere de `window.location.pathname`).
- **Gestión de Identidad y Sesión (Lead Gating):**
  * Verifica `localStorage.getItem('cuatropuntas_blog_user')`.
  * Si existe sesión: renderiza directamente el **Estado Autenticado**.
  * Si no existe sesión: renderiza el **Estado Bloqueado / Invitación**.
- **Integración con Google Identity Services (GIS):**
  * Incluye llamada a `google.accounts.id.initialize`:
    - `client_id`: Configurable vía atributo `data-google-client-id` o meta tag, con fallback a botón simulado para pruebas locales.
    - `callback`: Función `handleGoogleCredentialResponse(response)`.
  * Decodificación de ID Token JWT:
    - Parser nativo client-side de Base64Url que extrae `name`, `email`, `picture`.
    - Almacena en `localStorage` y actualiza inmediatamente la UI a **Estado Autenticado**.
- **Formulario Alternativo Tradicional:**
  * Para usuarios sin cuenta de Google o con bloqueadores de scripts:
    - Campos: Nombre completo, Correo electrónico.
    - Checkbox obligatorio: *"Acepto recibir novedades técnicas y presupuestos de Cuatropuntas"*.
    - Al enviar: valida inputs, guarda sesión local `{ name, email, auth_provider: 'email' }` y desbloquea el formulario de comentario.
- **Formulario de Comentario Activo:**
  * Muestra tarjeta con avatar del usuario, nombre y botón sutil *"Cambiar usuario"*.
  * Textarea con placeholder técnico y contador de caracteres `10 / 1000`.
  * Campo trampa honeypot invisible.
  * Botón de envío con feedback interactivo (spinner / texto "Publicando...").
- **Visualización de Lista de Comentarios:**
  * Renderiza comentarios existentes con avatar/inicial con inicial en círculo terracota (`#c05621`), nombre de usuario, fecha legible en español ("Hace X días" o formato "8 Sep 2026") y texto del comentario.
  * Si el autor contiene `"Cuatropuntas"`, muestra badge especial `"Equipo Técnico Cuatropuntas"`.
  * Lista vacía: Estado ilustrado motivador *"Aún no hay consultas en este artículo. ¡Sé el primero en preguntar a nuestros constructores!"*.

---

### 2.3. Sincronización Canónica con `scripts/publish-blog.js`
- Modificación de la función canónica `generatePostHtml`:
  * Inserción del contenedor de comentarios antes del pie de página del artículo:
    ```html
    <!-- Sección de Comentarios & Comunidad -->
    <div id="blog-comments-container" data-slug="${postData.slug}" class="mt-14 pt-10 border-t border-gray-200"></div>
    ```
  * Inclusión del script Google Identity Services:
    ```html
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script src="/blog-comments.js" defer></script>
    ```
- Migración retroactiva: Script o paso para inyectar este bloque en los 8 artículos existentes en `public/blog/posts/`.

---

### 2.4. Suite de Pruebas Automatizadas (`tests/blog-comments.spec.js`)
- **Test 1: Estructura y Renderizado Frontend**
  * Montaje de `#blog-comments-container` en un post de blog.
  * Presencia del copy persuasivo de lead magnet.
  * Presencia del botón de Google y formulario alternativo.
- **Test 2: Flujo de Identificación y Gating**
  * Validación de formulario alternativo (bloqueo si faltan campos o email inválido).
  * Simulación de login con Google / credenciales.
  * Transición de Estado Bloqueado a Estado Activo con perfil del usuario.
- **Test 3: Validación y Publicación de Comentario (Frontend + Mock API)**
  * Validación de longitud mínima (10 caracteres) y máxima (1000).
  * Envío exitoso e inserción reactiva inmediata en la lista de comentarios.
- **Test 4: Endpoint Serverless `api/blog-comments.js`**
  * `GET /api/blog-comments?slug=...` retorna lista de comentarios.
  * `POST /api/blog-comments` valida campos obligatorios y formato.
  * Sanitización anti-XSS (neutralización de `<script>alert(1)</script>`).
  * Detección y bloqueo de honeypots (`isBotSubmission`).
- **Test 5: Resiliencia de Persistencia Google Sheets**
  * Comportamiento fail-safe ante webhook caído o timeout de 3.5s (el comentario se guarda y retorna éxito sin romper el endpoint).
