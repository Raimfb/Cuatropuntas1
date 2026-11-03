# Tareas Técnicas 027: Publicador Automatizado en Facebook con Tarjetas Visuales (Estilo Radio Bío Bío)
**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-03  

---

## Desglose de Tareas de Ejecución

- [x] **Tarea 1: Generador Gráfico Estilo Radio Bío Bío (Pillow)**
  - [x] 1.1 Crear `scripts/generate-facebook-card.py` con soporte multiplataforma de fuentes y centrado de imagen.
  - [x] 1.2 Integrar `public/logo.png` en el footer junto con `cuatropuntas.com`.
  - [x] 1.3 Añadir algoritmo de extracción de palabras clave para resaltado en color cyan/naranja.
  - [x] 1.4 Crear directorio de salida `public/blog/social/` para almacenar las tarjetas procesadas.

- [x] **Tarea 2: Orquestador y Publicador en Facebook (Meta Graph API)**
  - [x] 2.1 Crear `content/social/facebook-feed-history.json` como registro persistente de publicaciones.
  - [x] 2.2 Crear `scripts/publish-facebook.js` con soporte para `--mode=tuesday-backlog`, `--mode=friday-new`, `--slug=<slug>` y `--dry-run`.
  - [x] 2.3 Implementar subida multipart / URL a `POST /v21.0/${FB_PAGE_ID}/photos` usando el token permanente (`expires_at: 0`).
  - [x] 2.4 Generar copy persuasivo minimalista (1-2 oraciones de expectativa + enlace canónico al blog + WhatsApp SSOT).

- [x] **Tarea 3: Automatización de Flujos y GitHub Actions**
  - [x] 3.1 Actualizar `.github/workflows/weekly-blog.yml` para disparar `scripts/publish-facebook.js --mode=friday-new` tras la compilación exitosa.
  - [x] 3.2 Crear `.github/workflows/facebook-backlog.yml` para ejecutar el backlog los días martes a las 14:00 UTC (11:00 AM Chile).
  - [x] 3.3 Documentar los secrets necesarios en GitHub (`FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`).

- [x] **Tarea 4: Verificación Automatizada & Despliegue**
  - [x] 4.1 Crear suite de pruebas `tests/facebook-publisher.spec.js`.
  - [x] 4.2 Ejecutar pruebas locales y verificar generación de tarjeta y resolución de cola (17/17 tests globales en verde).
  - [x] 4.3 Ejecutar verificación de sintaxis (`node -c`, `python -m py_compile`).
  - [x] 4.4 Realizar commit en Git, push a `origin/main` y desplegar en producción.
