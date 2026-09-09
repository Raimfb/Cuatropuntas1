# Technical Plan: 007 - Homepage Commercial Hierarchy & Service Decoupling
**Feature ID:** `007_homepage_commercial_hierarchy`  
**Estado:** DRAFT / PENDING REVIEW  
**Fichero Objetivo Principal:** [`public/index.html`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/public/index.html)  
**Fichero de Pruebas:** [`tests/verify.spec.js`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/tests/verify.spec.js)

---

## 1. Arquitectura de Cambios en `public/index.html`

### 1.1. Modificación Quirúrgica 1: Hero Section (Línea ~360)
* **Selector / Contexto:** `header#inicio .hero-media-copy > p.text-orange-200`
* **Código Anterior:**
  ```html
  <p class="text-sm sm:text-base text-orange-200 font-semibold mb-8">
      Precios desde <span class="font-bold">19 UF/m² +IVA</span> · Trámites municipales incluidos · Trabajamos con subsidios MINVU
  </p>
  ```
* **Código Nuevo:**
  ```html
  <p class="text-sm sm:text-base text-orange-200 font-semibold mb-8">
      Precios desde <span class="font-bold">19 UF/m² +IVA</span> · Construcción Llave en Mano · Trámites DOM Incluidos
  </p>
  ```

---

### 1.2. Modificación Quirúrgica 2: Sección Autoridad ("¿Por qué elegirnos?")
* **Contexto 2A: Badge Superior (Línea ~405-410):**
  * Sustituir el badge verde de subsidios por un badge privado de calidad/garantía de obra:
  ```html
  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
      <svg class="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
      Construcción Llave en Mano
  </span>
  ```
* **Contexto 2B: Tarjeta Azul L450 (`Feature 4 (Subsidies)`):**
  * Eliminar por completo el bloque:
  ```html
  <!-- ELIMINAR: Feature 4 (Subsidies) -->
  <div class="bg-blue-50 p-8 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition mt-8">
      ...
  </div>
  ```

---

### 1.3. Modificación Quirúrgica 3: Grilla de Servicios (`#servicios`, Líneas ~462-536)
Transformación de la estructura de 3 bloques a 4 tarjetas independientes de alto estándar, manteniendo el ritmo visual alternado (imagen-texto / texto-imagen):

```html
<!-- ===== Services Section ===== -->
<section id="servicios" class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-4xl font-serif font-bold text-center text-primary mb-16">Nuestros Servicios</h2>

        <div class="space-y-20">
            <!-- Servicio 1: Casas Nuevas Llave en Mano -->
            <div class="flex flex-col lg:flex-row items-center gap-12">
                <div class="w-full lg:w-1/2 h-80 lg:h-96 rounded-2xl overflow-hidden shadow-xl">
                    <picture class="w-full h-full">
                        <source srcset="/casa_solida_moderna_1770071499659.webp" type="image/webp">
                        <img src="/casa_solida_moderna_1770071499659.png" alt="Casa nueva llave en mano construida por Cuatropuntas en Santiago"
                            class="w-full h-full object-cover transform hover:scale-105 transition duration-700" loading="lazy" width="600" height="400">
                    </picture>
                </div>
                <div class="w-full lg:w-1/2">
                    <div class="inline-block bg-orange-100 text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase mb-3">Desde 19 UF/m² +IVA</div>
                    <h3 class="text-2xl font-bold text-primary mb-4">Casas Nuevas Llave en Mano</h3>
                    <p class="text-gray-600 mb-6 leading-relaxed">
                        Construcción residencial integral en tu terreno. Ejecutamos proyectos completos en Metalcom estructural, Panel SIP o Albañilería Armada con coordinación técnica de arquitectura, cálculo y permisos municipales hasta la recepción final.
                    </p>
                    <ul class="space-y-2 mb-8">
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Sistemas constructivos certificados según terreno y clima</li>
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Entrega 100% habitable con pisos, baños y pintura</li>
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Gestión completa del Permiso de Edificación DOM</li>
                    </ul>
                    <a href="/servicios/casas-nuevas/" class="inline-flex items-center text-secondary font-bold hover:underline">
                        Ver Casas Nuevas Llave en Mano &rarr;
                    </a>
                </div>
            </div>

            <!-- Servicio 2: Segundos Pisos y Ampliaciones -->
            <div class="flex flex-col-reverse lg:flex-row items-center gap-12">
                <div class="w-full lg:w-1/2">
                    <div class="inline-block bg-orange-100 text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase mb-3">Desde 22 UF/m² +IVA</div>
                    <h3 class="text-2xl font-bold text-primary mb-4">Segundos Pisos y Ampliaciones</h3>
                    <p class="text-gray-600 mb-6 leading-relaxed">
                        Gana metros cuadrados habitables sin mudarte de casa. Diseñamos e instalamos ampliaciones en altura con estructuras ultralivianas que no sobrecargan los cimientos originales y permiten mantener la habitabilidad del primer piso durante las faenas.
                    </p>
                    <ul class="space-y-2 mb-8">
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Montaje en seco (Metalcom / SIP) de rápida ejecución</li>
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Aislación termoacústica de alto desempeño</li>
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Regularización municipal y planos según Ley del Mono o DOM</li>
                    </ul>
                    <a href="/servicios/segundos-pisos/" class="inline-flex items-center text-secondary font-bold hover:underline">
                        Ver Segundos Pisos y Ampliaciones &rarr;
                    </a>
                </div>
                <div class="w-full lg:w-1/2 h-80 lg:h-96 rounded-2xl overflow-hidden shadow-xl">
                    <picture class="w-full h-full">
                        <source srcset="/ampliacion_antes_despues_realista.webp" type="image/webp">
                        <img src="/ampliacion_antes_despues_realista.png" alt="Ampliación de segundo piso construida por Cuatropuntas en Santiago"
                            class="w-full h-full object-cover transform hover:scale-105 transition duration-700" loading="lazy" width="600" height="400">
                    </picture>
                </div>
            </div>

            <!-- Servicio 3: Remodelaciones Integrales -->
            <div class="flex flex-col lg:flex-row items-center gap-12">
                <div class="w-full lg:w-1/2 h-80 lg:h-96 rounded-2xl overflow-hidden shadow-xl">
                    <picture class="w-full h-full">
                        <source srcset="/ampliacion_antes_despues_etiquetada.webp" type="image/webp">
                        <img src="/ampliacion_antes_despues_etiquetada.png" alt="Remodelación integral de interiores y recintos húmedos por Cuatropuntas"
                            class="w-full h-full object-cover transform hover:scale-105 transition duration-700" style="object-position: center top;" loading="lazy" width="600" height="400">
                    </picture>
                </div>
                <div class="w-full lg:w-1/2">
                    <div class="inline-block bg-orange-100 text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase mb-3">Desde 11 UF/m² +IVA · Baños y Cocinas por Partida</div>
                    <h3 class="text-2xl font-bold text-primary mb-4">Remodelaciones Integrales</h3>
                    <p class="text-gray-600 mb-6 leading-relaxed">
                        Renovación profunda de viviendas existentes y recintos específicos. Especialistas en remodelación de baños completos (65 a 95 UF) y cocinas a medida (90 a 160 UF), así como redistribución de plantas, tabiquerías e instalaciones sanitarias y eléctricas.
                    </p>
                    <ul class="space-y-2 mb-8">
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Renovación hidrosanitaria e impermeabilización técnica</li>
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Mobiliario a medida, cuarzo y griferías de alta gama</li>
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Presupuesto itemizado por partidas sin costos ocultos</li>
                    </ul>
                    <a href="/servicios/remodelaciones/" class="inline-flex items-center text-secondary font-bold hover:underline">
                        Ver Remodelaciones Integrales &rarr;
                    </a>
                </div>
            </div>

            <!-- Servicio 4: Quinchos y Terrazas de Alto Estándar -->
            <div class="flex flex-col-reverse lg:flex-row items-center gap-12">
                <div class="w-full lg:w-1/2">
                    <div class="inline-block bg-orange-100 text-secondary text-xs font-bold px-3 py-1 rounded-full uppercase mb-3">Desde 12 UF/m² +IVA</div>
                    <h3 class="text-2xl font-bold text-primary mb-4">Quinchos y Terrazas de Alto Estándar</h3>
                    <p class="text-gray-600 mb-6 leading-relaxed">
                        Diseño y construcción de espacios exteriores para compartir todo el año. Creamos quinchos en obra con parrillas profesionales, campanas de tiraje forzado, hornos empotrados, barras de granito e iluminación nocturna integrada.
                    </p>
                    <ul class="space-y-2 mb-8">
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Parrillas en albañilería refractaria con tiraje calculado</li>
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Cubiertas en vigas a la vista, pérgolas y termopanel</li>
                        <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Conexiones de agua, gas y circuitos eléctricos dedicados</li>
                    </ul>
                    <a href="/servicios/quinchos/" class="inline-flex items-center text-secondary font-bold hover:underline">
                        Ver Quinchos y Terrazas &rarr;
                    </a>
                </div>
                <div class="w-full lg:w-1/2 h-80 lg:h-96 rounded-2xl overflow-hidden shadow-xl">
                    <picture class="w-full h-full">
                        <source srcset="/quincho_premium_chile_1770071485791.webp" type="image/webp">
                        <img src="/quincho_premium_chile_1770071485791.png" alt="Quincho premium con parrilla en obra construido por Cuatropuntas en Chile"
                            class="w-full h-full object-cover transform hover:scale-105 transition duration-700" loading="lazy" width="600" height="400">
                    </picture>
                </div>
            </div>
        </div>
    </div>
</section>
```

---

### 1.4. Modificación Quirúrgica 4: Sección Garantía Técnica (Líneas ~963-968)
* **Selector:** `#garantia .space-y-4 > div:nth-child(3)`
* **Código Anterior:**
  ```html
  <div class="flex items-center">
      <div class="bg-blue-500/20 p-3 rounded-md mr-4 text-blue-400 font-bold">03</div>
      <div>
          <p class="font-bold">Subsidios MINVU</p>
          <p class="text-sm text-gray-400">Te ayudamos a usar tu subsidio para construir tu casa.</p>
      </div>
  </div>
  ```
* **Código Nuevo:**
  ```html
  <div class="flex items-center">
      <div class="bg-orange-500/20 p-3 rounded-md mr-4 text-orange-400 font-bold">03</div>
      <div>
          <p class="font-bold">Presupuesto Cerrado y Plazos de Entrega</p>
          <p class="text-sm text-gray-400">Cronograma de avance y especificaciones garantizadas por contrato, sin costos imprevistos.</p>
      </div>
  </div>
  ```

---

### 1.5. Modificación Quirúrgica 5: Sello de Acreditación Secundaria MINVU
* **Ubicación Estratégica:** Justo antes de la sección `#contacto` (Cotizador), como un banner sobrio y cualificador:
```html
<!-- ===== Banner Secundario: Acreditación MINVU Sitio Propio ===== -->
<section class="py-10 bg-gray-100 border-t border-gray-200">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-lg border border-blue-100">
                    🏛️
                </div>
                <div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-1">
                        Sello de Acreditación Técnica
                    </span>
                    <h3 class="text-base sm:text-lg font-bold text-primary">Construcción con Subsidio Habitacional</h3>
                    <p class="text-xs sm:text-sm text-gray-600 mt-0.5">
                        Acreditados ante el MINVU para Construcción en Sitio Propio (DS1 y DS49). <strong>Requisito estricto:</strong> Terreno propio y subsidio adjudicado en mano.
                    </p>
                </div>
            </div>
            <a href="/subsidio-minvu-sitio-propio" class="inline-flex items-center justify-center px-5 py-2.5 border border-blue-600 text-blue-700 hover:bg-blue-50 font-bold text-xs sm:text-sm rounded-md transition whitespace-nowrap">
                Ver Requisitos de Sitio Propio &rarr;
            </a>
        </div>
    </div>
</section>
```

---

## 2. Plan de Pruebas Automatizadas (`tests/verify.spec.js`)

Se integrará un nuevo bloque de pruebas específico en `tests/verify.spec.js`:

```javascript
test('Verificar rebalanceo comercial y 4 tarjetas de servicios en index.html', async ({ page }) => {
    const indexPath = path.join(publicDir, 'index.html');
    const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`;
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

    // 1. Validar Hero
    const heroValue = page.locator('header#inicio p.text-orange-200');
    await expect(heroValue).toContainText('Precios desde 19 UF/m² +IVA · Construcción Llave en Mano · Trámites DOM Incluidos');
    await expect(heroValue).not.toContainText('subsidios MINVU');

    // 2. Validar 4 Tarjetas de Servicios independientes
    const serviceCards = page.locator('#servicios h3');
    await expect(serviceCards).toHaveCount(4);
    await expect(serviceCards.nth(0)).toHaveText('Casas Nuevas Llave en Mano');
    await expect(serviceCards.nth(1)).toHaveText('Segundos Pisos y Ampliaciones');
    await expect(serviceCards.nth(2)).toHaveText('Remodelaciones Integrales');
    await expect(serviceCards.nth(3)).toHaveText('Quinchos y Terrazas de Alto Estándar');

    // 3. Validar eliminación de tarjeta azul L450
    const blueCard = page.locator('section:has(h2:has-text("¿Por qué elegirnos?")) div.bg-blue-50');
    await expect(blueCard).toHaveCount(0);

    // 4. Validar Pilar 03 de Garantía
    const pilar03 = page.locator('#garantia p.font-bold:has-text("Presupuesto Cerrado y Plazos de Entrega")');
    await expect(pilar03).toBeVisible();
    const pilarSubsidio = page.locator('#garantia p.font-bold:has-text("Subsidios MINVU")');
    await expect(pilarSubsidio).toHaveCount(0);

    // 5. Validar Banner Secundario de Acreditación MINVU
    const bannerMinvu = page.locator('section:has-text("Sello de Acreditación Técnica")');
    await expect(bannerMinvu).toBeVisible();
    await expect(bannerMinvu).toContainText('Acreditados ante el MINVU para Construcción en Sitio Propio (DS1 y DS49)');
    await expect(bannerMinvu).toContainText('Requisito estricto: Terreno propio y subsidio adjudicado en mano');
});
```

---

## 3. Plan de Reversión (Rollback)
Si cualquier prueba de la suite falla o se detecta degradación visual:
- Se preserva el archivo de respaldo o se revierte quirúrgicamente con git diff a la versión anterior.
- Los assets de imagen son preexistentes en `public/` (`casa_solida_moderna_1770071499659.webp`, `ampliacion_antes_despues_realista.webp`, `ampliacion_antes_despues_etiquetada.webp`, `quincho_premium_chile_1770071485791.webp`), por lo que no hay riesgo de dependencias externas no resueltas.
