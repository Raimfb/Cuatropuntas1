# Technical Implementation Plan: 011 - Simplificación Comercial y Desescalada de Tecnicismos Térmicos

**Feature ID:** `011_commercial_copy_simplification`  
**Estado:** APROBADO / IMPLEMENTADO  
**Metodología:** SDD (Spec-Driven Development) & TDD  

---

## 1. Arquitectura Técnica y Matriz de Traducción Comercial

### 1.1. Principio Rector: Del Laboratorio a la Experiencia de Habitar
El objetivo no es reducir la calidad constructiva ni alterar las especificaciones de obra, sino **cambiar el ángulo de comunicación en el embudo de ventas**: de la jerga de ingeniería y artículos legales fríos hacia la propuesta de valor residencial tangible.

| Tecnicismo de Laboratorio (Spec 010) | Beneficio Comercial de Habitabilidad (Spec 011) | Ubicación en el Sitio |
| :--- | :--- | :--- |
| `Art. 4.1.10 OGUC (Zona 3 RM)` | *Aislación térmica y acústica integral diseñada para el clima de Santiago* | Bullets de servicios y tarjetas de precios |
| `Techumbre: U <= 0.38 W/m²K (R100 >= 260)` | *Techos con aislación continua que evitan sobrecalentamiento en verano y frío en invierno* | Detalle de Nivel Base Normativo |
| `Expediente para Recepción Final DOM (Art. 5.1.6)` | *Construcción formal con carpeta técnica lista para recepción municipal (DOM)* | Paso 4 de servicios y footer de tarjetas |
| `Barrera de vapor hacia cara cálida y barrera hidrófuga` | *Protección continua contra humedad y condensaciones para muros sanos y duraderos* | Fichas de servicios (Metalcom / SIP) |
| `Apto Calificación Energética CEV` | *Máximo confort térmico con consumo energético mínimo y alta plusvalía* | Tarjeta Nivel Premium / EIFS |

---

## 2. Modificaciones Quirúrgicas Planificadas

### 2.1. Portada (`public/index.html`)

#### A. Sección `#servicios` - Servicio 1: Casas Nuevas Llave en Mano
- **Texto Actual:**
  ```html
  <ul class="space-y-2 mb-8">
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Cumplimiento térmico reglamentario Art. 4.1.10 OGUC (Zona 3 RM)</li>
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Entrega 100% habitable con aislación certificada y terminaciones completas</li>
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Expediente técnico y tramitación para Recepción Final DOM (Art. 5.1.6)</li>
  </ul>
  ```
- **Texto Simplificado de Reemplazo:**
  ```html
  <ul class="space-y-2 mb-8">
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Aislación térmica y acústica integral adaptada al clima de Santiago</li>
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Viviendas cálidas en invierno y frescas en verano, con bajo consumo energético</li>
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Construcción formal con carpeta técnica lista para recepción municipal (DOM)</li>
  </ul>
  ```

#### B. Sección `#servicios` - Servicio 2: Segundos Pisos y Ampliaciones
- **Texto Actual:**
  ```html
  <ul class="space-y-2 mb-8">
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Montaje liviano en seco (Metalcom / SIP) sin sobrecargar cimientos</li>
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Aislación termoacústica de entrepiso y envolvente Art. 4.1.10 OGUC (Zona 3 RM)</li>
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Expediente de cálculo y regularización para Recepción Final DOM (Art. 5.1.6)</li>
  </ul>
  ```
- **Texto Simplificado de Reemplazo:**
  ```html
  <ul class="space-y-2 mb-8">
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Estructuras ultralivianas de montaje en seco sin sobrecargar fundaciones</li>
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Losas y techos con aislación acústica y térmica para máximo confort interior</li>
      <li class="flex items-center text-gray-700"><span class="text-secondary mr-2">✓</span> Expediente técnico y planos listos para regularización y recepción en la DOM</li>
  </ul>
  ```

#### C. Sección `#precios` - Bloque de 3 Niveles de Desempeño Térmico
- Encabezado: "Opciones de Confort Térmico y Terminaciones"
- Bajada: "Nuestro precio base de **19 UF/m² +IVA** asegura una vivienda 100% habitable con la aislación reglamentaria exigida para su aprobación municipal en Santiago. Puedes personalizar tu proyecto con upgrades de confort según tus expectativas:"
- **Nivel Base Normativo:**
  - Glosa: "Vivienda llave en mano 100% habitable con la aislación requerida por normativa para obtener la recepción municipal."
  - Bullets:
    - *✓ Techumbre aislada contra el frío invernal y el calor de verano*
    - *✓ Lana mineral continua y barrera perimetral contra la humedad*
    - *✓ Ventanas estándar en perfiles de aluminio o PVC*
- **Nivel Confort & Eficiencia:**
  - Glosa: "Mayor tranquilidad acústica frente al ruido exterior y hasta un 40% de ahorro en calefacción y aire acondicionado."
  - Bullets:
    - *✓ Ventanas Termopanel (DVH) herméticas en dormitorios y áreas de estar*
    - *✓ Aislación de mayor densidad en tabiquerías y cielos*
    - *✓ Sellos perimetrales para evitar filtraciones de aire*
- **Nivel Premium / EIFS:**
  - Glosa: "Máxima aislación continua exterior para un hogar de temperatura uniforme todo el año y plusvalía superior."
  - Bullets:
    - *✓ Envolvente continua exterior (EIFS) o SIP de alta densidad sin puentes térmicos*
    - *✓ Eliminación de pérdidas de calor a través de muros y estructuras*
    - *✓ Cristales Low-E de alta tecnología y perfilería hermética premium*

---

### 2.2. Catálogo de Precios (`public/precios.html`)

- Actualizar la sección `#niveles-termicos` aplicando idéntica matriz de lenguaje comercial de habitabilidad descrita para la Home, garantizando que el usuario entienda qué recibe a cada nivel sin abrumarse con unidades de laboratorio.

---

### 2.3. Fichas Técnicas de Servicios

#### A. `public/servicios/casas-nuevas.html`
- Metalcom: Destacar la aislación integral entre montantes de acero, barrera hidrófuga perimetral y rapidez de montaje.
- Panel SIP: Destacar la rigidez autoportante y excelente retención térmica continua.
- Paso 4: "Carpeta técnica completa de arquitectura, cálculo y servicios básicos lista para la obtención de la Recepción Final en la Dirección de Obras Municipales (DOM)."

#### B. `public/servicios/segundos-pisos.html`
- Metalcom: Destacar el mínimo peso sobre la casa existente y la aislación termoacústica en entrepiso.
- Paso 4: "Expediente técnico y cálculo de cargas para tramitación municipal y regularización definitiva en la DOM."

---

### 2.4. Preservación del Blog (`public/blog/posts/normativa-aislacion-termica-oguc-santiago-precios.html`)
- **Regla Estricta:** NO se modificará el artículo técnico. El blog actúa como repositorio de autoridad técnica y captura de leads calificados vía SEO orgánico.

---

### 2.5. Refactorización de la Suite TDD (`tests/normative-compliance.spec.js`)

Se ajustará el contrato de pruebas para reflejar la separación entre páginas de ventas (beneficios) y el blog (autoridad técnica):
1. `T01.1`: Validará que `index.html` y `precios.html` expongan los 3 niveles manteniendo la base de 19 UF/m² y el mensaje de habitabilidad y recepción municipal, sin forzar la cadena "4.1.10".
2. `T01.2`: Validará que `casas-nuevas.html` y `segundos-pisos.html` comuniquen la aislación adaptada a Santiago y la carpeta técnica para recepción municipal (DOM).
3. `T01.3`: Mantendrá las aserciones estrictas sobre el post del blog (Schema `TechArticle`, Art. 4.1.10, $U \le 0.38$, $R_{100} \ge 260$, comentarios y WhatsApp oficial).
4. `T01.4`: Mantendrá la validación de `AGENTS.md` como SSOT técnico y operativo.

---

## 3. Plan de Verificación y Criterios de Éxito

1. `npx playwright test tests/normative-compliance.spec.js` en verde al 100%.
2. `npx playwright test` (suite global completa) con 77/77 pruebas aprobadas con 0 fallos.
3. Inspección de diff para asegurar cambios quirúrgicos sin tocar CSS ni lógica funcional de cotizadores.
