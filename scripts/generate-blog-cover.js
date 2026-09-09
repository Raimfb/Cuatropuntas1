/**
 * scripts/generate-blog-cover.js
 * Constructora Cuatropuntas SpA
 * Generador y Optimizador Automatizado de Portadas con IA (Spec 012)
 *
 * Características:
 * - Ingeniería de prompt visual arquitectónico contextualizado en Santiago de Chile.
 * - Negative prompt estricto (cero personas, textos, marcas de agua ni renders 3D).
 * - Motor dual de compresión a WebP 16:9 (1200x675 px) con Python Pillow / FFmpeg.
 * - Presupuesto estricto de peso < 100 KB para Core Web Vitals (LCP).
 * - Mecanismo de Graceful Fallback no destructivo ante límites de cuota (HTTP 429).
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
try { require('dotenv').config(); } catch (e) {}

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'blog', 'images');

// Catálogo base de assets limpios de contingencia por categoría
const FALLBACK_CATEGORY_ASSETS = {
    'casas-nuevas': path.join(PUBLIC_DIR, 'blog_precios_construccion.jpg'),
    'casas nuevas': path.join(PUBLIC_DIR, 'blog_precios_construccion.jpg'),
    'materiales & sistemas': path.join(PUBLIC_DIR, 'blog_comparativa_sistemas.jpg'),
    'materiales y sistemas': path.join(PUBLIC_DIR, 'blog_comparativa_sistemas.jpg'),
    'segundos pisos': path.join(PUBLIC_DIR, 'blog_regularizar_ampliacion.jpg'),
    'segundos-pisos': path.join(PUBLIC_DIR, 'blog_regularizar_ampliacion.jpg'),
    'ampliaciones': path.join(PUBLIC_DIR, 'blog_regularizar_ampliacion.jpg'),
    'guías prácticas': path.join(PUBLIC_DIR, 'blog_consejos_construir.jpg'),
    'guias practicas': path.join(PUBLIC_DIR, 'blog_consejos_construir.jpg'),
    'remodelaciones': path.join(PUBLIC_DIR, 'blog_remodelacion_bano_cocina.jpg'),
    'precios & cotización': path.join(PUBLIC_DIR, 'blog_precios_construccion.jpg'),
    'quinchos': path.join(PUBLIC_DIR, 'quincho_premium_chile_1770071485791.webp'),
    'default': path.join(PUBLIC_DIR, 'blog_precios_construccion.jpg')
};

/**
 * Sintetiza un prompt fotográfico arquitectónico estricto según Spec 012
 */
function buildVisualPrompt(topicData = {}) {
    const title = (topicData.title || '').toLowerCase();
    const category = (topicData.category || '').toLowerCase();

    // Detección de materialidad contextual
    let materialFocus = "perfiles de acero galvanizado Metalcom estructural y losa de hormigón armado";
    if (title.includes('sip') || title.includes('panel')) {
        materialFocus = "paneles SIP estructurales con alma aislante de alta densidad y ventanales termopanel";
    } else if (title.includes('albañilería') || title.includes('ladrillo') || title.includes('sólida')) {
        materialFocus = "albañilería confinada armada con cadenas de hormigón visto y detalles modernos";
    } else if (title.includes('quincho') || category.includes('quincho')) {
        materialFocus = "quincho contemporáneo de alto estándar con vigas a la vista, mesones de cuarzo y asador en obra";
    } else if (title.includes('remodel') || title.includes('baño') || title.includes('cocina')) {
        materialFocus = "arquitectura interior y exterior de remodelación premium con porcelanato, cubiertas pulidas y termopanel";
    } else if (title.includes('térmic') || title.includes('aislac') || title.includes('oguc')) {
        materialFocus = "envolvente térmica continua eficiente, doble vidriado hermético DVH y fachada de arquitectura bioclimática";
    }

    const prompt = `Architectural photography of a contemporary modern residential house in Santiago de Chile. Built with ${materialFocus}, large double-glazed hermetic windows (termopanel), clean geometry, flat or low-pitch roof, concrete foundation. Clear blue sky with Andean mountain foothills in soft natural morning sunlight. Editorial architectural magazine quality, 8k resolution, photorealistic exterior view.`;

    // Negative prompt estricto según EARS-012-02
    const negativePrompt = `people, humans, faces, silhouettes, typography, text, watermark, signature, logo, low resolution, 3d cartoon render, blur, distorted, surreal, miniature model`;

    return { prompt, negativePrompt };
}

/**
 * Resuelve la ruta de un ejecutable en el sistema
 */
function findExecutable(commandName, extraPaths = []) {
    try {
        const isWin = process.platform === 'win32';
        const checkCmd = isWin ? `where ${commandName}` : `which ${commandName}`;
        const output = execSync(checkCmd, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
        if (output) {
            return output.split('\n')[0].trim();
        }
    } catch (e) {}

    for (const extra of extraPaths) {
        if (fs.existsSync(extra)) return extra;
    }
    return null;
}

/**
 * Procesa un archivo o buffer de imagen a WebP 16:9 con presupuesto de peso estricto (< 100 KB)
 */
async function processImageToWebp(inputBufferOrPath, targetPath, options = {}) {
    const targetWidth = options.width || 1200;
    const targetHeight = options.height || 675;
    const maxBytes = options.maxBytes || 100 * 1024; // 100 KB

    // Asegurar directorio destino
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Si la entrada es un Buffer, escribir a un archivo temporal
    let tempInputFile = null;
    let inputPath = '';

    if (Buffer.isBuffer(inputBufferOrPath)) {
        tempInputFile = path.join(targetDir, `temp_in_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.tmp`);
        fs.writeFileSync(tempInputFile, inputBufferOrPath);
        inputPath = tempInputFile;
    } else {
        inputPath = path.resolve(inputBufferOrPath);
    }

    if (!fs.existsSync(inputPath)) {
        throw new Error(`Archivo de entrada no encontrado: ${inputPath}`);
    }

    let success = false;
    let lastError = null;

    // 1. Intento A: Python Pillow (disponible en entorno local Windows y con WebP support)
    const pythonBin = findExecutable('python') || findExecutable('python3');
    if (pythonBin) {
        try {
            const pythonScript = `
import sys, os
from PIL import Image

in_path = sys.argv[1]
out_path = sys.argv[2]
tw = int(sys.argv[3])
th = int(sys.argv[4])
mb = int(sys.argv[5])

img = Image.open(in_path)
if img.mode != 'RGB':
    img = img.convert('RGB')

# Recorte proporcional centrado 16:9
ow, oh = img.size
ta = tw / th
oa = ow / oh

if oa > ta:
    nw = int(oh * ta)
    left = (ow - nw) // 2
    img = img.crop((left, 0, left + nw, oh))
else:
    nh = int(ow / ta)
    top = (oh - nh) // 2
    img = img.crop((0, top, ow, top + nh))

img = img.resize((tw, th), Image.Resampling.LANCZOS)

# Bucle dinámico de compresión (< 100 KB)
for q in [80, 72, 65, 55, 45]:
    img.save(out_path, 'WEBP', quality=q, method=6)
    if os.path.getsize(out_path) < mb:
        break
`;
            const pyRes = spawnSync(pythonBin, [
                '-c', pythonScript,
                inputPath,
                targetPath,
                targetWidth.toString(),
                targetHeight.toString(),
                maxBytes.toString()
            ], { encoding: 'utf8' });

            if (pyRes.status === 0 && fs.existsSync(targetPath) && fs.statSync(targetPath).size > 0) {
                success = true;
            } else if (pyRes.stderr) {
                lastError = new Error(`Python Pillow error: ${pyRes.stderr}`);
            }
        } catch (e) {
            lastError = e;
        }
    }

    // 2. Intento B: FFmpeg (pre-instalado por defecto en GitHub Actions Ubuntu runners)
    if (!success) {
        const ffmpegBin = findExecutable('ffmpeg', [
            'C:\\Users\\raimu\\.gemini\\antigravity\\scratch\\ffmpeg.exe',
            '/usr/bin/ffmpeg',
            '/usr/local/bin/ffmpeg'
        ]);

        if (ffmpegBin) {
            try {
                // Probar calidades descendentes hasta cumplir el presupuesto
                for (const q of [80, 70, 60, 50]) {
                    const vfFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}`;
                    const ffRes = spawnSync(ffmpegBin, [
                        '-y',
                        '-i', inputPath,
                        '-vf', vfFilter,
                        '-c:v', 'libwebp',
                        '-quality', q.toString(),
                        targetPath
                    ], { encoding: 'utf8' });

                    if (ffRes.status === 0 && fs.existsSync(targetPath)) {
                        const size = fs.statSync(targetPath).size;
                        if (size < maxBytes) {
                            success = true;
                            break;
                        }
                    }
                }
            } catch (e) {
                lastError = e;
            }
        }
    }

    // Limpiar archivo temporal si se creó
    if (tempInputFile && fs.existsSync(tempInputFile)) {
        try { fs.unlinkSync(tempInputFile); } catch (e) {}
    }

    if (!success || !fs.existsSync(targetPath)) {
        throw new Error(`No se pudo procesar la imagen a WebP (< 100 KB): ${lastError ? lastError.message : 'Motor de compresión no disponible'}`);
    }

    const finalSize = fs.statSync(targetPath).size;
    if (finalSize >= maxBytes) {
        console.warn(`⚠️ [COVER GENERATOR] La imagen excede por poco el límite: ${(finalSize / 1024).toFixed(1)} KB`);
    }

    return targetPath;
}

/**
 * Resuelve el asset base de contingencia según la categoría del post
 */
function resolveFallbackAsset(category = '') {
    const key = (category || '').toLowerCase().trim();
    if (FALLBACK_CATEGORY_ASSETS[key] && fs.existsSync(FALLBACK_CATEGORY_ASSETS[key])) {
        return FALLBACK_CATEGORY_ASSETS[key];
    }
    return FALLBACK_CATEGORY_ASSETS['default'];
}

/**
 * Pipeline principal de generación o asignación de portada
 */
async function generateBlogCover(topicData = {}, slug = '', options = {}) {
    if (!slug) {
        slug = (topicData.title || 'post-cover')
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    const targetFileName = `${slug}.webp`;
    const targetPhysicalPath = path.join(IMAGES_DIR, targetFileName);
    const webRelativePath = `/blog/images/${targetFileName}`;

    // Modo Dry Run: Solo simular sin llamadas reales ni escritura
    if (options.dryRun) {
        const { prompt, negativePrompt } = buildVisualPrompt(topicData);
        console.log(`🔍 [DRY RUN] Simulación de Portada Visual:`);
        console.log(`   Ruta objetivo: ${webRelativePath}`);
        console.log(`   Prompt: "${prompt.substring(0, 80)}..."`);
        return {
            success: true,
            dryRun: true,
            imagePath: webRelativePath,
            physicalPath: targetPhysicalPath,
            prompt,
            negativePrompt
        };
    }

    const apiKey = options.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const { prompt, negativePrompt } = buildVisualPrompt(topicData);

    let aiGeneratedBuffer = null;

    // Intento de Generación con IA (Google GenAI)
    if (apiKey && !apiKey.includes('FAKE')) {
        try {
            console.log(`🎨 Generando portada con IA para: "${topicData.title}"...`);
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey);

            // Intentar modelos compatibles de imagen
            const modelCandidates = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image'];
            for (const modelName of modelCandidates) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const fullPrompt = `${prompt}\nNegative prompt: ${negativePrompt}`;
                    const res = await model.generateContent(fullPrompt);

                    if (res && res.response && res.response.candidates && res.response.candidates[0]) {
                        const parts = res.response.candidates[0].content.parts;
                        const imagePart = parts.find(p => p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith('image/'));
                        if (imagePart) {
                            aiGeneratedBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
                            console.log(`✅ Portada generada con éxito usando ${modelName}.`);
                            break;
                        }
                    }
                } catch (subErr) {
                    // Continuar al siguiente modelo o al fallback
                }
            }
        } catch (err) {
            console.warn(`⚠️ [COVER GENERATOR] Llamada a API de imagen fallida: ${err.message}`);
        }
    }

    // Mecanismo Graceful Fallback (EARS-012-08)
    if (!aiGeneratedBuffer) {
        console.log(`ℹ️ [COVER FALLBACK] Utilizando plantilla base limpia optimizada para "${slug}"...`);
        const fallbackSource = resolveFallbackAsset(topicData.category);
        await processImageToWebp(fallbackSource, targetPhysicalPath, {
            width: 1200,
            height: 675,
            maxBytes: 100 * 1024
        });

        return {
            success: true,
            fallback: true,
            imagePath: webRelativePath,
            physicalPath: targetPhysicalPath
        };
    }

    // Procesar buffer descargado de IA
    await processImageToWebp(aiGeneratedBuffer, targetPhysicalPath, {
        width: 1200,
        height: 675,
        maxBytes: 100 * 1024
    });

    return {
        success: true,
        aiGenerated: true,
        imagePath: webRelativePath,
        physicalPath: targetPhysicalPath
    };
}

// Ejecución CLI directa para pruebas
if (require.main === module) {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    const sampleTopic = {
        title: "Radier de Hormigón H-20 vs Sobrecimiento en Santiago",
        category: "Materiales & Sistemas"
    };

    generateBlogCover(sampleTopic, 'test-cli-cover', { dryRun: isDryRun })
        .then(res => {
            console.log(`🎉 Resultado:`, res);
            process.exit(0);
        })
        .catch(err => {
            console.error(`❌ Error: ${err.message}`);
            process.exit(1);
        });
}

module.exports = {
    buildVisualPrompt,
    processImageToWebp,
    generateBlogCover,
    resolveFallbackAsset,
    FALLBACK_CATEGORY_ASSETS,
    IMAGES_DIR
};
