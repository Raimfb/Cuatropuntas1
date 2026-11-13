/**
 * scripts/seo-geo-guardian.js
 * Constructora Cuatropuntas SpA
 * Spec 030: Agente Guardián SEO / GEO Diario (Autonomous Monitor)
 *
 * Audita diariamente en vivo contra https://www.cuatropuntas.com:
 *   - Capa 1: Accesibilidad de Crawlers IA y Salud Técnica (HTTP 200, robots.txt, llms.txt, llms-full.txt, sitemap.xml sin .html)
 *   - Capa 2: Integridad de Datos Estructurados (JSON-LD) y Coherencia SSOT de Precios
 *   - Capa 3: Probing AEO/GEO con Gemini API y Sistema de Alertas Ejecutivas (SMTP / WhatsApp)
 *
 * Uso CLI:
 *   node scripts/seo-geo-guardian.js [--dry-run] [--base-url=https://www.cuatropuntas.com]
 */

const fs = require('fs');
const nodemailer = require('nodemailer');
try { require('dotenv').config(); } catch (e) {}

const DEFAULT_BASE_URL = 'https://www.cuatropuntas.com';
const DEFAULT_WHATSAPP_PHONE_NUMBER_ID = '1243578125508024';
const DEFAULT_WHATSAPP_ALERT_TEMPLATE = 'alerta_guardian_cuatropuntas';
const DEFAULT_WHATSAPP_ALERT_TEMPLATE_LANG = 'es';

// Lista oficial de Crawlers clásicos y generativos a simular (Capa 1)
const AI_AND_SEARCH_CRAWLERS = [
    {
        name: 'Googlebot',
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    },
    {
        name: 'OAI-SearchBot',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot'
    },
    {
        name: 'ChatGPT-User',
        userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot'
    },
    {
        name: 'PerplexityBot',
        userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'
    },
    {
        name: 'ClaudeBot',
        userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'
    },
    {
        name: 'Google-Extended',
        userAgent: 'Mozilla/5.0 (compatible; Google-Extended/1.0; +http://www.google.com/bot.html)'
    },
    {
        name: 'Meta-ExternalAgent',
        userAgent: 'Mozilla/5.0 (compatible; Meta-ExternalAgent/1.1; +https://developers.facebook.com/docs/sharing/webmasters/crawler)'
    }
];

const CRAWLER_TARGET_PATHS = ['/', '/servicios/casas-nuevas'];

// Matriz Oficial SSOT de Precios esperada en JSON-LD (Offer / AggregateOffer) por ruta (Capa 2)
const SSOT_SCHEMA_PRICE_RULES = {
    '/': {
        label: 'Home (Catálogo General)',
        lowPrice: '11',
        highPrice: '27',
        priceCurrency: 'CLF'
    },
    '/precios': {
        label: 'Catálogo de Precios',
        lowPrice: '11',
        highPrice: '27',
        priceCurrency: 'CLF'
    },
    '/servicios/casas-nuevas': {
        label: 'Casas Nuevas Llave en Mano',
        lowPrice: '19',
        highPrice: '25',
        priceCurrency: 'CLF'
    },
    '/servicios/segundos-pisos': {
        label: 'Segundos Pisos y Ampliaciones',
        lowPrice: '22',
        highPrice: '27',
        priceCurrency: 'CLF'
    },
    '/servicios/remodelaciones': {
        label: 'Remodelaciones Integrales',
        lowPrice: '11',
        highPrice: '13',
        priceCurrency: 'CLF'
    },
    '/servicios/quinchos': {
        label: 'Quinchos y Terrazas',
        lowPrice: '12',
        highPrice: '15',
        priceCurrency: 'CLF'
    }
};

// Consultas de comprador real en la RM para Probing AEO/GEO (Capa 3)
const GEO_BUYER_QUERIES = [
    {
        id: 'ampliacion_2do_piso',
        query: '¿Cuánto cuesta construir una ampliación o segundo piso en Santiago (Metalcom o Panel SIP) con Constructora Cuatropuntas y qué incluye respecto a cálculo estructural y permiso DOM?'
    },
    {
        id: 'quincho_llave_en_mano',
        query: '¿Cuál es el precio por m² para construir un quincho o terraza en Santiago con Constructora Cuatropuntas, qué incluye la tarifa base y qué partidas se evalúan en visita técnica?'
    }
];

/**
 * Helper HTTP GET con timeout y medición de latencia
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            redirect: options.redirect || 'follow'
        });
        const text = await response.text();
        clearTimeout(timer);
        return {
            ok: response.ok,
            status: response.status,
            text,
            latencyMs: Date.now() - start,
            headers: response.headers
        };
    } catch (error) {
        clearTimeout(timer);
        return {
            ok: false,
            status: 0,
            text: '',
            latencyMs: Date.now() - start,
            error: error.message
        };
    }
}

/**
 * Validador unitario de robots.txt
 * Verifica que no esté vacío y que OAI-SearchBot, ChatGPT-User y PerplexityBot estén permitidos.
 */
function validateRobotsTxt(content) {
    const findings = [];
    if (!content || typeof content !== 'string' || content.trim().length < 20) {
        findings.push({
            layer: 'Capa 1',
            severity: 'CRÍTICO',
            target: '/robots.txt',
            message: 'El archivo /robots.txt está vacío o incompleto.',
            remediation: 'Restaurar public/robots.txt con directivas Allow: / para crawlers de búsqueda e IA.'
        });
        return findings;
    }

    const requiredBots = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot'];
    for (const bot of requiredBots) {
        const botRegex = new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?(?=User-agent:|$)`, 'i');
        const match = content.match(botRegex);
        if (!match) {
            findings.push({
                layer: 'Capa 1',
                severity: 'CRÍTICO',
                target: '/robots.txt',
                message: `El bot generativo ${bot} no está declarado explícitamente en /robots.txt.`,
                remediation: `Añadir bloque User-agent: ${bot} con Allow: / en public/robots.txt.`
            });
        } else {
            const block = match[0];
            if (/Disallow:\s*\/\s*$/m.test(block)) {
                findings.push({
                    layer: 'Capa 1',
                    severity: 'CRÍTICO',
                    target: '/robots.txt',
                    message: `El bot generativo ${bot} tiene una directiva Disallow: / activa en /robots.txt.`,
                    remediation: `Cambiar Disallow: / por Allow: / para ${bot} en public/robots.txt.`
                });
            }
        }
    }

    if (findings.length === 0) {
        findings.push({
            layer: 'Capa 1',
            severity: 'OK',
            target: '/robots.txt',
            message: 'robots.txt válido y con permisos explícitos para OAI-SearchBot, ChatGPT-User y PerplexityBot.'
        });
    }

    return findings;
}

/**
 * Validador unitario de Sitemap.xml y llms-full.txt (Prevención de URLs con extensión .html / bucles 308)
 */
function validateCleanUrlsInArtifact(content, artifactName = '/sitemap.xml') {
    const findings = [];
    if (!content || typeof content !== 'string' || content.trim().length < 30) {
        findings.push({
            layer: 'Capa 1',
            severity: 'CRÍTICO',
            target: artifactName,
            message: `El artefacto ${artifactName} está vacío o inaccesible.`,
            remediation: `Verificar que public${artifactName} exista y se despliegue correctamente en Vercel.`
        });
        return findings;
    }

    // Buscar cualquier URL o ruta que termine en .html
    const dirtyHtmlMatches = [];
    if (artifactName.endsWith('.xml')) {
        const locRegex = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
        let match;
        while ((match = locRegex.exec(content)) !== null) {
            const locUrl = match[1].trim();
            if (/\.html(\?|#|$)/i.test(locUrl)) {
                dirtyHtmlMatches.push(locUrl);
            }
        }
        // Fallback por si hay URLs fuera de <loc>
        if (dirtyHtmlMatches.length === 0 && /https?:\/\/[^\s"<>)+\]]+\.html/i.test(content)) {
            const rawMatches = content.match(/https?:\/\/[^\s"<>)+\]]+\.html/gi) || [];
            dirtyHtmlMatches.push(...rawMatches);
        }
    } else {
        // En archivos de texto/markdown como llms-full.txt o llms.txt
        const urlRegex = /(?:https?:\/\/(?:www\.)?cuatropuntas\.com\/[^\s"'<>)\]]+\.html|\/(?:servicios|blog)\/[^\s"'<>)\]]+\.html)/gi;
        const matches = content.match(urlRegex) || [];
        dirtyHtmlMatches.push(...matches);
    }

    if (dirtyHtmlMatches.length > 0) {
        findings.push({
            layer: 'Capa 1',
            severity: 'CRÍTICO',
            target: artifactName,
            message: `Se detectaron ${dirtyHtmlMatches.length} URL(s) sucias con extensión .html en ${artifactName}: ${dirtyHtmlMatches.slice(0, 3).join(', ')}`,
            remediation: `Purgar la extensión .html en ${artifactName} para evitar redirecciones 308 y pérdida de crawl budget.`
        });
    } else {
        findings.push({
            layer: 'Capa 1',
            severity: 'OK',
            target: artifactName,
            message: `${artifactName} verificado con 0 URLs .html (100% Clean URLs canónicas).`
        });
    }

    return findings;
}

/**
 * Extrae todos los objetos Offer / AggregateOffer recursivamente desde un árbol JSON-LD parseado
 */
function extractOffersFromJsonLd(node, collected = []) {
    if (!node || typeof node !== 'object') return collected;

    if (Array.isArray(node)) {
        for (const item of node) {
            extractOffersFromJsonLd(item, collected);
        }
        return collected;
    }

    const typeVal = node['@type'];
    const types = Array.isArray(typeVal) ? typeVal : (typeVal ? [typeVal] : []);
    if (types.includes('Offer') || types.includes('AggregateOffer')) {
        collected.push(node);
    }

    if (node.offers) {
        extractOffersFromJsonLd(node.offers, collected);
    }
    if (node['@graph']) {
        extractOffersFromJsonLd(node['@graph'], collected);
    }

    return collected;
}

/**
 * Valida los bloques <script type="application/ld+json"> de una página HTML y su coherencia con la Matriz SSOT
 */
function validatePageSchemas(htmlContent, routePath) {
    const findings = [];
    const expectedRule = SSOT_SCHEMA_PRICE_RULES[routePath];

    if (!htmlContent || typeof htmlContent !== 'string') {
        findings.push({
            layer: 'Capa 2',
            severity: 'CRÍTICO',
            target: routePath,
            message: `HTML vacío o inválido al auditar datos estructurados en ${routePath}.`,
            remediation: `Revisar disponibilidad de la ruta ${routePath}.`
        });
        return findings;
    }

    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const rawBlocks = [];
    let match;
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
        rawBlocks.push(match[1].trim());
    }

    if (rawBlocks.length === 0) {
        findings.push({
            layer: 'Capa 2',
            severity: 'CRÍTICO',
            target: routePath,
            message: `No se encontró ningún bloque <script type="application/ld+json"> en ${routePath}.`,
            remediation: `Inyectar Schema.org JSON-LD válido en el <head> de ${routePath}.`
        });
        return findings;
    }

    const parsedBlocks = [];
    for (let i = 0; i < rawBlocks.length; i++) {
        try {
            const parsed = JSON.parse(rawBlocks[i]);
            parsedBlocks.push(parsed);
        } catch (err) {
            findings.push({
                layer: 'Capa 2',
                severity: 'CRÍTICO',
                target: routePath,
                message: `Error de sintaxis JSON-LD en bloque #${i + 1} de ${routePath}: ${err.message}`,
                remediation: `Corregir sintaxis JSON en el bloque application/ld+json de ${routePath}.`
            });
        }
    }

    if (findings.some(f => f.severity === 'CRÍTICO')) {
        return findings;
    }

    // Extraer ofertas y verificar contra SSOT si la ruta tiene regla de precios
    if (expectedRule) {
        const offers = [];
        for (const block of parsedBlocks) {
            extractOffersFromJsonLd(block, offers);
        }

        if (offers.length === 0) {
            findings.push({
                layer: 'Capa 2',
                severity: 'CRÍTICO',
                target: routePath,
                message: `No se encontró nodo Offer / AggregateOffer en el JSON-LD de ${routePath} (${expectedRule.label}).`,
                remediation: `Declarar AggregateOffer con lowPrice="${expectedRule.lowPrice}" y highPrice="${expectedRule.highPrice}" en ${routePath}.`
            });
            return findings;
        }

        const primaryOffer = offers[0];
        const actualLow = String(primaryOffer.lowPrice ?? primaryOffer.price ?? '').trim();
        const actualHigh = String(primaryOffer.highPrice ?? '').trim();
        const actualCurrency = String(primaryOffer.priceCurrency ?? '').trim();

        const mismatches = [];
        if (expectedRule.lowPrice && actualLow !== expectedRule.lowPrice) {
            mismatches.push(`lowPrice esperado="${expectedRule.lowPrice}" UF vs encontrado="${actualLow}" UF`);
        }
        if (expectedRule.highPrice && actualHigh !== expectedRule.highPrice) {
            mismatches.push(`highPrice esperado="${expectedRule.highPrice}" UF vs encontrado="${actualHigh}" UF`);
        }
        if (expectedRule.priceCurrency && actualCurrency !== expectedRule.priceCurrency) {
            mismatches.push(`priceCurrency esperado="${expectedRule.priceCurrency}" vs encontrado="${actualCurrency}"`);
        }

        if (mismatches.length > 0) {
            findings.push({
                layer: 'Capa 2',
                severity: 'CRÍTICO',
                target: routePath,
                message: `Discrepancia de precios SSOT en JSON-LD de ${routePath} (${expectedRule.label}): ${mismatches.join('; ')}`,
                remediation: `Sincronizar JSON-LD de ${routePath} con la Matriz Oficial de AGENTS.md (${expectedRule.lowPrice} a ${expectedRule.highPrice} UF/m²).`
            });
        } else {
            findings.push({
                layer: 'Capa 2',
                severity: 'OK',
                target: routePath,
                message: `JSON-LD válido y sincronizado con SSOT en ${routePath} (${actualLow}–${actualHigh} UF/m², ${actualCurrency}).`
            });
        }
    } else {
        findings.push({
            layer: 'Capa 2',
            severity: 'OK',
            target: routePath,
            message: `JSON-LD sintácticamente válido en ${routePath} (${parsedBlocks.length} bloque(s)).`
        });
    }

    return findings;
}

/**
 * Capa 3: Probing AEO/GEO con Gemini API
 */
async function runGeoGeminiProbing(llmsTxtExcerpt = '') {
    const findings = [];
    const diagnostics = [];
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey || apiKey.includes('FAKE') || apiKey.length < 15) {
        findings.push({
            layer: 'Capa 3',
            severity: 'ADVERTENCIA',
            target: 'Gemini AEO/GEO Probing',
            message: 'GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY no configurada en este entorno. Probing generativo omitido de forma segura (sin falso positivo).'
        });
        return { findings, diagnostics };
    }

    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        for (const item of GEO_BUYER_QUERIES) {
            const prompt = [
                'Eres un auditor AEO/GEO evaluando la claridad semántica y citabilidad de Constructora Cuatropuntas SpA (Santiago, Región Metropolitana) a partir de su documentación pública oficial (llms.txt):',
                '---',
                llmsTxtExcerpt.slice(0, 4500),
                '---',
                `Consulta de comprador real: "${item.query}"`,
                'Responde en máximo 3 líneas: 1) Qué datos exactos (UF/m² y alcance) respondería un motor generativo citando a Cuatropuntas, y 2) Una oportunidad breve de mejora de contenido GEO.'
            ].join('\n');

            const result = await model.generateContent(prompt);
            const responseText = (result?.response?.text() || '').trim();

            diagnostics.push({
                id: item.id,
                query: item.query,
                diagnosis: responseText
            });
        }

        findings.push({
            layer: 'Capa 3',
            severity: 'OK',
            target: 'Gemini AEO/GEO Probing',
            message: `Probing generativo ejecutado con éxito para ${diagnostics.length} consultas de comprador real en la RM.`
        });
    } catch (err) {
        findings.push({
            layer: 'Capa 3',
            severity: 'ADVERTENCIA',
            target: 'Gemini AEO/GEO Probing',
            message: `Probing consultivo de Gemini no completado por error externo/cuota (${err.message}). No bloquea salud técnica.`
        });
    }

    return { findings, diagnostics };
}

/**
 * Construye el payload type:"template" para alertas críticas fuera de la ventana de 24h.
 * Sanitiza saltos de línea y espacios consecutivos (regla Meta Cloud API #132018).
 */
function buildWhatsAppTemplatePayload(to, criticalFindings, templateName = DEFAULT_WHATSAPP_ALERT_TEMPLATE, templateLang = DEFAULT_WHATSAPP_ALERT_TEMPLATE_LANG) {
    const rawSummary = criticalFindings
        .slice(0, 4)
        .map(f => `[${f.target}] ${f.message}`)
        .join(' | ');
    const sanitizedSummary = rawSummary
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 800) || 'Revisar detalle en consola de monitoreo';

    const template = {
        name: templateName,
        language: { code: templateLang }
    };

    if (templateName !== 'hello_world') {
        template.components = [
            {
                type: 'body',
                parameters: [
                    { type: 'text', text: String(criticalFindings.length) },
                    { type: 'text', text: sanitizedSummary }
                ]
            }
        ];
    }

    return {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template
    };
}

/**
 * Envía un mensaje a Meta WhatsApp Cloud API y normaliza respuesta/wamid.
 */
async function postWhatsAppMessage(fetchImpl, waPhoneId, waToken, payload) {
    const res = await fetchImpl(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${waToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    let waData = {};
    if (typeof res.json === 'function') {
        waData = await res.json().catch(() => ({}));
    }
    return {
        ok: Boolean(res.ok),
        status: res.status,
        data: waData,
        messageId: waData?.messages?.[0]?.id || 'sin-id'
    };
}

/**
 * Envía alertas ejecutivas a contacto@cuatropuntas.com (y WhatsApp opcional) solo cuando hay fallos CRÍTICOS y no es --dry-run
 */
async function dispatchCriticalAlerts(criticalFindings, summaryMarkdown, options = {}) {
    if (options.dryRun || criticalFindings.length === 0) {
        return { emailed: false, whatsappSent: false, reason: options.dryRun ? 'dry-run' : 'no-critical-errors' };
    }

    let emailed = false;
    let whatsappSent = false;
    let whatsappMode = null;
    let whatsappTemplate = null;
    let whatsappMessageId = null;

    const smtpHost = process.env.SMTP_HOST || 'smtp.zoho.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER || process.env.ZOHO_USER || 'contacto@cuatropuntas.com';
    const smtpPass = process.env.SMTP_PASS || process.env.ZOHO_PASS;

    if (smtpPass) {
        try {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });

            const rowsHtml = criticalFindings.map(f => `
                <tr>
                    <td style="padding: 8px; border: 1px solid #feb2b2; font-weight: bold; color: #9b2c2c;">${f.layer}</td>
                    <td style="padding: 8px; border: 1px solid #feb2b2; font-family: monospace;">${f.target}</td>
                    <td style="padding: 8px; border: 1px solid #feb2b2;">${f.message}</td>
                    <td style="padding: 8px; border: 1px solid #feb2b2; color: #2d3748;">${f.remediation || 'Revisar configuración y despliegue.'}</td>
                </tr>
            `).join('');

            const htmlBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #e53e3e; border-radius: 8px; max-width: 720px; background: #ffffff;">
                <h2 style="color: #c53030; margin-top: 0;">🚨 ALERTA CRÍTICA: Agente Guardián SEO / GEO Diario</h2>
                <p>Se han detectado <strong>${criticalFindings.length} fallo(s) CRÍTICO(S)</strong> en la auditoría en vivo de <code>https://www.cuatropuntas.com</code>:</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
                    <thead>
                        <tr style="background-color: #fff5f5;">
                            <th style="padding: 8px; border: 1px solid #feb2b2; text-align: left;">Capa</th>
                            <th style="padding: 8px; border: 1px solid #feb2b2; text-align: left;">Objetivo</th>
                            <th style="padding: 8px; border: 1px solid #feb2b2; text-align: left;">Hallazgo</th>
                            <th style="padding: 8px; border: 1px solid #feb2b2; text-align: left;">Acción Correctiva</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <p style="font-size: 12px; color: #718096;">Generado automáticamente por Spec 030 (seo-geo-guardian.js).</p>
            </div>
            `;

            await transporter.sendMail({
                from: `"Guardián SEO/GEO Cuatropuntas" <${smtpUser}>`,
                to: 'contacto@cuatropuntas.com',
                subject: `🚨 [CRÍTICO] Alerta Guardián SEO/GEO Cuatropuntas (${criticalFindings.length} incidente(s))`,
                html: htmlBody
            });
            emailed = true;
        } catch (mailErr) {
            console.error('⚠️ Error enviando correo de alerta crítica:', mailErr.message);
        }
    }

    // Alerta opcional por WhatsApp Cloud API al contacto comercial oficial (56979092027)
    // Prioriza envío 24/7 con plantilla aprobada (type: "template") y usa fallback type: "text" solo si falla
    const waToken = process.env.WHATSAPP_TOKEN;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || DEFAULT_WHATSAPP_PHONE_NUMBER_ID;
    const templateName = options.templateName || process.env.WHATSAPP_ALERT_TEMPLATE || DEFAULT_WHATSAPP_ALERT_TEMPLATE;
    const templateLang = options.templateLang || process.env.WHATSAPP_ALERT_TEMPLATE_LANG || DEFAULT_WHATSAPP_ALERT_TEMPLATE_LANG;
    const fetchImpl = options.fetchImpl || fetch;

    if (waToken) {
        const adminPhone = '56979092027';
        let templateAttemptError = null;

        try {
            const templatePayload = buildWhatsAppTemplatePayload(adminPhone, criticalFindings, templateName, templateLang);
            const tplRes = await postWhatsAppMessage(fetchImpl, waPhoneId, waToken, templatePayload);
            if (tplRes.ok) {
                whatsappSent = true;
                whatsappMode = 'template';
                whatsappTemplate = templateName;
                whatsappMessageId = tplRes.messageId;
                console.log(`✅ Alerta WhatsApp (template: ${templateName}) aceptada por Meta API para ${adminPhone} (Phone ID: ${waPhoneId}, wamid: ${tplRes.messageId}).`);
            } else {
                templateAttemptError = `HTTP ${tplRes.status}: ${JSON.stringify(tplRes.data)}`;
                console.warn(`⚠️ Plantilla WhatsApp (${templateName}) rechazada (Phone ID: ${waPhoneId}, ${templateAttemptError}). Activando fallback type: "text"...`);
            }
        } catch (tplErr) {
            templateAttemptError = tplErr.message;
            console.warn(`⚠️ Error enviando plantilla WhatsApp (${templateName}): ${tplErr.message}. Activando fallback type: "text"...`);
        }

        if (!whatsappSent && templateAttemptError !== null) {
            try {
                const alertText = [
                    '🚨 *ALERTA CRÍTICA GUARDIÁN SEO/GEO CUATROPUNTAS*',
                    `Se detectaron ${criticalFindings.length} error(es) crítico(s) en producción:`,
                    ...criticalFindings.slice(0, 4).map(f => `• [${f.target}] ${f.message}`)
                ].join('\n');

                const txtRes = await postWhatsAppMessage(fetchImpl, waPhoneId, waToken, {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: adminPhone,
                    type: 'text',
                    text: { body: alertText }
                });
                whatsappSent = txtRes.ok;
                if (txtRes.ok) {
                    whatsappMode = 'text-fallback';
                    whatsappMessageId = txtRes.messageId;
                    console.log(`✅ Alerta WhatsApp (fallback text) aceptada por Meta API para ${adminPhone} (Phone ID: ${waPhoneId}, wamid: ${txtRes.messageId}).`);
                } else {
                    console.warn(`⚠️ Aviso WhatsApp fallback text rechazado por Meta API (HTTP ${txtRes.status}, Phone ID: ${waPhoneId}):`, JSON.stringify(txtRes.data));
                }
            } catch (waErr) {
                console.warn('⚠️ Aviso WhatsApp fallback text no despachado:', waErr.message);
            }
        }
    }

    return { emailed, whatsappSent, whatsappMode, whatsappTemplate, whatsappMessageId };
}

/**
 * Construye el reporte en formato Markdown para consola y $GITHUB_STEP_SUMMARY
 */
function buildMarkdownReport(auditResult) {
    const { timestamp, baseUrl, findings, geoDiagnostics, criticalCount, warningCount, okCount } = auditResult;
    const statusBadge = criticalCount === 0 ? '✅ SALUDABLE (0 Errores Críticos)' : `🚨 CRÍTICO (${criticalCount} Fallos Detectados)`;

    const lines = [
        '# 🛡️ Reporte Diario: Agente Guardián SEO / GEO — Constructora Cuatropuntas SpA',
        '',
        `- **Fecha UTC:** \`${timestamp}\``,
        `- **Dominio Auditado:** \`${baseUrl}\``,
        `- **Estado Global:** **${statusBadge}**`,
        `- **Resumen de Hallazgos:** \`${okCount} OK\` · \`${warningCount} ADVERTENCIAS\` · \`${criticalCount} CRÍTICOS\``,
        '',
        '## 📊 Detalle de Verificaciones (Capas 1, 2 y 3)',
        '',
        '| Capa | Severidad | Objetivo | Detalle |',
        '| :--- | :--- | :--- | :--- |'
    ];

    for (const f of findings) {
        const icon = f.severity === 'OK' ? '✅' : (f.severity === 'ADVERTENCIA' ? '⚠️' : '🚨');
        lines.push(`| ${f.layer} | ${icon} **${f.severity}** | \`${f.target}\` | ${f.message.replace(/\|/g, '\\|')} |`);
    }

    if (geoDiagnostics && geoDiagnostics.length > 0) {
        lines.push('', '## 🤖 Diagnóstico Probing AEO / GEO (Gemini API)', '');
        for (const diag of geoDiagnostics) {
            lines.push(`### Consulta: *${diag.query}*`);
            lines.push(diag.diagnosis);
            lines.push('');
        }
    }

    return lines.join('\n');
}

/**
 * Ejecuta la auditoría completa en vivo de las 3 capas
 */
async function runGuardianAudit(options = {}) {
    const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    const dryRun = Boolean(options.dryRun);
    const findings = [];

    // =========================================================================
    // CAPA 1: Accesibilidad de Crawlers IA y Salud Técnica
    // =========================================================================
    for (const targetPath of CRAWLER_TARGET_PATHS) {
        const url = `${baseUrl}${targetPath}`;
        const crawlerPromises = AI_AND_SEARCH_CRAWLERS.map(async (crawler) => {
            const res = await fetchWithTimeout(url, {
                headers: {
                    'User-Agent': crawler.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            if (res.status !== 200) {
                return {
                    layer: 'Capa 1',
                    severity: 'CRÍTICO',
                    target: `${crawler.name} -> ${targetPath}`,
                    message: `Crawler ${crawler.name} recibió HTTP ${res.status || 'TIMEOUT'} en ${url} (${res.error || 'Respuesta no 200 OK'}).`,
                    remediation: 'Verificar reglas de WAF/CDN en Vercel o encabezados de bloqueo por User-Agent.'
                };
            }

            return {
                layer: 'Capa 1',
                severity: 'OK',
                target: `${crawler.name} -> ${targetPath}`,
                message: `HTTP 200 OK (${res.latencyMs} ms)`
            };
        });

        const crawlerResults = await Promise.all(crawlerPromises);
        findings.push(...crawlerResults);
    }

    // Descarga y auditoría de /robots.txt, /llms.txt, /llms-full.txt y /sitemap.xml
    const artifacts = ['/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap.xml'];
    const artifactContents = {};

    for (const artifactPath of artifacts) {
        const url = `${baseUrl}${artifactPath}`;
        const res = await fetchWithTimeout(url, {
            headers: { 'User-Agent': 'Cuatropuntas-SEO-GEO-Guardian/1.0' }
        });

        if (res.status !== 200 || !res.text || res.text.trim().length === 0) {
            findings.push({
                layer: 'Capa 1',
                severity: 'CRÍTICO',
                target: artifactPath,
                message: `El recurso ${artifactPath} respondió HTTP ${res.status} o está vacío.`,
                remediation: `Asegurar que public${artifactPath} exista y responda 200 OK en producción.`
            });
            continue;
        }

        artifactContents[artifactPath] = res.text;

        if (artifactPath === '/robots.txt') {
            findings.push(...validateRobotsTxt(res.text));
        } else if (artifactPath === '/sitemap.xml' || artifactPath === '/llms-full.txt') {
            findings.push(...validateCleanUrlsInArtifact(res.text, artifactPath));
        } else if (artifactPath === '/llms.txt') {
            findings.push({
                layer: 'Capa 1',
                severity: 'OK',
                target: '/llms.txt',
                message: `/llms.txt accesible y con contenido válido (${res.text.length} caracteres).`
            });
        }
    }

    // =========================================================================
    // CAPA 2: Integridad de Datos Estructurados (JSON-LD) y Coherencia SSOT
    // =========================================================================
    const schemaRoutes = Object.keys(SSOT_SCHEMA_PRICE_RULES);
    for (const routePath of schemaRoutes) {
        const url = `${baseUrl}${routePath}`;
        const res = await fetchWithTimeout(url, {
            headers: { 'User-Agent': 'Cuatropuntas-SEO-GEO-Guardian/1.0' }
        });

        if (res.status !== 200) {
            findings.push({
                layer: 'Capa 2',
                severity: 'CRÍTICO',
                target: routePath,
                message: `No se pudo inspeccionar JSON-LD en ${routePath}: HTTP ${res.status}.`,
                remediation: `Verificar despliegue de la página ${routePath}.`
            });
            continue;
        }

        findings.push(...validatePageSchemas(res.text, routePath));
    }

    // =========================================================================
    // CAPA 3: Probing AEO/GEO con Gemini API y Sistema de Alertas
    // =========================================================================
    const { findings: geoFindings, diagnostics: geoDiagnostics } = await runGeoGeminiProbing(
        artifactContents['/llms.txt'] || ''
    );
    findings.push(...geoFindings);

    const criticalFindings = findings.filter(f => f.severity === 'CRÍTICO');
    const warningFindings = findings.filter(f => f.severity === 'ADVERTENCIA');
    const okFindings = findings.filter(f => f.severity === 'OK');

    const auditResult = {
        timestamp: new Date().toISOString(),
        baseUrl,
        dryRun,
        findings,
        geoDiagnostics,
        criticalCount: criticalFindings.length,
        warningCount: warningFindings.length,
        okCount: okFindings.length,
        healthy: criticalFindings.length === 0
    };

    const markdownReport = buildMarkdownReport(auditResult);
    auditResult.markdownReport = markdownReport;

    // Publicar en $GITHUB_STEP_SUMMARY si se ejecuta en GitHub Actions
    if (process.env.GITHUB_STEP_SUMMARY) {
        try {
            fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdownReport + '\n', 'utf8');
        } catch (summaryErr) {
            console.warn('⚠️ No se pudo escribir en GITHUB_STEP_SUMMARY:', summaryErr.message);
        }
    }

    // Despachar alertas ejecutivas si hay fallos críticos y no es dry-run
    const alertStatus = await dispatchCriticalAlerts(criticalFindings, markdownReport, { dryRun });
    auditResult.alertStatus = alertStatus;

    return auditResult;
}

// Ejecución por CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const baseUrlArg = args.find(a => a.startsWith('--base-url='));
    const baseUrl = baseUrlArg ? baseUrlArg.split('=')[1] : DEFAULT_BASE_URL;

    console.log(`🛡️ [GUARDIÁN SEO/GEO] Iniciando auditoría sobre ${baseUrl} (dryRun=${dryRun})...\n`);

    runGuardianAudit({ baseUrl, dryRun })
        .then((result) => {
            console.log(result.markdownReport);
            console.log(`\n📊 Resumen Final: ${result.okCount} OK | ${result.warningCount} ADVERTENCIAS | ${result.criticalCount} CRÍTICOS`);
            if (result.criticalCount > 0) {
                if (result.alertStatus) {
                    console.log(`📣 Estado de alertas: email=${result.alertStatus.emailed}, whatsapp=${result.alertStatus.whatsappSent}`);
                }
                console.error(`❌ Se detectaron ${result.criticalCount} errores CRÍTICOS en producción.`);
                process.exit(1);
            }
            console.log('✅ Auditoría SEO/GEO completada con 0 errores críticos.');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ Error fatal ejecutando el Agente Guardián SEO/GEO:', err);
            process.exit(1);
        });
}

module.exports = {
    AI_AND_SEARCH_CRAWLERS,
    CRAWLER_TARGET_PATHS,
    SSOT_SCHEMA_PRICE_RULES,
    DEFAULT_WHATSAPP_PHONE_NUMBER_ID,
    DEFAULT_WHATSAPP_ALERT_TEMPLATE,
    DEFAULT_WHATSAPP_ALERT_TEMPLATE_LANG,
    buildWhatsAppTemplatePayload,
    validateRobotsTxt,
    validateCleanUrlsInArtifact,
    validatePageSchemas,
    extractOffersFromJsonLd,
    runGeoGeminiProbing,
    dispatchCriticalAlerts,
    buildMarkdownReport,
    runGuardianAudit
};
