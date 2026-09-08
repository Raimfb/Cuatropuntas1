/**
 * api/blog-comments.js
 * Constructora Cuatropuntas SpA
 * Endpoint Serverless para Gestión de Comentarios y Captura de Leads (Spec 005)
 *
 * Métodos:
 *  - GET /api/blog-comments?slug=[slug]
 *  - POST /api/blog-comments
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateName, validateEmail } = require('./_botGuard');

const DATA_DIR = path.join(__dirname, '..', 'data');
const COMMENTS_FILE = path.join(DATA_DIR, 'blog-comments.json');

/**
 * Sanitiza caracteres especiales para neutralizar inyecciones XSS
 */
function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Persistencia fail-safe de suscriptores/comentarios en Google Sheets
 */
async function persistCommentLeadToGoogleSheets(leadData, customTimeoutMs = 3500) {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn('⚠️ [COMMENTS PERSISTENCE] GOOGLE_SHEETS_WEBHOOK_URL no configurada. Saltando registro.');
        return { success: false, reason: 'URL_NOT_CONFIGURED' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), customTimeoutMs);

    try {
        const payload = {
            tipo: 'Comentario Blog',
            timestamp: new Date().toISOString(),
            fecha_hora_chile: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
            nombre: leadData.nombre,
            email: leadData.email,
            auth_provider: leadData.auth_provider || 'email',
            post_slug: leadData.slug,
            comentario: leadData.comentario,
            opt_in: true,
            origen: 'Blog Post Cuatropuntas'
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`⚠️ [COMMENTS PERSISTENCE] Sheets HTTP ${response.status}`);
            return { success: false, reason: `HTTP_${response.status}` };
        }

        return { success: true };
    } catch (error) {
        clearTimeout(timeoutId);
        const reason = error.name === 'AbortError' ? 'TIMEOUT_EXCEEDED' : error.message;
        console.error(`⚠️ [COMMENTS PERSISTENCE] Excepción: ${reason}`);
        return { success: false, reason };
    }
}

/**
 * Lee comentarios persistidos de data/blog-comments.json
 */
function readAllComments() {
    try {
        if (!fs.existsSync(COMMENTS_FILE)) {
            return [];
        }
        const data = fs.readFileSync(COMMENTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error leyendo blog-comments.json:', err);
        return [];
    }
}

/**
 * Guarda comentarios atómicamente en data/blog-comments.json
 */
function saveComment(commentItem) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const comments = readAllComments();
        comments.unshift(commentItem);
        fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error guardando comentario en archivo:', err);
        return false;
    }
}

/**
 * Handler Serverless principal
 */
async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // --- GET /api/blog-comments?slug=[slug] ---
    if (req.method === 'GET') {
        const slug = req.query?.slug || req.query?.post_slug;
        if (!slug) {
            return res.status(400).json({ error: 'Parámetro slug es obligatorio.' });
        }

        const allComments = readAllComments();
        const filtered = allComments.filter(c => c.slug === slug);

        return res.status(200).json({
            success: true,
            count: filtered.length,
            comments: filtered
        });
    }

    // --- POST /api/blog-comments ---
    if (req.method === 'POST') {
        try {
            const body = req.body || {};

            // 1. Filtrado de Honeypots Invisibles (Bots maliciosos)
            if (body.website_url || body._hp_check) {
                console.log(`[BOT HONEYPOT BLOCKED api/blog-comments.js] Email: ${body?.email}`);
                return res.status(200).json({
                    success: true,
                    message: 'Comentario recibido correctamente.'
                });
            }

            const { slug, name, email, comment, auth_provider, picture } = body;

            // 2. Validación de campos obligatorios
            if (!slug || !name || !email || !comment) {
                return res.status(400).json({
                    error: 'Faltan campos obligatorios: slug, name, email y comment son requeridos.'
                });
            }

            // 3. Validación de Longitud de Comentario (10 a 1000 caracteres)
            const trimmedComment = String(comment).trim();
            if (trimmedComment.length < 10) {
                return res.status(400).json({
                    error: 'El comentario debe tener al menos 10 caracteres.'
                });
            }
            if (trimmedComment.length > 1000) {
                return res.status(400).json({
                    error: 'El comentario no puede exceder los 1.000 caracteres.'
                });
            }

            // 4. Validación de Email y Nombre
            const trimmedEmail = String(email).trim();
            const emailErr = validateEmail(trimmedEmail);
            if (emailErr) {
                return res.status(400).json({ error: `Formato de correo inválido: ${emailErr}` });
            }

            const trimmedName = String(name).trim();
            const nameErr = validateName(trimmedName);
            if (nameErr) {
                return res.status(400).json({ error: `Nombre inválido: ${nameErr}` });
            }

            // 5. Sanitización Anti-XSS
            const safeName = escapeHtml(trimmedName);
            const safeComment = escapeHtml(trimmedComment);

            // 6. Persistencia Fail-Safe en Google Sheets
            await persistCommentLeadToGoogleSheets({
                nombre: safeName,
                email: trimmedEmail,
                slug,
                comentario: safeComment,
                auth_provider: auth_provider || 'email'
            });

            // 7. Almacenamiento local del comentario
            const newComment = {
                id: crypto.randomUUID(),
                slug,
                name: safeName,
                email: trimmedEmail,
                comment: safeComment,
                auth_provider: auth_provider || 'email',
                picture: picture || null,
                date: new Date().toISOString()
            };

            saveComment(newComment);

            // 8. Respuesta exitosa con el comentario publicado (omitiendo email privado del retorno)
            return res.status(201).json({
                success: true,
                message: 'Comentario publicado con éxito.',
                comment: {
                    id: newComment.id,
                    slug: newComment.slug,
                    name: newComment.name,
                    comment: newComment.comment,
                    auth_provider: newComment.auth_provider,
                    picture: newComment.picture,
                    date: newComment.date
                }
            });

        } catch (error) {
            console.error('Error en api/blog-comments:', error);
            return res.status(500).json({
                error: `Error interno al procesar el comentario: ${error.message}`
            });
        }
    }

    return res.status(405).json({ error: 'Método no permitido.' });
}

module.exports = handler;
module.exports.escapeHtml = escapeHtml;
module.exports.persistCommentLeadToGoogleSheets = persistCommentLeadToGoogleSheets;
module.exports.readAllComments = readAllComments;
module.exports.saveComment = saveComment;
