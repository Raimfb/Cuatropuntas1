/**
 * api/blog-publish.js
 * Constructora Cuatropuntas SpA
 * Endpoint Serverless para Ingesta y Publicación Automatizada del Blog (Spec 003)
 *
 * Método: POST /api/blog-publish
 * Headers: Authorization: Bearer <process.env.BLOG_PUBLISH_SECRET>
 * Body: { markdown: "..." } o { title, slug, content, ... }
 */

const crypto = require('crypto');
const { compileAndPublishPost, parseMarkdownWithFrontmatter } = require('../scripts/publish-blog');

/**
 * Valida el encabezado Authorization: Bearer <token> usando comparación constante en tiempo
 */
function isAuthorized(req) {
    const secret = process.env.BLOG_PUBLISH_SECRET;
    if (!secret) return false;

    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) return false;

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return false;

    const token = match[1].trim();
    const tokenBuf = Buffer.from(token, 'utf8');
    const secretBuf = Buffer.from(secret, 'utf8');

    if (tokenBuf.length !== secretBuf.length) return false;
    return crypto.timingSafeEqual(tokenBuf, secretBuf);
}

module.exports = async function handler(req, res) {
    // 1. Validar Método HTTP
    if (req.method && req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Solo se acepta POST.' });
    }

    // 2. Validar Autenticación Bearer Token
    if (!isAuthorized(req)) {
        return res.status(401).json({
            error: 'No autorizado: Token de publicación inválido o no proporcionado.'
        });
    }

    try {
        const body = req.body || {};
        let postPayload = {};

        // 3. Procesar según formato (Markdown con frontmatter o JSON plano)
        if (body.markdown && typeof body.markdown === 'string') {
            const parsed = parseMarkdownWithFrontmatter(body.markdown);
            postPayload = {
                ...parsed.metadata,
                content: parsed.content,
                ...body // Permitir sobreescritura de parámetros si vienen en el body
            };
        } else {
            postPayload = { ...body };
        }

        // 4. Validar campos obligatorios
        if (!postPayload.title || !postPayload.slug || !postPayload.content) {
            return res.status(400).json({
                error: 'Faltan campos obligatorios: title, slug y content son requeridos.'
            });
        }

        // 5. Compilar y sincronizar atómicamente
        const result = compileAndPublishPost(postPayload);

        return res.status(200).json({
            success: true,
            slug: result.slug,
            url: result.url,
            message: 'Artículo publicado y catálogos sincronizados con éxito.'
        });

    } catch (error) {
        console.error('Error en api/blog-publish:', error);
        return res.status(500).json({
            error: `Error interno al procesar publicación: ${error.message}`
        });
    }
};
