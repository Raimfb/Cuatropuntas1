# Especificación de Requerimientos: Spec 014 - Delimitación de Alcance Técnico y Transparencia para Quinchos
**Feature ID:** `014_quincho_technical_scope`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Problema de Negocio

En el modelo comercial de Cuatropuntas, los proyectos de **Quinchos y Terrazas** parten desde **12 UF/m² + IVA** (en estructura ligera Metalcom) y **15 UF/m² + IVA** (en albañilería en obra).

Históricamente, la falta de delimitación contractual y publicitaria explícita en las fichas del sitio web y en el cotizador automático ha generado fricciones con prospectos que asumen que la tarifa paramétrica base incluye:
1. **Redes sanitarias completas:** Trazo de cañerías desde matriz de agua potable, grifería, lavacopas de acero y excavación/canalización de desagües hasta cámara de alcantarillado exterior.
2. **Canalización eléctrica dedicada:** Alimentación subterránea o aérea desde el tablero general de distribución (TDA), automáticos independientes y luminarias decorativas.
3. **Mobiliario terminado de carpintería fina:** Muebles cerrados bajo mesón con puertas, cajoneras y tiradores.
4. **Cubiertas de lujo:** Piedra natural (mármol, granito pulido) o cuarzo reconstituido.

Estas partidas conllevan una alta variabilidad técnica que depende exclusivamente de la distancia al empalme existente, la topografía del terreno y las preferencias de terminación del cliente. Si se prometen dentro de la tarifa base, causan frustración o presupuestos no rentables.

La **Spec 014** resuelve esta asimetría mediante:
1. **Delimitación Taxativa del Alcance Base:** Fijar formalmente las partidas incluidas en la tarifa paramétrica (techumbre, radier, parrilla con refractarios y manivela, campana y mesón básico).
2. **Declaración Explícita de Exclusiones en Cotizador (`api/quote.js`):** Inyección obligatoria de `notasAlcance` específicas para quinchos en el JSON de respuesta, en la Ficha Técnica PDF (`pdfkit`) y en los correos transaccionales (cliente y administración).
3. **Tarjeta de Transparencia en Frontend (`public/quote-wizard.js`):** Despliegue de un bloque de alcance en el Paso 3 (Resumen) al cotizar un quincho.
4. **Saneamiento Web y Blindaje SSOT (`public/servicios/quinchos.html` y `AGENTS.md`):** Eliminación de afirmaciones engañosas de "instalaciones sanitarias/eléctricas y cubiertas de cuarzo incluidas" en copys y metadatos SEO.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Requerimientos Ubicuos (Ubiquitous Requirements)
- **[EARS-014-01] Definición Oficial de Alcance Base de Quinchos:** El sistema y la documentación comercial **DEBEN** considerar como partidas incluidas en la cotización base de quinchos (desde 12 UF/m² Metalcom y 15 UF/m² Albañilería):
  * Cobertizo o techumbre estructural (madera o acero según diseño).
  * Piso de hormigón / radier afinado.
  * Parrilla tradicional en obra revestida en ladrillos refractarios con mecanismo elevable y manivela frontal.
  * Campana de hojalatería con ducto de tiraje y sombrero para evacuación limpia de humos.
  * Mesón de apoyo lateral básico (en madera estructural o albañilería afinada).
- **[EARS-014-02] Exclusiones Taxativas Obligatorias:** El sistema y la documentación técnica **DEBEN** declarar taxativamente como exclusiones de la tarifa base (a cubicar y presupuestar en terreno tras visita técnica):
  * Redes sanitarias (empalmes de agua potable, grifería, lavacopas y canalización de desagües a alcantarillado).
  * Canalización eléctrica desde tablero general o iluminación decorativa adicional.
  * Muebles cerrados bajo mesón (puertas de madera, cajoneras o herrajes).
  * Cubiertas en piedra natural (granito, mármol o cuarzo).
  * Spiedos motorizados u otros accesorios de cocción adicionales.

### 2.2. Requerimientos Basados en Eventos (Event-Driven Requirements)
- **[EARS-014-03] Inyección de Cláusula de Quincho en Motor de Cotización:** **Cuando** se invoque la función `calculateQuote` con `tipo === 'Quincho'` (o variaciones que incluyan "quincho"), el sistema **DEBE** inyectar en el arreglo `notasAlcance` de la respuesta las dos notas oficiales de quinchos:
  1. *Alcance Base Incluido:* "Quincho Base Incluye: Cobertizo o techumbre (madera o acero según diseño), radier de hormigón afinado, parrilla en obra con ladrillos refractarios y mecanismo elevable con manivela frontal, campana de hojalatería con ducto de tiraje y mesón de apoyo lateral básico."
  2. *Exclusiones Taxativas:* "Partidas Adicionales (a presupuestar en terreno tras visita técnica): No contempla conexiones sanitarias (empalme de agua potable, grifería, lavacopas ni desagüe a alcantarillado), canalización eléctrica desde tablero general, muebles cerrados bajo mesón ni cubiertas en piedra natural (granito/cuarzo)."
- **[EARS-014-04] Presentación en Paso 3 del Wizard:** **Cuando** el usuario avance al Paso 3 en `public/quote-wizard.js` habiendo seleccionado `qTipo === 'Quincho'`, el sistema **DEBE** mostrar dinámicamente una tarjeta informativa de transparencia técnica con el detalle de lo que incluye y no incluye la estimación.
- **[EARS-014-05] Limpieza al Cambiar de Tipo de Proyecto:** **Cuando** el usuario cambie el selector `#qTipo` a un tipo distinto de Quincho (ej. "Casa Nueva" o "Ampliacion"), el sistema **DEBE** ocultar y limpiar la tarjeta de resumen de alcance de quinchos en el Paso 3.

### 2.3. Requerimientos de Estado (State-Driven Requirements)
- **[EARS-014-06] Consistencia en Generación de PDF y Correos:** **Mientras** se procese una solicitud de cotización para un quincho en `api/quote.js`, el sistema **DEBE** renderizar la sección de alcance técnico con título representativo ("Alcance Técnico de Partidas (Quincho / Terraza)") tanto en el correo al cliente, en el correo al administrador y en la ficha PDF adjunta.

### 2.4. Requerimientos No Deseados y Manejo de Errores (Unwanted Behavior / Fail-Safe)
- **[EARS-014-07] Prevención de Textos Falsos en la Landing:** **Si** la página `public/servicios/quinchos.html` contiene referencias que afirmen que las instalaciones sanitarias, de gas, eléctricas o cubiertas de cuarzo/granito vienen "incluidas" en la tarifa base, el sistema **DEBE** sustituirlas por copys alineados a la política de presupuesto de adicionales en terreno.

---

## 3. Criterios de Aceptación Técnicos
1. `calculateQuote({ tipo: 'Quincho', area: 25, sistema: 'Metalcon' })` retorna `notasAlcance` con exactamente 2 cláusulas técnicas (Alcance Base Incluido y Exclusiones Taxativas).
2. El endpoint `/api/quote` devuelve en su respuesta JSON `notasAlcance` con las cláusulas de quinchos cuando `tipo === 'Quincho'`.
3. El correo HTML al cliente reemplaza el título estático de "Remodelación" por una etiqueta contextualizada para quinchos cuando corresponda.
4. El PDF generado contiene la sección "Alcance Técnico Específico (Partidas Incluidas / Excluidas)" con las viñetas del quincho.
5. El Paso 3 de `public/quote-wizard.js` despliega la tarjeta de alcance para Quinchos con estilos coherentes y se oculta para otros tipos de proyectos.
6. `public/servicios/quinchos.html` tiene sus metadatos (description, open graph, json-ld) y tarjetas de equipamiento corregidos, eliminando la falsa inclusión de agua/luz/muebles/granito en el precio base.
7. `AGENTS.md` incorpora la política técnica oficial de quinchos en la Matriz de Precios y Parámetros Comerciales (Sección 3).
8. La suite automatizada `tests/quincho-scope.spec.js` verifica de punta a punta: cálculo unitario, endpoint HTTP, renderizado en UI y persistencia.
9. La suite global de regresión (`npx playwright test`) conserva 100% de éxito.
