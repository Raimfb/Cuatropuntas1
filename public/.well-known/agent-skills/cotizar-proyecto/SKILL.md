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

## Flujo de Trabajo
1. Validar m² y materialidad seleccionada.
2. Calcular rango de inversión en UF y pesos chilenos según valor UF actual.
3. Informar respaldo de garantía conforme al Art. 18 de la LGUC (10 años en estructura).
4. Ofrecer derivación a visita técnica presencial (https://cal.com/cuatropuntas.com/visita-tecnica) o contacto oficial por WhatsApp (+56 9 2738 4075).
