# Technical Plan: 008 - Hero Video Optimization & LCP Performance
**Feature ID:** `008_hero_video_optimization`  
**Estado:** DRAFT / PENDING REVIEW  
**Ficheros Objetivo:**  
- [`public/hero-timelapse.mp4`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/hero-timelapse.mp4) (Compresión de 21.2 MB a < 2.5 MB)
- [`public/hero-poster.webp`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/hero-poster.webp) (Nuevo asset de fotograma clave < 80 KB)
- [`public/index.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/index.html) (Vincular póster y validar atributos)
- [`tests/hero-video.spec.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/tests/hero-video.spec.js) (Suite de verificación automatizada de video y póster)

---

## 1. Estrategia de Transcodificación y Compresión

### 1.1. Motor de Procesamiento Local
El entorno cuenta con el binario nativo de **FFmpeg 7.1** instalado y disponible vía Python (`imageio_ffmpeg`):
`C:\Users\raimu\AppData\Roaming\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe`

### 1.2. Parámetros de Video para Alcanzar < 2.5 MB
* **Duración:** 98.63 segundos.
* **Presupuesto de Datos:** 2.3 MB = 19,293,798 bits.
* **Bitrate Objetivo:** ~185 kbps promedio, con pico de 220 kbps y buffer de 400 kbps.
* **Comando de Compresión (Vía script de ejecución seguro):**
  ```bash
  ffmpeg -y -i public/hero-timelapse.mp4 \
    -c:v libx264 -preset slow \
    -b:v 180k -maxrate 220k -bufsize 400k \
    -vf "scale=1280:720" \
    -an -movflags +faststart \
    public/hero-timelapse-optimized.mp4
  ```
* **Manejo de Reversión y Respaldo:** Antes de sobreescribir el archivo original, se generará una copia temporal de respaldo (`hero-timelapse-backup.mp4`). Una vez certificado el nuevo peso (< 2.5 MB) y la integridad del contenedor, se sustituirá el archivo definitivo.

---

## 2. Generación del Fotograma Clave (`hero-poster.webp`)

### 2.1. Extracción de Fotograma
Se extraerá un fotograma nítido de la obra (por ejemplo en el segundo 5, donde la estructura ya es visible):
```bash
ffmpeg -y -ss 00:00:05 -i public/hero-timelapse.mp4 \
  -vframes 1 -vf "scale=1280:720" -c:v libwebp -quality 75 \
  public/hero-poster.webp
```

### 2.2. Validación de Criterios
* Formato: WebP.
* Dimensiones: 1280x720 (16:9).
* Peso esperado: entre 35 KB y 65 KB (estrictamente menor al umbral de 80 KB).

---

## 3. Modificación Quirúrgica en `public/index.html`

### 3.1. Contexto DOM (Líneas ~380-384)
* **Código Anterior:**
  ```html
  <video controls autoplay loop muted playsinline preload="metadata" aria-label="Timelapse CP de las etapas de obra" poster="/casa_solida_moderna_1770071499659.webp" class="hero-timelapse-video">
      <source src="/hero-timelapse.mp4" type="video/mp4">
      Su navegador no soporta reproducción de video.
  </video>
  ```
* **Código Nuevo:**
  ```html
  <video controls autoplay loop muted playsinline preload="metadata" aria-label="Timelapse CP de las etapas de obra" poster="/hero-poster.webp" class="hero-timelapse-video">
      <source src="/hero-timelapse.mp4" type="video/mp4">
      Su navegador no soporta reproducción de video.
  </video>
  ```

---

## 4. Suite de Pruebas Automatizadas (`tests/hero-video.spec.js`)

Se creará una suite dedicada que valide:
1. **Existencia y Tamaño del Video:**
   ```javascript
   const videoPath = path.join(__dirname, '../public/hero-timelapse.mp4');
   const stats = fs.statSync(videoPath);
   expect(stats.size).toBeLessThan(2.5 * 1024 * 1024); // < 2.5 MB
   ```
2. **Existencia y Tamaño del Póster:**
   ```javascript
   const posterPath = path.join(__dirname, '../public/hero-poster.webp');
   expect(fs.existsSync(posterPath)).toBe(true);
   const posterStats = fs.statSync(posterPath);
   expect(posterStats.size).toBeLessThan(80 * 1024); // < 80 KB
   ```
3. **Validación de Atributos DOM:**
   ```javascript
   const video = page.locator('video.hero-timelapse-video');
   await expect(video).toHaveAttribute('poster', '/hero-poster.webp');
   await expect(video).toHaveAttribute('preload', 'metadata');
   await expect(video).toHaveAttribute('autoplay', '');
   await expect(video).toHaveAttribute('loop', '');
   await expect(video).toHaveAttribute('muted', '');
   await expect(video).toHaveAttribute('playsinline', '');
   ```
4. **Verificación de Ausencia de Audio:** Probar que el archivo MP4 no posee pistas de audio mediante lectura de átomos ISO BMFF.

---

## 5. Plan de Reversión (Rollback)
Si la calidad de compresión resulta deficiente o el peso no satisface los umbrales:
- Se preserva el archivo de respaldo `public/hero-timelapse-backup.mp4` para restaurarlo de inmediato.
- Se ajustará el bitrate a un valor balanceado (ej. 200k o resolución 960x540) hasta obtener el consenso visual óptimo.
