const { test, expect } = require('@playwright/test');

test.describe('Spec 001 - Quote Engine Core Unit Tests', () => {
    test('api/quote.js se puede requerir sin errores de sintaxis y exporta calculateQuote', async () => {
        const quoteModule = require('../api/quote');
        expect(quoteModule).toBeDefined();
        expect(typeof quoteModule.calculateQuote).toBe('function');
    });

    test('Casas Nuevas 1 Piso: Matriz base oficial (19 UF Metalcom, 21 UF SIP, 25 UF Albañilería) + Factor Idea (+8%)', async () => {
        const { calculateQuote } = require('../api/quote');

        // Metalcom: 19 UF/m² * 100 m² * 1.08 (Idea: Diseño + Cálculo + DOM) = 2052 UF
        const metalcomQuote = calculateQuote({
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            area: 100,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea'
        });
        expect(metalcomQuote.baseUFm2).toBe(19);
        expect(metalcomQuote.factorPermisos).toBe(1.08);
        expect(metalcomQuote.totalEstimado).toBeCloseTo(2052, 2);
        expect(metalcomQuote.minUF).toBe('1.970'); // Math.round(2052 * 0.96) = 1970
        expect(metalcomQuote.maxUF).toBe('2.155'); // Math.round(2052 * 1.05) = 2155

        // SIP: 21 UF/m² * 100 m² * 1.08 = 2268 UF
        const sipQuote = calculateQuote({
            tipo: 'Casa Nueva',
            sistema: 'SIP',
            area: 100,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea'
        });
        expect(sipQuote.baseUFm2).toBe(21);
        expect(sipQuote.totalEstimado).toBeCloseTo(2268, 2);

        // Albañilería: 25 UF/m² * 100 m² * 1.08 = 2700 UF
        const albanileriaQuote = calculateQuote({
            tipo: 'Casa Nueva',
            sistema: 'Albañilería',
            area: 100,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea'
        });
        expect(albanileriaQuote.baseUFm2).toBe(25);
        expect(albanileriaQuote.totalEstimado).toBeCloseTo(2700, 2);
    });

    test('Segundos Pisos y Ampliaciones: Matriz base (22 UF Metalcom, 24 UF SIP, 27 UF Albañilería) + Factor Idea (+8%)', async () => {
        const { calculateQuote } = require('../api/quote');

        const amplQuote = calculateQuote({
            tipo: 'Segundo Piso',
            sistema: 'Metalcon',
            area: 50,
            pisos: 2,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea'
        });
        expect(amplQuote.baseUFm2).toBe(22);
        expect(amplQuote.factorPermisos).toBe(1.08);
        expect(amplQuote.totalEstimado).toBeCloseTo(1188, 2); // 1100 * 1.08 = 1188
    });

    test('Quinchos de Alto Estándar: Matriz base (12 UF Metalcom, 15 UF Albañilería)', async () => {
        const { calculateQuote } = require('../api/quote');

        const quinchoQuote = calculateQuote({
            tipo: 'Quincho',
            sistema: 'Metalcon',
            area: 30,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea'
        });
        expect(quinchoQuote.baseUFm2).toBe(12);
        // Área < 40 m² tiene factor escala +8%: 12 * 1.08 * 30 = 388.8
        expect(quinchoQuote.multiplicador).toBe(1.08);
        expect(quinchoQuote.totalEstimado).toBeCloseTo(388.8, 1);
    });

    test('Remodelación de Baño Pequeño (4 m²): Aplica piso base técnico (60-70 UF)', async () => {
        const { calculateQuote } = require('../api/quote');

        const banoQuote = calculateQuote({
            tipo: 'Remodelacion',
            sistema: 'Metalcon',
            area: 4,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'Idea'
        });

        // En lugar de 4 * 11 UF = 44 UF, aplica baseRecinto = 60 UF
        expect(banoQuote.totalEstimado).toBe(60);
        expect(banoQuote.minUF).toBe('58'); // 60 * 0.96 = 57.6 -> 58
        expect(banoQuote.maxUF).toBe('63'); // 60 * 1.05 = 63
    });

    test('Factores de Descuento por Permiso DOM y Recargo Premium', async () => {
        const { calculateQuote } = require('../api/quote');

        // Permiso DOM aprobado aplica factor 0.94 (~6% descuento técnico)
        const domQuote = calculateQuote({
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            area: 100,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Santiago',
            permisos: 'PermisoAprobado'
        });
        expect(domQuote.factorPermisos).toBe(0.94);
        expect(domQuote.totalEstimado).toBe(1900 * 0.94);

        // Terminaciones Premium aplica +10% (y permisos Idea +8% en Casa Nueva)
        const premiumQuote = calculateQuote({
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            area: 100,
            pisos: 1,
            terminaciones: 'Premium',
            comuna: 'Santiago',
            permisos: 'Idea'
        });
        expect(premiumQuote.multiplicador).toBe(1.10);
        expect(premiumQuote.factorPermisos).toBe(1.08);
        expect(premiumQuote.totalEstimado).toBeCloseTo(1900 * 1.10 * 1.08, 2);
    });

    test('Spec 029.2: Calibración Sector Oriente (1.22) y Gestión Arquitectura/DOM (1.08) en Casa Nueva 100 m² Las Condes (~2.400 a 2.630 UF)', async () => {
        const { calculateQuote, getFactorComuna, getPermisosData } = require('../api/quote');

        // 1. Validar factor 1.22 en las 5 comunas del Sector Oriente (incluyendo variaciones de mayúsculas/tildes)
        for (const comuna of ['Las Condes', 'VITACURA', 'Lo Barnechea', 'La Reina', 'Providencia', 'las condes']) {
            expect(getFactorComuna(comuna)).toBe(1.22);
        }
        // Resto de comunas intactas
        expect(getFactorComuna('Santiago Centro')).toBe(1.00);
        expect(getFactorComuna('Ñuñoa')).toBe(1.00);
        expect(getFactorComuna('Colina (Chicureo)')).toBe(0.98);
        expect(getFactorComuna('Pirque')).toBe(0.98);

        // 2. Validar factorPermisos para 'Idea' según tipología
        expect(getPermisosData('Idea', 'Casa Nueva').factor).toBe(1.08);
        expect(getPermisosData('Idea', 'Ampliacion').factor).toBe(1.08);
        expect(getPermisosData('Idea', 'Quincho').factor).toBe(1.00);
        expect(getPermisosData('Idea', 'Remodelacion').factor).toBe(1.00);

        // 3. Caso objetivo: Casa Nueva 100 m² en Las Condes (Metalcon, Estándar, Idea)
        // Subtotal = 19 * 100 * 1.22 * 1.08 = 2503.44 UF -> Rango: 2.403 a 2.629 UF + IVA
        const lasCondesQuote = calculateQuote({
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            area: 100,
            pisos: 1,
            terminaciones: 'Estandar',
            comuna: 'Las Condes',
            permisos: 'Idea'
        });

        expect(lasCondesQuote.factorComuna).toBe(1.22);
        expect(lasCondesQuote.factorPermisos).toBe(1.08);
        expect(lasCondesQuote.totalEstimado).toBeCloseTo(2503.44, 2);
        expect(lasCondesQuote.minUF_raw).toBeGreaterThanOrEqual(2400);
        expect(lasCondesQuote.minUF_raw).toBeLessThanOrEqual(2410);
        expect(lasCondesQuote.maxUF_raw).toBeGreaterThanOrEqual(2620);
        expect(lasCondesQuote.maxUF_raw).toBeLessThanOrEqual(2635);
        expect(lasCondesQuote.minUF).toBe('2.403');
        expect(lasCondesQuote.maxUF).toBe('2.629');
    });

    test('Persistencia Fail-Safe: Resiliencia de persistLeadToGoogleSheets ante URL no configurada o error', async () => {
        const { persistLeadToGoogleSheets } = require('../api/quote');
        const dummyLead = {
            nombre: 'Test Lead Resiliencia',
            email: 'test@resiliencia.com',
            telefono: '+56912345678',
            tipo: 'Casa Nueva',
            sistema: 'Metalcon',
            areaNum: 100,
            pisosNum: 1,
            terminaciones: 'Estandar',
            comunaHuman: 'Las Condes, RM',
            permisos: 'Idea',
            minUF: '1.824',
            maxUF: '1.995',
            totalEstimado: 1900
        };

        // Caso A: Sin variable de entorno configurada
        const originalEnv = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
        delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;

        const resWithoutEnv = await persistLeadToGoogleSheets(dummyLead);
        expect(resWithoutEnv.success).toBe(false);
        expect(resWithoutEnv.reason).toBe('URL_NOT_CONFIGURED');

        // Caso B: URL inalcanzable (simulando timeout / error de red sin botar el proceso)
        process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'http://127.0.0.1:59999/unreachable-sheets-webhook';
        const resUnreachable = await persistLeadToGoogleSheets(dummyLead);
        expect(resUnreachable.success).toBe(false);
        expect(resUnreachable.reason).toBeDefined();

        // Restaurar variable original si existía
        if (originalEnv) {
            process.env.GOOGLE_SHEETS_WEBHOOK_URL = originalEnv;
        } else {
            delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
        }
    });
});

