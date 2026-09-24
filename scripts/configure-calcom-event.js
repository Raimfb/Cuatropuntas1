/**
 * scripts/configure-calcom-event.js
 * Sincronización y blindaje de parámetros operativos en Cal.com API v2
 * Spec 021: 24h anticipación (1440 min), buffers 45 min y ventana rodante 14 días
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar .env.local prioritariamente, luego .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function loadConfig(env = process.env, args = process.argv.slice(2)) {
  const apiKey = env.CAL_API_KEY || null;
  const dryRun = args.includes('--dry-run');

  let slug = 'visita-tecnica';
  let username = 'cuatropuntas.com';

  for (const arg of args) {
    if (arg.startsWith('--slug=')) {
      slug = arg.split('=')[1];
    } else if (arg.startsWith('--username=')) {
      username = arg.split('=')[1];
    }
  }

  return {
    apiKey,
    dryRun,
    slug,
    username
  };
}

function buildEventPayload(options = {}) {
  return {
    minimumBookingNotice: options.minimumNotice !== undefined ? options.minimumNotice : 1440,
    beforeEventBuffer: options.beforeBuffer !== undefined ? options.beforeBuffer : 45,
    afterEventBuffer: options.afterBuffer !== undefined ? options.afterBuffer : 45,
    bookingWindow: options.bookingWindow || {
      type: 'calendarDays',
      value: 14,
      rolling: true
    }
  };
}

function calculateDiff(currentEvent, targetPayload) {
  const diffs = [];

  if (currentEvent.minimumBookingNotice !== targetPayload.minimumBookingNotice) {
    diffs.push({
      field: 'minimumBookingNotice',
      from: currentEvent.minimumBookingNotice,
      to: targetPayload.minimumBookingNotice,
      description: 'Anticipación mínima (minutos)'
    });
  }

  if (currentEvent.beforeEventBuffer !== targetPayload.beforeEventBuffer) {
    diffs.push({
      field: 'beforeEventBuffer',
      from: currentEvent.beforeEventBuffer,
      to: targetPayload.beforeEventBuffer,
      description: 'Colchón de traslado previo (minutos)'
    });
  }

  if (currentEvent.afterEventBuffer !== targetPayload.afterEventBuffer) {
    diffs.push({
      field: 'afterEventBuffer',
      from: currentEvent.afterEventBuffer,
      to: targetPayload.afterEventBuffer,
      description: 'Colchón de traslado posterior (minutos)'
    });
  }

  const currentWindow = currentEvent.bookingWindow || {};
  const targetWindow = targetPayload.bookingWindow || {};

  const windowDiff =
    currentWindow.disabled !== targetWindow.disabled ||
    currentWindow.type !== targetWindow.type ||
    currentWindow.value !== targetWindow.value ||
    currentWindow.rolling !== targetWindow.rolling;

  if (windowDiff) {
    diffs.push({
      field: 'bookingWindow',
      from: currentWindow,
      to: targetWindow,
      description: 'Ventana de agendamiento futuro'
    });
  }

  return {
    hasChanges: diffs.length > 0,
    diffs
  };
}

async function syncCalcomEvent({
  apiKey,
  slug = 'visita-tecnica',
  username = 'cuatropuntas.com',
  dryRun = false,
  fetchFn = globalThis.fetch
} = {}) {
  if (!apiKey) {
    console.warn('⚠️ [CAL.COM WARNING] CAL_API_KEY no encontrada en las variables de entorno (.env.local / .env).');
    console.warn('   Saltando sincronización de parámetros de Cal.com sin fallar.');
    return {
      success: false,
      skipped: true,
      reason: 'MISSING_API_KEY'
    };
  }

  const targetPayload = buildEventPayload();

  // 1. Consultar tipos de evento del usuario
  const listUrl = `https://api.cal.com/v2/event-types?username=${encodeURIComponent(username)}`;
  const listRes = await fetchFn(listUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'cal-api-version': '2024-06-14'
    }
  });

  if (!listRes.ok) {
    const errorText = await listRes.text();
    console.error(`❌ [CAL.COM ERROR] Error al consultar tipos de evento (${listRes.status}): ${errorText}`);
    return {
      success: false,
      error: `HTTP_${listRes.status}`,
      details: errorText
    };
  }

  const listData = await listRes.json();
  const eventTypes = listData.data || [];
  const event = eventTypes.find(e => e.slug === slug);

  if (!event) {
    console.error(`❌ [CAL.COM ERROR] Evento con slug "${slug}" no encontrado para el usuario "${username}".`);
    return {
      success: false,
      error: 'EVENT_NOT_FOUND',
      slug,
      username
    };
  }

  const diffResult = calculateDiff(event, targetPayload);

  console.log(`\n📅 [CAL.COM AUDIT] Evento localizado: "${event.title}" (ID: ${event.id}, Slug: "${event.slug}")`);
  console.log(`   URL pública: ${event.bookingUrl || `https://cal.com/${username}/${slug}`}`);

  if (!diffResult.hasChanges) {
    console.log('✅ [CAL.COM SYNC] El evento ya cuenta con los parámetros operativos canónicos. Cero cambios necesarios (Idempotente).');
    return {
      success: true,
      updated: false,
      reason: 'ALREADY_SYNCED',
      eventId: event.id,
      current: event
    };
  }

  console.log('\n🔍 [CAL.COM DIFF] Diferencias detectadas frente a la política de la Spec 021:');
  for (const d of diffResult.diffs) {
    console.log(`   - ${d.field} (${d.description}):`);
    console.log(`     Actual:   ${JSON.stringify(d.from)}`);
    console.log(`     Objetivo: ${JSON.stringify(d.to)}`);
  }

  if (dryRun) {
    console.log('\n🛡️ [CAL.COM DRY-RUN] Modo simulación activo (--dry-run). No se enviaron cambios a la API de Cal.com.');
    return {
      success: true,
      dryRun: true,
      eventId: event.id,
      diffResult
    };
  }

  // 2. Aplicar actualización vía PATCH
  const updateUrl = `https://api.cal.com/v2/event-types/${event.id}`;
  const updateRes = await fetchFn(updateUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'cal-api-version': '2024-06-14',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(targetPayload)
  });

  if (!updateRes.ok) {
    const errorText = await updateRes.text();
    console.error(`❌ [CAL.COM ERROR] Error al actualizar el evento (${updateRes.status}): ${errorText}`);
    return {
      success: false,
      error: `HTTP_${updateRes.status}`,
      details: errorText
    };
  }

  const updateData = await updateRes.json();
  console.log(`\n🎉 [CAL.COM SYNC EXITOSO] Evento "${event.title}" actualizado con éxito en Cal.com:`);
  console.log(`   • Anticipación mínima: 1440 min (24 horas)`);
  console.log(`   • Buffer previo: 45 min`);
  console.log(`   • Buffer posterior: 45 min`);
  console.log(`   • Ventana rodante: 14 días calendario`);

  return {
    success: true,
    updated: true,
    eventId: event.id,
    data: updateData.data
  };
}

async function main() {
  const config = loadConfig();
  const result = await syncCalcomEvent({
    apiKey: config.apiKey,
    slug: config.slug,
    username: config.username,
    dryRun: config.dryRun
  });

  if (!result.success && !result.skipped) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Excepción no controlada en configure-calcom-event:', err);
    process.exit(1);
  });
}

module.exports = {
  loadConfig,
  buildEventPayload,
  calculateDiff,
  syncCalcomEvent
};
