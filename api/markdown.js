// api/markdown.js - Markdown content negotiation for AI agents
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const page = (req.query.page || req.query.path || 'index').toLowerCase();
  
  let markdown = '';
  
  if (page.includes('precio')) {
    markdown = `# Precios de Construcción por m² en Chile - Constructora Cuatro Puntas

Valores referenciales actualizados para construcción residencial llave en mano en Santiago y alrededores:

## 1. Casas Nuevas Llave en Mano
- **Metalcom Estructural:** 11 a 16 UF/m² ($420.000 - $610.000 CLP/m²)
- **Panel SIP Certificado:** 13 a 18 UF/m² ($495.000 - $685.000 CLP/m²)
- **Albañilería Armada / Sólida:** 16 a 24 UF/m² ($610.000 - $915.000 CLP/m²)

## 2. Ampliaciones y Segundos Pisos
- **Segundo Piso en Metalcom:** 12 a 17 UF/m²
- **Ampliación en Primer Piso (Panel SIP):** 13 a 18 UF/m²
- **Ampliación Sólida:** 16 a 22 UF/m²

## 3. Quinchos y Terrazas Premium
- **Quincho Estándar (Estructura y asador):** 8 a 12 UF/m²
- **Quincho Premium (Muebles, isla de granito, baño y parrilla integrada):** 12 a 16 UF/m²

## Contacto para Cotización Formal
- WhatsApp: +56 9 6348 2439
- Web: https://cuatropuntas.com
- Email: contacto@cuatropuntas.com
`;
  } else if (page.includes('subsidio')) {
    markdown = `# Subsidio MINVU DS1 - Construcción en Sitio Propio - Cuatro Puntas

Guía técnica y de postulación para construir vivienda con subsidio del Estado en terreno propio.

## Tramos del Subsidio DS1
- **Tramo 1:** Hasta 950 UF de costo de construcción.
- **Tramo 2:** Hasta 1.400 UF de costo.
- **Tramo 3:** Hasta 2.200 UF de costo.

## Requisitos Principales
1. Terreno con título de dominio inscrito en el Conservador de Bienes Raíces (CBR) a nombre del postulante o cónyuge.
2. Certificado de informaciones previas (CIP) que permita uso habitacional.
3. Factibilidad de servicios (agua potable, alcantarillado, electricidad).
4. Ahorro mínimo en cuenta para la vivienda al último día hábil del mes anterior a la postulación.

## Servicio Integral Cuatro Puntas
- Proyecto de Arquitectura y Cálculo Estructural.
- Permiso de Edificación y Recepción Final en Dirección de Obras Municipales (DOM).
- Ejecución completa de obras.

Contacto: contacto@cuatropuntas.com / WhatsApp: +56 9 6348 2439
`;
  } else {
    // Portada / Default
    markdown = `# Constructora Cuatro Puntas

> Constructora líder en Santiago de Chile en casas llave en mano, ampliaciones, segundos pisos, quinchos premium y gestión de subsidios MINVU.

## Servicios Principales
- **Construcción Llave en Mano:** Proyectos residenciales desde fundaciones hasta terminaciones de lujo.
- **Ampliaciones y 2dos Pisos:** Ampliación liviana o sólida con cálculo estructural garantizado.
- **Quinchos y Terrazas:** Espacios gourmet y recreativos personalizados.
- **Subsidios MINVU DS1 / DS49:** Gestión integral de arquitectura, DOM y construcción en sitio propio.

## Materiales Disponibles
- **Metalcom Estructural:** Rápido, sismorresistente y económico (11-16 UF/m²).
- **Panel SIP:** Máxima eficiencia energética y térmica (13-18 UF/m²).
- **Albañilería y Hormigón:** Solidez, durabilidad e inercia térmica (16-24 UF/m²).

## Documentación y Protocolos
- Catálogo de Precios: https://cuatropuntas.com/precios
- Guía Subsidio Minvu: https://cuatropuntas.com/subsidio-minvu-sitio-propio
- Resumen LLMs: https://cuatropuntas.com/llms.txt
- Documento Extendido: https://cuatropuntas.com/llms-full.txt
- Servidor MCP: https://cuatropuntas.com/.well-known/mcp/server-card.json

## Vías de Contacto
- WhatsApp: +56 9 6348 2439
- Email: contacto@cuatropuntas.com
- Web: https://cuatropuntas.com
`;
  }

  // Estimar tokens aproximados (1 token ~ 4 caracteres)
  const tokenCount = Math.ceil(markdown.length / 4);

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Vary', 'Accept');
  res.setHeader('x-markdown-tokens', tokenCount.toString());
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(markdown);
};
