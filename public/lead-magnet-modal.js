(function () {
    'use strict';

    const GUIDE_META = {
        'permiso-edificacion': {
            id: 'permiso-edificacion',
            badge: 'GUÍA TÉCNICA DOM · PDF GRATUITO (2 PÁGINAS)',
            title: 'Guía Práctica del Permiso de Edificación en la RM',
            desc: 'Ingresa tu nombre y correo electrónico para desbloquear la descarga inmediata del PDF y recibir una copia de respaldo.',
            filename: 'guia-permiso-edificacion-rm.pdf',
            rootHref: './guias/guia-permiso-edificacion-rm.pdf',
            subHref: '../guias/guia-permiso-edificacion-rm.pdf',
            prodUrl: '/guias/guia-permiso-edificacion-rm.pdf'
        },
        'recepcion-final': {
            id: 'recepcion-final',
            badge: 'CHECKLIST OFICIAL DOM · PDF GRATUITO (2 PÁGINAS)',
            title: 'Checklist Oficial de Recepción Final Municipal (DOM)',
            desc: 'Ingresa tu nombre y correo electrónico para desbloquear la descarga inmediata del PDF y recibir una copia de respaldo.',
            filename: 'checklist-recepcion-final-dom.pdf',
            rootHref: './guias/checklist-recepcion-final-dom.pdf',
            subHref: '../guias/checklist-recepcion-final-dom.pdf',
            prodUrl: '/guias/checklist-recepcion-final-dom.pdf'
        }
    };

    const isFileProtocol = window.location.protocol === 'file:';
    const isSubdir = window.location.pathname.includes('/servicios/');

    function getApiEndpoint() {
        return isFileProtocol
            ? 'https://www.cuatropuntas.com/api/lead-magnet'
            : '/api/lead-magnet';
    }

    function getPoliticasHref() {
        if (!isFileProtocol) return '/politicas';
        return isSubdir ? '../politicas.html' : './politicas.html';
    }

    function resolvePdfHref(guide, apiDownloadUrl) {
        if (isFileProtocol) {
            return isSubdir ? guide.subHref : guide.rootHref;
        }
        return apiDownloadUrl || guide.prodUrl;
    }

    function injectStyles() {
        if (document.getElementById('leadMagnetModalStyles')) return;
        const style = document.createElement('style');
        style.id = 'leadMagnetModalStyles';
        style.textContent = `
            #leadMagnetModal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 12px;
                background: rgba(15, 23, 42, 0.72);
                backdrop-filter: blur(4px);
                box-sizing: border-box;
            }
            #leadMagnetModal.hidden {
                display: none !important;
            }
            #leadMagnetModal * {
                box-sizing: border-box;
            }
            .lm-dialog {
                width: 100%;
                max-width: 480px;
                max-height: calc(100vh - 24px);
                overflow-y: auto;
                background: #ffffff;
                border-radius: 14px;
                box-shadow: 0 24px 48px rgba(15, 23, 42, 0.28);
                border: 1px solid #e2e8f0;
                position: relative;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
            }
            .lm-header {
                background: #1a365d;
                color: #ffffff;
                padding: 20px 44px 18px 22px;
                border-top-left-radius: 13px;
                border-top-right-radius: 13px;
                border-bottom: 3px solid #c05621;
            }
            .lm-badge {
                display: inline-block;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                color: #fbd38d;
                margin-bottom: 6px;
            }
            .lm-title {
                margin: 0;
                font-size: 18px;
                line-height: 1.3;
                font-weight: 800;
                color: #ffffff;
            }
            .lm-close {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 9999px;
                background: rgba(255, 255, 255, 0.14);
                color: #ffffff;
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .lm-close:hover {
                background: rgba(255, 255, 255, 0.26);
            }
            .lm-body {
                padding: 20px 22px 22px;
                color: #1a202c;
            }
            .lm-desc {
                margin: 0 0 16px;
                font-size: 14px;
                line-height: 1.5;
                color: #4a5568;
            }
            .lm-field {
                margin-bottom: 14px;
            }
            .lm-label {
                display: block;
                font-size: 13px;
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 5px;
            }
            .lm-input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                font-size: 15px;
                color: #1a202c;
                background: #ffffff;
            }
            .lm-input:focus {
                outline: 2px solid #c05621;
                border-color: #c05621;
            }
            .lm-error {
                margin: 0 0 12px;
                padding: 9px 12px;
                border-radius: 8px;
                background: #fff5f5;
                border: 1px solid #feb2b2;
                color: #9b2c2c;
                font-size: 13px;
                font-weight: 500;
            }
            .lm-error.hidden {
                display: none;
            }
            .lm-submit {
                width: 100%;
                padding: 12px 16px;
                border: none;
                border-radius: 8px;
                background: #c05621;
                color: #ffffff;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.15s ease;
            }
            .lm-submit:hover:not(:disabled) {
                background: #9c4221;
            }
            .lm-submit:disabled {
                opacity: 0.65;
                cursor: wait;
            }
            .lm-privacy {
                margin: 12px 0 0;
                font-size: 11.5px;
                line-height: 1.45;
                color: #64748b;
                text-align: center;
            }
            .lm-privacy a {
                color: #c05621;
                text-decoration: underline;
            }
            .lm-success {
                text-align: center;
                padding: 6px 0 2px;
            }
            .lm-success.hidden {
                display: none;
            }
            .lm-success-badge {
                display: inline-block;
                background: #ecfdf5;
                color: #065f46;
                border: 1px solid #a7f3d0;
                font-size: 12px;
                font-weight: 700;
                padding: 4px 10px;
                border-radius: 9999px;
                margin-bottom: 10px;
            }
            .lm-success-title {
                margin: 0 0 8px;
                font-size: 18px;
                font-weight: 800;
                color: #1a365d;
            }
            .lm-success-text {
                margin: 0 0 16px;
                font-size: 13.5px;
                line-height: 1.5;
                color: #4a5568;
            }
            .lm-actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .lm-download-btn {
                display: inline-block;
                width: 100%;
                padding: 12px 16px;
                border-radius: 8px;
                background: #1a365d;
                color: #ffffff !important;
                font-size: 14px;
                font-weight: 700;
                text-decoration: none;
            }
            .lm-download-btn:hover {
                background: #0f294a;
            }
            .lm-cta-quote {
                display: inline-block;
                width: 100%;
                padding: 10px 16px;
                border-radius: 8px;
                border: 1px solid #c05621;
                color: #c05621 !important;
                background: #fffaf5;
                font-size: 13.5px;
                font-weight: 700;
                text-decoration: none;
            }
        `;
        document.head.appendChild(style);
    }

    function ensureModal() {
        injectStyles();
        let modal = document.getElementById('leadMagnetModal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'leadMagnetModal';
        modal.className = 'hidden';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'lmModalTitle');

        modal.innerHTML = `
            <div class="lm-dialog">
                <button type="button" id="lmCloseBtn" class="lm-close" aria-label="Cerrar ventana">&times;</button>
                <div class="lm-header">
                    <span id="lmModalBadge" class="lm-badge"></span>
                    <h3 id="lmModalTitle" class="lm-title"></h3>
                </div>
                <div class="lm-body">
                    <form id="lmForm" novalidate>
                        <p id="lmModalDesc" class="lm-desc"></p>
                        <input type="hidden" id="lmGuiaInput" name="guia" value="">
                        <input type="text" id="lmWebsiteUrl" name="website_url" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;">
                        <div class="lm-field">
                            <label for="lmNombre" class="lm-label">Nombre Completo *</label>
                            <input type="text" id="lmNombre" name="nombre" required autocomplete="name" placeholder="Ej: Carolina Soto" class="lm-input">
                        </div>
                        <div class="lm-field">
                            <label for="lmEmail" class="lm-label">Correo Electrónico *</label>
                            <input type="email" id="lmEmail" name="email" required autocomplete="email" placeholder="nombre@correo.cl" class="lm-input">
                        </div>
                        <p id="lmError" class="lm-error hidden" role="alert"></p>
                        <button type="submit" id="lmSubmitBtn" class="lm-submit">Desbloquear y Descargar PDF</button>
                        <p class="lm-privacy">
                            Recibirás acceso inmediato al PDF y recomendaciones técnicas DOM de Constructora Cuatropuntas. Sin spam. Ver <a href="${getPoliticasHref()}" target="_blank" rel="noopener">Políticas y Privacidad</a>.
                        </p>
                    </form>

                    <div id="lmSuccessMessage" class="lm-success hidden" aria-live="polite">
                        <span class="lm-success-badge">PDF Desbloqueado</span>
                        <h4 class="lm-success-title">Tu guía técnica ya está lista</h4>
                        <p class="lm-success-text">Iniciamos la descarga automática de tu documento y te enviaremos una copia de respaldo si el correo SMTP está habilitado.</p>
                        <div class="lm-actions">
                            <a id="lmDirectDownloadLink" href="#" download="" class="lm-download-btn">Descargar PDF nuevamente</a>
                            <a id="lmGoQuoteLink" href="#contacto" class="lm-cta-quote">Cotizar mi proyecto por comuna &rarr;</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#lmCloseBtn');
        const form = modal.querySelector('#lmForm');
        const goQuoteLink = modal.querySelector('#lmGoQuoteLink');

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });
        goQuoteLink.addEventListener('click', function () {
            closeModal();
        });
        form.addEventListener('submit', handleFormSubmit);

        return modal;
    }

    function openModal(guiaKey) {
        const guide = GUIDE_META[guiaKey];
        if (!guide) return;

        const modal = ensureModal();
        const form = modal.querySelector('#lmForm');
        const successBox = modal.querySelector('#lmSuccessMessage');
        const errorBox = modal.querySelector('#lmError');
        const submitBtn = modal.querySelector('#lmSubmitBtn');

        modal.querySelector('#lmModalBadge').textContent = guide.badge;
        modal.querySelector('#lmModalTitle').textContent = guide.title;
        modal.querySelector('#lmModalDesc').textContent = guide.desc;
        modal.querySelector('#lmGuiaInput').value = guide.id;

        errorBox.textContent = '';
        errorBox.classList.add('hidden');
        form.classList.remove('hidden');
        successBox.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Desbloquear y Descargar PDF';

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        const nombreInput = modal.querySelector('#lmNombre');
        if (nombreInput) {
            setTimeout(function () { nombreInput.focus(); }, 40);
        }
    }

    function closeModal() {
        const modal = document.getElementById('leadMagnetModal');
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function showError(msg) {
        const errorBox = document.getElementById('lmError');
        if (!errorBox) return;
        errorBox.textContent = msg;
        errorBox.classList.remove('hidden');
    }

    function triggerDownload(url, filename) {
        try {
            const tempLink = document.createElement('a');
            tempLink.href = url;
            tempLink.setAttribute('download', filename);
            tempLink.style.display = 'none';
            document.body.appendChild(tempLink);
            tempLink.click();
            setTimeout(function () {
                if (tempLink.parentNode) tempLink.parentNode.removeChild(tempLink);
            }, 300);
        } catch {
            // El enlace visible #lmDirectDownloadLink permanece disponible en el modal
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const modal = document.getElementById('leadMagnetModal');
        const guiaKey = modal.querySelector('#lmGuiaInput').value;
        const guide = GUIDE_META[guiaKey];
        const nombre = (modal.querySelector('#lmNombre').value || '').trim();
        const email = (modal.querySelector('#lmEmail').value || '').trim().toLowerCase();
        const websiteUrl = (modal.querySelector('#lmWebsiteUrl').value || '').trim();
        const submitBtn = modal.querySelector('#lmSubmitBtn');
        const errorBox = modal.querySelector('#lmError');

        errorBox.textContent = '';
        errorBox.classList.add('hidden');

        if (nombre.length < 2) {
            showError('Por favor ingresa tu nombre completo (mínimo 2 caracteres).');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            showError('Por favor ingresa un correo electrónico válido.');
            return;
        }
        if (!guide) {
            showError('Guía seleccionada no válida.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Desbloqueando PDF...';

        try {
            const resp = await fetch(getApiEndpoint(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    email,
                    guia: guide.id,
                    sourcePage: window.location.pathname || '/',
                    website_url: websiteUrl
                })
            });

            const data = await resp.json().catch(function () { return {}; });
            if (!resp.ok || !data.ok) {
                showError(data.error || 'No se pudo procesar tu solicitud. Revisa tus datos e intenta nuevamente.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Desbloquear y Descargar PDF';
                return;
            }

            const finalHref = resolvePdfHref(guide, data.downloadUrl);
            const filename = data.filename || guide.filename;
            const directLink = modal.querySelector('#lmDirectDownloadLink');
            directLink.href = finalHref;
            directLink.setAttribute('download', filename);

            modal.querySelector('#lmForm').classList.add('hidden');
            modal.querySelector('#lmSuccessMessage').classList.remove('hidden');

            triggerDownload(finalHref, filename);
        } catch (err) {
            showError('Error de conexión al servidor. Por favor reintenta en unos segundos.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Desbloquear y Descargar PDF';
        }
    }

    document.addEventListener('click', function (e) {
        const trigger = e.target.closest('[data-lead-magnet]');
        if (!trigger) return;
        const guiaKey = trigger.getAttribute('data-lead-magnet');
        if (!GUIDE_META[guiaKey]) return;
        e.preventDefault();
        openModal(guiaKey);
    });

    window.CuatropuntasLeadMagnet = {
        openModal,
        closeModal,
        GUIDE_META
    };
})();
