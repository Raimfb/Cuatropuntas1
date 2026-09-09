# Feature Specification: 008 - Hero Video Optimization & LCP Performance
**Feature ID:** `008_hero_video_optimization`  
**Estado:** DRAFT / PENDING REVIEW  
**Autor:** Antigravity (Lead AI Solutions Architect)  
**Metodología:** SDD (EARS Notation - Easy Approach to Requirements Syntax)  
**Documento Fuente:** [`AGENTS.md`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/AGENTS.md)

---

## 1. Resumen Ejecutivo y Alcance
Esta especificación define la optimización del recurso de video del Hero (`public/hero-timelapse.mp4`) y la generación de un póster WebP ultraligero (`public/hero-poster.webp`) para mejorar drásticamente las métricas de Core Web Vitals (especialmente Largest Contentful Paint - LCP y First Contentful Paint - FCP), reduciendo el consumo de ancho de banda móvil de 21.2 MB a menos de 2.5 MB (una reducción de ~88%).

### Diagnóstico de Línea Base
* **Asset:** `public/hero-timelapse.mp4`
* **Peso original:** 21.23 MB (22,260,215 bytes)
* **Duración:** 98.63 segundos
* **Resolución:** 1280x720 (720p 16:9)
* **Códec actual:** H.264 / AVC (`avc1`)
* **Audio:** Sin pista de audio (solo track de video `vmhd`)
* **Póster actual en DOM:** `/casa_solida_moderna_1770071499659.webp` (184 KB, imagen estática desacoplada de la secuencia real del timelapse).

### Objetivo
1. Reducir el peso de `public/hero-timelapse.mp4` a menos de **2.5 MB** mediante transcodificación H.264 optimizada para web con bitrate controlado (`-b:v ~180k -maxrate 220k -bufsize 400k`), manteniendo resolución nativa 1280x720 o 960x540 sin audio y con flags de inicio rápido (`+faststart`).
2. Extraer un fotograma clave del timelapse y guardarlo como `public/hero-poster.webp` con peso estricto menor a **80 KB** y relación de aspecto 16:9.
3. Actualizar la etiqueta `<video>` en `public/index.html` vinculando `poster="hero-poster.webp"` (o `/hero-poster.webp`), garantizando atributos de reproducción autónoma silenciosa (`autoplay`, `loop`, `muted`, `playsinline`, `preload="metadata"`).
4. Garantizar compatibilidad móvil total y mantener el desplazamiento acumulado de diseño en cero (**CLS = 0**).
5. Certificar los umbrales de peso y atributos DOM mediante pruebas automatizadas en Playwright.

---

## 2. Requisitos del Sistema (Notación EARS)

### 2.1. Ubiquitous Requirements (Requisitos Generales del Sistema)
* **REQ-UBI-01 [Límite de Peso de Video]:** El archivo [`public/hero-timelapse.mp4`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/hero-timelapse.mp4) optimizado DEBE tener un tamaño en disco estrictamente menor a **2.5 MB** (2,621,440 bytes).
* **REQ-UBI-02 [Límite de Peso de Póster]:** El archivo [`public/hero-poster.webp`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/hero-poster.webp) DEBE existir físicamente y su tamaño en disco DEBE ser estrictamente menor a **80 KB** (81,920 bytes).
* **REQ-UBI-03 [Relación de Aspecto y CLS]:** Tanto el video como el póster DEBEN mantener la relación de aspecto estándar 16:9 para coincidir con la regla CSS `.hero-media-video-frame { aspect-ratio: 16 / 9; }`, asegurando que el navegador reserve el espacio exacto y mantenga **CLS = 0**.
* **REQ-UBI-04 [Inexistencia de Audio]:** El video transcodificado NO DEBE contener ningún stream de audio (`-an`), previniendo bloqueos de políticas de autoplay en navegadores móviles (iOS Safari, Android Chrome).
* **REQ-UBI-05 [Inicio Rápido para Streaming Web]:** El contenedor MP4 DEBE transcodificarse con la bandera `movflags +faststart` para ubicar el átomo `moov` al inicio del archivo, permitiendo la reproducción inmediata sin requerir la descarga completa previa.

### 2.2. Event-Driven Requirements (Comportamiento del DOM y Reproducción)
* **REQ-EVT-01 [Configuración de la Etiqueta Video]:** CUANDO se renderice la página `public/index.html`, el elemento `<video class="hero-timelapse-video">` DEBE contener los siguientes atributos exactos:
  - `autoplay`: Para inicio automático al cargar la vista.
  - `loop`: Para ciclo continuo de la secuencia.
  - `muted`: Requerido obligatoriamente por los motores WebKit y Chromium para permitir autoplay.
  - `playsinline`: Requerido para evitar reproducción en pantalla completa forzada en dispositivos iOS.
  - `preload="metadata"`: Para diferir la descarga masiva de datos hasta la interacción del viewport.
  - `poster="/hero-poster.webp"` (o `hero-poster.webp`): Para visualización instantánea mientras se amortiguan los primeros paquetes del video.
* **REQ-EVT-02 [Contenido Alternativo / Fallback]:** CUANDO el agente de usuario no soporte el elemento de video, el contenedor DEBE exhibir un texto accesible de fallback (`Su navegador no soporta reproducción de video.`).

### 2.3. Unwanted Behavior Requirements (Comportamientos Prohibidos)
* **REQ-ERR-01:** Queda estrictamente PROHIBIDO sustituir el video por un GIF animado debido a su pésima eficiencia de compresión y paleta degradada.
* **REQ-ERR-02:** NO SE DEBE eliminar la etiqueta `<source src="/hero-timelapse.mp4" type="video/mp4">` ni alterar su ruta canónica en producción.
* **REQ-ERR-03:** NO SE DEBE permitir que el póster exceda los 100 KB ni que presente artefactos severos de compresión que degraden la calidad percibida de la marca.

---

## 3. Criterios de Aceptación Técnicos
1. **Verificación Automatizada (`tests/hero-video.spec.js` o `tests/verify.spec.js`):**
   - El archivo `public/hero-timelapse.mp4` pesa menos de 2.5 MB.
   - El archivo `public/hero-poster.webp` existe y pesa menos de 80 KB.
   - La etiqueta `video.hero-timelapse-video` en `index.html` tiene los atributos `poster`, `autoplay`, `loop`, `muted`, `playsinline` y `preload="metadata"`.
2. **Pruebas de Regresión Global:**
   - La suite completa de 65 tests Playwright preexistentes debe seguir pasando al 100% en verde.
3. **Calidad Visual:**
   - El video optimizado se reproduce fluidamente a 24-30 fps sin macrobloques evidentes.
