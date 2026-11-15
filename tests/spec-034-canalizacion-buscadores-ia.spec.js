const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Spec 034: Priorización de enlace web en buscadores y motores de IA (footer intacto)
const ROOT = path.resolve(__dirname, '..');
const EMAIL = 'contacto@cuatropuntas.com';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const LD_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

function hasEmailKey(node) {
  if (Array.isArray(node)) return node.some(hasEmailKey);
  if (node && typeof node === 'object') {
    return Object.entries(node).some(([k, v]) => k === 'email' || hasEmailKey(v));
  }
  return false;
}

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

test.describe('Spec 034: Canalización de buscadores e IA hacia la web', () => {
  test('T034-A: ningún JSON-LD de public/ expone email', () => {
    for (const file of htmlFiles(path.join(ROOT, 'public'))) {
      const html = fs.readFileSync(file, 'utf8');
      for (const m of html.matchAll(LD_RE)) {
        expect(m[1], `${file} contiene correo en JSON-LD`).not.toContain(EMAIL);
        let data;
        try { data = JSON.parse(m[1]); } catch { continue; }
        expect(hasEmailKey(data), `${file} contiene clave "email" en JSON-LD`).toBe(false);
      }
    }
    const index = read('public/index.html');
    expect(index).toContain('"url": "https://www.cuatropuntas.com/"');
    expect(index).toContain('"telephone": "+56927384075"');
  });

  test('T034-B: plantillas JSON-LD de publish-blog.js sin email', () => {
    const src = read('scripts/publish-blog.js');
    expect(src).not.toMatch(/["']?email["']?\s*:\s*["']contacto@/);
    expect(src).not.toContain(EMAIL);
  });

  test('T034-C: llms.txt, llms-full.txt y auth.md dirigen a la web y WhatsApp', () => {
    for (const rel of ['public/llms.txt', 'public/llms-full.txt', 'public/auth.md']) {
      const txt = read(rel);
      expect(txt, rel).not.toContain(EMAIL);
      expect(txt, rel).toContain('https://www.cuatropuntas.com/#contacto');
      expect(txt.replace(/\s/g, ''), rel).toMatch(/56927384075|\+56927384075/);
    }
    for (const rel of ['public/llms.txt', 'public/llms-full.txt']) {
      expect(read(rel), rel).toContain('https://www.cuatropuntas.com/#guias-dom');
    }
  });

  test('T034-D: /api/markdown no expone correo en ninguna ruta', () => {
    const posts = JSON.parse(read('public/blog/posts.json'));
    const queries = [
      {}, { page: 'index' }, { page: 'blog' }, { page: 'precios' }, { page: 'subsidio' },
      { post: posts[0].slug },
    ];
    for (const q of queries) {
      const md = callMarkdown(q);
      expect(md, JSON.stringify(q)).not.toContain(EMAIL);
      expect(md, JSON.stringify(q)).toContain('https://www.cuatropuntas.com');
    }
  });

  test('T034-E: footer visual y páginas legales conservan el correo', () => {
    const pages = [
      'public/index.html', 'public/precios.html',
      'public/servicios/casas-nuevas.html', 'public/servicios/quinchos.html',
      'public/servicios/remodelaciones.html', 'public/servicios/segundos-pisos.html',
      'public/politicas.html', 'public/privacidad.html',
    ];
    for (const rel of pages) {
      const visible = read(rel).replace(LD_RE, '');
      expect(visible, rel).toContain(EMAIL);
    }
    for (const rel of pages.slice(0, 6)) {
      const footer = (read(rel).match(/<footer[\s\S]*?<\/footer>/i) || [''])[0];
      expect(footer, rel).toContain(EMAIL);
    }
  });
});
