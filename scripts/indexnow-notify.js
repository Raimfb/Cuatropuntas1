/**
 * scripts/indexnow-notify.js
 * Constructora Cuatropuntas SpA
 * Notificador Automático de IndexNow para Bing, Copilot, Perplexity y motores asociados (Spec 028)
 *
 * Uso:
 *   node scripts/indexnow-notify.js              -> Envía todas las URLs de public/sitemap.xml
 *   node scripts/indexnow-notify.js --dry-run    -> Valida y muestra el payload sin hacer llamadas HTTP externas
 *   node scripts/indexnow-notify.js --url=<url>  -> Envía una URL específica
 */

const fs = require('fs');
const path = require('path');

const HOST = 'www.cuatropuntas.com';
const INDEXNOW_KEY = '4a9c8e1d7f2b5a3c6e0d9b8f7a6c5e4d';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
const SITEMAP_PATH = path.resolve(__dirname, '../public/sitemap.xml');

function extractSitemapUrls() {
    if (!fs.existsSync(SITEMAP_PATH)) {
        throw new Error(`No se encontró sitemap.xml en ${SITEMAP_PATH}`);
    }
    const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
    return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].trim());
}

async function notifyIndexNow(options = {}) {
    const isDryRun = Boolean(options.dryRun);
    const urls = options.urls && options.urls.length > 0 ? options.urls : extractSitemapUrls();

    const payload = {
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList: urls
    };

    if (isDryRun) {
        console.log(`✅ [IndexNow Dry-Run] Payload validado (${urls.length} URLs listas para enviar a api.indexnow.org)`);
        return { success: true, dryRun: true, count: urls.length, payload };
    }

    try {
        const res = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        console.log(`🚀 [IndexNow] Petición enviada para ${urls.length} URLs — HTTP ${res.status}`);
        return {
            success: res.status >= 200 && res.status < 300,
            status: res.status,
            count: urls.length
        };
    } catch (err) {
        console.warn(`⚠️ [IndexNow] Advertencia de red al notificar: ${err.message}`);
        return { success: false, error: err.message, count: urls.length };
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const urlArg = args.find(a => a.startsWith('--url='));
    const customUrls = urlArg ? [urlArg.split('=')[1]] : null;

    notifyIndexNow({ dryRun, urls: customUrls }).then(res => {
        if (!res.success && !dryRun) {
            process.exitCode = 0; // No bloquear CI ante caídas externas de IndexNow
        }
    });
}

module.exports = {
    INDEXNOW_KEY,
    KEY_LOCATION,
    extractSitemapUrls,
    notifyIndexNow
};
