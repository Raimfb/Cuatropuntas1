// api/mcp.js - Model Context Protocol HTTP Endpoint
const { getFactorComuna, getPermisosData } = require('./quote');

const TARIFAS_BASE_SSOT = {
  casa_nueva: { metalcom: 19, sip: 21, albanileria: 25, label: 'Casa Nueva Llave en Mano (1 Piso)' },
  segundo_piso: { metalcom: 22, sip: 24, albanileria: 27, label: 'Segundo Piso / Ampliación' },
  quincho: { metalcom: 12, sip: 14, albanileria: 15, label: 'Quincho y Terraza' },
  remodelacion: { metalcom: 11, sip: 13, albanileria: 13, label: 'Remodelación Integral' }
};

function describeAnilloRM(factor) {
  if (factor >= 1.22) return 'Anillo 5 — Sector Oriente (+22%)';
  if (factor >= 1.18) return 'Anillo 4 — Chicureo / Colina (+18%)';
  if (factor >= 1.08) return 'Anillo 3 — Cordón Lejano RM (+8%)';
  if (factor >= 1.02) return 'Anillo 2 — Pirque (+2%)';
  return 'Anillo 1 — Base Local / Santiago Urbano (0%)';
}

const COTIZAR_INPUT_SCHEMA = {
  type: "object",
  properties: {
    metros_cuadrados: { type: "number", description: "Superficie estimada en m² (obras <40 m² aplican +8% por escala)." },
    materialidad: { type: "string", enum: ["metalcom", "sip", "albanileria"] },
    tipo_proyecto: {
      type: "string",
      enum: ["casa_nueva", "segundo_piso", "quincho", "remodelacion"],
      description: "Tipo de obra (por defecto casa_nueva)."
    },
    comuna: {
      type: "string",
      description: "Comuna de la Región Metropolitana (aplica Anillos Logísticos RM: 0% a +22%)."
    },
    permisos: {
      type: "string",
      enum: ["Idea", "Planos", "PermisoAprobado", "ArquitectoPropio"],
      description: "Estado de planimetría/DOM: Idea (+8% diseño, cálculo y DOM en casas/ampliaciones), Planos (-3%), PermisoAprobado o ArquitectoPropio (-6%)."
    }
  },
  required: ["metros_cuadrados", "materialidad"]
};

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
      version: "1.1.0",
      status: "online",
      description: "Servidor MCP de Constructora Cuatro Puntas para cotizaciones paramétricas SSOT en la Región Metropolitana (valores netos +IVA).",
      tools: [
        {
          name: "cotizar_construccion",
          description: "Calcula presupuesto estimado neto (+IVA) según matriz SSOT, 5 anillos logísticos RM y etapa arquitectura/DOM.",
          inputSchema: COTIZAR_INPUT_SCHEMA
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
              description: "Calcula presupuesto estimado neto (+IVA) según matriz SSOT, 5 anillos logísticos RM y etapa arquitectura/DOM.",
              inputSchema: COTIZAR_INPUT_SCHEMA
            }
          ]
        }
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'cotizar_construccion') {
        const m2 = Math.max(1, Number(args.metros_cuadrados) || 50);
        const matKey = String(args.materialidad || 'metalcom').toLowerCase().trim();
        const matNorm = matKey === 'metalcon' ? 'metalcom' : (matKey === 'covintec' ? 'sip' : matKey);
        const tipoKey = String(args.tipo_proyecto || 'casa_nueva').toLowerCase().trim();
        const tipoConfig = TARIFAS_BASE_SSOT[tipoKey] || TARIFAS_BASE_SSOT.casa_nueva;
        const tarifaBase = tipoConfig[matNorm] || tipoConfig.metalcom;

        const factorEscala = m2 < 40 ? 1.08 : 1.00;
        const factorComuna = getFactorComuna(args.comuna || '');
        const permisosKey = args.permisos || 'Idea';
        const permisosData = getPermisosData(permisosKey, tipoKey);
        const factorPermisos = permisosData.factor;

        const ufM2Final = Number((tarifaBase * factorEscala * factorComuna * factorPermisos).toFixed(2));
        const totalUF = Math.round(tarifaBase * factorEscala * factorComuna * factorPermisos * m2);
        const anilloLabel = describeAnilloRM(factorComuna);

        return res.status(200).json({
          jsonrpc: "2.0",
          id: id || 1,
          result: {
            content: [
              {
                type: "text",
                text: `Cotización preliminar para ${tipoConfig.label} de ${m2} m² en ${matNorm}: ${totalUF} UF netos (+IVA) (~${ufM2Final} UF/m² netos +IVA). Base SSOT: ${tarifaBase} UF/m² | Territorio: ${anilloLabel} (x${factorComuna.toFixed(2)}) | Planimetría/DOM (${permisosKey}): x${factorPermisos.toFixed(2)} — ${permisosData.badgeShort}${factorEscala > 1 ? ' | Escala <40 m² (+8%)' : ''}. Cotizador web: https://www.cuatropuntas.com/#cotizador | WhatsApp: https://wa.me/56927384075`
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
