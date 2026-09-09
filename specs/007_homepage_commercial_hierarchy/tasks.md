# Task Breakdown: 007 - Homepage Commercial Hierarchy & Service Decoupling
**Feature ID:** `007_homepage_commercial_hierarchy`  
**Estado:** PENDING USER APPROVAL (STOP GATE)  
**Metodología:** SDD (Spec-Driven Development)

---

## Tareas de Implementación Quirúrgica

- [x] **Task 1: Actualización del Arnés de Pruebas (`tests/verify.spec.js`)**
  - Agregar el test unitario `Verificar rebalanceo comercial y 4 tarjetas de servicios en index.html`.
  - Asegurar aserciones para el Hero, las 4 tarjetas de servicios, eliminación de tarjeta L450, Pilar 03 de Garantía y Banner de Acreditación.
  - *Comando de Verificación:* `npx playwright test tests/verify.spec.js -g "rebalanceo comercial"` (aprobado).

- [x] **Task 2: Intervención Quirúrgica en Hero Section (`public/index.html`)**
  - Modificar la línea de valor en `header#inicio p.text-orange-200`.
  - Reemplazar texto por: `Precios desde 19 UF/m² +IVA · Construcción Llave en Mano · Trámites DOM Incluidos`.
  - *Comando de Verificación:* `git diff public/index.html` (aprobado).

- [x] **Task 3: Limpieza en Sección Autoridad ("¿Por qué elegirnos?") (`public/index.html`)**
  - Sustituir el badge verde `Trabajamos con Subsidios MINVU` por `Construcción Llave en Mano` con ícono check.
  - Eliminar por completo el bloque contenedor `Feature 4 (Subsidies)` en L450 (`div.bg-blue-50`).
  - *Comando de Verificación:* Inspección de diff sin líneas huérfanas (aprobado).

- [x] **Task 4: Desacoplamiento de Grilla a 4 Tarjetas Simétricas (`public/index.html`)**
  - Reemplazar el bloque `#servicios` por las 4 tarjetas de alto impacto:
    1. *Casas Nuevas Llave en Mano* (Metalcom, SIP, Albañilería / desde 19 UF/m²).
    2. *Segundos Pisos y Ampliaciones* (Estructura liviana, sin sobrecarga, habitabilidad / desde 22 UF/m²).
    3. *Remodelaciones Integrales* (Baños 65-95 UF, Cocinas 90-160 UF, recintos >25 m² desde 11 UF/m²).
    4. *Quinchos y Terrazas de Alto Estándar* (Parrillas en obra, cubiertas, iluminación / desde 12 UF/m²).
  - Validar enlaces independientes a `/servicios/casas-nuevas/`, `/servicios/segundos-pisos/`, `/servicios/remodelaciones/` y `/servicios/quinchos/`.
  - *Comando de Verificación:* Aprobado por suite Playwright.

- [x] **Task 5: Actualización de Pilar 03 en Garantía Técnica (`public/index.html`)**
  - Reemplazar el ítem `03 Subsidios MINVU` por `03 Presupuesto Cerrado y Plazos de Entrega`.
  - Actualizar estilo de caja y texto descriptivo de garantía contractual.
  - *Comando de Verificación:* Aprobado por suite Playwright.

- [x] **Task 6: Inserción del Banner Secundario de Acreditación MINVU (`public/index.html`)**
  - Insertar banner sobrio antes de `#contacto` con filtro estricto: *"Acreditados ante el MINVU para Construcción en Sitio Propio (DS1 y DS49). Requisito: Terreno propio y subsidio adjudicado en mano."*
  - Enlazar a `/subsidio-minvu-sitio-propio`.
  - *Comando de Verificación:* Aprobado por suite Playwright.

- [x] **Task 7: Ejecución del Arnés Completo de Pruebas y Validación E2E**
  - Ejecutar `npx playwright test tests/verify.spec.js`.
  - Ejecutar suite global para evitar regresiones (`npx playwright test`).
  - *Comando de Verificación:* 65/65 tests aprobados (0 errores).
