# Skill: Cotización de Proyectos de Construcción

## Propósito
Permite a agentes de IA y clientes calcular el presupuesto estimado de obras residenciales en Chile conforme a la Matriz Oficial de Precios de Constructora Cuatropuntas SpA (Valores netos +IVA).

## Parámetros de Entrada
- Superficie en m² (mínimo recomendado: 15 m² para ampliaciones, 45 m² para casas nuevas).
- Tipología y Materialidad:
  - **Casas Nuevas (1 Piso):** Metalcom (desde 19 UF/m²), Panel SIP (desde 21 UF/m²), Albañilería armada (desde 25 UF/m²).
  - **Segundos Pisos y Ampliaciones:** Metalcom (desde 22 UF/m²), Panel SIP (desde 24 UF/m²), Albañilería (desde 27 UF/m²).
  - **Quinchos y Terrazas:** Metalcom (desde 12 UF/m²), Albañilería (desde 15 UF/m²).
  - **Remodelaciones Integrales:** Ligera Metalcom (desde 11 UF/m²), Sólida Albañilería (desde 13 UF/m²).
  - **Recintos Húmedos Pequeños:** Baño Completo (65 a 95 UF), Cocina Integral (90 a 160 UF).
- Comuna de la Región Metropolitana de Santiago.
- Estado de planimetría y permisos DOM (`Idea`, `Planos`, `PermisoAprobado`, `ArquitectoPropio`).

## Factores Paramétricos y Alcance DOM (Netos +IVA)
- **Criterios de Obra, Terreno y Emplazamiento RM:** Los valores del presupuesto son estimativos y se calculan en base al tipo de obra, tipo de terreno, valor de suelo y lejanía de la urbe de Santiago, aspectos revisados en terreno.
- **Planimetría, Cálculo y Gestión DOM:** Etapa `Idea` (desde cero: diseño, cálculo estructural y trámite DOM completo desde Permiso de Edificación hasta Certificado de Recepción Final Definitiva) aplica **`+8%` (`1.08`)** en Casas Nuevas y Ampliaciones (`0%` evaluación en terreno en Quinchos y Remodelaciones); `Planos` (cálculo estructural y gestión DOM completa hasta Certificado de Recepción Final Definitiva) aplica **`-3%` (`0.97`)**; `PermisoAprobado` / `ArquitectoPropio` aplica **`-6%` (`0.94`)** y corresponde a solo ejecución de obra con entrega de carpeta técnica del constructor. Derechos municipales (1,5% tabla MINVU) y empalmes definitivos se detallan aparte al costo real. **Cláusula de exclusión:** La Recepción Final cubre exclusivamente lo ejecutado por Cuatropuntas según planos aprobados; no se tramita Recepción Final si el mandante/terceros ejecutan obras anexas no contratadas (quinchos, piscinas, ampliaciones o paisajismo/exteriores) o si existen construcciones preexistentes sin regularizar.
- **Escala y Terminaciones:** Proyectos `<40 m²` aplican **`+8%`**; nivel Premium aplica **`+10%`**.

## Flujo de Trabajo
1. Validar m², tipología, materialidad, comuna RM y etapa de planimetría/DOM.
2. Calcular rango de inversión neto (+IVA) aplicando los criterios de obra, terreno, comuna RM y etapa DOM en UF y pesos chilenos según valor UF actual.
3. Informar respaldo de garantía conforme al Art. 18 de la LGUC (10 años en estructura).
4. Ofrecer derivación a visita técnica presencial (https://cal.com/cuatropuntas.com/visita-tecnica) o contacto oficial por WhatsApp (+56 9 2738 4075).
