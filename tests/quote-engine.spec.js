const { test, expect } = require('@playwright/test');

test.describe('Spec 001 - Quote Engine Core Unit Tests', () => {
    test('api/quote.js se puede requerir sin errores de sintaxis y exporta calculateQuote', async () => {
        const quoteModule = require('../api/quote');
        expect(quoteModule).toBeDefined();
        expect(typeof quoteModule.calculateQuote).toBe('function');
    });

    test('Casas Nuevas 1 Piso: Matriz base oficial (19 UF Metalcom, 21 UF SIP, 25 UF Albañilería)', async () => {
        const { calculateQuote } = require('../api/quote');

        // Metalcom: 19 UF/m²
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
        expect(metalcomQuote.totalEstimado).toBe(1900);
        expect(metalcomQuote.minUF).toBe('1.824'); // 1900 * 0.96 = 1824
        expect(metalcomQuote.maxUF).toBe('1.995'); // 1900 * 1.05 = 1995

        // SIP: 21 UF/m²
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
        expect(sipQuote.totalEstimado).toBe(2100);

        // Albañilería: 25 UF/m²
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
        expect(albanileriaQuote.totalEstimado).toBe(2500);
    });

    test('Segundos Pisos y Ampliaciones: Matriz base (22 UF Metalcom, 24 UF SIP, 27 UF Albañilería)', async () => {
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
        expect(amplQuote.totalEstimado).toBe(1100);
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

        // Terminaciones Premium aplica +10%
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
        expect(premiumQuote.totalEstimado).toBe(1900 * 1.10);
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

