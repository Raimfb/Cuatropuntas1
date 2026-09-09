# Task Breakdown: 008 - Hero Video Optimization & LCP Performance
**Feature ID:** `008_hero_video_optimization`  
**Estado:** PENDING USER APPROVAL (STOP GATE)  
**Metodología:** SDD (Spec-Driven Development / TDD)

---

## Tareas de Implementación Quirúrgica

- [x] **Task 1: Creación del Test Automatizado (`tests/hero-video.spec.js`)**
  - Implementar test de tamaño de archivo para `hero-timelapse.mp4` (< 2.5 MB).
  - Implementar test de existencia y peso para `hero-poster.webp` (< 80 KB).
  - Implementar test de atributos DOM en `index.html` (`poster`, `preload`, `autoplay`, `loop`, `muted`, `playsinline`).
  - *Comando de Verificación:* `npx playwright test tests/hero-video.spec.js` (aprobado en Red y Green).

- [x] **Task 2: Extracción y Generación de `public/hero-poster.webp`**
  - Extraer fotograma representativo del timelapse en 960x540 usando FFmpeg 7.1.
  - Codificar en formato WebP con compresión de calidad controlada (peso resultante: 74,026 bytes = 72.29 KB < 80 KB).
  - *Comando de Verificación:* `node -e "console.log(fs.statSync('public/hero-poster.webp').size)"` (72.29 KB).

- [x] **Task 3: Transcodificación y Compresión de `public/hero-timelapse.mp4`**
  - Crear copia de respaldo temporal (`hero-timelapse-backup.mp4`).
  - Transcodificar a H.264 sin audio (`-an`), resolución 960x540, `movflags +faststart` y bitrate controlado (~175k) para lograr peso < 2.5 MB.
  - Reemplazar atómicamente `public/hero-timelapse.mp4` (peso resultante: 2,190,342 bytes = 2.09 MB < 2.5 MB).
  - *Comando de Verificación:* `node -e "console.log(fs.statSync('public/hero-timelapse.mp4').size)"` (2.09 MB).

- [x] **Task 4: Actualización Quirúrgica de la Etiqueta Video en `public/index.html`**
  - Modificar atributo `poster` de `/casa_solida_moderna_1770071499659.webp` a `/hero-poster.webp`.
  - Asegurar presencia de atributos `preload="metadata"`, `autoplay`, `loop`, `muted`, `playsinline`.
  - *Comando de Verificación:* `git diff public/index.html` (aprobado).

- [x] **Task 5: Validación de la Suite E2E de Video (Fase Green)**
  - Ejecutar `npx playwright test tests/hero-video.spec.js`.
  - *Comando de Verificación:* 3/3 tests aprobados (1.1s).

- [x] **Task 6: Validación de Regresión Global del Proyecto**
  - Ejecutar la suite completa de Playwright (`npx playwright test`).
  - *Comando de Verificación:* 68/68 tests aprobados con 0 fallos (20.7s).

- [x] **Task 7: Despliegue a Producción**
  - Registrar commit: `perf(spec-008): optimizar video hero timelapse a <2.5MB y agregar poster webp para LCP`.
  - Push a `origin main` para trigger de despliegue en Vercel.
  - *Comando de Verificación:* `git push origin main`.
