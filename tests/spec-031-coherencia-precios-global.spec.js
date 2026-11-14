const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const baseDir = path.resolve(__dirname, '..');

test.describe('Spec 031: Coherencia Total de Precios y Anillos Territoriales (Sitio, Servicios y Agentes)', () => {

    test('T031.1: api/mcp.js usa matriz SSOT, 5 anillos RM, +8% DOM etapa Idea y valores netos (+IVA)', async () => {
        const mcpHandler = require(path.join(baseDir, 'api', 'mcp.js'));
        const mcpSource = fs.readFileSync(path.join(baseDir, 'api', 'mcp.js'), 'utf8');

        expect(mcpSource).not.toContain('13.5');
        expect(mcpSource).not.toContain('15.5');

        const invokeMcp = async (method, body = {}) => {
            let statusCode = 200;
            let payload = null;
            await mcpHandler({ method, body }, {
                setHeader: () => {},
                status: (code) => {
                    statusCode = code;
                    return {
                        json: (data) => { payload = data; },
                        end: () => {}
                    };
                }
            });
            return { statusCode, payload };
        };

        // 1. GET schema exposes tipo_proyecto, comuna, permisos
        const getRes = await invokeMcp('GET');
        expect(getRes.statusCode).toBe(200);
        const cotizarGet = getRes.payload.tools.find(t => t.name === 'cotizar_construccion');
        expect(cotizarGet.inputSchema.properties.tipo_proyecto.enum).toEqual(['casa_nueva', 'segundo_piso', 'quincho', 'remodelacion']);
        expect(cotizarGet.inputSchema.properties.comuna.type).toBe('string');
        expect(cotizarGet.inputSchema.properties.permisos.enum).toContain('Idea');
        expect(cotizarGet.inputSchema.required).toEqual(['metros_cuadrados', 'materialidad']);

        // 2. POST tools/list matches schema
        const listRes = await invokeMcp('POST', { method: 'tools/list', id: 10 });
        expect(listRes.statusCode).toBe(200);
        expect(listRes.payload.result.tools[0].inputSchema.properties.comuna).toBeDefined();

        // 3. POST tools/call across all 5 rings + DOM stages
        const cases = [
            { args: { metros_cuadrados: 100, materialidad: 'metalcom', tipo_proyecto: 'casa_nueva', comuna: 'Puente Alto', permisos: 'Idea' }, expectedUF: '2052 UF', anillo: 'Anillo 1' },
            { args: { metros_cuadrados: 100, materialidad: 'metalcom', tipo_proyecto: 'casa_nueva', comuna: 'Pirque', permisos: 'Idea' }, expectedUF: '2093 UF', anillo: 'Anillo 2' },
            { args: { metros_cuadrados: 100, materialidad: 'metalcom', tipo_proyecto: 'casa_nueva', comuna: 'Buin', permisos: 'Idea' }, expectedUF: '2216 UF', anillo: 'Anillo 3' },
            { args: { metros_cuadrados: 100, materialidad: 'metalcom', tipo_proyecto: 'casa_nueva', comuna: 'Chicureo', permisos: 'Idea' }, expectedUF: '2421 UF', anillo: 'Anillo 4' },
            { args: { metros_cuadrados: 100, materialidad: 'metalcom', tipo_proyecto: 'casa_nueva', comuna: 'Las Condes', permisos: 'Idea' }, expectedUF: '2503 UF', anillo: 'Anillo 5' },
            { args: { metros_cuadrados: 60, materialidad: 'sip', tipo_proyecto: 'segundo_piso', comuna: 'Puente Alto', permisos: 'Planos' }, expectedUF: '1397 UF', anillo: 'Anillo 1' },
            { args: { metros_cuadrados: 25, materialidad: 'sip', tipo_proyecto: 'quincho', comuna: 'Puente Alto', permisos: 'Idea' }, expectedUF: '378 UF', anillo: 'Anillo 1' },
            { args: { metros_cuadrados: 50, materialidad: 'albanileria', tipo_proyecto: 'remodelacion', comuna: 'Puente Alto', permisos: 'Idea' }, expectedUF: '650 UF', anillo: 'Anillo 1' }
        ];

        for (const c of cases) {
            const callRes = await invokeMcp('POST', { method: 'tools/call', id: 20, params: { name: 'cotizar_construccion', arguments: c.args } });
            const text = callRes.payload.result.content[0].text;
            expect(text).toContain(c.expectedUF);
            expect(text).toContain('netos (+IVA)');
            expect(text).toContain(c.anillo);
        }
    });

    test('T031.2: Coherencia HTML, +IVA, 5 Anillos RM, DOM y WebMCP en precios.html e index.html', async () => {
        const preciosHtml = fs.readFileSync(path.join(baseDir, 'public', 'precios.html'), 'utf8');
        const indexHtml = fs.readFileSync(path.join(baseDir, 'public', 'index.html'), 'utf8');

        // precios.html checks
        expect(preciosHtml).not.toContain('hay zonas donde el costo es más accesible');
        expect(preciosHtml).toContain('5 Anillos Logísticos RM');
        expect(preciosHtml).toContain('+22%');
        expect(preciosHtml).toContain('+18%');
        expect(preciosHtml).toContain('+8%');
        expect(preciosHtml).toContain('+2%');
        expect(preciosHtml).toContain('Desde 19 UF<span class="text-sm font-normal text-gray-500">/m² +IVA</span>');
        expect(preciosHtml).toContain('Desde 22 UF<span class="text-sm font-normal text-gray-500">/m² +IVA</span>');
        expect(preciosHtml).toContain('Desde 12 UF<span class="text-sm font-normal text-gray-500">/m² +IVA</span>');
        expect(preciosHtml).toContain('Desde 11 UF<span class="text-sm font-normal text-gray-500">/m² +IVA</span>');
        expect(preciosHtml).toContain('65 a 95 UF<span class="text-sm font-normal text-gray-500">/recinto +IVA</span>');
        expect(preciosHtml).toContain('90 a 160 UF<span class="text-sm font-normal text-gray-500">/recinto +IVA</span>');

        // WebMCP en precios.html sincronizado (quincho.sip: 14, remodelacion.sip: 13)
        expect(preciosHtml).toContain('quincho: { metalcom: 12, sip: 14, albanileria: 15 }');
        expect(preciosHtml).toContain('remodelacion: { metalcom: 11, sip: 13, albanileria: 13 }');
        expect(preciosHtml).toContain('nota_condiciones:');

        // index.html checks
        expect(indexHtml).toContain('/m² +IVA</span>');
        expect(indexHtml).toContain('5 Anillos Logísticos RM');
        expect(indexHtml).toContain('Anillo 1');
        expect(indexHtml).toContain('Sector Oriente +22%');
        expect(indexHtml).toContain('nota_condiciones:');
        expect(indexHtml).toContain('total_estimado_neto_uf:');

        // Guardrail: sin jerga térmica de laboratorio en ventas
        expect(preciosHtml).not.toContain('Art. 4.1.10');
        expect(preciosHtml).not.toContain('W/m²K');
        expect(indexHtml).not.toContain('Art. 4.1.10');
        expect(indexHtml).not.toContain('W/m²K');
    });

    test('T031.3: Transparencia comercial y preservación SEO en /servicios/*, subsidio-minvu y politicas.html', async () => {
        const serviceFiles = [
            { file: 'casas-nuevas.html', low: '19', high: '25', isObraNueva: true },
            { file: 'segundos-pisos.html', low: '22', high: '27', isObraNueva: true },
            { file: 'remodelaciones.html', low: '11', high: '13', isObraNueva: false },
            { file: 'quinchos.html', low: '12', high: '15', isObraNueva: false }
        ];

        for (const item of serviceFiles) {
            const html = fs.readFileSync(path.join(baseDir, 'public', 'servicios', item.file), 'utf8');
            expect(html).toContain('Valores netos (+IVA)');
            expect(html).toContain('Anillo 1');
            expect(html).toContain('5 Anillos Logísticos RM');
            expect(html).toContain('Sector Oriente +22%');
            if (item.isObraNueva) {
                expect(html).toContain('+8% desde cero');
            } else {
                expect(html).toContain('evaluación');
            }

            // Guardrails intactos: meta description 120-165 & JSON-LD AggregateOffer
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
            expect(descMatch).not.toBeNull();
            expect(descMatch[1].length).toBeGreaterThanOrEqual(120);
            expect(descMatch[1].length).toBeLessThanOrEqual(165);

            const jsonLd = JSON.parse(html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
            const serviceNode = jsonLd['@graph'].find(n => n['@type'] === 'Service');
            expect(serviceNode.offers.lowPrice).toBe(item.low);
            expect(serviceNode.offers.highPrice).toBe(item.high);
        }

        const subsidioHtml = fs.readFileSync(path.join(baseDir, 'public', 'subsidio-minvu-sitio-propio.html'), 'utf8');
        expect(subsidioHtml).toContain('Desde 19 UF<span class="text-base font-normal text-gray-500">/m² +IVA</span>');
        expect(subsidioHtml).toContain('Desde 21 UF<span class="text-base font-normal text-gray-500">/m² +IVA</span>');
        expect(subsidioHtml).toContain('Desde 25 UF<span class="text-base font-normal text-gray-500">/m² +IVA</span>');
        expect(subsidioHtml).toContain('5 Anillos Logísticos RM');

        const politicasHtml = fs.readFileSync(path.join(baseDir, 'public', 'politicas.html'), 'utf8');
        expect(politicasHtml).toContain('valores netos (+IVA) referenciales base Anillo 1');
        expect(politicasHtml).toContain('5 Anillos Logísticos de la Región Metropolitana');
        expect(politicasHtml).toContain('+8% en proyectos desde cero');
    });

    test('T031.4: api/markdown.js, api/whatsapp.js, api/chat.js y lib/agent-consultor.js reflejan 5 anillos RM y +8% DOM', async () => {
        const markdownHandler = require(path.join(baseDir, 'api', 'markdown.js'));
        const fetchMd = (query) => {
            let body = '';
            markdownHandler({ query }, {
                setHeader: () => {},
                status: () => ({ send: (s) => { body = s; } })
            });
            return body;
        };

        const preciosMd = fetchMd({ page: 'precios' });
        expect(preciosMd).toContain('Factores de Calibración Territorial (5 Anillos RM)');
        expect(preciosMd).toContain('x1.22');
        expect(preciosMd).toContain('x1.18');
        expect(preciosMd).toContain('x1.08');
        expect(preciosMd).toContain('x1.02');
        expect(preciosMd).toContain('x1.00');
        expect(preciosMd).toContain('+8% (`1.08`)');

        const defaultMd = fetchMd({});
        expect(defaultMd).toContain('Ligera Metalcom desde 11 UF/m² | Sólida Albañilería desde 13 UF/m²');
        expect(defaultMd).toContain('5 Anillos Logísticos RM');
        expect(defaultMd).toContain('**+8%** por etapa desde cero');

        const whatsappSrc = fs.readFileSync(path.join(baseDir, 'api', 'whatsapp.js'), 'utf8');
        expect(whatsappSrc).toContain('5 Anillos Logísticos y de Mercado RM');
        expect(whatsappSrc).toContain('x1.22');
        expect(whatsappSrc).toContain('suma +8% (x1.08)');
        const waMatrizMatch = whatsappSrc.match(/### MATRIZ OFICIAL[\s\S]*?(?=### FORMATO DE NEGRITAS)/);
        expect(waMatrizMatch).not.toBeNull();
        expect(waMatrizMatch[0]).not.toContain('**'); // Estricto formato WhatsApp sin negritas dobles

        const chatSrc = fs.readFileSync(path.join(baseDir, 'api', 'chat.js'), 'utf8');
        expect(chatSrc).toContain('5 Anillos Logísticos y de Mercado RM');
        expect(chatSrc).toContain('suma +8% (x1.08)');
        expect(chatSrc).toContain('Anillo 5 Sector Oriente');

        const consultorSrc = fs.readFileSync(path.join(baseDir, 'lib', 'agent-consultor.js'), 'utf8');
        expect(consultorSrc).toContain('5 Anillos Logísticos RM');
        expect(consultorSrc).toContain('+8% desde cero / etapa Idea');
    });

    test('T031.5: Agent Skill SKILL.md, index.json SHA-256 y script curador están sincronizados', async () => {
        const skillPath = path.join(baseDir, 'public', '.well-known', 'agent-skills', 'cotizar-proyecto', 'SKILL.md');
        const indexPath = path.join(baseDir, 'public', '.well-known', 'agent-skills', 'index.json');

        const skillContent = fs.readFileSync(skillPath, 'utf8');
        expect(skillContent).toContain('5 Anillos Logísticos y de Mercado RM');
        expect(skillContent).toContain('+8%` (`1.08`)');
        expect(skillContent).toContain('desde 19 UF/m²');
        expect(skillContent).toContain('desde 21 UF/m²');
        expect(skillContent).toContain('desde 25 UF/m²');

        const indexJson = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        const entry = indexJson.skills.find(s => s.name === 'cotizar-proyecto');
        const expectedHash = 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(skillPath)).digest('hex');
        expect(entry.digest).toBe(expectedHash);

        const curateSrc = fs.readFileSync(path.join(baseDir, 'scripts', 'auto-curate-and-publish.js'), 'utf8');
        expect(curateSrc).toContain('5 Anillos Logísticos RM');
        expect(curateSrc).toContain('+8% desde cero');
    });

});
