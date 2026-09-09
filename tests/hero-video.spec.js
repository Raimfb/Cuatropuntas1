const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Spec 008: Optimización de Video Hero y Rendimiento LCP', () => {
    const publicDir = path.join(__dirname, '../public');
    const videoPath = path.join(publicDir, 'hero-timelapse.mp4');
    const posterPath = path.join(publicDir, 'hero-poster.webp');
    const indexPath = path.join(publicDir, 'index.html');

    test('T01.1: El archivo public/hero-timelapse.mp4 debe existir y pesar menos de 2.5 MB', async () => {
        expect(fs.existsSync(videoPath)).toBe(true);
        const stats = fs.statSync(videoPath);
        const maxBytes = 2.5 * 1024 * 1024; // 2,621,440 bytes
        expect(stats.size).toBeLessThan(maxBytes);
    });

    test('T01.2: El archivo public/hero-poster.webp debe existir y pesar menos de 80 KB', async () => {
        expect(fs.existsSync(posterPath)).toBe(true);
        const stats = fs.statSync(posterPath);
        const maxBytes = 80 * 1024; // 81,920 bytes
        expect(stats.size).toBeLessThan(maxBytes);
    });

    test('T01.3: La etiqueta video en index.html debe configurar poster y atributos de autoplay silencioso', async ({ page }) => {
        const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

        const video = page.locator('video.hero-timelapse-video');
        await expect(video).toBeVisible();

        // Validar atributos de rendimiento LCP y compatibilidad móvil
        await expect(video).toHaveAttribute('poster', '/hero-poster.webp');
        await expect(video).toHaveAttribute('preload', 'metadata');
        await expect(video).toHaveAttribute('autoplay', '');
        await expect(video).toHaveAttribute('loop', '');
        await expect(video).toHaveAttribute('muted', '');
        await expect(video).toHaveAttribute('playsinline', '');

        // Validar fuente del video
        const source = video.locator('source[src="/hero-timelapse.mp4"]');
        await expect(source).toBeAttached();
    });
});
