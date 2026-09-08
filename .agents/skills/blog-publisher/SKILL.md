---
name: blog-publisher
description: >-
  Redacta, compila, sincroniza y publica artículos técnicos optimizados para el blog de Constructora Cuatropuntas SpA.
  Se activa automáticamente cuando el usuario solicite redactar, crear, actualizar o publicar un post para el blog.
---

# Blog Publisher Skill: Constructora Cuatropuntas SpA

Esta skill proporciona el protocolo editorial estricto, la matriz de costos y el procedimiento técnico autónomo para generar, compilar y verificar artículos en el blog oficial de Constructora Cuatropuntas SpA sin depender de herramientas externas.

---

## 1. Protocolo Editorial y Comercial de Cuatropuntas

### Estándar de Lenguaje y Vocabulario Técnico Chileno
- **Términos obligatorios:** Utilizar terminología técnica y normativa oficial de Chile:
  * Normativa: OGUC (Ordenanza General de Urbanismo y Construcciones), DOM (Dirección de Obras Municipales), SII, permisos de edificación, recepción final/definitiva.
  * Constructivo: Radier de hormigón H-20 / H-25, perfiles de acero galvanizado Metalcom (Cintac), paneles SIP, albañilería armada o confinada, aislación térmica Zona 3 RM, termopaneles, shower door, membranas hidrófugas e impermeabilizantes.
  * Métrica: Valores expresados en **UF** y **UF/m²** netos (+IVA), con equivalencias pedagógicas en pesos chilenos ($ CLP) cuando clarifique el presupuesto al cliente.
- **Tono:** Pedagógico, transparente, riguroso y consultivo. Prohibido el humo publicitario y los clichés genéricos de IA ("En este fascinante viaje", "En resumen", etc.).
- **Ecosistema de Telefonía Oficial (SSOT):**
  * Botón Flotante y Captura: `+56 9 2738 4075` (`https://wa.me/56927384075`).
  * Agendamiento Técnico: `https://cal.com/cuatropuntas.com/visita-tecnica`.
  * **PROHIBIDO:** El número `+56 9 6348 2439` está purgado y no debe aparecer bajo ninguna circunstancia.

### Estructura Canónica Obligatoria del Post
1. **Frontmatter YAML:**
   - `title`: Título atractivo y optimizado para SEO/GEO.
   - `slug`: URL amigable en kebab-case sin tildes ni caracteres especiales.
   - `excerpt`: Resumen de 1 a 2 oraciones para Google y tarjeta de previsualización.
   - `category`: Una de las categorías oficiales (`Casas Nuevas`, `Segundos Pisos & Ampliaciones`, `Remodelaciones`, `Quinchos`, `Precios & Cotización`, `Guías Prácticas`, `Materiales & Sistemas`).
   - `date`: Fecha en formato `YYYY-MM-DD`.
   - `author`: `Equipo Técnico Cuatropuntas` o `Ingeniería Cuatropuntas`.
   - `image`: Opcional. Si se omite, el compilador asigna la imagen oficial de la categoría.
   - `readTime`: Tiempo estimado (ej: `7 min de lectura`).
   - `tags`: Array de 3 a 5 palabras clave estratégicas.
   - `faq`: Array de al menos 2 a 3 objetos `{ question: "...", answer: "..." }`.
2. **Cuerpo del Artículo:**
   - Introducción con contexto chileno.
   - Títulos de sección (`##`) con análisis profundo.
   - Subtítulos (`###`) con listas y viñetas explicativas.
   - **Tabla comparativa GFM:** Al menos una tabla con columnas claras de sistemas, costos en UF y plazos.
   - **Bloques destacados (`> ...`):** Consejos normativos de la DOM o buenas prácticas de obra.
   - **Preguntas Frecuentes:** El compilador inyecta automáticamente el bloque visual con Schema.org `FAQPage`.

---

## 2. Cadena de Ejecución Obligatoria (Workflow Autónomo)

Para redactar y publicar un artículo, el agente debe seguir estrictamente este flujo de 4 pasos sin saltarse ninguno:

```text
1. Redactar Borrador en content/drafts/[slug].md
   ↓
2. Compilar y Sincronizar: node scripts/publish-blog.js content/drafts/[slug].md
   ↓
3. Verificar con Suite Playwright: npx playwright test tests/blog-automation.spec.js
   ↓
4. Confirmar Éxito y exhibir ruta generada: public/blog/posts/[slug].html
```

### Paso 1: Guardar el Borrador Markdown
Escribir el contenido en la carpeta de borradores:
`content/drafts/[slug].md`

### Paso 2: Ejecutar el Compilador Nativo
Ejecutar por terminal:
```powershell
node scripts/publish-blog.js content/drafts/[slug].md
```
Esto generará atómicamente:
- El archivo HTML en `public/blog/posts/[slug].html`.
- La entrada estructurada en `public/blog/posts.json`.
- La tarjeta estática SSR en `public/blog/index.html`.
- La URL canónica en `public/sitemap.xml`.

### Paso 3: Ejecutar la Verificación Automatizada
Ejecutar la suite de pruebas para confirmar integridad:
```powershell
npx playwright test tests/blog-automation.spec.js
```

### Paso 4: Certificación y Reporte
Si las pruebas pasan al 100% en verde:
1. Confirmar el éxito al usuario.
2. Reportar la ruta del HTML (`public/blog/posts/[slug].html`).
3. Reportar el slug y el enlace canónico generado (`https://www.cuatropuntas.com/blog/posts/[slug].html`).
