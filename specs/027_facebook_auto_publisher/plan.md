# Plan Técnico 027: Publicador Automatizado en Facebook con Tarjetas Visuales (Estilo Radio Bío Bío)
**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-03  

---

## 1. Arquitectura del Sistema

```text
[Pipeline Automatizado Cuatropuntas]
          │
          ├──> A. Generador Gráfico: scripts/generate-facebook-card.py
          │      ├── Carga portada de public/blog/images/ o fallback
          │      ├── Aplica gradiente oscuro inferior con Pillow
          │      ├── Renderiza titular con palabras resaltadas
          │      ├── Incrusta public/logo.png + cuatropuntas.com
          │      └── Exporta a public/blog/social/[slug].jpg
          │
          ├──> B. Orquestador y Publicador: scripts/publish-facebook.js
          │      ├── Lee public/blog/posts.json
          │      ├── Lee y actualiza content/social/facebook-feed-history.json
          │      ├── Modo Tuesday Backlog: selecciona el más antiguo sin publicar
          │      ├── Modo Friday New: selecciona el artículo recién creado
          │      ├── Construye copy intrigante con enlace canónico
          │      └── Llama a Meta Graph API v21.0: POST /386393411716633/photos
          │
          ├──> C. Automatización GitHub Actions
          │      ├── .github/workflows/facebook-backlog.yml (Martes 14:00 UTC)
          │      └── .github/workflows/weekly-blog.yml (Viernes post-compilación)
          │
          └──> D. Suite de Verificación: tests/facebook-publisher.spec.js
                 ├── Valida resolución y canales de la imagen generada
                 ├── Valida el algoritmo de priorización de la cola
                 └── Valida idempotencia y seguridad ante fin de backlog
```

---

## 2. Componentes y Rutas de Archivos

1. **`scripts/generate-facebook-card.py`:**
   - Script Python autónomo ejecutable por CLI: `python scripts/generate-facebook-card.py <slug> [options]`.
   - Utiliza Pillow (disponible en local y en runner de GitHub Actions).
2. **`scripts/publish-facebook.js`:**
   - Script Node.js con soporte dotenv y Meta Graph API.
   - Parámetros soportados:
     * `--mode=tuesday-backlog`: Toma el siguiente post pendiente del backlog.
     * `--mode=friday-new`: Toma el post más reciente.
     * `--slug=<slug>`: Publica un post específico.
     * `--dry-run`: Genera la tarjeta y el copy sin enviar la petición HTTP a Facebook.
3. **`content/social/facebook-feed-history.json`:**
   - Registro persistente de posts publicados (`slug`, `published_at`, `facebook_photo_id`, `facebook_post_url`).
4. **`tests/facebook-publisher.spec.js`:**
   - Pruebas automatizadas Playwright / Node para verificar generación gráfica y lógica de cola.
