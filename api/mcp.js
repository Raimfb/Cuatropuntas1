// api/mcp.js - Model Context Protocol HTTP Endpoint
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      name: "cuatropuntas-mcp-server",
      version: "1.0.0",
      status: "online",
      description: "Servidor MCP de Constructora Cuatro Puntas para cotizaciones de construcción y asesoría en Chile.",
      tools: [
        {
          name: "cotizar_construccion",
          description: "Calcula presupuesto estimado de construcción o ampliación en Santiago por m2.",
          inputSchema: {
            type: "object",
            properties: {
              metros_cuadrados: { type: "number" },
              materialidad: { type: "string", enum: ["metalcom", "sip", "albanileria"] }
            },
            required: ["metros_cuadrados", "materialidad"]
          }
        },
        {
          name: "consultar_subsidio_minvu",
          description: "Requisitos de postulación Subsidio DS1 sitio propio.",
          inputSchema: {
            type: "object",
            properties: {
              tramo: { type: "string", enum: ["tramo1", "tramo2", "tramo3"] }
            }
          }
        }
      ]
    });
  }

  if (req.method === 'POST') {
    const { method, params, id } = req.body || {};

    if (method === 'tools/list') {
      return res.status(200).json({
        jsonrpc: "2.0",
        id: id || 1,
        result: {
          tools: [
            {
              name: "cotizar_construccion",
              description: "Calcula presupuesto estimado de construcción o ampliación en Santiago por m2.",
              inputSchema: {
                type: "object",
                properties: {
                  metros_cuadrados: { type: "number" },
                  materialidad: { type: "string", enum: ["metalcom", "sip", "albanileria"] }
                },
                required: ["metros_cuadrados", "materialidad"]
              }
            }
          ]
        }
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'cotizar_construccion') {
        const m2 = args.metros_cuadrados || 50;
        const mat = args.materialidad || 'metalcom';
        const precios = { metalcom: 13.5, sip: 15.5, albanileria: 20 };
        const ufM2 = precios[mat] || 15;
        return res.status(200).json({
          jsonrpc: "2.0",
          id: id || 1,
          result: {
            content: [
              {
                type: "text",
                text: `Cotización estimada para ${m2} m² en ${mat}: ${m2 * ufM2} UF referenciales (aprox. ${ufM2} UF/m²). Contacto: https://wa.me/56963482439`
              }
            ]
          }
        });
      }
    }

    return res.status(200).json({
      jsonrpc: "2.0",
      id: id || 1,
      result: { status: "ready" }
    });
  }

  res.status(405).json({ error: "Method not allowed" });
};
