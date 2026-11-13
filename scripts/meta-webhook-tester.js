/**
 * Meta WhatsApp Webhook Automated Tester
 * Simulates Meta Cloud API webhook payloads for local and remote integration testing.
 * Constructora Cuatropuntas SpA
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const url = require('url');

// Generador de payloads estándar de Meta Cloud API
function createMetaPayload({
    from = '56912345678',
    name = 'Juan Pérez',
    text = 'Hola, me gustaría cotizar una ampliación de segundo piso',
    messageId = `wamid.HBgL${Date.now()}`,
    phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1243578125508024',
    displayPhoneNumber = '+1 555-188-0101',
    buttonPayload = null
}) {
    const message = {
        from: from,
        id: messageId,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        type: buttonPayload ? 'button' : 'text'
    };

    if (buttonPayload) {
        message.button = {
            payload: buttonPayload,
            text: text
        };
    } else {
        message.text = {
            body: text
        };
    }

    return {
        object: 'whatsapp_business_account',
        entry: [
            {
                id: '1463815779100293',
                changes: [
                    {
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: displayPhoneNumber,
                                phone_number_id: phoneNumberId
                            },
                            contacts: [
                                {
                                    profile: {
                                        name: name
                                    },
                                    wa_id: from
                                }
                            ],
                            messages: [message]
                        },
                        field: 'messages'
                    }
                ]
            }
        ]
    };
}

// Ejecutor de prueba local en memoria (in-process)
async function runLocalScenario(scenarioName, payloadOptions = {}) {
    const whatsappHandler = require('../api/whatsapp.js');
    console.log(`\n======================================================`);
    console.log(`🧪 EJECUTANDO ESCENARIO LOCAL: ${scenarioName.toUpperCase()}`);
    console.log(`======================================================`);

    if (scenarioName === 'verify') {
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'cuatropuntas_webhook_secret_2026';
        const challenge = 'meta_challenge_1234567890';
        
        let statusCode = null;
        let responseBody = null;

        const req = {
            method: 'GET',
            query: {
                'hub.mode': 'subscribe',
                'hub.verify_token': verifyToken,
                'hub.challenge': challenge
            }
        };

        const res = {
            status: (code) => {
                statusCode = code;
                return {
                    send: (body) => { responseBody = body; return res; }
                };
            }
        };

        await whatsappHandler(req, res);
        console.log(`Resultado GET Handshake: Status ${statusCode}, Body: "${responseBody}"`);
        const passed = statusCode === 200 && responseBody === challenge;
        console.log(passed ? '✅ Verificación de Webhook PASADA' : '❌ Verificación de Webhook FALLIDA');
        return passed;
    }

    // Escenario de Mensaje POST
    const payload = createMetaPayload(payloadOptions);
    console.log(`📩 Payload Entrante (Simulado de Meta):`);
    console.log(`   Remitente: ${payloadOptions.name || 'Juan Pérez'} (${payloadOptions.from || '56912345678'})`);
    console.log(`   Mensaje: "${payloadOptions.text}"`);

    let statusCode = null;
    let responseBody = null;

    const req = {
        method: 'POST',
        body: payload
    };

    const res = {
        status: (code) => {
            statusCode = code;
            return {
                send: (body) => { responseBody = body; return res; }
            };
        }
    };

    const startTime = Date.now();
    await whatsappHandler(req, res);
    const duration = Date.now() - startTime;

    console.log(`\n⏱️ Tiempo de respuesta: ${duration}ms`);
    console.log(`HTTP Status: ${statusCode}, Body: ${responseBody}`);
    const passed = statusCode === 200 && responseBody === 'EVENT_RECEIVED';
    console.log(passed ? '✅ Webhook procesó el evento correctamente (200 OK)' : '❌ Error procesando evento');
    return passed;
}

// Ejecutor de prueba HTTP remoto (contra servidor corriendo)
function sendHttpRequest(targetUrl, method, data, queryParams = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new url.URL(targetUrl);
        Object.keys(queryParams).forEach(k => parsed.searchParams.append(k, queryParams[k]));

        const isHttps = parsed.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: method,
            headers: {}
        };

        let bodyData = null;
        if (data && method === 'POST') {
            bodyData = JSON.stringify(data);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(bodyData);
        }

        const req = client.request(options, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: resBody }));
        });

        req.on('error', (err) => reject(err));
        if (bodyData) req.write(bodyData);
        req.end();
    });
}

// Ejecución CLI
async function main() {
    const args = process.argv.slice(2);
    const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'local';
    const targetUrl = args.find(a => a.startsWith('--url='))?.split('=')[1] || 'http://localhost:3000/api/whatsapp';

    console.log(`🚀 Iniciando Suite de Pruebas de Webhook de Meta (Modo: ${mode})`);

    const scenarios = [
        {
            name: 'verify',
            desc: 'Verificación de Handshake GET con hub.challenge'
        },
        {
            name: 'greeting',
            desc: 'Saludo inicial de prospecto',
            options: { name: 'Constanza Silva', text: '¡Hola! Buenas tardes, quería consultar por sus servicios.' }
        },
        {
            name: 'quote_second_floor',
            desc: 'Cotización de Segundo Piso (Metalcom)',
            options: { name: 'Rodrigo Araya', text: 'Hola, tengo una casa en Peñalolén y quiero construir un segundo piso de 50 m2 en metalcom.' }
        },
        {
            name: 'subsidio_discard',
            desc: 'Filtro y descarte de subsidio sin adjudicación',
            options: { name: 'María Gómez', text: 'Hola, quiero postular al subsidio habitacional con ustedes, ¿cómo postulo?' }
        }
    ];

    let passedCount = 0;

    for (const sc of scenarios) {
        try {
            let success = false;
            if (mode === 'local') {
                success = await runLocalScenario(sc.name, sc.options || {});
            } else {
                console.log(`\n🌐 Enviando HTTP POST a ${targetUrl} [${sc.name}]...`);
                if (sc.name === 'verify') {
                    const token = process.env.WHATSAPP_VERIFY_TOKEN || 'cuatropuntas_webhook_secret_2026';
                    const res = await sendHttpRequest(targetUrl, 'GET', null, {
                        'hub.mode': 'subscribe',
                        'hub.verify_token': token,
                        'hub.challenge': 'remote_test_12345'
                    });
                    success = res.status === 200 && res.body === 'remote_test_12345';
                } else {
                    const payload = createMetaPayload(sc.options || {});
                    const res = await sendHttpRequest(targetUrl, 'POST', payload);
                    success = res.status === 200 && res.body === 'EVENT_RECEIVED';
                }
            }

            if (success) passedCount++;
        } catch (err) {
            console.error(`❌ Error en escenario ${sc.name}:`, err.message);
        }
    }

    console.log(`\n======================================================`);
    console.log(`📊 RESUMEN DE PRUEBAS: ${passedCount}/${scenarios.length} Escenarios Pasados`);
    console.log(`======================================================\n`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    createMetaPayload,
    runLocalScenario,
    sendHttpRequest
};
