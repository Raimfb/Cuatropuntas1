import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Spec 021: Automatización y Blindaje de Parámetros Operativos en Cal.com', () => {
  const scriptPath = path.resolve(process.cwd(), 'scripts/configure-calcom-event.js');

  test('T01.1: El script scripts/configure-calcom-event.js debe existir físicamente y exportar funciones modulares', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);

    const mod = require(scriptPath);
    expect(typeof mod.loadConfig).toBe('function');
    expect(typeof mod.buildEventPayload).toBe('function');
    expect(typeof mod.calculateDiff).toBe('function');
    expect(typeof mod.syncCalcomEvent).toBe('function');
  });

  test('T01.2: buildEventPayload construye el payload canónico para Cal.com API v2 (1440 min, buffers 45 min, 14 días rodantes)', () => {
    const { buildEventPayload } = require(scriptPath);
    const payload = buildEventPayload();

    expect(payload).toEqual({
      minimumBookingNotice: 1440,
      beforeEventBuffer: 45,
      afterEventBuffer: 45,
      bookingWindow: {
        type: 'calendarDays',
        value: 14,
        rolling: true
      }
    });
  });

  test('T01.3: calculateDiff detecta discrepancias de configuración e identifica cuándo ya está sincronizado (idempotencia)', () => {
    const { calculateDiff, buildEventPayload } = require(scriptPath);
    const target = buildEventPayload();

    const currentRemote = {
      id: 6800545,
      slug: 'visita-tecnica',
      minimumBookingNotice: 120,
      beforeEventBuffer: 90,
      afterEventBuffer: 90,
      bookingWindow: { disabled: true }
    };

    const diffResult = calculateDiff(currentRemote, target);
    expect(diffResult.hasChanges).toBe(true);
    expect(diffResult.diffs.length).toBeGreaterThanOrEqual(4);

    const noticeDiff = diffResult.diffs.find(d => d.field === 'minimumBookingNotice');
    expect(noticeDiff).toBeDefined();
    expect(noticeDiff.from).toBe(120);
    expect(noticeDiff.to).toBe(1440);

    const beforeDiff = diffResult.diffs.find(d => d.field === 'beforeEventBuffer');
    expect(beforeDiff).toBeDefined();
    expect(beforeDiff.from).toBe(90);
    expect(beforeDiff.to).toBe(45);

    const afterDiff = diffResult.diffs.find(d => d.field === 'afterEventBuffer');
    expect(afterDiff).toBeDefined();
    expect(afterDiff.from).toBe(90);
    expect(afterDiff.to).toBe(45);

    // Cuando ya está sincronizado
    const syncedRemote = {
      id: 6800545,
      slug: 'visita-tecnica',
      minimumBookingNotice: 1440,
      beforeEventBuffer: 45,
      afterEventBuffer: 45,
      bookingWindow: {
        type: 'calendarDays',
        value: 14,
        rolling: true
      }
    };
    const syncedResult = calculateDiff(syncedRemote, target);
    expect(syncedResult.hasChanges).toBe(false);
    expect(syncedResult.diffs.length).toBe(0);
  });

  test('T01.4: loadConfig gestiona banderas CLI y extrae credenciales de forma segura sin exponer secretos', () => {
    const { loadConfig } = require(scriptPath);

    const envWithKey = { CAL_API_KEY: 'cal_live_test_secret_12345' };
    const config = loadConfig(envWithKey, ['--dry-run', '--slug=visita-tecnica', '--username=cuatropuntas.com']);

    expect(config.apiKey).toBe('cal_live_test_secret_12345');
    expect(config.dryRun).toBe(true);
    expect(config.slug).toBe('visita-tecnica');
    expect(config.username).toBe('cuatropuntas.com');

    // Manejo ante ausencia de clave
    const configNoKey = loadConfig({}, []);
    expect(configNoKey.apiKey).toBeNull();
    expect(configNoKey.dryRun).toBe(false);
  });

  test('T01.5: syncCalcomEvent sale limpiamente si falta CAL_API_KEY (CI/CD friendly)', async () => {
    const { syncCalcomEvent } = require(scriptPath);

    const result = await syncCalcomEvent({
      apiKey: null,
      slug: 'visita-tecnica',
      username: 'cuatropuntas.com',
      dryRun: false
    });

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('MISSING_API_KEY');
  });

  test('T01.6: syncCalcomEvent en modo --dry-run no despacha peticiones mutacionales PATCH', async () => {
    const { syncCalcomEvent } = require(scriptPath);

    let patchCalled = false;
    const mockFetch = async (url, options = {}) => {
      if (options.method === 'PATCH') {
        patchCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'success' })
        };
      }
      // Mock GET
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: [
            {
              id: 6800545,
              slug: 'visita-tecnica',
              minimumBookingNotice: 120,
              beforeEventBuffer: 90,
              afterEventBuffer: 90,
              bookingWindow: { disabled: true }
            }
          ]
        })
      };
    };

    const result = await syncCalcomEvent({
      apiKey: 'cal_live_test_key',
      slug: 'visita-tecnica',
      username: 'cuatropuntas.com',
      dryRun: true,
      fetchFn: mockFetch
    });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(patchCalled).toBe(false);
    expect(result.diffResult.hasChanges).toBe(true);
  });

  test('T01.7: syncCalcomEvent aplica PATCH con payload exacto y respeta idempotencia', async () => {
    const { syncCalcomEvent } = require(scriptPath);

    let sentPayload = null;
    let sentHeaders = null;

    const mockFetch = async (url, options = {}) => {
      if (options.method === 'PATCH') {
        sentPayload = JSON.parse(options.body);
        sentHeaders = options.headers;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'success',
            data: {
              id: 6800545,
              ...sentPayload
            }
          })
        };
      }
      // Mock GET
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: [
            {
              id: 6800545,
              slug: 'visita-tecnica',
              minimumBookingNotice: 120,
              beforeEventBuffer: 90,
              afterEventBuffer: 90,
              bookingWindow: { disabled: true }
            }
          ]
        })
      };
    };

    const result = await syncCalcomEvent({
      apiKey: 'cal_live_test_key',
      slug: 'visita-tecnica',
      username: 'cuatropuntas.com',
      dryRun: false,
      fetchFn: mockFetch
    });

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);
    expect(sentPayload).toEqual({
      minimumBookingNotice: 1440,
      beforeEventBuffer: 45,
      afterEventBuffer: 45,
      bookingWindow: {
        type: 'calendarDays',
        value: 14,
        rolling: true
      }
    });
    expect(sentHeaders['cal-api-version']).toBe('2024-06-14');
    expect(sentHeaders['Authorization']).toBe('Bearer cal_live_test_key');
  });
});
