/**
 * scripts/preflight-check.js
 * Constructora Cuatropuntas SpA
 * Diagnóstico Pre-flight Autónomo para el Pipeline de Publicación del Blog
 *
 * Valida:
 * 1. Claves de API y variables de entorno (GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY).
 * 2. Permisos de escritura y rutas del sistema de archivos.
 * 3. Disponibilidad de herramientas de compresión y plantillas WebP nativas de contingencia.
 * 4. Integridad de los catálogos y feeds RSS.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
try { require('dotenv').config(); } catch (e) {}

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const POSTS_DIR = path.join(PUBLIC_DIR, 'blog', 'posts');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'blog', 'images');
const TEMPLATES_DIR = path.join(IMAGES_DIR, 'templates');
const DRAFTS_DIR = path.join(ROOT_DIR, 'content', 'drafts');
const POSTS_JSON = path.join(PUBLIC_DIR, 'blog', 'posts.json');
const SITEMAP_XML = path.join(PUBLIC_DIR, 'sitemap.xml');

let hasFatalError = false;
const diagnostics = [];

function logCheck(title, status, detail) {
    const icon = status === 'ok' ? '✅' : (status === 'warn' ? '⚠️' : '❌');
    console.log(`${icon} [${status.toUpperCase()}] ${title}: ${detail}`);
    diagnostics.push({ title, status, detail });
    if (status === 'error') hasFatalError = true;
}

console.log('🚀 [PREFLIGHT CHECK] Iniciando auditoría pre-vuelo del sistema de blog...\n');

// 1. Verificación de Variables de Entorno y Claves de API
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
    logCheck('API Key', 'warn', 'Ni GEMINI_API_KEY ni GOOGLE_GENERATIVE_AI_API_KEY están presentes. Se requerirá usar pool de contingencia o modo offline.');
} else if (apiKey.includes('FAKE') || apiKey.length < 15) {
    logCheck('API Key', 'warn', `Clave API detectada pero tiene formato ficticio o corto (${apiKey.substring(0, 8)}...).`);
} else {
    logCheck('API Key', 'ok', `Clave configurada correctamente (${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}).`);
}

// 2. Verificación de Directorios y Permisos de Escritura
const requiredDirs = [
    { name: 'Directorio de Posts', path: POSTS_DIR },
    { name: 'Directorio de Imágenes', path: IMAGES_DIR },
    { name: 'Directorio de Plantillas WebP', path: TEMPLATES_DIR },
    { name: 'Directorio de Borradores', path: DRAFTS_DIR }
];

for (const dir of requiredDirs) {
    if (!fs.existsSync(dir.path)) {
        try {
            fs.mkdirSync(dir.path, { recursive: true });
            logCheck(dir.name, 'ok', `Creado exitosamente en ${dir.path}`);
        } catch (err) {
            logCheck(dir.name, 'error', `No se pudo crear el directorio: ${err.message}`);
        }
    } else {
        // Probar escritura
        const testFile = path.join(dir.path, `.preflight_test_${Date.now()}.tmp`);
        try {
            fs.writeFileSync(testFile, 'cuatropuntas-preflight-ok');
            fs.unlinkSync(testFile);
            logCheck(dir.name, 'ok', `Accesible y con permisos de escritura.`);
        } catch (err) {
            logCheck(dir.name, 'error', `Fallo de permisos de escritura: ${err.message}`);
        }
    }
}

// 3. Verificación de Archivos de Índice y Metadatos
if (fs.existsSync(POSTS_JSON)) {
    try {
        const raw = fs.readFileSync(POSTS_JSON, 'utf8');
        const parsed = JSON.parse(raw);
        logCheck('posts.json', 'ok', `JSON válido con ${parsed.length} artículos indexados.`);
    } catch (err) {
        logCheck('posts.json', 'error', `El archivo posts.json está corrupto: ${err.message}`);
    }
} else {
    logCheck('posts.json', 'warn', `No existe aún posts.json. Se creará en la primera compilación.`);
}

if (fs.existsSync(SITEMAP_XML)) {
    logCheck('sitemap.xml', 'ok', `Existe y listo para inyección de URLs.`);
} else {
    logCheck('sitemap.xml', 'warn', `No existe sitemap.xml en public/. Se generará dinámicamente.`);
}

// 4. Verificación de la Cadena de Imágenes (Image Toolchain & Tier 3)
let pillowAvailable = false;
for (const pyBin of ['python', 'python3']) {
    try {
        const res = spawnSync(pyBin, ['-c', 'from PIL import Image; print("OK")'], { encoding: 'utf8' });
        if (res.status === 0 && res.stdout.includes('OK')) {
            pillowAvailable = true;
            break;
        }
    } catch (e) {}
}

if (pillowAvailable) {
    logCheck('Image Engine: Python Pillow', 'ok', 'Disponible para compresión WebP dinámica.');
} else {
    logCheck('Image Engine: Python Pillow', 'warn', 'No instalado o módulo PIL ausente. Se utilizarán fallbacks.');
}

// Verificar plantillas nativas Tier 3
if (fs.existsSync(TEMPLATES_DIR)) {
    const templates = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.webp'));
    if (templates.length >= 5) {
        let validTemplates = true;
        for (const t of templates) {
            const sz = fs.statSync(path.join(TEMPLATES_DIR, t)).size;
            if (sz === 0 || sz >= 100 * 1024) {
                validTemplates = false;
                logCheck(`Plantilla ${t}`, 'error', `Tamaño anómalo: ${(sz / 1024).toFixed(1)} KB`);
            }
        }
        if (validTemplates) {
            logCheck('Tier 3 WebP Templates', 'ok', `${templates.length} plantillas WebP (< 100 KB) verificadas y listas.`);
        }
    } else {
        logCheck('Tier 3 WebP Templates', 'warn', `Se encontraron solo ${templates.length} plantillas en ${TEMPLATES_DIR}.`);
    }
} else {
    logCheck('Tier 3 WebP Templates', 'error', `No existe el directorio ${TEMPLATES_DIR}`);
}

// Resumen Final
console.log('\n📊 [RESUMEN DE DIAGNÓSTICO]');
if (hasFatalError) {
    console.error('❌ Se detectaron fallos críticos que impiden la ejecución segura del pipeline del blog.\n');
    process.exit(1);
} else {
    console.log('✅ Todos los chequeos críticos pasaron con éxito. El sistema está listo para operar.\n');
    process.exit(0);
}
