const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

// Spec 035: Clarificación explícita del alcance DOM hasta Recepción Final Definitiva
// y cláusula de exclusión por obras anexas del mandante / preexistencias sin regularizar.
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const LD_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function callMarkdown(query) {
  const handler = require(path.join(ROOT, 'api', 'markdown.js'));
  let body = '';
  const res = {
    setHeader() {},
    status() { return this; },
    send(b) { body = b; },
    json(b) { body = JSON.stringify(b); },
  };
  handler({ query, url: '/api/markdown', headers: {} }, res);
  return body;
}

function parsePdf(relPath) {
  const rawBuffer = fs.readFileSync(path.join(ROOT, relPath));
  const rawLatin = rawBuffer.toString('latin1');
  const counts = [...rawLatin.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  const pageCount = counts.length > 0 ? Math.max(...counts) : 0;

  const decompressed = [...rawLatin.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map((m) => {
      try {
        return zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
      } catch {
        return '';
      }
    })
    .join('\n');

  const lines = [];
  for (const tjMatch of decompressed.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
    const hexParts = [...tjMatch[1].matchAll(/<([0-9a-fA-F]+)>/g)]
      .map((h) => Buffer.from(h[1], 'hex').toString('latin1'));
    if (hexParts.length > 0) lines.push(hexParts.join(''));
  }

  return { pageCount, text: lines.join(' ').replace(/\s+/g, ' ').trim() };
}

const PREEXISTENCIAS_RE = /(?:construcciones\s+)?preexist(?:encias|entes)\s+(?:sin regularizar|irregulares)/i;

test.describe('Spec 035: Alcance DOM hasta Recepción Final Definitiva y Exclusión por Obras Anexas', () => {
  test('T035-A: Web pública y políticas reflejan ciclo DOM completo, -6% solo ejecución y exclusión sin romper guardrails', () => {
    const pages = [
      'public/index.html',
      'public/precios.html',
      'public/servicios/casas-nuevas.html',
      'public/servicios/segundos-pisos.html',
      'public/subsidio-minvu-sitio-propio.html',
      'public/politicas.html',
    ];

    for (const rel of pages) {
      const html = read(rel);
      expect(html, `${rel} debe mencionar Recepción Final Definitiva`).toMatch(/Recepci[oó]n Final Definitiva/i);
      expect(html, `${rel} debe explicitar exclusión por obras anexas`).toMatch(/obras anexas/i);
      expect(html, `${rel} debe explicitar preexistencias sin regularizar`).toMatch(PREEXISTENCIAS_RE);
      expect(html, `${rel} no puede prometer aprobación garantizada`).not.toMatch(/aprobaci[oó]n garantizada/i);

      // Todos los bloques JSON-LD preservan sintaxis JSON válida
      const ldMatches = [...html.matchAll(LD_RE)];
      expect(ldMatches.length, `${rel} requiere JSON-LD válido`).toBeGreaterThan(0);
      for (const m of ldMatches) {
        expect(() => JSON.parse(m[1]), `JSON-LD inválido en ${rel}`).not.toThrow();
      }
    }

    // Preservar Hero literal evaluado en tests/verify.spec.js:230 y WebMCP nota_condiciones
    const indexHtml = read('public/index.html');
    expect(indexHtml).toContain('Precios desde <span class="font-bold">19 UF/m² +IVA</span> · Construcción Llave en Mano · Trámites DOM Incluidos');
    expect(indexHtml).toMatch(/solo ejecuci[oó]n/i);
    expect(indexHtml).toMatch(/nota_condiciones:.*Certificado de Recepci[oó]n Final Definitiva/);

    // Subsección contractual 2.2 en politicas.html y cobertura de casos de exclusión
    const politicas = read('public/politicas.html');
    expect(politicas).toContain('2.2 Alcance de Tramitación Municipal DOM, Recepción Final Definitiva y Exclusiones');
    expect(politicas).toMatch(/quinchos,\s*piscinas,\s*ampliaciones adicionales/i);
    expect(politicas).toMatch(/solo[\s\S]{0,40}ejecuci[oó]n/i);
  });

  test('T035-B: Superficies IA/agentes sincronizadas y llms.txt <= 4500 caracteres (AEO Guardian)', () => {
    const llms = read('public/llms.txt');
    expect(llms.length, 'public/llms.txt debe mantenerse <= 4500 chars por seo-geo-guardian.js:432').toBeLessThanOrEqual(4500);
    expect(llms).toContain('Certificado de Recepción Final Definitiva');
    expect(llms).toMatch(/solo ejecuci[oó]n/i);
    expect(llms).toMatch(/obras anexas no contratadas/i);
    expect(llms).toMatch(PREEXISTENCIAS_RE);

    const llmsFull = read('public/llms-full.txt');
    expect(llmsFull).toContain('Certificado de Recepción Final Definitiva');
    expect(llmsFull).toMatch(/solo ejecuci[oó]n material de obra/i);
    expect(llmsFull).toMatch(/obras anexas no contratadas/i);
    expect(llmsFull).toMatch(PREEXISTENCIAS_RE);

    for (const q of [{ page: 'precios' }, {}]) {
      const md = callMarkdown(q);
      expect(md, JSON.stringify(q)).toContain('Certificado de Recepción Final Definitiva');
      expect(md, JSON.stringify(q)).toMatch(/solo ejecuci[oó]n/i);
      expect(md, JSON.stringify(q)).toMatch(/obras anexas/i);
      expect(md, JSON.stringify(q)).toMatch(PREEXISTENCIAS_RE);
    }

    const skillPath = path.join(ROOT, 'public', '.well-known', 'agent-skills', 'cotizar-proyecto', 'SKILL.md');
    const skill = fs.readFileSync(skillPath, 'utf8');
    expect(skill).toContain('Certificado de Recepción Final Definitiva');
    expect(skill).toMatch(/solo ejecuci[oó]n de obra/i);
    expect(skill).toMatch(/obras anexas no contratadas/i);
    expect(skill).toMatch(PREEXISTENCIAS_RE);

    const indexJson = JSON.parse(read('public/.well-known/agent-skills/index.json'));
    const entry = indexJson.skills.find((s) => s.name === 'cotizar-proyecto');
    const expectedHash = 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(skillPath)).digest('hex');
    expect(entry.digest).toBe(expectedHash);
  });

  test('T035-C: Prompts SDR y consultor reflejan ciclo completo, solo ejecución -6% y exclusión (WhatsApp single *)', () => {
    const wa = read('api/whatsapp.js');
    expect(wa).toContain('Certificado de Recepción Final Definitiva');
    expect(wa).toMatch(/solo ejecuci[oó]n de obra/i);
    expect(wa).toMatch(/obras anexas no contratadas/i);
    expect(wa).toMatch(PREEXISTENCIAS_RE);
    const waMatriz = wa.match(/### MATRIZ OFICIAL[\s\S]*?(?=### FORMATO DE NEGRITAS)/);
    expect(waMatriz).not.toBeNull();
    expect(waMatriz[0]).not.toContain('**');

    const chat = read('api/chat.js');
    expect(chat).toContain('Certificado de Recepción Final Definitiva');
    expect(chat).toMatch(/solo ejecuci[oó]n de obra/i);
    expect(chat).toMatch(/obras anexas no contratadas/i);
    expect(chat).toMatch(PREEXISTENCIAS_RE);

    const consultor = read('lib/agent-consultor.js');
    expect(consultor).toContain('Certificado de Recepción Final Definitiva');
    expect(consultor).toMatch(/solo ejecuci[oó]n/i);
    expect(consultor).toMatch(/obras anexas no contratadas/i);
    expect(consultor).toMatch(PREEXISTENCIAS_RE);
  });

  test('T035-D: Cotizador quote-wizard.js y api/quote.js alineados con adminBadge intacto y PDF de 1 página', async () => {
    const wizard = read('public/quote-wizard.js');
    expect(wizard).toContain('<option value="Idea">Solo tengo la idea (Diseño, cálculo y DOM hasta Recepción Final Definitiva)</option>');
    expect(wizard).toContain('<option value="Planos">Tengo planos de arquitectura (Cálculo estructural y DOM hasta Recepción Final)</option>');
    expect(wizard).toContain('<option value="PermisoAprobado">Tengo Permiso DOM Aprobado (Solo ejecución de obra; Recepción vía patrocinante)</option>');
    expect(wizard).toContain('<option value="ArquitectoPropio">Tengo arquitecto propio que tramita la DOM (Solo ejecución de obra)</option>');

    const quoteMod = require(path.join(ROOT, 'api', 'quote.js'));
    const ideaData = quoteMod.getPermisosData('Idea', 'Casa Nueva');
    const planosData = quoteMod.getPermisosData('Planos', 'Ampliación');
    const permData = quoteMod.getPermisosData('PermisoAprobado', 'Casa Nueva');
    const arqData = quoteMod.getPermisosData('ArquitectoPropio', 'Casa Nueva');

    expect(ideaData.adminBadge).toBe('PROYECTO COMPLETO (Diseño + DOM + Construcción)');
    expect(ideaData.label).toContain('Recepción Final Definitiva');
    expect(ideaData.notePdf).toContain('Recepción Final Definitiva');
    expect(ideaData.notePdf).toMatch(/obras anexas/i);
    expect(planosData.label).toContain('Recepción Final Definitiva');
    expect(planosData.notePdf).toMatch(/preexistencias sin regularizar/i);
    expect(permData.label).toMatch(/Solo ejecuci[oó]n/i);
    expect(arqData.label).toMatch(/Solo ejecuci[oó]n/i);

    const pdfBuf = await quoteMod.generatePdfBuffer({
      nombre: 'Camila Rojas',
      email: 'camila@example.com',
      telefono: '56911223344',
      tipo: 'Casa Nueva',
      sistema: 'Metalcon',
      area: 85,
      pisos: 1,
      terminaciones: 'Estandar',
      comuna: 'Providencia',
      permisos: 'Idea',
    });
    const pageMatches = [...pdfBuf.toString('latin1').matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...pageMatches)).toBe(1);

    const emailData = quoteMod.generateEmailData({
      nombre: 'Camila Rojas',
      email: 'camila@example.com',
      tipo: 'Casa Nueva',
      sistema: 'Metalcon',
      area: 85,
      pisos: 1,
      terminaciones: 'Estandar',
      comuna: 'Providencia',
      permisos: 'Idea',
    });
    expect(emailData.html).toContain('Certificado de Recepción Final Definitiva');
    expect(emailData.html).toMatch(/obras anexas no contratadas/i);
  });

  test('T035-E: Lead Magnets PDF mantienen 2 páginas exactas e incluyen ciclo DOM completo + cláusula de exclusión', () => {
    for (const rel of ['public/guias/guia-permiso-edificacion-rm.pdf', 'public/guias/checklist-recepcion-final-dom.pdf']) {
      const pdf = parsePdf(rel);
      expect(pdf.pageCount, `${rel} debe tener exactamente 2 páginas`).toBe(2);
      expect(pdf.text, `${rel} debe citar Recepción Final Definitiva`).toContain('Certificado de Recepción Final Definitiva');
      expect(pdf.text, `${rel} debe citar solo ejecución`).toMatch(/solo ejecuci[oó]n/i);
      expect(pdf.text, `${rel} debe citar exclusión por obras anexas`).toMatch(/obras anexas no contratadas/i);
      expect(pdf.text, `${rel} debe citar preexistencias sin regularizar`).toMatch(/preexistencias sin regularizar/i);
      expect(pdf.text, `${rel} no puede prometer aprobación garantizada`).not.toMatch(/aprobaci[oó]n garantizada/i);
    }
  });
});
