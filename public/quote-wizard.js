/**
 * Constructora Cuatropuntas SpA - Cotizador Web Modular
 * public/quote-wizard.js
 * 
 * Componente unificado para el cotizador multi-paso con validación,
 * formateo telefónico chileno, soporte de URL pre-fill, anti-bot y
 * puente con Cal.com.
 */

(function(window, document) {
    'use strict';

    const COMUNAS_RM = [
        "Alhué", "Buin", "Calera de Tango", "Cerrillos", "Cerro Navia", "Colina (Chicureo)",
        "Conchalí", "Curacaví", "El Bosque", "El Monte", "Estación Central", "Huechuraba",
        "Independencia", "Isla de Maipo", "La Cisterna", "La Florida", "La Granja", "La Pintana",
        "La Reina", "Lampa (Batuco)", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado",
        "Macul", "Maipú", "María Pinto", "Melipilla", "Ñuñoa", "Padre Hurtado", "Paine",
        "Pedro Aguirre Cerda", "Peñaflor", "Peñalolén", "Pirque", "Providencia", "Pudahuel",
        "Puente Alto", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Bernardo",
        "San Joaquín", "San José de Maipo", "San Miguel", "San Pedro", "San Ramón",
        "Santiago Centro", "Talagante", "Tiltil", "Vitacura", "Otra comuna de la RM"
    ];

    const CONFIG_POR_TIPO = {
        'Casa Nueva': {
            sistemaLabel: 'Sistema Constructivo',
            showSistema: true,
            sistemas: [
                { value: "Metalcon", label: "Metalcom Estructural (Acero Galvanizado)" },
                { value: "SIP", label: "Panel SIP (Alta Eficiencia Termoacústica)" },
                { value: "Albanileria", label: "Albañilería Tradicional / Hormigón" }
            ],
            defaultSistema: 'Metalcon',
            areaPlaceholder: 'Ej: 50 o 120',
            areaHelpText: '',
            showEspacios: false,
            minArea: 10,
            showPisos: true,
            pisosLabel: 'Número de Pisos',
            pisosOptions: [
                { value: "1", label: "1 Piso" },
                { value: "2", label: "2 o más Pisos" }
            ],
            defaultPisos: "1",
            terminacionesLabel: 'Nivel de Terminaciones',
            terminacionesOptions: [
                { value: "Basico", label: "Básico (Habitable, ventanas estándar, revestimientos estándar)" },
                { value: "Estandar", label: "Estándar (Buenas terminaciones superficiales)" },
                { value: "Premium", label: "Premium (Termopanel, pisos flotantes, revestimientos)" }
            ],
            defaultTerminaciones: "Estandar",
            showPermisos: true,
            permisosLabel: 'Estado de Planos y Permiso Municipal (DOM)',
            defaultPermisos: "Idea"
        },
        'Ampliacion': {
            sistemaLabel: 'Sistema Constructivo (Ampliación 1º piso o Sobreelevación 2º piso)',
            showSistema: true,
            sistemas: [
                { value: "Metalcon", label: "Metalcom Estructural (Ideal 1º y 2º Piso)" },
                { value: "SIP", label: "Panel SIP Termoacústico" },
                { value: "Albanileria", label: "Albañilería / Estructura Mixta" }
            ],
            defaultSistema: 'Metalcon',
            areaPlaceholder: 'Ej: 30 o 60',
            areaHelpText: '',
            showEspacios: false,
            minArea: 10,
            showPisos: true,
            pisosLabel: 'Ubicación de la Obra (1º piso hacia patio o 2º piso sobreelevación)',
            pisosOptions: [
                { value: "1", label: "Primer Piso (Extensión hacia patio o terreno)" },
                { value: "2", label: "Segundo Piso (Sobreelevación estructural liviana)" }
            ],
            defaultPisos: "1",
            terminacionesLabel: 'Nivel de Terminaciones',
            terminacionesOptions: [
                { value: "Basico", label: "Básico (Habitable, ventanas estándar, revestimientos estándar)" },
                { value: "Estandar", label: "Estándar (Buenas terminaciones superficiales)" },
                { value: "Premium", label: "Premium (Termopanel DVH, pisos fotolaminados, aislación perimetral)" }
            ],
            defaultTerminaciones: "Estandar",
            showPermisos: true,
            permisosLabel: 'Estado de Planos y Permiso Municipal (DOM)',
            defaultPermisos: "Idea"
        },
        'Remodelacion': {
            sistemaLabel: 'Sistema Constructivo',
            showSistema: false,
            sistemas: [
                { value: "Metalcon", label: "Remodelación Estándar" }
            ],
            defaultSistema: 'Metalcon',
            areaPlaceholder: 'Ej: 4 (baño), 15 (cocina) o 50 (casa)',
            areaHelpText: 'Los recintos húmedos puros (baño o cocina) se cotizan por paquete cerrado con partidas integrales.',
            showEspacios: true,
            minArea: 3,
            showPisos: false,
            pisosLabel: 'Número de Pisos',
            pisosOptions: [{ value: "1", label: "1 Piso" }],
            defaultPisos: "1",
            terminacionesLabel: 'Nivel de Terminaciones de Interiores',
            terminacionesOptions: [
                { value: "Estandar", label: "Estándar (Cerámicas/porcelanatos tradicionales, grifería estándar, pintura lavable)" },
                { value: "Premium", label: "Alta Gama / Premium (Porcelanatos rectificados, grifería empotrada, cubiertas cuarzo/silestone)" }
            ],
            defaultTerminaciones: "Estandar",
            showPermisos: false,
            permisosLabel: 'Estado de Planos y Permiso Municipal (DOM)',
            defaultPermisos: "Idea"
        },
        'Quincho': {
            sistemaLabel: 'Estructura y Techumbre del Cobertizo',
            showSistema: true,
            sistemas: [
                { value: "Metalcon", label: "Estructura en Pino Oregón / Madera Seleccionada" },
                { value: "SIP", label: "Estructura Mixta con Cubierta Termoaislada" },
                { value: "Albanileria", label: "Perfilería de Acero y Albañilería a la Vista" }
            ],
            defaultSistema: 'Metalcon',
            areaPlaceholder: 'Ej: 20 o 35',
            areaHelpText: 'Tarifa base contempla cobertura, radier, asador refractario con manivela y campana.',
            showEspacios: false,
            minArea: 10,
            showPisos: false,
            pisosLabel: 'Número de Pisos',
            pisosOptions: [{ value: "1", label: "1 Piso" }],
            defaultPisos: "1",
            terminacionesLabel: 'Nivel de Terminaciones y Pavimentos',
            terminacionesOptions: [
                { value: "Estandar", label: "Estándar (Radier afinado / Porcelanato rústico, parrilla y mesón en obra)" },
                { value: "Premium", label: "Premium (Porcelanato antideslizante, cubiertas granito/cuarzo, iluminación empotrada)" }
            ],
            defaultTerminaciones: "Estandar",
            showPermisos: true,
            permisosLabel: 'Estado de Planos y Permiso Municipal (DOM)',
            defaultPermisos: "Idea"
        }
    };

    function getTipoConfig(tipoVal) {
        if (!tipoVal) return CONFIG_POR_TIPO['Casa Nueva'];
        const lower = String(tipoVal).toLowerCase();
        if (lower.includes('remodela')) return CONFIG_POR_TIPO['Remodelacion'];
        if (lower.includes('quincho')) return CONFIG_POR_TIPO['Quincho'];
        if (lower.includes('amplia') || lower.includes('segundo')) return CONFIG_POR_TIPO['Ampliacion'];
        return CONFIG_POR_TIPO['Casa Nueva'];
    }

    const TIPOS_DEFAULT = [
        { value: "Casa Nueva", label: "Construcción Casa Nueva" },
        { value: "Ampliacion", label: "Segundo Piso / Ampliación" },
        { value: "Remodelacion", label: "Remodelación" },
        { value: "Quincho", label: "Quincho / Terraza" }
    ];

    let _renderedAt = Date.now();

    /**
     * Formatea un número al estándar móvil chileno (+56 9 XXXX XXXX)
     */
    function formatChileanPhone(raw) {
        if (!raw) return '';
        const digits = raw.replace(/\D/g, '');
        
        // Si viene con código de país 56
        if (digits.startsWith('569') && digits.length >= 11) {
            const mobile = digits.slice(3, 11);
            return `+56 9 ${mobile.slice(0, 4)} ${mobile.slice(4, 8)}`;
        }
        if (digits.startsWith('56') && digits.length >= 10) {
            const mobile = digits.slice(2, 10);
            return `+56 9 ${mobile.slice(0, 4)} ${mobile.slice(4, 8)}`;
        }
        // Si ingresa 9 dígitos comenzando con 9 (ej: 912345678)
        if (digits.startsWith('9') && digits.length === 9) {
            const mobile = digits.slice(1);
            return `+56 9 ${mobile.slice(0, 4)} ${mobile.slice(4, 8)}`;
        }
        // Si ingresa 8 dígitos sin el 9 (ej: 12345678)
        if (digits.length === 8) {
            return `+56 9 ${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
        }
        // Retornar con prefijo si tiene dígitos suficientes
        if (digits.length > 8) {
            const part = digits.slice(-8);
            return `+56 9 ${part.slice(0, 4)} ${part.slice(4, 8)}`;
        }
        return raw;
    }

    /**
     * Genera la plantilla HTML del wizard
     */
    function createWizardHTML(config) {
        const defaultTipo = config.defaultTipo || 'Casa Nueva';
        const initialTipoConfig = getTipoConfig(defaultTipo);
        const defaultSistema = config.defaultSistema || initialTipoConfig.defaultSistema;
        const placeholderArea = config.placeholderArea || initialTipoConfig.areaPlaceholder || 'Ej: 4 (baño), 15 (cocina) o 50 (casa)';

        const tipoOptions = (config.tipos || TIPOS_DEFAULT).map(t => {
            const val = typeof t === 'string' ? t : t.value;
            const lbl = typeof t === 'string' ? t : t.label;
            const isSel = val === defaultTipo ? 'selected' : '';
            return `<option value="${val}" ${isSel}>${lbl}</option>`;
        }).join('');

        const sistemaOptions = initialTipoConfig.sistemas.map(s => {
            const isSel = s.value === defaultSistema ? 'selected' : '';
            return `<option value="${s.value}" ${isSel}>${s.label}</option>`;
        }).join('');

        const pisosOptions = (initialTipoConfig.pisosOptions || [
            { value: "1", label: "1 Piso" },
            { value: "2", label: "2 o más Pisos" }
        ]).map(p => `<option value="${p.value}" ${p.value === (initialTipoConfig.defaultPisos || '1') ? 'selected' : ''}>${p.label}</option>`).join('');

        const terminacionesOptions = (initialTipoConfig.terminacionesOptions || [
            { value: "Basico", label: "Básico (Habitable, ventanas estándar, revestimientos estándar)" },
            { value: "Estandar", label: "Estándar (Buenas terminaciones superficiales)" },
            { value: "Premium", label: "Premium (Termopanel, pisos flotantes, revestimientos)" }
        ]).map(t => `<option value="${t.value}" ${t.value === (initialTipoConfig.defaultTerminaciones || 'Estandar') ? 'selected' : ''}>${t.label}</option>`).join('');

        const comunaOptions = COMUNAS_RM.map(c => `<option value="${c}">${c}</option>`).join('');

        return `
            <!-- Progress Bar -->
            <div class="mb-8">
                <div class="flex justify-between mb-2">
                    <span class="text-xs font-semibold text-secondary" id="stepIndicatorTitle">Paso 1: Tu Proyecto</span>
                    <span class="text-xs font-semibold text-gray-500" id="stepIndicatorProg">1/3</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-secondary h-2 rounded-full transition-all duration-300 w-1/3" id="progressBar"></div>
                </div>
            </div>

            <form id="quoteForm" class="bg-white p-8 border border-gray-200 shadow-xl rounded-xl relative overflow-hidden">
                <!-- Step 1: Proyecto -->
                <div id="step1" class="step-container transition-opacity duration-300">
                    <h3 class="text-lg font-bold mb-4">Detalles del Proyecto</h3>
                    <div class="space-y-4">
                        <!-- Selector Visual de 4 Tipologías (Spec 024) -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">¿Qué tipo de proyecto deseas cotizar?</label>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4" id="tipoCardsContainer" role="radiogroup" aria-label="Tipo de Proyecto">
                                <!-- Card 1: Casa Nueva -->
                                <button type="button" data-tipo-card="Casa Nueva" class="tipo-card text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:border-secondary hover:shadow-md ${defaultTipo === 'Casa Nueva' ? 'border-2 border-secondary bg-amber-50/70 shadow-sm ring-1 ring-secondary' : 'border-slate-300 bg-white'}" role="radio" aria-checked="${defaultTipo === 'Casa Nueva' ? 'true' : 'false'}">
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="w-10 h-10 rounded-lg flex items-center justify-center tipo-icon-wrap transition-colors ${defaultTipo === 'Casa Nueva' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}">
                                                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                                </svg>
                                            </div>
                                            <div class="tipo-check-indicator w-5 h-5 rounded-full border flex items-center justify-center transition-all ${defaultTipo === 'Casa Nueva' ? 'bg-secondary text-white border-secondary' : 'border-slate-300 bg-white text-transparent'}">
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </div>
                                        </div>
                                        <div class="font-bold text-gray-900 text-sm leading-snug">Construcción Casa Nueva</div>
                                        <div class="text-[11px] text-gray-500 mt-1 leading-normal">Vivienda llave en mano en sitio propio</div>
                                    </div>
                                </button>

                                <!-- Card 2: Ampliacion -->
                                <button type="button" data-tipo-card="Ampliacion" class="tipo-card text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:border-secondary hover:shadow-md ${defaultTipo === 'Ampliacion' ? 'border-2 border-secondary bg-amber-50/70 shadow-sm ring-1 ring-secondary' : 'border-slate-300 bg-white'}" role="radio" aria-checked="${defaultTipo === 'Ampliacion' ? 'true' : 'false'}">
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="w-10 h-10 rounded-lg flex items-center justify-center tipo-icon-wrap transition-colors ${defaultTipo === 'Ampliacion' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}">
                                                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                                                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                                                    <polyline points="2 17 12 22 22 17"></polyline>
                                                    <polyline points="2 12 12 17 22 12"></polyline>
                                                </svg>
                                            </div>
                                            <div class="tipo-check-indicator w-5 h-5 rounded-full border flex items-center justify-center transition-all ${defaultTipo === 'Ampliacion' ? 'bg-secondary text-white border-secondary' : 'border-slate-300 bg-white text-transparent'}">
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </div>
                                        </div>
                                        <div class="font-bold text-gray-900 text-sm leading-snug">Ampliación / 2º Piso</div>
                                        <div class="text-[11px] text-gray-500 mt-1 leading-normal">Extensión habitacional y sobreelevación</div>
                                    </div>
                                </button>

                                <!-- Card 3: Remodelacion -->
                                <button type="button" data-tipo-card="Remodelacion" class="tipo-card text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:border-secondary hover:shadow-md ${defaultTipo === 'Remodelacion' ? 'border-2 border-secondary bg-amber-50/70 shadow-sm ring-1 ring-secondary' : 'border-slate-300 bg-white'}" role="radio" aria-checked="${defaultTipo === 'Remodelacion' ? 'true' : 'false'}">
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="w-10 h-10 rounded-lg flex items-center justify-center tipo-icon-wrap transition-colors ${defaultTipo === 'Remodelacion' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}">
                                                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                    <line x1="3" y1="9" x2="21" y2="9"></line>
                                                    <line x1="9" y1="21" x2="9" y2="9"></line>
                                                </svg>
                                            </div>
                                            <div class="tipo-check-indicator w-5 h-5 rounded-full border flex items-center justify-center transition-all ${defaultTipo === 'Remodelacion' ? 'bg-secondary text-white border-secondary' : 'border-slate-300 bg-white text-transparent'}">
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </div>
                                        </div>
                                        <div class="font-bold text-gray-900 text-sm leading-snug">Remodelación Integral</div>
                                        <div class="text-[11px] text-gray-500 mt-1 leading-normal">Cocinas, baños o interiores completos</div>
                                    </div>
                                </button>

                                <!-- Card 4: Quincho -->
                                <button type="button" data-tipo-card="Quincho" class="tipo-card text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:border-secondary hover:shadow-md ${defaultTipo === 'Quincho' ? 'border-2 border-secondary bg-amber-50/70 shadow-sm ring-1 ring-secondary' : 'border-slate-300 bg-white'}" role="radio" aria-checked="${defaultTipo === 'Quincho' ? 'true' : 'false'}">
                                    <div>
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="w-10 h-10 rounded-lg flex items-center justify-center tipo-icon-wrap transition-colors ${defaultTipo === 'Quincho' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}">
                                                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M3 4h18"></path>
                                                    <path d="M4 4v16"></path>
                                                    <path d="M20 4v16"></path>
                                                    <path d="M8 4v16"></path>
                                                    <path d="M12 4v16"></path>
                                                    <path d="M16 4v16"></path>
                                                    <path d="M2 9h20"></path>
                                                </svg>
                                            </div>
                                            <div class="tipo-check-indicator w-5 h-5 rounded-full border flex items-center justify-center transition-all ${defaultTipo === 'Quincho' ? 'bg-secondary text-white border-secondary' : 'border-slate-300 bg-white text-transparent'}">
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </div>
                                        </div>
                                        <div class="font-bold text-gray-900 text-sm leading-snug">Quinchos y Terrazas</div>
                                        <div class="text-[11px] text-gray-500 mt-1 leading-normal">Cobertizos, terrazas y asadores en obra</div>
                                    </div>
                                </button>
                            </div>
                            <div id="qTipoSelectContainer" class="sr-only" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">
                                <label for="qTipo">Tipo de Proyecto</label>
                                <select id="qTipo" aria-label="Seleccionar tipo de proyecto" title="Seleccionar tipo de proyecto" class="w-full" required>
                                    ${tipoOptions}
                                </select>
                            </div>
                        </div>
                        <div id="espaciosRemodelarContainer" class="${defaultTipo === 'Remodelacion' ? '' : 'hidden '}transition-all duration-300" style="${defaultTipo === 'Remodelacion' ? '' : 'display: none;'}">
                            <label for="espacios-remodelar" class="block text-sm font-medium text-gray-700 mb-1">Espacio o espacios a remodelar</label>
                            <div class="flex flex-wrap gap-2 mb-2.5" id="remodelaChipsContainer">
                                <button type="button" data-remodela-chip="Baño completo" class="remodela-chip text-xs bg-slate-100 hover:bg-orange-50 hover:text-secondary hover:border-orange-300 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition font-medium cursor-pointer shadow-xs">Baño Completo</button>
                                <button type="button" data-remodela-chip="Cocina integral" class="remodela-chip text-xs bg-slate-100 hover:bg-orange-50 hover:text-secondary hover:border-orange-300 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition font-medium cursor-pointer shadow-xs">Cocina Integral</button>
                                <button type="button" data-remodela-chip="Baño y Cocina" class="remodela-chip text-xs bg-slate-100 hover:bg-orange-50 hover:text-secondary hover:border-orange-300 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition font-medium cursor-pointer shadow-xs">Baño y Cocina</button>
                                <button type="button" data-remodela-chip="Living y dormitorios" class="remodela-chip text-xs bg-slate-100 hover:bg-orange-50 hover:text-secondary hover:border-orange-300 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition font-medium cursor-pointer shadow-xs">Living / Dormitorios</button>
                            </div>
                            <input type="text" id="espacios-remodelar" name="espacios_remodelar" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition" placeholder="Ej: Cocina y baño, o dormitorio y living, o baño y comedor...">
                            <span class="text-xs text-gray-500 mt-1 block">Indícanos si incluye zonas húmedas (baño, cocina) o recintos secos para ajustar el alcance técnico.</span>
                        </div>
                        <!-- Honeypot fields (hidden from human users, bot trap) -->
                        <div style="display:none !important; position:absolute; left:-9999px;" aria-hidden="true">
                            <input type="text" id="website_url" name="website_url" tabindex="-1" autocomplete="off" placeholder="Tú sitio web aquí">
                            <input type="text" id="_hp_check" name="_hp_check" tabindex="-1" autocomplete="off">
                        </div>
                        <div id="qSistemaContainer" class="${initialTipoConfig.showSistema ? '' : 'hidden '}" style="${initialTipoConfig.showSistema ? '' : 'display: none;'}">
                            <label id="qSistemaLabel" for="qSistema" class="block text-sm font-medium text-gray-700 mb-1">${initialTipoConfig.sistemaLabel}</label>
                            <select id="qSistema" aria-label="Seleccionar sistema constructivo" title="Seleccionar sistema constructivo" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" ${initialTipoConfig.showSistema ? 'required' : ''}>
                                ${sistemaOptions}
                            </select>
                        </div>
                        <div id="qAreaContainer">
                            <label for="qArea" class="block text-sm font-medium text-gray-700 mb-1">Superficie Estimada (m²)</label>
                            <input type="number" id="qArea" min="${initialTipoConfig.minArea || 10}" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition" placeholder="${placeholderArea}" ${config.placeholderArea ? 'data-custom-placeholder="true"' : ''} required>
                            <span id="qAreaHelpText" class="text-xs text-gray-500 mt-1 block ${initialTipoConfig.areaHelpText ? '' : 'hidden'}" style="${initialTipoConfig.areaHelpText ? '' : 'display: none;'}">${initialTipoConfig.areaHelpText || ''}</span>
                        </div>
                    </div>
                    <div class="mt-6 flex justify-end">
                        <button type="button" onclick="nextStep(2)" class="px-6 py-3 bg-primary text-white font-bold rounded-md hover:bg-gray-800 transition shadow-md">Siguiente &rarr;</button>
                    </div>
                </div>

                <!-- Step 2: Diseño y Ubicación -->
                <div id="step2" class="step-container hidden transition-opacity duration-300 opacity-0" style="display: none;">
                    <h3 class="text-lg font-bold mb-4">Diseño y Ubicación</h3>
                    <div class="space-y-4">
                        <div id="qPisosContainer" class="${initialTipoConfig.showPisos ? '' : 'hidden'}" style="${initialTipoConfig.showPisos ? '' : 'display: none;'}">
                            <label id="qPisosLabel" for="qPisos" class="block text-sm font-medium text-gray-700 mb-1">${initialTipoConfig.pisosLabel || 'Número de Pisos'}</label>
                            <select id="qPisos" aria-label="Seleccionar número de pisos" title="Seleccionar número de pisos" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" ${initialTipoConfig.showPisos ? 'required' : ''}>
                                ${pisosOptions}
                            </select>
                        </div>
                        <div id="qTerminacionesContainer">
                            <label id="qTerminacionesLabel" for="qTerminaciones" class="block text-sm font-medium text-gray-700 mb-1">${initialTipoConfig.terminacionesLabel || 'Nivel de Terminaciones'}</label>
                            <select id="qTerminaciones" aria-label="Seleccionar nivel de terminaciones" title="Seleccionar nivel de terminaciones" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                                ${terminacionesOptions}
                            </select>
                        </div>
                        <div id="qComunaContainer">
                            <label id="qComunaLabel" for="qComuna" class="block text-sm font-medium text-gray-700 mb-1">Comuna de la Obra (Región Metropolitana)</label>
                            <select id="qComuna" aria-label="Seleccionar comuna de la obra" title="Seleccionar comuna de la obra" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                                <option value="">Selecciona tu comuna...</option>
                                ${comunaOptions}
                            </select>
                        </div>
                        <div id="qPermisosContainer" class="${initialTipoConfig.showPermisos ? '' : 'hidden'}" style="${initialTipoConfig.showPermisos ? '' : 'display: none;'}">
                            <label id="qPermisosLabel" for="qPermisos" class="block text-sm font-medium text-gray-700 mb-1">Estado de Planos y Permiso Municipal (DOM)</label>
                            <select id="qPermisos" aria-label="Seleccionar estado de planos y permisos" title="Seleccionar estado de planos y permisos" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" ${initialTipoConfig.showPermisos ? 'required' : ''}>
                                <option value="Idea">Solo tengo la idea (Requiero diseño de planos y gestión DOM completa)</option>
                                <option value="Planos">Tengo planos de arquitectura (Falta cálculo estructural y permiso DOM)</option>
                                <option value="PermisoAprobado">Tengo Permiso de Edificación DOM Aprobado (Listo para construir)</option>
                                <option value="ArquitectoPropio">Tengo arquitecto propio que tramita la DOM (Solo requiero construcción)</option>
                            </select>
                            <span id="qPermisosHelpText" class="text-xs text-gray-500 mt-1.5 block ${defaultTipo === 'Quincho' ? '' : 'hidden'}" style="${defaultTipo === 'Quincho' ? '' : 'display: none;'}">Tranquilo: si aún no tienes permisos municipales para tu quincho, selecciona 'Solo tengo la idea' y lo evaluamos en la visita técnica.</span>
                        </div>
                    </div>
                    <div class="mt-6 flex justify-between">
                        <button type="button" onclick="nextStep(1)" class="px-6 py-3 border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-50 transition">&larr; Anterior</button>
                        <button type="button" onclick="nextStep(3)" class="px-6 py-3 bg-primary text-white font-bold rounded-md hover:bg-gray-800 transition shadow-md">Siguiente &rarr;</button>
                    </div>
                </div>

                <!-- Step 3: Contacto -->
                <div id="step3" class="step-container hidden transition-opacity duration-300 opacity-0" style="display: none;">
                    <h3 class="text-lg font-bold mb-4">¿A dónde enviamos tu cotización?</h3>
                    <div id="step3RemodelacionResumen" class="hidden mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed" style="display: none;"></div>
                    <div id="step3QuinchoResumen" class="hidden mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg text-xs text-gray-800 leading-relaxed" style="display: none;">
                        <div class="font-bold text-orange-900 mb-1 flex items-center gap-1.5">
                            <span>Alcance de la Estimación para Quincho:</span>
                        </div>
                        <div class="space-y-1.5">
                            <p><strong class="text-green-800">✓ Incluye:</strong> Cobertizo o techumbre, radier afinado, parrilla en obra con refractarios y manivela frontal, campana de hojalatería con ducto de tiraje y mesón de apoyo.</p>
                            <p><strong class="text-amber-800">⚠ No incluye (adicionales):</strong> Conexiones de agua potable, desagües a alcantarillado, canalización eléctrica ni muebles bajo mesón (se presupuestan en terreno según factibilidad).</p>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label for="qNombre" class="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                            <input type="text" id="qNombre" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition" placeholder="Juan Pérez" required>
                        </div>
                        <div>
                            <label for="qEmail" class="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico (Tu cotización llegará aquí)</label>
                            <input type="email" id="qEmail" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition" placeholder="juan@ejemplo.com" required>
                        </div>
                        <div>
                            <label for="qTelefono" class="block text-sm font-medium text-gray-700 mb-1">Teléfono Móvil (+56 9)</label>
                            <input type="tel" id="qTelefono" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition" placeholder="+56 9 1234 5678" required>
                            <span class="text-xs text-gray-500 mt-1 block">Ingresa tu número móvil chileno (+56 9) para coordinar la visita técnica a terreno.</span>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-4 leading-relaxed">
                        Al solicitar tu presupuesto, aceptas el tratamiento de tus datos para coordinar el contacto técnico conforme a nuestra <a href="/privacidad" target="_blank" rel="noopener noreferrer" class="text-secondary hover:underline font-medium">Política de Privacidad</a>.
                    </p>
                    <div class="mt-6 flex flex-col sm:flex-row justify-between items-center sm:gap-4 gap-4">
                        <button type="button" onclick="nextStep(2)" class="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-50 transition order-2 sm:order-1">&larr; Anterior</button>
                        <button type="submit" id="quoteSubmitBtn" class="w-full sm:w-auto px-6 py-4 bg-secondary text-white font-bold rounded-md hover:bg-orange-700 transition shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap order-1 sm:order-2">
                            Obtener Cotización &rarr;
                        </button>
                    </div>
                    <p id="quoteStatus" class="hidden text-sm text-center font-bold mt-4"></p>
                </div>

                <!-- Success State (CTA Agendamiento) -->
                <div id="stepSuccess" class="step-container hidden transition-opacity duration-300 opacity-0 text-center py-8" style="display: none;">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                        <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">¡Cotización enviada con éxito!</h3>
                    <p class="text-gray-600 mb-8">Revisa tu bandeja de entrada o spam. Hemos enviado un presupuesto referencial en PDF a tu correo electrónico.</p>

                    <div id="calendarCTAContainer" class="bg-orange-50 p-6 rounded-lg border border-orange-100 hidden">
                        <p class="text-lg font-bold text-primary mb-2">Siguiente Paso: Visita a Terreno</p>
                        <p class="text-sm text-gray-700 mb-6">Para preparar un precio cerrado, necesitamos evaluar el terreno y confirmar el alcance del proyecto.</p>
                        <a href="https://cal.com/cuatropuntas.com/visita-tecnica" id="calendarBtnLink" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-secondary text-white font-bold text-lg rounded-md hover:bg-orange-600 transition shadow-lg mb-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            Agendar Visita Técnica a Terreno
                        </a>
                        <p class="text-xs text-gray-500">Lunes a Viernes 11:00-19:00 · Sábados 11:00-16:00</p>
                    </div>

                    <div id="fallbackCTAContainer" class="bg-gray-50 p-6 rounded-lg border border-gray-200 hidden">
                        <p class="text-lg font-bold text-gray-800 mb-2">Te contactaremos pronto</p>
                        <p class="text-sm text-gray-600">Nuestro equipo comercial se pondrá en contacto contigo para coordinar los siguientes antecedentes y, si corresponde, una visita a terreno.</p>
                    </div>
                </div>
            </form>
        `;
    }

    /**
     * Sincroniza el estado visual activo de las 4 tarjetas de tipología (Spec 024)
     */
    function syncTipoCards(tipoVal) {
        if (!tipoVal) return;
        const norm = String(tipoVal).toLowerCase();
        const cards = document.querySelectorAll('.tipo-card[data-tipo-card]');
        cards.forEach(card => {
            const cardTipo = card.getAttribute('data-tipo-card') || '';
            const cardNorm = cardTipo.toLowerCase();
            const isMatch = (cardTipo === tipoVal) ||
                (norm.includes('remodela') && cardNorm.includes('remodela')) ||
                (norm.includes('quincho') && cardNorm.includes('quincho')) ||
                (norm.includes('amplia') && cardNorm.includes('amplia')) ||
                ((norm.includes('casa') || norm.includes('nueva')) && cardNorm.includes('casa'));

            const iconWrap = card.querySelector('.tipo-icon-wrap');
            const check = card.querySelector('.tipo-check-indicator');

            if (isMatch) {
                card.classList.add('border-2', 'border-secondary', 'bg-amber-50/70', 'shadow-sm', 'ring-1', 'ring-secondary');
                card.classList.remove('border-slate-300', 'bg-white');
                card.setAttribute('aria-checked', 'true');
                if (iconWrap) {
                    iconWrap.classList.add('bg-amber-100', 'text-amber-900');
                    iconWrap.classList.remove('bg-slate-100', 'text-slate-600');
                }
                if (check) {
                    check.classList.add('bg-secondary', 'text-white', 'border-secondary');
                    check.classList.remove('border-slate-300', 'bg-white', 'text-transparent');
                }
            } else {
                card.classList.remove('border-2', 'border-secondary', 'bg-amber-50/70', 'shadow-sm', 'ring-1', 'ring-secondary');
                card.classList.add('border-slate-300', 'bg-white');
                card.setAttribute('aria-checked', 'false');
                if (iconWrap) {
                    iconWrap.classList.remove('bg-amber-100', 'text-amber-900');
                    iconWrap.classList.add('bg-slate-100', 'text-slate-600');
                }
                if (check) {
                    check.classList.remove('bg-secondary', 'text-white', 'border-secondary');
                    check.classList.add('border-slate-300', 'bg-white', 'text-transparent');
                }
            }
        });
    }

    /**
     * Sincroniza dinámicamente el Paso 1 según la tipología del proyecto
     */
    function syncPolymorphicStep1(tipoVal) {
        syncTipoCards(tipoVal);
        const tipoConfig = getTipoConfig(tipoVal);
        const container = document.getElementById('qSistemaContainer');
        const label = document.getElementById('qSistemaLabel');
        const select = document.getElementById('qSistema');
        const areaEl = document.getElementById('qArea');
        const helpTextEl = document.getElementById('qAreaHelpText');
        const espaciosContainer = document.getElementById('espaciosRemodelarContainer');
        const espaciosInput = document.getElementById('espacios-remodelar');

        // 1. Selector de Sistema y Label
        if (container && select) {
            if (tipoConfig.showSistema) {
                container.classList.remove('hidden');
                container.style.display = '';
                select.setAttribute('required', 'required');

                if (label) label.innerText = tipoConfig.sistemaLabel;

                const currentVal = select.value;
                select.innerHTML = tipoConfig.sistemas.map(s => {
                    const isSel = (s.value === currentVal) ? 'selected' : '';
                    return `<option value="${s.value}" ${isSel}>${s.label}</option>`;
                }).join('');

                const isValid = tipoConfig.sistemas.some(s => s.value === currentVal);
                if (!isValid) {
                    select.value = tipoConfig.defaultSistema;
                }
            } else {
                container.classList.add('hidden');
                container.style.display = 'none';
                select.removeAttribute('required');
                select.value = tipoConfig.defaultSistema || 'Metalcon';
            }
        }

        // 2. Contenedor de Espacios a Remodelar
        if (espaciosContainer) {
            if (tipoConfig.showEspacios) {
                espaciosContainer.classList.remove('hidden');
                espaciosContainer.style.display = '';
            } else {
                espaciosContainer.classList.add('hidden');
                espaciosContainer.style.display = 'none';
                if (espaciosInput) espaciosInput.value = '';
            }
        }

        // 3. Texto de Ayuda y Placeholder de Superficie
        if (helpTextEl) {
            if (tipoConfig.areaHelpText) {
                helpTextEl.innerText = tipoConfig.areaHelpText;
                helpTextEl.classList.remove('hidden');
                helpTextEl.style.display = '';
            } else {
                helpTextEl.innerText = '';
                helpTextEl.classList.add('hidden');
                helpTextEl.style.display = 'none';
            }
        }

        if (areaEl) {
            areaEl.min = String(tipoConfig.minArea || 10);
            if (!areaEl.getAttribute('data-custom-placeholder')) {
                if (tipoConfig.areaPlaceholder) {
                    areaEl.placeholder = tipoConfig.areaPlaceholder;
                }
            }
        }

        // 4. Resúmenes de Paso 3
        const resumenQuinchoEl = document.getElementById('step3QuinchoResumen');
        if (resumenQuinchoEl && (!tipoVal || !tipoVal.toLowerCase().includes('quincho'))) {
            resumenQuinchoEl.classList.add('hidden');
            resumenQuinchoEl.style.display = 'none';
        }
        const resumenRemodelaEl = document.getElementById('step3RemodelacionResumen');
        if (resumenRemodelaEl && (!tipoVal || !tipoVal.toLowerCase().includes('remodela'))) {
            resumenRemodelaEl.classList.add('hidden');
            resumenRemodelaEl.style.display = 'none';
            resumenRemodelaEl.innerHTML = '';
        }

        // 5. Sincronización del Paso 2
        syncPolymorphicStep2(tipoVal);
    }

    /**
     * Sincroniza dinámicamente el Paso 2 según la tipología del proyecto
     */
    function syncPolymorphicStep2(tipoVal) {
        const tipoConfig = getTipoConfig(tipoVal);
        const pisosContainer = document.getElementById('qPisosContainer');
        const pisosLabel = document.getElementById('qPisosLabel');
        const pisosSelect = document.getElementById('qPisos');
        const termContainer = document.getElementById('qTerminacionesContainer');
        const termLabel = document.getElementById('qTerminacionesLabel');
        const termSelect = document.getElementById('qTerminaciones');
        const permisosContainer = document.getElementById('qPermisosContainer');
        const permisosLabel = document.getElementById('qPermisosLabel');
        const permisosSelect = document.getElementById('qPermisos');

        // 1. Selector de Pisos / Ubicación
        if (pisosContainer && pisosSelect) {
            if (tipoConfig.showPisos) {
                pisosContainer.classList.remove('hidden');
                pisosContainer.style.display = '';
                pisosSelect.setAttribute('required', 'required');
                if (pisosLabel && tipoConfig.pisosLabel) pisosLabel.innerText = tipoConfig.pisosLabel;

                const currentVal = pisosSelect.value;
                pisosSelect.innerHTML = (tipoConfig.pisosOptions || []).map(p => {
                    const isSel = (p.value === currentVal) ? 'selected' : '';
                    return `<option value="${p.value}" ${isSel}>${p.label}</option>`;
                }).join('');

                const isValid = (tipoConfig.pisosOptions || []).some(p => p.value === currentVal);
                if (!isValid) {
                    pisosSelect.value = tipoConfig.defaultPisos || '1';
                }
            } else {
                pisosContainer.classList.add('hidden');
                pisosContainer.style.display = 'none';
                pisosSelect.removeAttribute('required');
                pisosSelect.value = tipoConfig.defaultPisos || '1';
            }
        }

        // 2. Selector de Terminaciones
        if (termContainer && termSelect) {
            if (termLabel && tipoConfig.terminacionesLabel) termLabel.innerText = tipoConfig.terminacionesLabel;
            const currentTerm = termSelect.value;
            termSelect.innerHTML = (tipoConfig.terminacionesOptions || []).map(t => {
                const isSel = (t.value === currentTerm) ? 'selected' : '';
                return `<option value="${t.value}" ${isSel}>${t.label}</option>`;
            }).join('');

            const isTermValid = (tipoConfig.terminacionesOptions || []).some(t => t.value === currentTerm);
            if (!isTermValid) {
                termSelect.value = tipoConfig.defaultTerminaciones || 'Estandar';
            }
        }

        // 3. Selector de Permisos DOM
        if (permisosContainer && permisosSelect) {
            if (tipoConfig.showPermisos) {
                if (permisosLabel && tipoConfig.permisosLabel) permisosLabel.innerText = tipoConfig.permisosLabel;
                permisosContainer.classList.remove('hidden');
                permisosContainer.style.display = '';
                permisosSelect.setAttribute('required', 'required');
            } else {
                permisosContainer.classList.add('hidden');
                permisosContainer.style.display = 'none';
                permisosSelect.removeAttribute('required');
                permisosSelect.value = tipoConfig.defaultPermisos || 'Idea';
            }
        }

        // 4. Texto explicativo calmante para Quinchos en permisos DOM (Spec 024)
        const permisosHelpText = document.getElementById('qPermisosHelpText');
        if (permisosHelpText) {
            if (tipoVal && tipoVal.toLowerCase().includes('quincho')) {
                permisosHelpText.innerText = "Tranquilo: si aún no tienes permisos municipales para tu quincho, selecciona 'Solo tengo la idea' y evaluamos la exigencia de tu comuna en terreno.";
                permisosHelpText.classList.remove('hidden');
                permisosHelpText.style.display = '';
            } else {
                permisosHelpText.innerText = "";
                permisosHelpText.classList.add('hidden');
                permisosHelpText.style.display = 'none';
            }
        }
    }

    /**
     * Máquina de estados de navegación entre pasos
     */
    function nextStep(step) {
        if (step === 2) {
            const tipoVal = document.getElementById('qTipo')?.value || '';
            const tipoConfig = getTipoConfig(tipoVal);
            const areaEl = document.getElementById('qArea');
            const areaVal = areaEl ? parseFloat(areaEl.value) : 0;
            const minArea = tipoConfig.minArea || 10;

            if (tipoConfig.showEspacios) {
                const espaciosInput = document.getElementById('espacios-remodelar');
                const espaciosVal = espaciosInput ? espaciosInput.value.trim() : '';
                if (!espaciosVal) {
                    alert('Por favor, especifica qué espacios deseas remodelar (ej: cocina, baño, living).');
                    if (espaciosInput) espaciosInput.focus();
                    return false;
                }
            }

            if (!areaVal || areaVal < minArea) {
                alert(`Por favor, ingresa una superficie estimada válida (mínimo ${minArea} m²).`);
                if (areaEl) areaEl.focus();
                return false;
            }
        }

        if (step === 3) {
            const tipoVal = document.getElementById('qTipo')?.value || '';
            const tipoConfig = getTipoConfig(tipoVal);

            const pisosEl = document.getElementById('qPisos');
            const termEl = document.getElementById('qTerminaciones');
            const comEl = document.getElementById('qComuna');
            const permEl = document.getElementById('qPermisos');

            if (!tipoConfig.showPisos && pisosEl) {
                pisosEl.value = tipoConfig.defaultPisos || '1';
            }
            if (!tipoConfig.showPermisos && permEl) {
                permEl.value = tipoConfig.defaultPermisos || 'Idea';
            }

            const pisos = tipoConfig.showPisos ? pisosEl?.value : (tipoConfig.defaultPisos || '1');
            const term = termEl?.value;
            const com = comEl?.value;
            const perm = tipoConfig.showPermisos ? permEl?.value : (tipoConfig.defaultPermisos || 'Idea');

            if (!pisos || !term || !com || !perm) {
                alert('Por favor, completa todos los campos de diseño y ubicación para cotizar.');
                return false;
            }

            const isQuincho = tipoVal.toLowerCase().includes('quincho');
            const espaciosVal = document.getElementById('espacios-remodelar')?.value?.trim() || '';

            const resumenRemodelaEl = document.getElementById('step3RemodelacionResumen');
            if (resumenRemodelaEl) {
                if (tipoVal === 'Remodelacion' && espaciosVal) {
                    resumenRemodelaEl.classList.remove('hidden');
                    resumenRemodelaEl.style.display = '';
                    resumenRemodelaEl.innerHTML = `<strong>Recintos a remodelar:</strong> ${espaciosVal}<br><span class="text-amber-700 text-[11px]">*El presupuesto preliminar desglosará partidas húmedas y secas conforme a estos recintos. La propuesta definitiva se ratifica tras la visita técnica en terreno.</span>`;
                } else {
                    resumenRemodelaEl.classList.add('hidden');
                    resumenRemodelaEl.style.display = 'none';
                    resumenRemodelaEl.innerHTML = '';
                }
            }

            const resumenQuinchoEl = document.getElementById('step3QuinchoResumen');
            if (resumenQuinchoEl) {
                if (isQuincho) {
                    resumenQuinchoEl.classList.remove('hidden');
                    resumenQuinchoEl.style.display = '';
                } else {
                    resumenQuinchoEl.classList.add('hidden');
                    resumenQuinchoEl.style.display = 'none';
                }
            }
        }

        document.querySelectorAll('.step-container').forEach(el => {
            el.classList.add('hidden', 'opacity-0');
            el.style.display = 'none';
        });

        const currentObj = document.getElementById('step' + step);
        if (currentObj) {
            currentObj.classList.remove('hidden');
            currentObj.style.display = '';
            setTimeout(() => {
                currentObj.classList.remove('opacity-0');
            }, 10);
        }

        const bar = document.getElementById('progressBar');
        const indicatorProg = document.getElementById('stepIndicatorProg');
        const indicatorTitle = document.getElementById('stepIndicatorTitle');

        if (bar && indicatorProg && indicatorTitle) {
            if (step === 1) {
                bar.style.width = '33%';
                indicatorProg.innerText = '1/3';
                indicatorTitle.innerText = 'Paso 1: Tu Proyecto';
            } else if (step === 2) {
                bar.style.width = '66%';
                indicatorProg.innerText = '2/3';
                indicatorTitle.innerText = 'Paso 2: Diseño y Ubicación';
            } else if (step === 3) {
                bar.style.width = '100%';
                indicatorProg.innerText = '3/3';
                indicatorTitle.innerText = 'Paso 3: Contacto';
            }
        }

        return true;
    }

    function prevStep(step) {
        nextStep(step);
    }

    /**
     * Puente para invocación desde tablas de precios y comparativas
     */
    function calcularCon(tipo, sistema) {
        const tipoEl = document.getElementById('qTipo');
        const sistemaEl = document.getElementById('qSistema');
        if (tipoEl && tipo) {
            tipoEl.value = tipo;
            syncPolymorphicStep1(tipo);
        }
        if (sistemaEl && sistema) sistemaEl.value = sistema;

        nextStep(1);

        const target = document.getElementById('contacto');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Pre-llenado de datos mediante URLSearchParams
     */
    function prefillFromURL() {
        if (!window.location || !window.location.search) return;
        try {
            const params = new URLSearchParams(window.location.search);

            const nombre = params.get('nombre') || params.get('name');
            const telefono = params.get('telefono') || params.get('phone') || params.get('tel');
            const email = params.get('email') || params.get('correo');
            const tipo = params.get('tipo') || params.get('project');
            const sistema = params.get('sistema') || params.get('material');
            const area = params.get('area') || params.get('m2');
            const comuna = params.get('comuna');
            const pisos = params.get('pisos');
            const terminaciones = params.get('terminaciones');
            const espacios = params.get('espacios') || params.get('espacios_remodelar');

            if (nombre) {
                const el = document.getElementById('qNombre');
                if (el) el.value = nombre;
            }
            if (telefono) {
                const el = document.getElementById('qTelefono');
                if (el) el.value = formatChileanPhone(telefono);
            }
            if (email) {
                const el = document.getElementById('qEmail');
                if (el) el.value = email;
            }
            if (tipo) {
                const el = document.getElementById('qTipo');
                if (el) {
                    el.value = tipo;
                    syncPolymorphicStep1(tipo);
                }
            }
            if (espacios) {
                const el = document.getElementById('espacios-remodelar');
                if (el) el.value = espacios;
            }
            if (sistema) {
                const el = document.getElementById('qSistema');
                if (el) el.value = sistema;
            }
            if (area) {
                const el = document.getElementById('qArea');
                if (el) el.value = area;
            }
            if (comuna) {
                const el = document.getElementById('qComuna');
                if (el) el.value = comuna;
            }
            if (pisos) {
                const el = document.getElementById('qPisos');
                if (el) el.value = pisos;
            }
            if (terminaciones) {
                const el = document.getElementById('qTerminaciones');
                if (el) el.value = terminaciones;
            }
        } catch (e) {
            console.debug('Error parseando query params:', e);
        }
    }

    /**
     * Configuración del envío de formulario
     */
    function bindSubmitHandler(form) {
        if (!form) return;

        // Formateo dinámico del input de teléfono
        const telInput = document.getElementById('qTelefono');
        if (telInput) {
            telInput.addEventListener('blur', function() {
                this.value = formatChileanPhone(this.value);
            });
            telInput.addEventListener('input', function() {
                const clean = this.value.replace(/\D/g, '');
                if (clean.length === 9 && clean.startsWith('9')) {
                    this.value = formatChileanPhone(this.value);
                }
            });
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const btn = document.getElementById('quoteSubmitBtn');
            const status = document.getElementById('quoteStatus');
            btn.disabled = true;
            btn.innerText = 'Generando Cotización...';
            status.classList.add('hidden');
            status.innerText = '';

            const tipoVal = document.getElementById('qTipo')?.value || 'Casa Nueva';
            const tipoConfig = getTipoConfig(tipoVal);

            const payload = {
                tipo: tipoVal,
                sistema: document.getElementById('qSistema')?.value || tipoConfig.defaultSistema || 'Metalcon',
                espacios_remodelar: document.getElementById('espacios-remodelar')?.value || '',
                area: parseFloat(document.getElementById('qArea')?.value || '0'),
                pisos: parseInt(document.getElementById('qPisos')?.value || tipoConfig.defaultPisos || '1', 10),
                terminaciones: document.getElementById('qTerminaciones')?.value || tipoConfig.defaultTerminaciones || 'Estandar',
                comuna: document.getElementById('qComuna')?.value || '',
                permisos: document.getElementById('qPermisos')?.value || tipoConfig.defaultPermisos || 'Idea',
                nombre: document.getElementById('qNombre')?.value || '',
                email: document.getElementById('qEmail')?.value || '',
                telefono: document.getElementById('qTelefono')?.value || '',
                website_url: document.getElementById('website_url')?.value || '',
                _hp_check: document.getElementById('_hp_check')?.value || '',
                _ts: _renderedAt,
                _token: btoa(Math.floor(_renderedAt / 1000) + "_cuatropuntas_human")
            };

            try {
                let response;
                try {
                    response = await fetch('/api/quote', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } catch (fetchErr) {
                    if (window.location && window.location.protocol === 'file:') {
                        window.__lastQuotePayload = payload;
                        if (payload.email && payload.email.includes('error')) {
                            throw new Error('Error interno en servidor SMTP');
                        }
                        response = {
                            ok: true,
                            json: async () => ({
                                success: true,
                                message: 'Cotización enviada',
                                calendarUrl: 'https://cal.com/cuatropuntas.com/visita-tecnica'
                            })
                        };
                    } else {
                        throw fetchErr;
                    }
                }

                if (response.ok) {
                    const data = await response.json();

                    document.querySelectorAll('.step-container').forEach(el => {
                        el.classList.add('hidden', 'opacity-0');
                        el.style.display = 'none';
                    });
                    const pBarWrap = document.getElementById('progressBar')?.parentElement?.parentElement;
                    if (pBarWrap) pBarWrap.classList.add('hidden');

                    const successStep = document.getElementById('stepSuccess');
                    if (successStep) {
                        successStep.classList.remove('hidden');
                        successStep.style.display = '';
                        setTimeout(() => successStep.classList.remove('opacity-0'), 10);
                    }

                    const calContainer = document.getElementById('calendarCTAContainer');
                    const fallbackContainer = document.getElementById('fallbackCTAContainer');
                    const calLink = document.getElementById('calendarBtnLink');

                    if (data && data.calendarUrl && data.calendarUrl.trim() !== "") {
                        if (calLink) calLink.href = data.calendarUrl;
                        if (calContainer) calContainer.classList.remove('hidden');
                        if (fallbackContainer) fallbackContainer.classList.add('hidden');
                    } else {
                        if (calContainer) calContainer.classList.add('hidden');
                        if (fallbackContainer) fallbackContainer.classList.remove('hidden');
                    }

                    form.reset();
                } else {
                    let errMessage = 'Error al enviar la solicitud';
                    try {
                        const err = await response.json();
                        if (err && err.error) errMessage = 'Error: ' + err.error;
                    } catch (_) {}
                    throw new Error(errMessage);
                }
            } catch (error) {
                const msg = error.message || 'Error al generar la cotización.';
                status.innerText = msg.includes('Error') ? msg : 'Error: ' + msg;
                status.classList.remove('hidden', 'text-green-600');
                status.classList.add('text-red-600');
                btn.disabled = false;
                btn.innerText = 'Obtener Cotización \u2192';
                console.error('Quote submission error:', error);
            } finally {
                if (!status.classList.contains('text-green-600') && !document.getElementById('stepSuccess')?.classList.contains('hidden')) {
                    // Si hubo éxito, se deja el botón como estaba
                } else {
                    btn.disabled = false;
                    btn.innerText = 'Obtener Cotización \u2192';
                }
            }
        });
    }

    /**
     * Inicialización del cotizador modular
     */
    function initQuoteWizard() {
        const container = document.getElementById('quote-wizard-container') || document.querySelector('[data-quote-wizard]');
        
        if (container) {
            // Si el contenedor aún no tiene el form inyectado
            if (!container.querySelector('#quoteForm')) {
                const config = {
                    defaultTipo: container.getAttribute('data-default-tipo'),
                    defaultSistema: container.getAttribute('data-default-sistema'),
                    placeholderArea: container.getAttribute('data-placeholder-area')
                };

                const tiposAttr = container.getAttribute('data-tipos');
                if (tiposAttr) {
                    config.tipos = tiposAttr.split(',').map(s => s.trim());
                }

                container.innerHTML = createWizardHTML(config);
            }
        }

        const quoteForm = document.getElementById('quoteForm');
        if (quoteForm) {
            if (quoteForm.dataset.wizardReady === 'true') return;
            quoteForm.dataset.wizardReady = 'true';

            _renderedAt = Date.now();
            bindSubmitHandler(quoteForm);

            const tipoSelect = document.getElementById('qTipo');
            if (tipoSelect) {
                tipoSelect.addEventListener('change', function() {
                    syncPolymorphicStep1(this.value);
                });
                syncPolymorphicStep1(tipoSelect.value);
            }

            prefillFromURL();
            checkHashForTipo();
        }
    }

    /**
     * Preselección mediante hash en URL (#contacto?tipo=Quincho o #cotizador?tipo=Ampliacion)
     */
    function checkHashForTipo() {
        if (!window.location || !window.location.hash) return;
        const hash = window.location.hash;
        const match = hash.match(/tipo=([^&]+)/i);
        if (match && match[1]) {
            const decoded = decodeURIComponent(match[1]);
            calcularCon(decoded);
        }
    }

    // Delegación global para botones de tarjetas, chips y botones con data-quote-tipo (Spec 024)
    document.addEventListener('click', function(e) {
        // 1. Clic en tarjeta de tipología
        const card = e.target.closest('.tipo-card[data-tipo-card]');
        if (card) {
            e.preventDefault();
            const targetTipo = card.getAttribute('data-tipo-card');
            const select = document.getElementById('qTipo');
            if (select) {
                select.value = targetTipo;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }

        // 2. Clic en chip de remodelación
        const chip = e.target.closest('[data-remodela-chip]');
        if (chip) {
            e.preventDefault();
            const val = chip.getAttribute('data-remodela-chip');
            const espaciosInput = document.getElementById('espacios-remodelar');
            if (espaciosInput) {
                espaciosInput.value = val;
                espaciosInput.dispatchEvent(new Event('input', { bubbles: true }));
                espaciosInput.focus();
            }
            return;
        }

        // 3. Clic en botones externos con data-quote-tipo
        const quoteBtn = e.target.closest('[data-quote-tipo]');
        if (quoteBtn) {
            const tipo = quoteBtn.getAttribute('data-quote-tipo');
            const sistema = quoteBtn.getAttribute('data-quote-sistema');
            if (tipo) {
                calcularCon(tipo, sistema);
            }
        }
    });

    // Escuchar cambios de hash para deep-linking
    window.addEventListener('hashchange', checkHashForTipo);

    // Exportar globales en window para mantener retrocompatibilidad total
    window.nextStep = nextStep;
    window.prevStep = prevStep;
    window.calcularCon = calcularCon;
    window.QuoteWizard = {
        init: initQuoteWizard,
        nextStep: nextStep,
        prevStep: prevStep,
        calcularCon: calcularCon,
        formatChileanPhone: formatChileanPhone
    };

    // Auto-montaje al cargar la página
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQuoteWizard);
    } else {
        initQuoteWizard();
    }

})(window, document);
