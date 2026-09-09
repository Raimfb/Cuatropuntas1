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

    const SISTEMAS_DEFAULT = [
        { value: "Metalcon", label: "Ligero (Estructura completa en Metalcon)" },
        { value: "SIP", label: "Panel SIP (Aislación térmica y montaje por paneles)" },
        { value: "Albanileria", label: "Sólido (Albañilería en todo el proyecto)" },
        { value: "Mixto", label: "Mixto (Muros exteriores sólidos y divisiones interiores en Metalcon)" }
    ];

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
        const defaultSistema = config.defaultSistema || 'Metalcon';
        const placeholderArea = config.placeholderArea || 'Ej: 4 (baño), 15 (cocina) o 50 (casa)';

        const tipoOptions = (config.tipos || TIPOS_DEFAULT).map(t => {
            const val = typeof t === 'string' ? t : t.value;
            const lbl = typeof t === 'string' ? t : t.label;
            const isSel = val === defaultTipo ? 'selected' : '';
            return `<option value="${val}" ${isSel}>${lbl}</option>`;
        }).join('');

        const sistemaOptions = (config.sistemas || SISTEMAS_DEFAULT).map(s => {
            const val = typeof s === 'string' ? s : s.value;
            const lbl = typeof s === 'string' ? s : s.label;
            const isSel = val === defaultSistema ? 'selected' : '';
            return `<option value="${val}" ${isSel}>${lbl}</option>`;
        }).join('');

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
                        <div>
                            <label for="qTipo" class="block text-sm font-medium text-gray-700 mb-1">Tipo de Proyecto</label>
                            <select id="qTipo" aria-label="Seleccionar tipo de proyecto" title="Seleccionar tipo de proyecto" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                                ${tipoOptions}
                            </select>
                        </div>
                        <div id="espaciosRemodelarContainer" class="${defaultTipo === 'Remodelacion' ? '' : 'hidden '}transition-all duration-300" style="${defaultTipo === 'Remodelacion' ? '' : 'display: none;'}">
                            <label for="espacios-remodelar" class="block text-sm font-medium text-gray-700 mb-1">Espacio o espacios a remodelar</label>
                            <input type="text" id="espacios-remodelar" name="espacios_remodelar" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition" placeholder="Ej: Cocina y baño, o dormitorio y living, o baño y comedor...">
                            <span class="text-xs text-gray-500 mt-1 block">Indícanos si incluye zonas húmedas (baño, cocina) o recintos secos para ajustar el alcance técnico.</span>
                        </div>
                        <!-- Honeypot fields (hidden from human users, bot trap) -->
                        <div style="display:none !important; position:absolute; left:-9999px;" aria-hidden="true">
                            <input type="text" id="website_url" name="website_url" tabindex="-1" autocomplete="off" placeholder="Tú sitio web aquí">
                            <input type="text" id="_hp_check" name="_hp_check" tabindex="-1" autocomplete="off">
                        </div>
                        <div>
                            <label for="qSistema" class="block text-sm font-medium text-gray-700 mb-1">Sistema Constructivo</label>
                            <select id="qSistema" aria-label="Seleccionar sistema constructivo" title="Seleccionar sistema constructivo" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                                ${sistemaOptions}
                            </select>
                        </div>
                        <div>
                            <label for="qArea" class="block text-sm font-medium text-gray-700 mb-1">Superficie Estimada (m²)</label>
                            <input type="number" id="qArea" min="3" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition" placeholder="${placeholderArea}" required>
                        </div>
                    </div>
                    <div class="mt-6 flex justify-end">
                        <button type="button" onclick="nextStep(2)" class="px-6 py-3 bg-primary text-white font-bold rounded-md hover:bg-gray-800 transition shadow-md">Siguiente &rarr;</button>
                    </div>
                </div>

                <!-- Step 2: Diseño y Ubicación -->
                <div id="step2" class="step-container hidden transition-opacity duration-300 opacity-0">
                    <h3 class="text-lg font-bold mb-4">Diseño y Ubicación</h3>
                    <div class="space-y-4">
                        <div>
                            <label for="qPisos" class="block text-sm font-medium text-gray-700 mb-1">Número de Pisos</label>
                            <select id="qPisos" aria-label="Seleccionar número de pisos" title="Seleccionar número de pisos" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                                <option value="1">1 Piso</option>
                                <option value="2">2 o más Pisos</option>
                            </select>
                        </div>
                        <div>
                            <label for="qTerminaciones" class="block text-sm font-medium text-gray-700 mb-1">Nivel de Terminaciones</label>
                            <select id="qTerminaciones" aria-label="Seleccionar nivel de terminaciones" title="Seleccionar nivel de terminaciones" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                                <option value="Basico">Básico (Habitable, ventanas estándar, revestimientos estándar)</option>
                                <option value="Estandar" selected>Estándar (Buenas terminaciones superficiales)</option>
                                <option value="Premium">Premium (Termopanel, pisos flotantes, revestimientos)</option>
                            </select>
                        </div>
                        <div>
                            <label for="qComuna" class="block text-sm font-medium text-gray-700 mb-1">Comuna de la Obra (Región Metropolitana)</label>
                            <select id="qComuna" aria-label="Seleccionar comuna de la obra" title="Seleccionar comuna de la obra" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                                <option value="">Selecciona tu comuna...</option>
                                ${comunaOptions}
                            </select>
                        </div>
                        <div>
                            <label for="qPermisos" class="block text-sm font-medium text-gray-700 mb-1">Estado de Planos y Permiso Municipal (DOM)</label>
                            <select id="qPermisos" aria-label="Seleccionar estado de planos y permisos" title="Seleccionar estado de planos y permisos" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition bg-white" required>
                                <option value="Idea">Solo tengo la idea (Requiero diseño de planos y gestión DOM completa)</option>
                                <option value="Planos">Tengo planos de arquitectura (Falta cálculo estructural y permiso DOM)</option>
                                <option value="PermisoAprobado">Tengo Permiso de Edificación DOM Aprobado (Listo para construir)</option>
                                <option value="ArquitectoPropio">Tengo arquitecto propio que tramita la DOM (Solo requiero construcción)</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-6 flex justify-between">
                        <button type="button" onclick="nextStep(1)" class="px-6 py-3 border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-50 transition">&larr; Anterior</button>
                        <button type="button" onclick="nextStep(3)" class="px-6 py-3 bg-primary text-white font-bold rounded-md hover:bg-gray-800 transition shadow-md">Siguiente &rarr;</button>
                    </div>
                </div>

                <!-- Step 3: Contacto -->
                <div id="step3" class="step-container hidden transition-opacity duration-300 opacity-0">
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
                            <label for="qTelefono" class="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp activo)</label>
                            <input type="tel" id="qTelefono" class="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition" placeholder="+56 9 1234 5678" required>
                            <span class="text-xs text-gray-500 mt-1 block">Ingresa tu número móvil chileno (+56 9) para recibir alertas y PDF por WhatsApp.</span>
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
                <div id="stepSuccess" class="step-container hidden transition-opacity duration-300 opacity-0 text-center py-8">
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
     * Máquina de estados de navegación entre pasos
     */
    function nextStep(step) {
        if (step === 2) {
            const areaEl = document.getElementById('qArea');
            const areaVal = areaEl ? parseFloat(areaEl.value) : 0;
            if (!areaVal || areaVal < 3) {
                alert('Por favor, ingresa una superficie estimada válida (mínimo 3 m²).');
                if (areaEl) areaEl.focus();
                return false;
            }
        }

        if (step === 3) {
            const pisos = document.getElementById('qPisos')?.value;
            const term = document.getElementById('qTerminaciones')?.value;
            const com = document.getElementById('qComuna')?.value;
            const perm = document.getElementById('qPermisos')?.value;

            if (!pisos || !term || !com || !perm) {
                alert('Por favor, completa todos los campos de diseño y ubicación para cotizar.');
                return false;
            }

            const tipoVal = document.getElementById('qTipo')?.value || '';
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
        });

        const currentObj = document.getElementById('step' + step);
        if (currentObj) {
            currentObj.classList.remove('hidden');
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
            const container = document.getElementById('espaciosRemodelarContainer');
            if (container) {
                if (tipo === 'Remodelacion') {
                    container.classList.remove('hidden');
                    container.style.display = '';
                } else {
                    container.classList.add('hidden');
                    container.style.display = 'none';
                }
            }
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
                    const container = document.getElementById('espaciosRemodelarContainer');
                    if (container) {
                        if (tipo === 'Remodelacion') container.classList.remove('hidden');
                        else container.classList.add('hidden');
                    }
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

            const payload = {
                tipo: document.getElementById('qTipo')?.value || 'Casa Nueva',
                sistema: document.getElementById('qSistema')?.value || 'Metalcon',
                espacios_remodelar: document.getElementById('espacios-remodelar')?.value || '',
                area: parseFloat(document.getElementById('qArea')?.value || '0'),
                pisos: parseInt(document.getElementById('qPisos')?.value || '1', 10),
                terminaciones: document.getElementById('qTerminaciones')?.value || 'Estandar',
                comuna: document.getElementById('qComuna')?.value || '',
                permisos: document.getElementById('qPermisos')?.value || 'Idea',
                nombre: document.getElementById('qNombre')?.value || '',
                email: document.getElementById('qEmail')?.value || '',
                telefono: document.getElementById('qTelefono')?.value || '',
                website_url: document.getElementById('website_url')?.value || '',
                _hp_check: document.getElementById('_hp_check')?.value || '',
                _ts: _renderedAt,
                _token: btoa(Math.floor(_renderedAt / 1000) + "_cuatropuntas_human")
            };

            try {
                const response = await fetch('/api/quote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();

                    document.querySelectorAll('.step-container').forEach(el => el.classList.add('hidden', 'opacity-0'));
                    const pBarWrap = document.getElementById('progressBar')?.parentElement?.parentElement;
                    if (pBarWrap) pBarWrap.classList.add('hidden');

                    const successStep = document.getElementById('stepSuccess');
                    if (successStep) {
                        successStep.classList.remove('hidden');
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
                const sistemasAttr = container.getAttribute('data-sistemas');
                if (sistemasAttr) {
                    config.sistemas = sistemasAttr.split(',').map(s => s.trim());
                }

                container.innerHTML = createWizardHTML(config);
            }
        }

        const quoteForm = document.getElementById('quoteForm');
        if (quoteForm) {
            _renderedAt = Date.now();
            bindSubmitHandler(quoteForm);

            const tipoSelect = document.getElementById('qTipo');
            const espaciosContainer = document.getElementById('espaciosRemodelarContainer');
            const espaciosInput = document.getElementById('espacios-remodelar');

            function syncEspaciosVisibility(val) {
                if (espaciosContainer) {
                    if (val === 'Remodelacion') {
                        espaciosContainer.classList.remove('hidden');
                        espaciosContainer.style.display = '';
                    } else {
                        espaciosContainer.classList.add('hidden');
                        espaciosContainer.style.display = 'none';
                        if (espaciosInput) espaciosInput.value = '';
                    }
                }
                const resumenQuinchoEl = document.getElementById('step3QuinchoResumen');
                if (resumenQuinchoEl && (!val || !val.toLowerCase().includes('quincho'))) {
                    resumenQuinchoEl.classList.add('hidden');
                }
                const resumenRemodelaEl = document.getElementById('step3RemodelacionResumen');
                if (resumenRemodelaEl && val !== 'Remodelacion') {
                    resumenRemodelaEl.classList.add('hidden');
                    resumenRemodelaEl.innerHTML = '';
                }
            }

            if (tipoSelect) {
                tipoSelect.addEventListener('change', function() {
                    syncEspaciosVisibility(this.value);
                });
                syncEspaciosVisibility(tipoSelect.value);
            }

            prefillFromURL();
        }
    }

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
