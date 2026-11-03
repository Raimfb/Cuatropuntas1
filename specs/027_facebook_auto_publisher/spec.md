# Especificación 027: Publicador Automatizado en Facebook con Tarjetas Visuales (Estilo Radio Bío Bío)
**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Fecha:** 2026-11-03  
**Estado:** Aprobado / En Ejecución  

---

## 1. Contexto y Objetivos de Negocio
Constructora Cuatropuntas SpA cuenta con una biblioteca técnica de 17 artículos en su blog y un generador semanal automático en GitHub Actions. Sin embargo, este contenido no se distribuía orgánicamente en redes sociales.
El objetivo es implementar un sistema de publicación automatizada en la Página oficial de Facebook (`386393411716633` - *Cuatropuntas, Arquitectura, construcción y Remodelaciones*) que:
1. Emplee el formato visual de alto impacto tipo **Radio Bío Bío**: tarjeta cuadrada (1080x1080) con fotografía de fondo, gradiente oscuro, titular entre comillas con palabras clave destacadas en color, y pie con logo institucional (`public/logo.png`) y dominio `cuatropuntas.com`.
2. Mantenga un copy de texto minimalista en Facebook enfocado en generar expectativa y derivar tráfico directo al blog y al cotizador web oficial.
3. Ejecute una estrategia de calendario dual:
   - **Martes:** Publicación de 1 artículo del backlog histórico (de los 17 existentes) hasta agotarlo.
   - **Viernes:** Publicación inmediata del nuevo artículo generado por el pipeline semanal (`weekly-blog.yml`).
   - **Transición suave (Steady State):** Cuando se agoten los 17 artículos del backlog, los martes quedan en reposo automáticamente y el sistema continúa de manera perpetua con el post semanal de los viernes sin requerir cambios manuales.

---

## 2. Requisitos Funcionales y Técnicos (Sintaxis EARS)

### 2.1. Generación de Tarjetas Visuales (Pillow)
- **REQ-FB-01 (Formato y Dimensiones):** Cuando se procese un artículo para Facebook, el sistema DEBE generar una imagen cuadrada de exactamente 1080x1080 píxeles en formato JPEG con calidad 92%.
- **REQ-FB-02 (Composición Visual Estilo Bío Bío):** La tarjeta DEBE contener:
  1. Imagen de fondo del artículo escalada y recortada al centro.
  2. Gradiente oscuro inferior (alfa progresivo) cubriendo del 35% inferior al 100%.
  3. Titular de impacto entre comillas con palabras clave resaltadas en color cyan (`#38bdf8`) o naranja (`#f97316`).
  4. Pie de marca con el isotipo oficial [`public/logo.png`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/logo.png) y el texto `cuatropuntas.com`.
- **REQ-FB-03 (Compatibilidad Multiplataforma de Fuentes):** El generador DEBE utilizar `Segoe UI Bold` o `Arial Bold` en entornos Windows, y `DejaVuSans-Bold` en entornos Linux/GitHub Actions.

### 2.2. Publicador Meta Graph API y Gestión de Cola
- **REQ-FB-04 (Autenticación Permanente):** Cuando el script interactúe con la API de Facebook, DEBE autenticarse con el `FB_PAGE_ACCESS_TOKEN` permanente (`expires_at: 0`) para la página `386393411716633`.
- **REQ-FB-05 (Subida de Imagen con Copy Canónico):** Cuando se dispare una publicación, el script DEBE subir la tarjeta a `POST /{page_id}/photos` con un copy conciso (1-2 oraciones de intriga técnica) y el enlace canónico a `https://www.cuatropuntas.com/blog/posts/[slug].html`.
- **REQ-FB-06 (Historial y Control de Duplicados):** El sistema DEBE almacenar el registro de publicaciones en `content/social/facebook-feed-history.json` registrando slug, fecha, ID de Facebook y permalink. Ningún post del backlog podrá repetirse.
- **REQ-FB-07 (Tolerancia a Fin de Backlog):** Cuando se ejecute en modo backlog (`--mode=tuesday-backlog`) y no queden artículos sin publicar, el script DEBE registrar que el backlog está al día y terminar con código 0 sin arrojar error.

### 2.3. Automatización de Flujos (GitHub Actions)
- **REQ-FB-08 (Flujo Martes Backlog):** El workflow `.github/workflows/facebook-backlog.yml` DEBE ejecutarse todos los martes a las 14:00 UTC (11:00 AM Chile).
- **REQ-FB-09 (Flujo Viernes Nuevo Post):** El workflow `.github/workflows/weekly-blog.yml` DEBE invocar el publicador con `--mode=friday-new` inmediatamente después de compilar el nuevo artículo.

---

## 3. Criterios de Aceptación
1. `tests/facebook-publisher.spec.js` valida con 100% de éxito:
   - Generación correcta de la tarjeta gráfica (1080x1080 px, existencia en disco).
   - Lógica de selección de cola (modo backlog y modo nuevo post).
   - Tolerancia a cola vacía.
2. Script ejecutable en modo `--dry-run` y en modo real.
3. Despliegue de los workflows en GitHub y credenciales configuradas en `.env` (y documentadas para GitHub Secrets).
