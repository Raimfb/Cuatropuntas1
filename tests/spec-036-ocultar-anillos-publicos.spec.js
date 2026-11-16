const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');

function extractPdfText(pdfBuffer) {
    const raw = pdfBuffer.toString('latin1');
    const chunks = [];
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(raw)) !== null) {
        let content = match[1];
        try {
            content = zlib.inflateSync(Buffer.from(content, 'latin1')).toString('latin1');
        } catch (_) {
            // Uncompressed stream
        }
        // Reconstruir runs TJ (donde el kerning divide fragmentos <hex> dentro de una misma palabra) y Tj
        const opRegex = /\[([^\]]+)\]\s*TJ|<([0-9a-fA-F]+)>\s*Tj|\(([^()]*(?:\\.[^()]*)*)\)\s*Tj/g;
        let op;
        while ((op = opRegex.exec(content)) !== null) {
            if (op[1]) {
                const hexParts = [...op[1].matchAll(/<([0-9a-fA-F]+)>/g)].map(m =>
                    m[1].length % 2 === 0 ? Buffer.from(m[1], 'hex').toString('latin1') : ''
                );
                if (hexParts.length) chunks.push(hexParts.join(''));
            } else if (op[2]) {
                if (op[2].length % 2 === 0) chunks.push(Buffer.from(op[2], 'hex').toString('latin1'));
            } else if (op[3]) {
                chunks.push(op[3].replace(/\\([()\\])/g, '$1'));
            }
        }
    }
    return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

function countPdfPages(pdfBuffer) {
    const raw = pdfBuffer.toString('latin1');
    const countMatches = raw.match(/\/Count\s+(\d+)/g) || [];
    const counts = countMatches.map(m => parseInt(m.replace(/\D+/g, ''), 10));
    if (counts.length > 0) return Math.max(...counts);
    return (raw.match(/\/Type\s*\/Page\b(?!s)/g) || []).length;
}

function mockRes() {
    const res = {
        statusCode: 200,
        headers: {},
        payload: null,
        body: '',
        setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
        status(code) { this.statusCode = code; return this; },
        json(data) { this.payload = data; this.body = JSON.stringify(data); return this; },
        send(data) { this.body = typeof data === 'string' ? data : JSON.stringify(data); return this; },
        end() { return this; }
    };
    return res;
}

test.describe('Spec 036: Ocultamiento Público de 5 Anillos RM y Nota Prudente en Cotizaciones', () => {

    const FORBIDDEN_PUBLIC_REGEX = /Anillo\s*[1-5]|5\s*[Aa]nillos|Base\s*Anillo|Base\s*Local|Cord[oó]n\s*Lejano|Sector Oriente \+?22%|Chicureo.*\+?18%|\+22%|\+18%/i;

    test('T036.1: Cero exposición de Anillos RM o porcentajes territoriales en HTML, JSON-LD, WebMCP, LLMs, Skills y Lead Magnets PDF', async () => {
        const publicFiles = [
            'public/index.html',
            'public/precios.html',
            'public/politicas.html',
            'public/servicios/casas-nuevas.html',
            'public/servicios/segundos-pisos.html',
            'public/servicios/quinchos.html',
            'public/servicios/remodelaciones.html',
            'public/subsidio-minvu-sitio-propio.html',
            'public/llms.txt',
            'public/llms-full.txt',
            'public/.well-known/agent-skills/cotizar-proyecto/SKILL.md'
        ];

        for (const rel of publicFiles) {
            const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
            expect(content, `Fuga territorial pública en ${rel}`).not.toMatch(FORBIDDEN_PUBLIC_REGEX);
        }

        // Tarjeta eliminada completamente en precios.html
        const preciosHtml = fs.readFileSync(path.join(ROOT, 'public/precios.html'), 'utf8');
        expect(preciosHtml).not.toContain('Accesibilidad de la faena');

        // JSON-LD FAQ sigue siendo JSON válido en index.html
        const indexHtml = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
        const ldMatches = [...indexHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
        expect(ldMatches.length).toBeGreaterThan(0);
        for (const m of ldMatches) {
            expect(() => JSON.parse(m[1])).not.toThrow();
        }

        // llms.txt bajo límite AEO Guardian (<= 4500) y digest SHA-256 sincronizado en Agent Skills
        const llmsTxt = fs.readFileSync(path.join(ROOT, 'public/llms.txt'), 'utf8');
        expect(llmsTxt.length).toBeLessThanOrEqual(4500);

        const skillBytes = fs.readFileSync(path.join(ROOT, 'public/.well-known/agent-skills/cotizar-proyecto/SKILL.md'));
        const actualDigest = 'sha256:' + crypto.createHash('sha256').update(skillBytes).digest('hex');
        const indexJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/.well-known/agent-skills/index.json'), 'utf8'));
        const skillEntry = indexJson.skills.find(s => s.name === 'cotizar-proyecto');
        expect(skillEntry.digest).toBe(actualDigest);

        // API Markdown limpia en todas las rutas
        const markdownHandler = require(path.join(ROOT, 'api/markdown.js'));
        for (const page of ['', 'precios', 'subsidio', 'blog']) {
            const res = mockRes();
            markdownHandler({ method: 'GET', query: page ? { page } : {}, headers: { host: 'www.cuatropuntas.com' } }, res);
            expect(res.statusCode).toBe(200);
            expect(res.body, `Fuga en api/markdown.js?page=${page}`).not.toMatch(FORBIDDEN_PUBLIC_REGEX);
        }

        // API MCP limpia en esquema GET y respuesta POST
        const mcpHandler = require(path.join(ROOT, 'api/mcp.js'));
        const getRes = mockRes();
        mcpHandler({ method: 'GET', url: '/api/mcp', headers: {} }, getRes);
        expect(getRes.statusCode).toBe(200);
        expect(getRes.body).not.toMatch(FORBIDDEN_PUBLIC_REGEX);

        const postRes = mockRes();
        mcpHandler({
            method: 'POST',
            headers: {},
            body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'cotizar_construccion', arguments: { metros_cuadrados: 100, materialidad: 'metalcom', tipo_proyecto: 'casa_nueva', comuna: 'Las Condes', permisos: 'Idea' } } }
        }, postRes);
        expect(postRes.statusCode).toBe(200);
        expect(postRes.payload.result.content[0].text).toContain('2503 UF');
        expect(postRes.payload.result.content[0].text).not.toMatch(FORBIDDEN_PUBLIC_REGEX);
        expect(postRes.payload.result.content[0].text).toContain('valor de suelo y lejanía de la urbe de Santiago');

        // Lead Magnets PDF (ambos) limpios y de 2 páginas exactas
        for (const pdfName of ['guia-permiso-edificacion-rm.pdf', 'checklist-recepcion-final-dom.pdf']) {
            const buf = fs.readFileSync(path.join(ROOT, 'public/guias', pdfName));
            expect(countPdfPages(buf), `${pdfName} debe mantener 2 páginas`).toBe(2);
            const text = extractPdfText(buf);
            expect(text, `Fuga en PDF ${pdfName}`).not.toMatch(FORBIDDEN_PUBLIC_REGEX);
        }
    });

    test('T036.2: Prompts conversacionales IA y curador ocultan anillos/porcentajes e instruyen reserva interna', () => {
        const prompts = [
            { rel: 'api/whatsapp.js', checkSingleStar: true },
            { rel: 'api/chat.js', checkSingleStar: false },
            { rel: 'lib/agent-consultor.js', checkSingleStar: false },
            { rel: 'scripts/auto-curate-and-publish.js', checkSingleStar: false }
        ];

        for (const item of prompts) {
            const src = fs.readFileSync(path.join(ROOT, item.rel), 'utf8');
            expect(src, `Fuga de anillo numerado o % en ${item.rel}`).not.toMatch(/Anillo\s*[1-5]|5\s*[Aa]nillos|Base\s*Anillo|Cord[oó]n\s*Lejano|\+22%|\+18%/i);
            expect(src.toLowerCase(), `Falta regla de prohibición en ${item.rel}`).toContain('prohibido');
            if (item.checkSingleStar) {
                const matrixStart = src.indexOf('### MATRIZ OFICIAL');
                const matrixEnd = src.indexOf('### ', matrixStart + 18);
                const matrixSection = src.slice(matrixStart, matrixEnd > 0 ? matrixEnd : undefined);
                expect(matrixSection).not.toContain('**');
            }
        }
    });

    test('T036.3: Motor interno api/quote.js conserva intactos los factores territoriales para cotización interna', () => {
        const { calculateQuote, getFactorComuna } = require(path.join(ROOT, 'api/quote.js'));

        expect(getFactorComuna('Puente Alto')).toBe(1.00);
        expect(getFactorComuna('Pirque')).toBe(1.02);
        expect(getFactorComuna('Buin')).toBe(1.08);
        expect(getFactorComuna('Chicureo')).toBe(1.18);
        expect(getFactorComuna('Las Condes')).toBe(1.22);

        const baseQ = calculateQuote({ tipo: 'Casa Nueva', sistema: 'Metalcon', area: 100, pisos: 1, terminaciones: 'Estandar', comuna: 'Puente Alto', permisos: 'Idea' });
        const raiseQ = calculateQuote({ tipo: 'Casa Nueva', sistema: 'Metalcon', area: 100, pisos: 1, terminaciones: 'Estandar', comuna: 'Las Condes', permisos: 'Idea' });

        expect(Math.round(baseQ.totalEstimado)).toBe(2052);
        expect(Math.round(raiseQ.totalEstimado)).toBe(2503);
    });

    test('T036.4: Nota escrita prudente condicional en PDF (1 página estricta) y Email cuando factorComuna > 1', async () => {
        const { generatePdfBuffer, generateEmailData } = require(path.join(ROOT, 'api/quote.js'));
        const EXPECTED_NOTE = 'Los valores del presupuesto son estimativos y calculados en base al tipo de obra, tipo de terreno, valor de suelo y lejanía de la urbe de Santiago';

        // 1. Con alza territorial (Las Condes: 1.22 y Pirque: 1.02)
        for (const tc of [
            { comuna: 'Las Condes', comunaHuman: 'Las Condes', factorComuna: 1.22, tipo: 'Casa Nueva', sistema: 'Metalcon', areaNum: 100 },
            { comuna: 'Pirque', comunaHuman: 'Pirque', factorComuna: 1.02, tipo: 'Remodelación Integral', sistema: 'Albañilería', areaNum: 55, espacios_remodelar: 'Ampliación de living, cambio de pavimentos, 1 baño completo y pintura interior' }
        ]) {
            const pdfBuf = await generatePdfBuffer({
                nombre: 'Cliente Prueba',
                email: 'test@example.com',
                telefono: '+56912345678',
                permisos: 'Idea',
                ...tc
            });
            expect(countPdfPages(pdfBuf), `PDF en ${tc.comuna} (${tc.tipo}) debe mantenerse en 1 página`).toBe(1);
            const pdfText = extractPdfText(pdfBuf);
            expect(pdfText).toContain(EXPECTED_NOTE);
            expect(pdfText).not.toMatch(/Anillo|\+22%|\+2%|x1\.22|Puente Alto|más caro/i);

            const emailData = generateEmailData({
                nombre: 'Cliente Prueba',
                email: 'test@example.com',
                telefono: '+56912345678',
                permisos: 'Idea',
                ...tc
            });
            expect(emailData.html).toContain(EXPECTED_NOTE);
            expect(emailData.html).not.toMatch(/Anillo|\+22%|\+2%|x1\.22|Puente Alto|más caro/i);
        }

        // 2. Sin alza territorial (Puente Alto: 1.00) -> no muestra nota territorial de lejanía
        const basePdfBuf = await generatePdfBuffer({
            nombre: 'Cliente Base',
            email: 'base@example.com',
            telefono: '+56912345678',
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            areaNum: 100,
            comuna: 'Puente Alto',
            comunaHuman: 'Puente Alto',
            factorComuna: 1.00,
            permisos: 'Idea'
        });
        expect(countPdfPages(basePdfBuf)).toBe(1);
        const basePdfText = extractPdfText(basePdfBuf);
        expect(basePdfText).not.toContain('lejanía de la urbe de Santiago');

        const baseEmail = generateEmailData({
            nombre: 'Cliente Base',
            email: 'base@example.com',
            telefono: '+56912345678',
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            areaNum: 100,
            comuna: 'Puente Alto',
            comunaHuman: 'Puente Alto',
            factorComuna: 1.00,
            permisos: 'Idea'
        });
        expect(baseEmail.html).not.toContain('lejanía de la urbe de Santiago');

        // 3. Fallback sin pasar factorComuna explícito (solo comuna) también resuelve correctamente
        const autoRaisePdf = await generatePdfBuffer({ nombre: 'Auto', email: 'a@b.cl', comuna: 'Las Condes', areaNum: 100, permisos: 'Idea' });
        expect(countPdfPages(autoRaisePdf)).toBe(1);
        expect(extractPdfText(autoRaisePdf)).toContain(EXPECTED_NOTE);
    });
});
