const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const publicDir = path.join(baseDir, 'public');

test.describe('Spec 010: Cumplimiento Térmico OGUC Art. 4.1.10, Niveles de Precios y Artículo Técnico', () => {

  test('T01.1: index.html y precios.html presentan los 3 niveles de desempeño térmico manteniendo la base de 19 UF/m² +IVA', async () => {
    const indexPath = path.join(publicDir, 'index.html');
    const preciosPath = path.join(publicDir, 'precios.html');

    expect(fs.existsSync(indexPath)).toBeTruthy();
    expect(fs.existsSync(preciosPath)).toBeTruthy();

    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const preciosHtml = fs.readFileSync(preciosPath, 'utf8');

    // Mantener base oficial de 19 UF/m²
    expect(indexHtml).toContain('19 UF');
    expect(preciosHtml).toContain('19 UF');

    // 3 Niveles en index.html
    expect(indexHtml).toMatch(/Base\s+Normativo|Nivel\s+Base/i);
    expect(indexHtml).toMatch(/Confort\s+(&|y)\s+Eficiencia/i);
    expect(indexHtml).toMatch(/Premium|EIFS/i);
    expect(indexHtml).toContain('4.1.10');
    expect(indexHtml).toMatch(/22\s*(-|a)\s*24\s*UF/i);
    expect(indexHtml).toMatch(/26\s*(-|a)\s*29\s*UF/i);

    // 3 Niveles en precios.html
    expect(preciosHtml).toMatch(/Base\s+Normativo|Nivel\s+Base/i);
    expect(preciosHtml).toMatch(/Confort\s+(&|y)\s+Eficiencia/i);
    expect(preciosHtml).toMatch(/Premium|EIFS/i);
    expect(preciosHtml).toContain('4.1.10');
    expect(preciosHtml).toMatch(/22\s*(-|a)\s*24\s*UF/i);
    expect(preciosHtml).toMatch(/26\s*(-|a)\s*29\s*UF/i);
  });

  test('T01.2: Fichas de casas-nuevas.html y segundos-pisos.html citan Art. 4.1.10 OGUC (Zona 3 RM) y expediente DOM (Art. 5.1.6)', async () => {
    const casasPath = path.join(publicDir, 'servicios', 'casas-nuevas.html');
    const segundosPath = path.join(publicDir, 'servicios', 'segundos-pisos.html');

    expect(fs.existsSync(casasPath)).toBeTruthy();
    expect(fs.existsSync(segundosPath)).toBeTruthy();

    const casasHtml = fs.readFileSync(casasPath, 'utf8');
    const segundosHtml = fs.readFileSync(segundosPath, 'utf8');

    // casas-nuevas.html
    expect(casasHtml).toContain('4.1.10');
    expect(casasHtml).toMatch(/Zona\s*3/i);
    expect(casasHtml).toContain('5.1.6');
    expect(casasHtml).toMatch(/Recepci[oó]n\s+Final/i);
    expect(casasHtml).toMatch(/barrera\s+de\s+(vapor|humedad)/i);

    // segundos-pisos.html
    expect(segundosHtml).toContain('4.1.10');
    expect(segundosHtml).toMatch(/Zona\s*3/i);
    expect(segundosHtml).toContain('5.1.6');
    expect(segundosHtml).toMatch(/Recepci[oó]n\s+Final/i);
    expect(segundosHtml).toMatch(/aislaci[oó]n/i);
  });

  test('T01.3: Post técnico de aislamiento térmico existe físicamente, cuenta con Schema TechArticle, contenedor de comentarios y WhatsApp oficial', async () => {
    const postSlug = 'normativa-aislacion-termica-oguc-santiago-precios';
    const postPath = path.join(publicDir, 'blog', 'posts', `${postSlug}.html`);

    expect(fs.existsSync(postPath)).toBeTruthy();

    const postHtml = fs.readFileSync(postPath, 'utf8');

    // Schema.org TechArticle
    expect(postHtml).toContain('TechArticle');

    // Contenedor de comentarios reactivo
    expect(postHtml).toContain('id="blog-comments-container"');
    expect(postHtml).toContain(`data-slug="${postSlug}"`);

    // WhatsApp oficial (+56 9 2738 4075 / 56927384075)
    expect(postHtml).toContain('56927384075');

    // Ausencia de número purgado
    expect(postHtml).not.toContain('56963482439');
    expect(postHtml).not.toContain('6348 2439');

    // Parámetros técnicos del artículo
    expect(postHtml).toContain('4.1.10');
    expect(postHtml).toMatch(/0[,.]38/); // U <= 0.38
    expect(postHtml).toContain('260'); // R100 >= 260
  });

  test('T01.4: AGENTS.md incluye los parámetros normativos actualizados (Art. 4.1.10 OGUC Zona 3 RM y 3 niveles)', async () => {
    const agentsPath = path.join(baseDir, 'AGENTS.md');
    expect(fs.existsSync(agentsPath)).toBeTruthy();

    const agentsContent = fs.readFileSync(agentsPath, 'utf8');

    expect(agentsContent).toContain('4.1.10');
    expect(agentsContent).toMatch(/Zona\s*3\s*RM/i);
    expect(agentsContent).toMatch(/0[,.]38/);
    expect(agentsContent).toContain('260');
    expect(agentsContent).toMatch(/21[.,]305/); // Ley 21.305
    expect(agentsContent).toMatch(/Base\s+Normativo/i);
    expect(agentsContent).toMatch(/Confort/i);
    expect(agentsContent).toMatch(/Premium|EIFS/i);
  });

});
