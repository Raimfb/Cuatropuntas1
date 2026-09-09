/**
 * public/blog-comments.js
 * Constructora Cuatropuntas SpA
 * Widget Reactivo de Comentarios y Captura de Leads para Email Marketing (Spec 005)
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'cuatropuntas_blog_user';

    function initBlogComments() {
        const container = document.getElementById('blog-comments-container');
        if (!container) return;

        const slug = container.getAttribute('data-slug') || inferSlugFromPath();
        if (!slug) return;

        let currentUser = loadCurrentUser();
        let comments = [];
        let isLoading = true;
        let submitStatus = null; // { type: 'success'|'error', message: string } | null
        let isSubmitting = false;

        // Cargar comentarios iniciales
        fetchComments(slug);

        function inferSlugFromPath() {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            const lastPart = pathParts[pathParts.length - 1] || '';
            return lastPart.replace('.html', '');
        }

        function loadCurrentUser() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                return stored ? JSON.parse(stored) : null;
            } catch (e) {
                return null;
            }
        }

        function saveCurrentUser(user) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
                currentUser = user;
            } catch (e) {
                console.error('Error guardando usuario en localStorage:', e);
            }
        }

        function clearCurrentUser() {
            try {
                localStorage.removeItem(STORAGE_KEY);
                currentUser = null;
            } catch (e) {}
        }

        async function fetchComments(postSlug) {
            isLoading = true;
            render();
            try {
                const res = await fetch(`/api/blog-comments?slug=${encodeURIComponent(postSlug)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.comments)) {
                        comments = data.comments;
                    }
                }
            } catch (e) {
                console.warn('No se pudieron cargar los comentarios en línea:', e);
            } finally {
                isLoading = false;
                render();
            }
        }

        function decodeJwt(token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                    atob(base64)
                        .split('')
                        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                        .join('')
                );
                return JSON.parse(jsonPayload);
            } catch (e) {
                return null;
            }
        }

        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(dateStr) {
            if (!dateStr) return 'Reciente';
            try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return dateStr;
                return d.toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
            } catch (e) {
                return dateStr;
            }
        }

        function render() {
            container.innerHTML = `
                <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 mt-12">
                    <!-- Cabecera de la Sección -->
                    <div class="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
                        <div>
                            <h3 class="text-2xl font-extrabold text-primary flex items-center gap-2.5">
                                <span>💬</span> Preguntas & Conversación Técnica
                            </h3>
                            <p class="text-gray-500 text-sm mt-1">
                                Consulta directamente a nuestros constructores sobre costos, normativas DOM o materiales.
                            </p>
                        </div>
                        <span class="bg-orange-100 text-secondary text-xs font-bold px-3 py-1.5 rounded-full">
                            ${comments.length} ${comments.length === 1 ? 'consulta' : 'consultas'}
                        </span>
                    </div>

                    <!-- Mensajes de Notificación -->
                    ${submitStatus ? `
                        <div class="mb-6 p-4 rounded-xl text-sm font-medium ${
                            submitStatus.type === 'success' 
                                ? 'bg-green-50 border border-green-200 text-green-800' 
                                : 'bg-red-50 border border-red-200 text-red-800'
                        }">
                            ${escapeHtml(submitStatus.message)}
                        </div>
                    ` : ''}

                    <!-- Estado Autenticado vs Estado Bloqueado (Lead Gating) -->
                    ${currentUser ? renderAuthenticatedForm() : renderGateBox()}

                    <!-- Lista de Comentarios Existentes -->
                    <div class="mt-10 pt-8 border-t border-gray-100">
                        <h4 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <span>Respuestas y Consultas de la Comunidad</span>
                        </h4>

                        ${isLoading ? `
                            <div class="text-center py-8 text-gray-400 text-sm">
                                <span class="animate-spin inline-block mr-2">⏳</span> Cargando consultas...
                            </div>
                        ` : comments.length === 0 ? `
                            <div class="bg-gray-50 rounded-xl p-8 text-center text-gray-500 text-sm border border-dashed border-gray-200">
                                <p class="text-base font-semibold text-gray-700 mb-1">Aún no hay consultas en este artículo</p>
                                <p>¡Sé el primero en dejar una consulta técnica a nuestros constructores!</p>
                            </div>
                        ` : `
                            <div class="space-y-6">
                                ${comments.map(c => renderCommentItem(c)).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;

            attachEventListeners();
            initGoogleIdentity();
        }

        function renderGateBox() {
            return `
                <div class="bg-orange-50/70 border border-orange-200 rounded-xl p-6 text-center space-y-5">
                    <div class="max-w-xl mx-auto">
                        <span class="inline-block bg-orange-100 text-secondary p-2 rounded-full mb-3">🔒</span>
                        <h4 class="text-lg font-bold text-gray-900">
                            Únete a la conversación técnica
                        </h4>
                        <p class="text-sm text-gray-600 mt-1 leading-relaxed">
                            Identifícate para dejar tu consulta a nuestros constructores y recibir novedades de costos y normativas de construcción en Santiago.
                        </p>
                    </div>

                    <!-- Botón Oficial Google Identity Services -->
                    <div class="flex flex-col items-center justify-center pt-2">
                        <div id="blog-comments-google-auth" class="min-h-[44px] flex items-center justify-center">
                            <!-- Google GIS Button renders here or fallback -->
                            <button type="button" id="btn-google-fallback-trigger" class="flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-2.5 rounded-lg border border-gray-300 shadow-sm transition text-sm">
                                <svg class="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                                </svg>
                                <span>Continuar con Google</span>
                            </button>
                        </div>
                    </div>

                    <!-- Divisor -->
                    <div class="relative flex py-2 items-center max-w-sm mx-auto">
                        <div class="flex-grow border-t border-orange-200"></div>
                        <span class="flex-shrink mx-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">o bien con tu correo</span>
                        <div class="flex-grow border-t border-orange-200"></div>
                    </div>

                    <!-- Formulario Alternativo Tradicional -->
                    <form id="comment-manual-auth-form" class="max-w-md mx-auto space-y-3 text-left">
                        <div>
                            <label for="comment-author-name" class="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                            <input type="text" id="comment-author-name" required placeholder="Ej. Ignacio Pérez" class="w-full text-sm px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none bg-white">
                        </div>
                        <div>
                            <label for="comment-author-email" class="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico</label>
                            <input type="email" id="comment-author-email" required placeholder="tu.correo@ejemplo.cl" class="w-full text-sm px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none bg-white">
                        </div>
                        <div class="flex items-start gap-2.5 pt-1">
                            <input type="checkbox" id="comment-marketing-consent" required checked class="mt-1 h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary">
                            <label for="comment-marketing-consent" class="text-xs text-gray-600 leading-snug">
                                Acepto recibir novedades técnicas y estimaciones de costos conforme a la <a href="/privacidad" target="_blank" rel="noopener noreferrer" class="text-secondary hover:underline font-medium">Política de Privacidad</a>.
                            </label>
                        </div>
                        <button type="submit" id="btn-manual-auth" class="w-full bg-secondary hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded-lg transition text-sm shadow-md mt-2">
                            Identificarme para Comentar
                        </button>
                    </form>
                </div>
            `;
        }

        function renderAuthenticatedForm() {
            const avatarHtml = currentUser.picture 
                ? `<img src="${currentUser.picture}" alt="${escapeHtml(currentUser.name)}" class="w-9 h-9 rounded-full border border-gray-200 object-cover">`
                : `<div class="w-9 h-9 rounded-full bg-secondary text-white font-bold flex items-center justify-center text-sm shadow-sm">${escapeHtml(currentUser.name.charAt(0).toUpperCase())}</div>`;

            return `
                <form id="comment-submit-form" class="space-y-4">
                    <!-- Ficha de Usuario Autenticado -->
                    <div class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3.5">
                        <div id="authenticated-user-badge" class="flex items-center gap-3">
                            ${avatarHtml}
                            <div>
                                <div class="text-sm font-bold text-primary flex items-center gap-1.5">
                                    <span>${escapeHtml(currentUser.name)}</span>
                                    <span class="text-[11px] bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded-full">Suscrito</span>
                                </div>
                                <div class="text-xs text-gray-500">${escapeHtml(currentUser.email)}</div>
                            </div>
                        </div>
                        <button type="button" id="btn-logout-user" class="text-xs text-gray-500 hover:text-secondary font-medium transition underline">
                            Cambiar usuario
                        </button>
                    </div>

                    <!-- Campo Honeypot Invisible -->
                    <input type="text" name="website_url" id="comment-hp-website" style="display:none" tabindex="-1" autocomplete="off">

                    <!-- Área de Texto para Comentario -->
                    <div>
                        <label for="comment-body-input" class="block text-xs font-bold text-gray-700 mb-1.5">
                            Tu Consulta Técnica:
                        </label>
                        <textarea 
                            id="comment-body-input" 
                            rows="3" 
                            required 
                            minlength="10" 
                            maxlength="1000" 
                            placeholder="Escribe tu consulta sobre este proyecto, materiales, trámites DOM o costos... (mínimo 10 caracteres)" 
                            class="w-full text-sm p-3.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none leading-relaxed transition"
                        ></textarea>
                        <div class="flex justify-between items-center text-xs text-gray-500 mt-1 px-1">
                            <span>Mínimo 10 caracteres</span>
                            <span id="comment-char-counter">0 / 1000</span>
                        </div>
                    </div>

                    <div class="flex justify-end pt-1">
                        <button 
                            type="submit" 
                            id="btn-submit-comment" 
                            ${isSubmitting ? 'disabled' : ''} 
                            class="bg-secondary hover:bg-orange-700 text-white font-bold py-2.5 px-6 rounded-xl transition text-sm shadow-md flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}"
                        >
                            ${isSubmitting ? '<span class="animate-spin">⏳</span> Publicando...' : 'Publicar Consulta Técnica'}
                        </button>
                    </div>
                </form>
            `;
        }

        function renderCommentItem(c) {
            const isOfficial = (c.name || '').toLowerCase().includes('cuatropuntas') || c.auth_provider === 'official';
            const avatar = c.picture 
                ? `<img src="${c.picture}" alt="${escapeHtml(c.name)}" class="w-10 h-10 rounded-full border border-gray-200 object-cover flex-shrink-0">`
                : `<div class="w-10 h-10 rounded-full ${isOfficial ? 'bg-primary' : 'bg-secondary'} text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">${escapeHtml((c.name || 'C').charAt(0).toUpperCase())}</div>`;

            return `
                <div class="bg-gray-50/70 border border-gray-100 rounded-xl p-4 sm:p-5 flex gap-4 transition hover:border-gray-200">
                    ${avatar}
                    <div class="flex-grow space-y-1.5">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-sm text-primary">${escapeHtml(c.name)}</span>
                                ${isOfficial ? `
                                    <span class="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                        Equipo Técnico Cuatropuntas
                                    </span>
                                ` : ''}
                            </div>
                            <span class="text-xs text-gray-400">${formatDate(c.date)}</span>
                        </div>
                        <p class="text-gray-700 text-sm leading-relaxed">
                            ${escapeHtml(c.comment)}
                        </p>
                    </div>
                </div>
            `;
        }

        function attachEventListeners() {
            // 1. Formulario Alternativo de Autenticación
            const manualForm = document.getElementById('comment-manual-auth-form');
            if (manualForm) {
                manualForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    const name = document.getElementById('comment-author-name').value.trim();
                    const email = document.getElementById('comment-author-email').value.trim();
                    const consent = document.getElementById('comment-marketing-consent').checked;

                    if (!name || !email || !consent) return;

                    saveCurrentUser({
                        name: name,
                        email: email,
                        auth_provider: 'email',
                        picture: null
                    });

                    render();
                });
            }

            // 2. Botón de fallback para Google (simulación o prompt)
            const googleFallbackBtn = document.getElementById('btn-google-fallback-trigger');
            if (googleFallbackBtn) {
                googleFallbackBtn.addEventListener('click', function () {
                    const sampleEmail = window.prompt('Ingresa tu correo para identificarte con Google:', 'usuario@gmail.com');
                    if (sampleEmail) {
                        const nameFromEmail = sampleEmail.split('@')[0];
                        saveCurrentUser({
                            name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
                            email: sampleEmail,
                            auth_provider: 'google',
                            picture: null
                        });
                        render();
                    }
                });
            }

            // 3. Botón de Cerrar Sesión / Cambiar Usuario
            const logoutBtn = document.getElementById('btn-logout-user');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function () {
                    clearCurrentUser();
                    render();
                });
            }

            // 4. Textarea y Contador de Caracteres
            const textarea = document.getElementById('comment-body-input');
            const counter = document.getElementById('comment-char-counter');
            if (textarea && counter) {
                textarea.addEventListener('input', function () {
                    const len = textarea.value.length;
                    counter.textContent = `${len} / 1000`;
                    if (len < 10) {
                        counter.classList.add('text-red-500');
                        counter.classList.remove('text-gray-500');
                    } else {
                        counter.classList.remove('text-red-500');
                        counter.classList.add('text-gray-500');
                    }
                });
            }

            // 5. Envío del Comentario
            const submitForm = document.getElementById('comment-submit-form');
            if (submitForm) {
                submitForm.addEventListener('submit', async function (e) {
                    e.preventDefault();
                    if (!currentUser || isSubmitting) return;

                    const commentText = (textarea?.value || '').trim();
                    const hpVal = document.getElementById('comment-hp-website')?.value || '';

                    if (commentText.length < 10) {
                        submitStatus = { type: 'error', message: 'Tu consulta debe tener al menos 10 caracteres.' };
                        render();
                        return;
                    }

                    isSubmitting = true;
                    submitStatus = null;
                    render();

                    try {
                        const res = await fetch('/api/blog-comments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                slug: slug,
                                name: currentUser.name,
                                email: currentUser.email,
                                comment: commentText,
                                auth_provider: currentUser.auth_provider,
                                picture: currentUser.picture,
                                website_url: hpVal
                            })
                        });

                        const data = await res.json();

                        if (res.ok && data.success) {
                            submitStatus = {
                                type: 'success',
                                message: '¡Muchas gracias! Tu consulta ha sido publicada con éxito y recibida por nuestros constructores.'
                            };
                            if (data.comment) {
                                comments.unshift(data.comment);
                            }
                        } else {
                            submitStatus = {
                                type: 'error',
                                message: data.error || 'No se pudo publicar la consulta. Por favor intenta nuevamente.'
                            };
                        }
                    } catch (err) {
                        submitStatus = {
                            type: 'error',
                            message: 'Error de conexión con el servidor. Por favor verifica tu red.'
                        };
                    } finally {
                        isSubmitting = false;
                        render();
                    }
                });
            }
        }

        function initGoogleIdentity() {
            const googleContainer = document.getElementById('blog-comments-google-auth');
            if (!googleContainer) return;

            // Si la librería de Google está cargada en la ventana
            if (window.google && window.google.accounts && window.google.accounts.id) {
                const clientId = container.getAttribute('data-google-client-id') || '1047123456789-dummy.apps.googleusercontent.com';
                try {
                    window.google.accounts.id.initialize({
                        client_id: clientId,
                        callback: function (response) {
                            if (response && response.credential) {
                                const payload = decodeJwt(response.credential);
                                if (payload && payload.email) {
                                    saveCurrentUser({
                                        name: payload.name || payload.email.split('@')[0],
                                        email: payload.email,
                                        picture: payload.picture || null,
                                        auth_provider: 'google'
                                    });
                                    render();
                                }
                            }
                        }
                    });

                    googleContainer.innerHTML = '';
                    window.google.accounts.id.renderButton(googleContainer, {
                        theme: 'outline',
                        size: 'large',
                        type: 'standard',
                        text: 'continue_with',
                        shape: 'rectangular'
                    });
                } catch (e) {
                    console.warn('Error inicializando Google Identity Services:', e);
                }
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBlogComments);
    } else {
        initBlogComments();
    }
})();
