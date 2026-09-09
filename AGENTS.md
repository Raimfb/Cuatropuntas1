# Instrucciones Operativas para Agentes de IA (AGENTS.md)
**Proyecto:** Constructora Cuatropuntas SpA (`cuatropuntas-secure`)  
**Única Fuente de Verdad (SSOT):** Este documento consolida las directrices de ingeniería, diseño, desarrollo y negocio. Sustituye y deroga formalmente al antiguo `ai_coding_manifesto.md` (archivado en [`docs/archive/ai_coding_manifesto.md`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/docs/archive/ai_coding_manifesto.md)).

---

## 1. Constitución y Metodología SDD (Spec-Driven Development)

Toda intervención en este repositorio debe respetar estrictamente la [Constitución del Proyecto](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/docs/constitution.md) y el ciclo de vida de **Spec-Driven Development (SDD)**:

```text
1. Auditoría / Investigación → 2. Spec (EARS) → 3. Plan Técnico → 4. Desglose Tasks → 5. Aprobación → 6. Ejecución Quirúrgica → 7. Verificación Real
```

* **Prohibido Codificar sin Spec:** No se escribirá código productivo (`api/`, `public/`) sin una especificación formal aprobada en `specs/00X_[nombre_feature]/`.
* **Prohibido el Código Roto en Producción:** Todo archivo `.js` debe compilar sin errores de sintaxis (`node -c <archivo>`).
* **Pruebas Sin Mocks Ciegos:** Ninguna prueba debe simular éxito falso sobre endpoints rotos o dependencias no verificadas.

---

## 2. Ecosistema Oficial de Telefonía y Canales (SSOT)

Queda terminantemente prohibido utilizar números de teléfono no autorizados o de pruebas obsoletas en código, documentación o metadatos.

| Canal / Propósito | Número Oficial | Formato Internacional E.164 | Rol Operativo |
| :--- | :--- | :--- | :--- |
| **Captura y Funnel Automatizado** | `+56 9 2738 4075` | `56927384075` | • Botón flotante WhatsApp en la web.<br>• Webhook Meta Cloud API de entrada.<br>• Asistente conversacional de prospección. |
| **Contacto Comercial / Cierre Humano** | `+56 9 7909 2027` | `56979092027` | • Recepción de alertas instantáneas de leads calificados.<br>• Recepción de avisos de reuniones agendadas en Cal.com.<br>• Botón "1-Touch WhatsApp" en correos al administrador. |
| **NÚMERO PURGADO (PROHIBIDO)** | `+56 9 6348 2439` | `56963482439` | ❌ Número obsoleto de pruebas de Meta. Prohibido en código, Markdown, MCP y documentación. |

> Para detalles completos de la calificación de prospectos, bifurcaciones de árbol conversacional y descarte de no-cualificados, consultar la fuente comercial oficial:  
> 🔗 [`whatsapp_meta_funnel.md`](file:///c:/Users/raimu/Documents/vyxa%20core/Cuatropuntas-Secure/whatsapp_meta_funnel.md)

---

## 3. Matriz Oficial de Precios y Parámetros Comerciales

Toda API, cotizador, prompt de IA, catálogo Markdown (`/api/markdown`), servidor MCP (`/api/mcp`) y página web debe sincronizarse con esta matriz exacta (Valores netos +IVA):

1. **Casas Nuevas Llave en Mano (1 Piso):**
   - Metalcom Estructural: desde **19 UF/m²**
   - Panel SIP / Covintec: desde **21 UF/m²**
   - Albañilería Armada / Mixto: desde **25 UF/m²**
2. **Segundos Pisos y Ampliaciones:**
   - Metalcom: desde **22 UF/m²**
   - Panel SIP: desde **24 UF/m²**
   - Albañilería: desde **27 UF/m²**
3. **Quinchos y Terrazas de Alto Estándar:**
   - Metalcom: desde **12 UF/m²**
   - Albañilería en obra: desde **15 UF/m²**
4. **Remodelaciones Integrales (>25 m²):**
   - Ligera (Metalcom): desde **11 UF/m²**
   - Sólida (Albañilería): desde **13 UF/m²**
5. **Recintos Húmedos Pequeños (No se cotizan por m² lineal):**
   - **Baño Completo:** **65 a 95 UF** (instalaciones de agua/desagüe, impermeabilización, revestimientos y artefactos).
   - **Cocina Integral:** **90 a 160 UF** (muebles a medida, cubiertas de cuarzo, redes sanitarias y gas).
6. **Agendamiento Oficial:**
   - Visita Técnica en Terreno: `https://cal.com/cuatropuntas.com/visita-tecnica`
7. **Estándar Térmico Obligatorio y Niveles de Confort (Art. 4.1.10 OGUC & Ley 21.305):**
   - **Exigencia Base Zona 3 RM (Santiago):** Todo proyecto habitacional debe cumplir con la transmitancia máxima en techumbre $U \le 0.38\ \text{W/m}^2\text{K}$ ($R_{100} \ge 260$), aislación perimetral en muros, barrera de vapor continua y vanos reglamentarios para aprobación de Recepción Final DOM (Art. 5.1.6).
   - **Nivel Base Normativo (Desde 19 UF/m² +IVA):** Cumple el 100% de la normativa legal de aislación para recepción DOM con ventanas estándar.
   - **Nivel Confort & Eficiencia (22 a 24 UF/m² +IVA):** Incorpora ventanas termopanel DVH en recintos habitables, mayor densidad aislante y sellos herméticos perimetrales (hasta 40% de ahorro energético).
   - **Nivel Premium / EIFS (26 a 29 UF/m² +IVA):** Envolvente térmica exterior continua (EIFS) o SIP de alta densidad, eliminación total de puentes térmicos y apto para Calificación Energética de Viviendas (CEV).

---

## 4. Principios de Ejecución Técnica (Ex-Manifesto)

### 4.1. Planificación Obligatoria (Think Before Coding)
* **Validación de Premisas:** Prohibido asumir contexto o interpretar ambigüedades en silencio. Si hay incertidumbre técnica o de negocio, formula preguntas antes de escribir código.
* **Gestión de Alternativas:** Si una tarea tiene múltiples rutas de implementación, presenta las opciones clave y sus trade-offs antes de elegir una por defecto.
* **Criterio de Simplicidad:** Si un requerimiento puede resolverse de forma más compacta y mantenible, proponla abiertamente.

### 4.2. Minimalismo Estricto (Simplicity First)
* **Cero Características Extra:** No agregar funcionalidades, librerías, abstracciones o preparaciones para "futuros casos de uso" no solicitados explícitamente en la Spec.
* **Evitar la Sobre-ingeniería:** No crear microservicios, capas abstractas o configuraciones dinámicas innecesarias para lógica de propósito único.
* **Regla de Compactación:** Si una solución supera las ~150-200 líneas de código cuando puede resolverse en 50 líneas legibles y robustas, reescríbela de forma concisa.

### 4.3. Modificaciones Quirúrgicas (Surgical Changes)
* **Aislamiento del Diff:** Intervenir única y exclusivamente las líneas necesarias. No alterar espaciados, indentación ni comentarios de bloques adyacentes sin justificación.
* **Mimetismo de Estilo:** Respetar la arquitectura existente en el repositorio (CommonJS para backend Vercel, ES Modules en cliente si aplica).
* **Gestión de Huérfanos:** Eliminar importaciones, variables y funciones que queden sin uso tras tus propios cambios. No eliminar código preexistente sin autorización.

### 4.4. Ejecución Orientada a Metas (Goal-Driven & Loop)
* **Definición de Éxito:** Traducir los requisitos en criterios de aceptación técnicos y ejecutables (ej. `node -c api/quote.js` sale con código 0; test unitario valida cálculo de 100 m² = 1900 UF).
* **Planificación por Pasos Atómicos:** Dividir tareas complejas en pasos secuenciales con comando o prueba de verificación inmediata.
* **Bucle Autónomo de Verificación:** Ejecutar linters, sintaxis y tests localmente para corregir cualquier anomalía antes de declarar una tarea completada.
