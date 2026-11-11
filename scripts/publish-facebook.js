/**
 * scripts/publish-facebook.js
 * Constructora Cuatropuntas SpA
 * Publicador Automatizado en Facebook (Estilo Radio Bío Bío)
 * Spec 027
 */

try { require('dotenv').config(); } catch (_) {}
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const POSTS_JSON_PATH = path.join(ROOT_DIR, 'public', 'blog', 'posts.json');
const HISTORY_FILE_PATH = path.join(ROOT_DIR, 'content', 'social', 'facebook-feed-history.json');
const CARDS_DIR = path.join(ROOT_DIR, 'public', 'blog', 'social');

const OFFICIAL_PHONE = '+56 9 2738 4075';
const OFFICIAL_PHONE_CLEAN = '56927384075';

// Credenciales oficiales Meta Graph API
const PAGE_ID = process.env.FB_PAGE_ID || '386393411716633';
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

/**
 * Lee o inicializa el historial de publicaciones
 */
function loadHistory() {
    if (!fs.existsSync(HISTORY_FILE_PATH)) {
        fs.mkdirSync(path.dirname(HISTORY_FILE_PATH), { recursive: true });
        fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify([], null, 2), 'utf8');
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(HISTORY_FILE_PATH, 'utf8'));
    } catch (e) {
        return [];
    }
}

/**
 * Guarda un registro en el historial
 */
function recordHistory(record) {
    const history = loadHistory();
    history.push({
        ...record,
        recorded_at: new Date().toISOString()
    });
    fs.mkdirSync(path.dirname(HISTORY_FILE_PATH), { recursive: true });
    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(history, null, 2), 'utf8');
}

/**
 * Genera el copy de texto con formato minimalista de expectativa (Estilo Radio Bío Bío)
 */
function buildSocialCopy(post) {
    const canonicalUrl = `https://www.cuatropuntas.com/blog/posts/${post.slug}`;
    
    // Titular limpio
    let headline = post.title.trim();
    if (headline.endsWith('— Cuatropuntas') || headline.endsWith('| Cuatropuntas')) {
        headline = headline.replace(/(\s*[—|]\s*Cuatropuntas)$/i, '').trim();
    }

    // 1-2 líneas intrigantes y llamado directo a la web
    const hook = post.excerpt ? `${post.excerpt.split('.')[0]}.` : headline;

    return `${headline}\n\n${hook}\n\nLee la guía técnica completa y revisa costos en nuestro sitio web:\n👉 ${canonicalUrl}\n\n📲 Asesoría directa al WhatsApp: ${OFFICIAL_PHONE}\n\n#ConstruccionSantiago #Cuatropuntas #ArquitecturaChile #PreciosConstruccion`;
}

/**
 * Genera la tarjeta gráfica utilizando scripts/generate-facebook-card.py
 */
function generateCard(slug) {
    fs.mkdirSync(CARDS_DIR, { recursive: true });
    const scriptPath = path.join(ROOT_DIR, 'scripts', 'generate-facebook-card.py');
    const cardPath = path.join(CARDS_DIR, `${slug}.jpg`);

    console.log(`🎨 Generando tarjeta visual estilo Radio Bío Bío para '${slug}'...`);
    const py = process.platform === 'win32' ? 'python' : 'python3';
    const cmd = `${py} "${scriptPath}" --slug="${slug}" --output="${cardPath}"`;
    execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR });

    if (!fs.existsSync(cardPath)) {
        throw new Error(`No se pudo generar la tarjeta en ${cardPath}`);
    }
    return cardPath;
}

/**
 * Publica la tarjeta y el copy en la Página de Facebook
 */
async function publishToFacebook(post, cardPath, dryRun = false) {
    const copy = buildSocialCopy(post);

    console.log('\n======================================================');
    console.log('📢 COPY PROGRAMADO PARA FACEBOOK (ESTILO BÍO BÍO):');
    console.log('======================================================');
    console.log(copy);
    console.log('======================================================');
    console.log(`🖼️ Imagen: ${cardPath}`);
    console.log(`📄 Página ID: ${PAGE_ID}`);

    if (dryRun) {
        console.log('\n[DRY-RUN] Simulación exitosa. No se llamó a la API de Meta.');
        return { success: true, dryRun: true, id: 'dry-run-id' };
    }

    if (!PAGE_TOKEN) {
        throw new Error('FB_PAGE_ACCESS_TOKEN no está definido en el entorno.');
    }

    const fileBuffer = fs.readFileSync(cardPath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('source', blob, `${post.slug}.jpg`);
    formData.append('caption', copy);
    formData.append('published', 'true');
    formData.append('access_token', PAGE_TOKEN);

    console.log('\n🚀 Subiendo publicación a la Página de Facebook...');
    const res = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/photos`, {
        method: 'POST',
        body: formData
    });

    const json = await res.json();
    if (!res.ok || json.error) {
        throw new Error(`Error en Meta Graph API (${res.status}): ${JSON.stringify(json.error || json)}`);
    }

    console.log(`✅ ¡Publicado con éxito en Facebook! ID de foto: ${json.id}`);
    const postUrl = `https://www.facebook.com/${json.id}`;

    // Registrar en el historial
    recordHistory({
        slug: post.slug,
        title: post.title,
        facebook_photo_id: json.id,
        facebook_post_url: postUrl,
        mode: post.publishMode || 'manual'
    });

    return { success: true, id: json.id, url: postUrl };
}

/**
 * Función principal
 */
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    
    let mode = 'tuesday-backlog'; // Por defecto toma el backlog
    const modeArg = args.find(a => a.startsWith('--mode='));
    if (modeArg) {
        mode = modeArg.split('=')[1];
    }

    const slugArg = args.find(a => a.startsWith('--slug='));
    const targetSlug = slugArg ? slugArg.split('=')[1] : null;

    if (!fs.existsSync(POSTS_JSON_PATH)) {
        console.error(`❌ No se encontró posts.json en ${POSTS_JSON_PATH}`);
        process.exit(1);
    }

    const posts = JSON.parse(fs.readFileSync(POSTS_JSON_PATH, 'utf8'));
    const history = loadHistory();
    const publishedSlugs = new Set(history.map(h => h.slug));

    let selectedPost = null;

    if (targetSlug) {
        selectedPost = posts.find(p => p.slug === targetSlug || p.id === targetSlug);
        if (!selectedPost) {
            console.error(`❌ Artículo con slug '${targetSlug}' no encontrado.`);
            process.exit(1);
        }
        selectedPost.publishMode = 'manual-slug';
    } else if (mode === 'friday-new' || mode === 'latest') {
        // Modo Viernes: Selecciona el artículo más reciente publicado
        selectedPost = posts[0];
        if (!selectedPost) {
            console.log('ℹ️ No hay artículos en el blog.');
            process.exit(0);
        }
        if (publishedSlugs.has(selectedPost.slug)) {
            console.log(`ℹ️ El artículo más reciente '${selectedPost.slug}' ya está en Facebook. Nada que publicar.`);
            process.exit(0);
        }
        selectedPost.publishMode = 'friday-new';
    } else {
        // Modo Martes (Backlog histórico): Selecciona el artículo más antiguo no publicado
        const pendingPosts = posts.filter(p => !publishedSlugs.has(p.slug) && !publishedSlugs.has(p.id));
        
        if (pendingPosts.length === 0) {
            console.log('ℹ️ ¡El backlog histórico está al día! No quedan artículos pendientes de publicar.');
            console.log('ℹ️ El sistema continuará automáticamente con los nuevos artículos de los viernes.');
            process.exit(0);
        }

        // Selecciona en orden cronológico (el más antiguo de los pendientes para avanzar en orden)
        selectedPost = pendingPosts[pendingPosts.length - 1];
        selectedPost.publishMode = 'tuesday-backlog';
        console.log(`📋 Artículos pendientes en el backlog: ${pendingPosts.length}`);
    }

    console.log(`📌 Post seleccionado: "${selectedPost.title}" (${selectedPost.slug})`);

    // 1. Generar tarjeta
    const cardPath = generateCard(selectedPost.slug);

    // 2. Publicar en Facebook
    await publishToFacebook(selectedPost, cardPath, dryRun);
}

if (require.main === module) {
    main().catch(err => {
        console.error('\n❌ Error en publicación de Facebook:', err.message);
        process.exit(1);
    });
}

module.exports = {
    buildSocialCopy,
    generateCard,
    publishToFacebook,
    loadHistory
};
