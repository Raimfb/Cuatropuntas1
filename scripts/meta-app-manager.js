/**
 * Meta App & WhatsApp Business Cloud API Manager
 * CLI and API utility to inspect, manage, and verify Meta Cloud API status.
 * Constructora Cuatropuntas SpA
 */

require('dotenv').config();
const https = require('https');

const GRAPH_VERSION = 'v21.0';
const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1243578125508024';

function graphRequest(path, method = 'GET', postData = null) {
    return new Promise((resolve, reject) => {
        if (!TOKEN) {
            return reject(new Error('WHATSAPP_TOKEN no está definido en las variables de entorno.'));
        }

        const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);
        if (method === 'GET' && !url.searchParams.has('access_token')) {
            url.searchParams.append('access_token', TOKEN);
        }

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Accept': 'application/json'
            }
        };

        let body = null;
        if (postData) {
            body = JSON.stringify(postData);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = https.request(options, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(resBody);
                    resolve({ status: res.statusCode, data: parsed });
                } catch(e) {
                    resolve({ status: res.statusCode, raw: resBody });
                }
            });
        });

        req.on('error', (err) => reject(err));
        if (body) req.write(body);
        req.end();
    });
}

// 1. Inspeccionar detalles del número y salud de la cuenta
async function getPhoneStatus(phoneId = PHONE_ID) {
    console.log(`\n🔍 Consultando estado del número de WhatsApp (${phoneId})...`);
    const fields = 'id,verified_name,code_verification_status,display_phone_number,quality_rating,platform_type,throughput,webhook_configuration';
    const res = await graphRequest(`/${phoneId}?fields=${fields}`);

    if (res.status === 200 && res.data) {
        console.log('✅ Estado del Número obtenido exitosamente:');
        console.log(`   • ID Telefónico: ${res.data.id}`);
        console.log(`   • Nombre Verificado: ${res.data.verified_name}`);
        console.log(`   • Número en Pantalla: ${res.data.display_phone_number}`);
        console.log(`   • Calificación de Calidad: ${res.data.quality_rating}`);
        console.log(`   • Estado de Verificación: ${res.data.code_verification_status}`);
        console.log(`   • Rendimiento (Throughput): ${res.data.throughput?.level || 'N/A'}`);
        console.log(`   • Webhook Configurado: ${res.data.webhook_configuration?.application || 'No configurado'}`);
        return res.data;
    } else {
        console.error('❌ Error consultando el número:', res.data || res.raw);
        return null;
    }
}

// 2. Inspeccionar Token de Meta y Scopes
async function inspectToken() {
    console.log(`\n🔐 Inspeccionando permisos y vigencia del Token Meta...`);
    const res = await graphRequest(`/debug_token?input_token=${TOKEN}`);

    if (res.status === 200 && res.data?.data) {
        const d = res.data.data;
        console.log('✅ Información del Token:');
        console.log(`   • App ID: ${d.app_id}`);
        console.log(`   • Tipo de Usuario: ${d.type}`);
        console.log(`   • ¿Es Válido?: ${d.is_valid ? 'SÍ ✅' : 'NO ❌'}`);
        console.log(`   • Expira: ${d.expires_at === 0 ? 'Nunca (Token Permanente) ♾️' : new Date(d.expires_at * 1000).toLocaleString()}`);
        console.log(`   • Scopes Aprobados: ${d.scopes?.join(', ')}`);
        return d;
    } else {
        console.error('❌ Error inspeccionando el token:', res.data || res.raw);
        return null;
    }
}

// 3. Enviar mensaje de prueba a un número autorizado
async function sendTestMessage(recipientPhone, messageText = 'Mensaje de prueba de automatización Cuatropuntas') {
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    console.log(`\n📤 Enviando mensaje de prueba a +${cleanPhone}...`);

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: messageText }
    };

    const res = await graphRequest(`/${PHONE_ID}/messages`, 'POST', payload);

    if (res.status === 200 && res.data?.messages) {
        console.log(`✅ Mensaje enviado exitosamente. ID: ${res.data.messages[0].id}`);
        return true;
    } else {
        console.error('❌ Error al enviar mensaje:', res.data || res.raw);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const action = args[0] || 'status';

    console.log('======================================================');
    console.log('🛠️  META CLOUD API & WHATSAPP BUSINESS MANAGER');
    console.log('======================================================');

    if (action === 'status') {
        await inspectToken();
        await getPhoneStatus();
    } else if (action === 'send') {
        const phone = args[1];
        const text = args.slice(2).join(' ') || 'Prueba de conexión exitosa desde Cuatropuntas.';
        if (!phone) {
            console.error('Uso: node scripts/meta-app-manager.js send <numero_e164> [mensaje]');
            process.exit(1);
        }
        await sendTestMessage(phone, text);
    } else {
        console.log('Acciones disponibles:');
        console.log('  node scripts/meta-app-manager.js status');
        console.log('  node scripts/meta-app-manager.js send <numero_e164> [mensaje]');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    getPhoneStatus,
    inspectToken,
    sendTestMessage,
    graphRequest
};
