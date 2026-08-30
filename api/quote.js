const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { isBotSubmission } = require('./_botGuard');
        const botCheck = isBotSubmission(req.body);

        if (botCheck.isBot) {
            console.log(`[BOT BLOCKED api/quote.js] Reason: ${botCheck.reason}. Name: ${req.body?.nombre}, Email: ${req.body?.email}`);
            // Responder con HTTP 200 para simular éxito y evitar que el bot reintente
            return res.status(200).json({ success: true, message: 'Cotización generada y enviada correctamente' });
        }

        const { tipo, sistema, area, pisos, terminaciones, comuna, permisos, nombre, email, telefono } = req.body;

        // 2. Validación de campos obligatorios
        if (!tipo || !sistema || area === undefined || pisos === undefined || !terminaciones || !comuna || !nombre || !email || !telefono) {
            return res.status(400).json({ error: 'Faltan campos obligatorios en el formulario.' });
        }

        // 3. Saneamiento y Límites Estrictos
        const areaNum = parseFloat(area);
        const pisosNum = parseInt(pisos);

        const isAmpliacion = tipo.toLowerCase().includes("segundo") || tipo.toLowerCase().includes("amplia");
        const isQuincho = tipo.toLowerCase().includes("quincho");
        const isRemodelacion = tipo.toLowerCase().includes("remodela");

        const minAllowedArea = isRemodelacion ? 3 : 10;

        if (isNaN(areaNum) || areaNum < minAllowedArea || areaNum > 5000) {
            return res.status(400).json({ error: `La superficie ingresada no es válida. Por favor ingresa un valor entre ${minAllowedArea} y 5000 m².` });
        }

        if (isNaN(pisosNum) || pisosNum < 1 || pisosNum > 4) {
            return res.status(400).json({ error: 'El número de pisos debe estar entre 1 y 4.' });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email) || email.length > 100) {
            return res.status(400).json({ error: 'El formato de correo electrónico no es válido.' });
        }

        // Mapeo legible de comunas para presentación ejecutiva
        function getComunaLabel(comunaVal) {
            if (!comunaVal) return 'Región Metropolitana';
            if (comunaVal === 'Tier1') return 'Sector Oriente, RM';
            if (comunaVal.startsWith('Tier')) return 'Región Metropolitana';
            if (comunaVal.includes('RM') || comunaVal.includes('Metropolitana')) return comunaVal;
            return `${comunaVal}, RM`;
        }

        const calendarUrl = "https://cal.com/cuatropuntas.com/visita-tecnica";

        // Mapeo y factores para Estado de Planos y Permisos DOM
        function getPermisosData(permisosKey) {
            switch (permisosKey) {
                case 'PermisoAprobado':
                    return {
                        label: 'Permiso de Edificación DOM Aprobado (Listo para construir)',
                        factor: 0.94, // ~6% de descuento técnico por expediente aprobado
                        adminBadge: 'PERMISO DOM APROBADO (Listo para inicio inmediato)',
                        badgeShort: 'Permiso DOM Listo',
                        badgePdf: 'Permiso DOM Aprobado',
                        notePdf: 'Descuento técnico aplicado por proyecto municipal aprobado. Inicio de faenas programable en plazos reducidos.'
                    };
                case 'ArquitectoPropio':
                    return {
                        label: 'Arquitecto propio a cargo de la DOM (Solo ejecución de obra)',
                        factor: 0.94, // ~6% de descuento técnico por gestión externa
                        adminBadge: 'ARQUITECTO PROPIO (Solo requiere Construcción)',
                        badgeShort: 'Arq. Propio',
                        badgePdf: 'Arq. Propio (Solo Obra)',
                        notePdf: 'Cotización orientada a la ejecución material de obra bajo dirección de tu arquitecto patrocinante.'
                    };
                case 'Planos':
                    return {
                        label: 'Planos de arquitectura listos (Falta cálculo y permiso DOM)',
                        factor: 0.97, // ~3% de descuento técnico por diseño inicial
                        adminBadge: 'PLANOS LISTOS (Falta cálculo y trámite DOM)',
                        badgeShort: 'Con Planos',
                        badgePdf: 'Planos Listos (Falta DOM)',
                        notePdf: 'Descuento aplicado por planos existentes. Cuatropuntas asume ingeniería de cálculo y tramitación municipal.'
                    };
                case 'Idea':
                default:
                    return {
                        label: 'Proyecto desde cero (Diseño, cálculo y gestión DOM incluidos)',
                        factor: 1.00,
                        adminBadge: 'PROYECTO COMPLETO (Diseño + DOM + Construcción)',
                        badgeShort: 'Desde Cero',
                        badgePdf: 'Diseño + DOM + Obra',
                        notePdf: 'Modalidad Llave en Mano Integral: incluye arquitectura, cálculo estructural, gestión DOM y ejecución de obra.'
                    };
            }
        }

        const permisosData = getPermisosData(permisos);
        const comunaHuman = getComunaLabel(comuna);
        const firstName = (nombre || '').trim().split(' ')[0] || 'Cliente';

        // --- MATRIZ DE PRECIOS EXACTA PUBLICADA EN LA WEB CUATROPUNTAS (UF/m² NETAS +IVA) ---
        // Coincidencia 100% estricta con las tablas públicas de precios.html y index.html
        let baseUFm2 = 19; // Fallback general

        const isAmpliacion = tipo.toLowerCase().includes("segundo") || tipo.toLowerCase().includes("amplia");
        const isQuincho = tipo.toLowerCase().includes("quincho");
        const isRemodelacion = tipo.toLowerCase().includes("remodela");

        if (isQuincho) {
            if (sistema === 'Metalcon') baseUFm2 = 12;
            else if (sistema === 'SIP' || sistema === 'Covintec') baseUFm2 = 14;
            else baseUFm2 = 15; // Albañilería / Mixto
        } else if (isRemodelacion) {
            if (sistema === 'Metalcon') baseUFm2 = 11;
            else baseUFm2 = 13; // Albañilería / otros sistemas sólidos
        } else if (isAmpliacion || pisosNum >= 2) {
            if (sistema === 'Metalcon') baseUFm2 = 22;
            else if (sistema === 'SIP' || sistema === 'Covintec') baseUFm2 = 24;
            else if (sistema === 'Mixto') baseUFm2 = 25;
            else baseUFm2 = 27; // Albañilería sólida
        } else {
            // Casa Nueva (1 Piso)
            if (sistema === 'Metalcon') baseUFm2 = 19;
            else if (sistema === 'SIP' || sistema === 'Covintec') baseUFm2 = 21;
            else if (sistema === 'Mixto') baseUFm2 = 23;
            else baseUFm2 = 25; // Albañilería sólida
        }

        // Ajustes por escala y terminaciones
        let multiplicador = 1.0;
        if (areaNum < 40) multiplicador += 0.08; // Proyectos pequeños (costo fijo proporcional mayor)
        if (terminaciones === 'Premium') multiplicador += 0.10; // Terminaciones Premium (porcelanatos, termopanel)

        // Factor logístico interno por comuna en RM
        function getFactorComuna(comunaVal) {
            if (!comunaVal) return 1.0;
            const name = String(comunaVal).toLowerCase();
            if (name.includes('vitacura') || name.includes('las condes') || name.includes('lo barnechea') || name.includes('providencia') || name.includes('la reina') || name === 'tier1') {
                return 1.05;
            }
            if (name.includes('colina') || name.includes('lampa') || name.includes('buin') || name.includes('paine') || name.includes('talagante') || name.includes('melipilla') || name.includes('curacaví') || name.includes('alhué') || name.includes('pirque') || name.includes('san josé de maipo') || name.includes('tiltil') || name.includes('isla de maipo') || name.includes('el monte') || name.includes('maría pinto') || name.includes('san pedro') || name === 'tier5' || name === 'tier4') {
                return 0.98;
            }
            return 1.00;
        }

        const factorComuna = getFactorComuna(comuna);
        const factorPermisos = permisosData.factor;

        const costoM2Final = baseUFm2 * multiplicador * factorComuna * factorPermisos;
        let totalEstimado = costoM2Final * areaNum;

        // Ajuste técnico para remodelaciones: en áreas pequeñas (<20 m²), como baños o cocinas,
        // los costos fijos de mano de obra técnica (gasfitería, impermeabilización, demolición y terminaciones)
        // se dimensionan con un piso base de partidas por recinto para no subdimensionar la obra.
        if (isRemodelacion) {
            if (areaNum <= 8) {
                // Recinto húmedo pequeño (Baño estándar): base técnica de partidas fijas (redes, impermeabilización, shower/tina y porcelanato)
                const baseRecinto = (sistema === 'Metalcon' ? 60 : 70) * (terminaciones === 'Premium' ? 1.18 : (terminaciones === 'Basico' ? 0.90 : 1.0));
                totalEstimado = Math.max(totalEstimado, baseRecinto * factorComuna * factorPermisos);
            } else if (areaNum < 20) {
                // Recinto mediano (Cocina / Baño amplio): base técnica de muebles, cubiertas, demolición y redes
                const baseRecinto = (sistema === 'Metalcon' ? 85 : 98) * (terminaciones === 'Premium' ? 1.18 : (terminaciones === 'Basico' ? 0.90 : 1.0));
                totalEstimado = Math.max(totalEstimado, baseRecinto * factorComuna * factorPermisos);
            }
        }

        // Rango referencial: ±5% sobre el total estimado para dar un margen comercial realista
        const minUF_raw = Math.round(totalEstimado * 0.96);
        const maxUF_raw = Math.round(totalEstimado * 1.05);

        const formatter = new Intl.NumberFormat('es-CL');
        const minUF = formatter.format(minUF_raw);
        const maxUF = formatter.format(maxUF_raw);

        // Enlaces directos a WhatsApp para máxima conversión
        const cleanClientPhone = (telefono || '').replace(/\D/g, '');
        const formattedClientPhone = cleanClientPhone.startsWith('56') ? cleanClientPhone : (cleanClientPhone.length === 9 ? `56${cleanClientPhone}` : cleanClientPhone);
        
        const clientWaText = encodeURIComponent(`Hola Constructora Cuatropuntas, recibí mi cotización referencial para mi proyecto de ${tipo} (${areaNum} m²) y me gustaría coordinar una visita técnica a terreno.`);
        const clientWhatsappUrl = `https://wa.me/56927384075?text=${clientWaText}`;

        const adminWaText = encodeURIComponent(`Hola ${firstName}, te escribo de Constructora Cuatropuntas respecto a tu solicitud de cotización para tu proyecto de ${tipo} (${areaNum} m²). ¿Te parece si coordinamos una visita técnica a terreno para revisar los detalles de tu propiedad y afinar la propuesta?`);
        const adminReplyWaUrl = `https://wa.me/${formattedClientPhone}?text=${adminWaText}`;

        // --- GENERACIÓN DE PDF PROFESIONAL EN MEMORIA (PDFKit) ---
        const doc = new PDFDocument({ margin: 45, size: 'LETTER' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        const pdfPromise = new Promise((resolve) => {
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
        });

        // 1. Encabezado Institucional
        doc.rect(45, 45, 522, 4).fill('#c05621'); // Barra decorativa terracota

        // Marca y Subtítulo
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a365d').text('CONSTRUCTORA CUATROPUNTAS', 45, 58);
        doc.fontSize(9).font('Helvetica').fillColor('#718096').text('Arquitectura, Ingeniería & Construcción Habitacional  |  www.cuatropuntas.com', 45, 78);

        // Metadatos a la derecha
        const fechaEmision = new Date().toLocaleDateString('es-CL');
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#4a5568').text(`Fecha: ${fechaEmision}`, 400, 58, { width: 167, align: 'right' });
        doc.fontSize(8.5).font('Helvetica').fillColor('#718096').text('Validez referencia: 30 días', 400, 72, { width: 167, align: 'right' });

        // Línea divisoria
        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(45, 96).lineTo(567, 96).stroke();

        // 2. Título Principal y Datos del Cliente
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a202c').text('ESTIMACIÓN REFERENCIAL DE PROYECTO', 45, 108);
        doc.fontSize(9.5).font('Helvetica').fillColor('#4a5568')
           .text(`Cliente: ${nombre}   |   Email: ${email}   |   Teléfono: ${telefono}`, 45, 126);

        // 3. Ficha Resumen del Proyecto
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a202c').text('1. Parámetros Técnicos del Proyecto', 45, 148);

        const cardTop = 164;
        doc.roundedRect(45, cardTop, 522, 72, 4).fillAndStroke('#f8fafc', '#e2e8f0');
        
        doc.fillColor('#2d3748').fontSize(9).font('Helvetica');
        doc.text(`• Tipo de Obra: ${tipo}`, 60, cardTop + 10);
        doc.text(`• Sistema Constructivo: ${sistema}`, 60, cardTop + 24);
        doc.text(`• Superficie Estimada: ${areaNum} m² (${pisosNum} piso${pisosNum > 1 ? 's' : ''})`, 60, cardTop + 38);
        doc.text(`• Nivel Terminaciones: ${terminaciones}`, 60, cardTop + 52);

        doc.text(`• Sector / Ubicación: ${comunaHuman}`, 290, cardTop + 10, { width: 260 });
        doc.text(`• Estado Planos / DOM: ${permisosData.badgePdf}`, 290, cardTop + 24, { width: 260 });
        doc.text('• Modalidad: Llave en Mano Integral', 290, cardTop + 38);
        doc.text('• Gestión Municipal: Asesoría Técnica DOM', 290, cardTop + 52);

        // 4. Inversión Estimada Referencial
        const sec2Top = cardTop + 84;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a202c').text('2. Estimación Económica Referencial (Sin IVA)', 45, sec2Top);
        doc.fontSize(9).font('Helvetica').fillColor('#4a5568')
           .text('Rango paramétrico preliminar calculado según m² y sistema constructivo seleccionado:', 45, sec2Top + 15);

        const priceBoxTop = sec2Top + 30;
        doc.roundedRect(45, priceBoxTop, 522, 44, 4).fillAndStroke('#fffaf5', '#fed7aa');
        doc.fillColor('#c05621').fontSize(16).font('Helvetica-Bold')
           .text(`${minUF} UF  —  ${maxUF} UF (sin IVA)`, 45, priceBoxTop + 10, { width: 522, align: 'center' });
        doc.fontSize(8).font('Helvetica').fillColor('#9c4221')
           .text('Presupuesto definitivo sujeto a evaluación en terreno y desarrollo de especialidades.', 45, priceBoxTop + 28, { width: 522, align: 'center' });

        // 5. Compromiso de Transparencia Técnica y Modelo Constructivo
        const sec3Top = priceBoxTop + 56;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a202c').text('3. Compromiso de Transparencia y Modelo Llave en Mano', 45, sec3Top);
        
        doc.fontSize(8.5).font('Helvetica').fillColor('#4a5568');
        let curY = sec3Top + 16;
        doc.text('• Contrato a Suma Alzada: El presupuesto de la propuesta definitiva es cerrado para todas las partidas, planos y especificaciones acordadas en el contrato.', 45, curY, { width: 522, lineGap: 2 });
        curY += 22;
        const viciosText = isRemodelacion
            ? '• Protocolo ante Imprevistos y Vicios Ocultos: En remodelaciones y recintos húmedos (baños/cocinas), la propuesta definitiva se valida tras inspeccionar el estado de redes de agua, desagües y preexistencias. Si surgen cañerías deterioradas no visibles preliminarmente, nuestro equipo emite informe técnico y cotización previa aprobada por ti.'
            : '• Protocolo ante Imprevistos y Vicios Ocultos: Si en la intervención se detectan preexistencias no visibles preliminarmente (ej. retiro normado de asbesto por empresas autorizadas, refuerzos de fundaciones o fallas en instalaciones preexistentes), nuestro equipo elabora un informe técnico y cotización complementaria con tu aprobación previa antes de ejecutar.';
        doc.text(viciosText, 45, curY, { width: 522, lineGap: 2 });
        curY += (isRemodelacion ? 36 : 32);
        doc.text('• Gestión Normativa Integral: Asesoramos y gestionamos la tramitación de Permiso de Edificación y Recepción Final ante la Dirección de Obras Municipales (DOM).', 45, curY, { width: 522, lineGap: 2 });

        // 6. Siguiente Paso — Coordinar Visita Técnica a Terreno
        const sec4Top = curY + 22;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a202c').text('4. Siguiente Paso — Visita Técnica en Terreno', 45, sec4Top);
        doc.fontSize(9).font('Helvetica').fillColor('#4a5568')
           .text('Para evaluar en terreno las condiciones de tu propiedad (deslindes, suelo, factibilidad municipal y distribución) y estructurar tu presupuesto definitivo a suma alzada, te invitamos a agendar una visita técnica.', 45, sec4Top + 15, { width: 522 });

        // Botón Interactivo Centrado
        const btnX = 135;
        const btnY = sec4Top + 48;
        const btnWidth = 340;
        const btnHeight = 36;
        
        doc.roundedRect(btnX, btnY, btnWidth, btnHeight, 6).fill('#c05621');
        doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
           .text('AGENDAR VISITA TÉCNICA A TERRENO', btnX, btnY + 12, { 
               width: btnWidth, 
               align: 'center' 
           });
        doc.link(btnX, btnY, btnWidth, btnHeight, calendarUrl);

        doc.fontSize(8).font('Helvetica').fillColor('#718096')
           .text('Haz clic en el botón superior o escríbenos a contacto@cuatropuntas.com', 45, btnY + 44, { width: 522, align: 'center' });

        // 7. Pie de Página
        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(45, 730).lineTo(567, 730).stroke();
        doc.fontSize(7.5).font('Helvetica').fillColor('#a0aec0')
           .text('Constructora Cuatropuntas SpA · Santiago de Chile · www.cuatropuntas.com · Documento informativo referencial.', 45, 738, { width: 522, align: 'center' });

        doc.end();

        const pdfBuffer = await pdfPromise;

        const faqPriceAnswer = isRemodelacion
            ? 'En remodelaciones integrales la referencia parte desde 11 UF/m² (Metalcon) y 13 UF/m² (albañilería). Para recintos específicos (baños y cocinas), el valor se estructura por paquete de partidas (redes, impermeabilización y terminaciones) con un rango referencial de 65 a 95 UF por baño completo y 90 a 160 UF por cocina integral.'
            : isQuincho
                ? 'Para quinchos de alto estándar, la referencia parte desde 12 UF/m² en Metalcon y 15 UF/m² en albañilería en obra, según equipamiento, techumbre y terminaciones.'
                : (isAmpliacion || pisosNum >= 2)
                    ? 'Para segundos pisos y ampliaciones, la referencia parte desde 22 UF/m² en Metalcon, 24 UF/m² en panel SIP y 27 UF/m² en albañilería sólida, dependiendo del refuerzo de la estructura existente y terminaciones.'
                    : 'Para casas nuevas completas, la referencia parte desde 19 UF/m² en Metalcon, 21 UF/m² en panel SIP y 25 UF/m² en albañilería tradicional sólida.';
            : isQuincho
                ? 'Para quinchos de alto estándar, la referencia parte desde 12 UF/m² en Metalcon y 15 UF/m² en albañilería en obra, según equipamiento, techumbre y terminaciones.'
                : (isAmpliacion || pisosNum >= 2)
                    ? 'Para segundos pisos y ampliaciones, la referencia parte desde 22 UF/m² en Metalcon, 24 UF/m² en panel SIP y 27 UF/m² en albañilería sólida, dependiendo del refuerzo de la estructura existente y terminaciones.'
                    : 'Para casas nuevas completas, la referencia parte desde 19 UF/m² en Metalcon, 21 UF/m² en panel SIP y 25 UF/m² en albañilería tradicional sólida.';

        const faqTimelineAnswer = isRemodelacion
            ? 'En remodelaciones, el plazo típico varía entre 1 y 3 meses tras coordinar partidas y materiales.'
            : 'Como referencia orientativa: una casa nueva de 50 a 100 m² toma entre 3 y 5 meses; una ampliación o segundo piso, entre 2 y 4 meses; y un quincho completo, entre 4 y 8 semanas.';

        const faqEmailHtml = `
            <div style="background-color:#fffaf5; border:1px solid #fed7aa; border-radius:8px; padding:18px; margin:24px 0; color:#4a5568; line-height:1.55;">
                <h3 style="margin:0 0 14px 0; color:#1a202c; font-size:16px;">Preguntas Frecuentes de Nuestros Clientes</h3>
                <p style="margin:0 0 12px 0; font-size:14px;"><strong>¿Cómo funciona la visita técnica en terreno?</strong><br>Coordinamos una inspección para evaluar deslindes, estado del suelo o vivienda existente, orientación solar y factibilidad ante la DOM.</p>
                <p style="margin:0 0 12px 0; font-size:14px;"><strong>¿Cómo se manejan los imprevistos en obra?</strong><br>Trabajamos con presupuestos cerrados a suma alzada sobre las partidas contratadas. Si surge un vicio oculto no visible al inicio (ej. necesidad de retiro de asbesto por norma o refuerzo de cimientos previos), se emite un informe técnico y cotización previa aprobada por ti.</p>
                <p style="margin:0 0 12px 0; font-size:14px;"><strong>¿Cuánto demora la obra?</strong><br>${faqTimelineAnswer}</p>
                <p style="margin:0; font-size:14px;"><strong>¿Trabajan con subsidio MINVU?</strong><br>Sí, ejecutamos obras de <strong>Construcción en Sitio Propio (DS1 y DS49)</strong> para beneficiarios con subsidio ya adjudicado y terreno propio.</p>
            </div>
        `;

        // --- ENVÍO DE CORREOS TRANSACCIONALES VÍA NODEMAILER ---
        const user = process.env.ZOHO_USER || 'contacto@cuatropuntas.com';
        const pass = process.env.ZOHO_PASS;

        if (!pass) {
            console.error("ERROR: Variable de entorno ZOHO_PASS no configurada.");
            return res.status(500).json({ error: 'Error en el servidor de correo. Por favor contáctanos por WhatsApp.' });
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true,
            auth: {
                user: user,
                pass: pass
            }
        });

        // 1. Enviar correo al CLIENTE con PDF adjunto y Copy de Alta Conversión
        const mailToClient = {
            from: `"Constructora Cuatropuntas" <${user}>`,
            to: email,
            subject: `Estimación para ${tipo}: ${minUF} a ${maxUF} UF | Constructora Cuatropuntas`,
            html: `
            <div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: auto; padding: 24px; color: #2d3748; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
                <!-- Header -->
                <div style="text-align: center; border-bottom: 2px solid #c05621; padding-bottom: 16px; margin-bottom: 20px;">
                    <h1 style="color: #1a365d; margin: 0; font-size: 22px; letter-spacing: 0.5px;">CONSTRUCTORA CUATROPUNTAS</h1>
                    <p style="color: #c05621; font-weight: bold; margin: 4px 0 0 0; font-size: 13px;">Arquitectura, Ingeniería & Construcción Habitacional</p>
                </div>

                <!-- Saludo cálido y validación -->
                <p style="font-size: 16px; margin-bottom: 12px;">Estimado(a) <strong>${firstName}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #4a5568; margin-top: 0;">
                    Agradecemos tu interés en cotizar con nosotros. Planificar tu <strong>${tipo} de ${areaNum} m²</strong> es un paso importante. En Cuatropuntas te acompañamos con respaldo técnico, materiales certificados y absoluta transparencia de costos.
                </p>

                <!-- Tarjeta Resumen Visual Inmediato -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #c05621; border-radius: 6px; padding: 18px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #1a202c; font-size: 16px;">Ficha de Estimación Referencial</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #4a5568;">
                        <tr><td style="padding: 4px 0; width: 40%;"><strong>Proyecto:</strong></td><td>${tipo} (${areaNum} m² - ${pisosNum} piso${pisosNum > 1 ? 's' : ''})</td></tr>
                        <tr><td style="padding: 4px 0;"><strong>Sistema Constructivo:</strong></td><td>${sistema} (${terminaciones})</td></tr>
                        <tr><td style="padding: 4px 0;"><strong>Sector de la obra:</strong></td><td>${comunaHuman}</td></tr>
                        <tr><td style="padding: 4px 0;"><strong>Planos / Permiso DOM:</strong></td><td>${permisosData.label}</td></tr>
                        <tr>
                            <td style="padding: 8px 0 4px 0;"><strong>Inversión Estimada:</strong></td>
                            <td style="padding: 8px 0 4px 0;"><span style="color: #c05621; font-size: 18px; font-weight: bold;">${minUF} a ${maxUF} UF</span> <span style="font-size: 12px; color: #718096;">(sin IVA)</span></td>
                        </tr>
                    </table>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #718096;">
                        *Valores paramétricos calculados según m², sistema constructivo y estado del proyecto. Adjunto encontrarás el documento PDF oficial con el desglose técnico.
                    </p>
                </div>

                <!-- Explicación del Siguiente Paso (Visita Técnica a Terreno) -->
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px; margin: 24px 0;">
                    <h3 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 16px;">¿Cómo pasamos de esta estimación a tu proyecto definitivo?</h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e40af;">
                        Para evaluar en terreno las condiciones de tu propiedad (deslindes, estado del suelo, factibilidad municipal y distribución) y estructurar un <strong>presupuesto definitivo cerrado a suma alzada</strong>, el siguiente paso es coordinar una <strong>Visita Técnica a Terreno</strong> con nuestro equipo de profesionales.
                    </p>
                </div>

                <!-- DOBLE LLAMADO A LA ACCIÓN (VISITA TÉCNICA + CONSULTAS WHATSAPP) -->
                <div style="text-align: center; margin: 28px 0 20px 0;">
                    <!-- Botón 1: Visita Técnica -->
                    <a href="${calendarUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #c05621; color: #ffffff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 12px;">
                        Agendar Visita Técnica a Terreno
                    </a>
                    
                    <!-- Botón 2: WhatsApp -->
                    <div>
                        <a href="${clientWhatsappUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #128C7E; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            ¿Tienes dudas previas? Chatear por WhatsApp
                        </a>
                    </div>
                    <p style="font-size: 12px; color: #718096; margin-top: 10px;">Atención técnica y coordinación de visitas en terreno: Lunes a Viernes de 09:00 a 18:30 hrs</p>
                </div>

                <!-- Pilares de Confianza y Transparencia Cuatropuntas -->
                <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin: 24px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #1a202c; font-size: 15px;">Nuestros Compromisos de Calidad y Transparencia:</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #4a5568; line-height: 1.6;">
                        <li><strong>Contratos a Suma Alzada:</strong> Precio garantizado y cerrado para todas las partidas acordadas en el proyecto definitivo.</li>
                        <li><strong>Transparencia ante Imprevistos:</strong> Si durante la obra surgen preexistencias o vicios ocultos (ej. retiro normado de asbesto por empresa autorizada o refuerzos estructurales), se presenta un informe técnico y cotización previa aprobada por ti.</li>
                        <li><strong>Gestión Integral DOM:</strong> Asesoría técnica en tramitación de Permisos de Edificación y Recepción Final.</li>
                    </ul>
                </div>

                ${faqEmailHtml}

                <!-- Footer -->
                <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
                    <p style="margin: 0; font-size: 13px; color: #718096; font-weight: bold;">Constructora Cuatropuntas SpA</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #718096;">Santiago de Chile · <a href="https://www.cuatropuntas.com" style="color: #c05621; text-decoration: none;">www.cuatropuntas.com</a> · +56 9 2738 4075</p>
                </div>
            </div>
            `,
            attachments: [
                {
                    filename: `Cotizacion_Cuatropuntas_${firstName}_${tipo.replace(/\s+/g, '_')}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        // 2. Enviar correo interno de AVISO PRIORITARIO a CUATROPUNTAS (Con Botón 1-Touch WhatsApp)
        const mailToAdmin = {
            from: `"Sitio Web Cuatropuntas" <${user}>`,
            to: 'contacto@cuatropuntas.com',
            subject: `NUEVA COTIZACIÓN WEB: ${nombre} (${tipo} ${areaNum}m² - ${minUF}-${maxUF} UF) [${permisosData.badgeShort}] - ${comunaHuman.split(',')[0].trim()}`,
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #ffffff; border: 2px solid #c05621; border-radius: 8px; max-width: 600px;">
                <h2 style="color: #c05621; margin-top: 0;">NUEVO CLIENTE HA COTIZADO EN LA WEB</h2>
                <p>El sistema automático ha emitido y enviado una estimación referencial de <strong>${minUF} a ${maxUF} UF</strong> al siguiente prospecto:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
                    <tr style="background-color: #f7fafc;"><td style="padding: 8px; font-weight: bold; width: 30%;">Nombre:</td><td style="padding: 8px;">${nombre}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td></tr>
                    <tr style="background-color: #f7fafc;"><td style="padding: 8px; font-weight: bold;">Teléfono:</td><td style="padding: 8px;"><a href="tel:${telefono}">${telefono}</a></td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Proyecto:</td><td style="padding: 8px;"><strong>${tipo}</strong> (${areaNum} m², ${pisosNum} piso${pisosNum > 1 ? 's' : ''}, ${sistema})</td></tr>
                    <tr style="background-color: #f7fafc;"><td style="padding: 8px; font-weight: bold;">Terminaciones:</td><td style="padding: 8px;">${terminaciones}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Ubicación:</td><td style="padding: 8px;">${comunaHuman}</td></tr>
                    <tr style="background-color: #fef3c7;"><td style="padding: 8px; font-weight: bold; color: #92400e;">Estado DOM / Planos:</td><td style="padding: 8px; font-weight: bold; color: #92400e;">${permisosData.adminBadge}</td></tr>
                    <tr style="background-color: #f7fafc;"><td style="padding: 8px; font-weight: bold;">Rango UF:</td><td style="padding: 8px; color: #c05621; font-weight: bold;">${minUF} a ${maxUF} UF (sin IVA)</td></tr>
                </table>

                <!-- BOTÓN 1-TOUCH WHATSAPP PARA CONTACTO RÁPIDO DESDE EL CELULAR -->
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${adminReplyWaUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #25D366; color: #ffffff; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.15);">
                        ESCRIBIR A ${firstName.toUpperCase()} POR WHATSAPP
                    </a>
                    <p style="font-size: 12px; color: #718096; margin-top: 8px;">Abre WhatsApp con mensaje de saludo e invitación a reunión técnica pre-redactado</p>
                </div>
            </div>
            `,
            attachments: [
                {
                    filename: `Copia_Cotizacion_${nombre}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        // 3. Envío de correos concurrentes
        await Promise.all([
            transporter.sendMail(mailToClient),
            transporter.sendMail(mailToAdmin)
        ]);

        // 4. Intentar alerta WhatsApp al Administrador (+56 9 7909 2027) vía Meta Graph API (si token está disponible)
        try {
            const token = process.env.WHATSAPP_TOKEN;
            const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1221676334362871";
            if (token) {
                const adminPhone = "56979092027";
                const adminMsg = `*NUEVA COTIZACIÓN WEB CUATROPUNTAS*\n\n*Cliente*: ${nombre}\n*Teléfono*: ${telefono}\n*Email*: ${email}\n*Proyecto*: ${tipo} (${areaNum} m² - ${sistema})\n*Sector*: ${comunaHuman.split(',')[0].trim()}\n*Estado DOM*: ${permisosData.adminBadge}\n*Rango*: ${minUF} a ${maxUF} UF\n\n*Contactar*: https://wa.me/${formattedClientPhone}`;
                
                await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: adminPhone,
                        type: "text",
                        text: { body: adminMsg }
                    })
                });
            }
        } catch (waErr) {
            console.log("Aviso WhatsApp opcional no despachado:", waErr.message);
        }

        res.status(200).json({ 
            success: true, 
            message: 'Cotización generada y enviada correctamente',
            calendarUrl: calendarUrl || null
        });

    } catch (error) {
        console.error('Error generando o enviando cotización:', error);
        res.status(500).json({ error: 'Error interno en el servidor de cotizaciones' });
    }
};
