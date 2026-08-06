/**
 * Módulo de detección de Bots y Filtrado Anti-Spam para Constructora Cuatropuntas
 */

function isBotSubmission(data = {}) {
    const {
        nombre,
        name,
        email,
        telefono,
        phone,
        website_url,
        _hp_check,
        _ts,
        _token
    } = data;

    const leadName = nombre || name;
    const leadPhone = telefono || phone;

    // 1. Honeypots (Campos trampa invisibles)
    if (website_url || _hp_check) {
        return { isBot: true, reason: 'Honeypot activado' };
    }

    // 2. Control de velocidad de envío (Timestamp)
    if (_ts && typeof _ts === 'number') {
        const elapsed = Date.now() - _ts;
        if (elapsed < 1500) { // Formulario enviado en menos de 1.5 segundos
            return { isBot: true, reason: `Envío demasiado rápido (${elapsed}ms)` };
        }
    }

    // 3. Token de interacción cliente
    if (_token) {
        try {
            const decoded = Buffer.from(_token, 'base64').toString('utf-8');
            if (!decoded.includes('_cuatropuntas_human')) {
                return { isBot: true, reason: 'Token de cliente no válido' };
            }
        } catch (e) {
            return { isBot: true, reason: 'Token malformado' };
        }
    }

    // 4. Validación estricta de Nombre
    if (leadName) {
        const nameReason = validateName(leadName);
        if (nameReason) {
            return { isBot: true, reason: `Nombre inválido (Bot): ${nameReason}` };
        }
    }

    // 5. Validación de Correo / Filtro Spam Dot-Trick
    if (email) {
        const emailReason = validateEmail(email);
        if (emailReason) {
            return { isBot: true, reason: `Email sospechoso (Bot): ${emailReason}` };
        }
    }

    // 6. Validación de Teléfono
    if (leadPhone) {
        const phoneReason = validatePhone(leadPhone);
        if (phoneReason) {
            return { isBot: true, reason: `Teléfono inválido (Bot): ${phoneReason}` };
        }
    }

    return { isBot: false };
}

function validateName(name) {
    if (typeof name !== 'string') return 'No es un texto';
    const trimmed = name.trim();

    if (trimmed.length < 2) return 'Demasiado corto';
    if (trimmed.length > 80) return 'Demasiado largo';

    // Rechazar números, etiquetas HTML, código o símbolos extraños (< > { } [ ] \ / $ = @ _ # % ^ * + ~ ` |)
    if (/[0-9<>{}\[\]\\\/$=@_#%^*+~`|]/.test(trimmed)) {
        return 'Contiene caracteres numéricos o símbolos no permitidos';
    }

    // Detectar patrones de bot como "hRhGxXJsvldndIIKW" (mayúsculas intercaladas en medio de palabras)
    // Permite prefijos legítimos como Mc, Mac, O'
    if (/[a-záéíóúñ][A-ZÁÉÍÓÚÑ]/.test(trimmed) && !/^(Mc|Mac|O')[A-Z]/.test(trimmed)) {
        return 'Mayúsculas intercaladas dentro de la palabra';
    }

    const words = trimmed.split(/\s+/);
    for (const word of words) {
        // Una sola palabra sin espacios > 14 caracteres (ej: hRhGxXJsvldndIIKW mide 17)
        if (word.length > 14) {
            return 'Palabra sin espacios demasiado larga (>14 caracteres)';
        }

        // Cadena de 5 o más consonantes consecutivas (ej: xJsvldnd tiene 8)
        if (/[bcdfghjklmnñpqrstvwxyz]{5,}/i.test(word)) {
            return 'Secuencia de consonantes innatural (5+ consonantes seguidas)';
        }

        // Ratio de vocales extremadamente bajo para palabras de 6+ letras
        if (word.length >= 6) {
            const vowelCount = (word.match(/[aeiouáéíóúü]/gi) || []).length;
            if (vowelsRatio(word, vowelCount) < 0.18) {
                return 'Proporción de vocales anormalmente baja (secuencia aleatoria)';
            }
        }
    }

    return null;
}

function vowelsRatio(word, count) {
    return count / word.length;
}

function validateEmail(email) {
    if (typeof email !== 'string') return 'No es un texto';
    const trimmed = email.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed) || trimmed.length > 100) {
        return 'Formato de email inválido';
    }

    const [localPart, domain] = trimmed.split('@');

    // Abuso de Gmail "dot trick" (ej: oni.f.e.s.uju8.0@gmail.com)
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        const dotCount = (localPart.match(/\./g) || []).length;
        if (dotCount > 3) {
            return 'Exceso de puntos en el nombre de usuario de Gmail';
        }
    }

    if (/\.\./.test(localPart)) {
        return 'Puntos consecutivos en el email';
    }

    return null;
}

function validatePhone(phone) {
    if (typeof phone !== 'string' && typeof phone !== 'number') return 'No es un texto/número';
    const cleanPhone = String(phone).replace(/\D/g, '');

    if (cleanPhone.length < 8 || cleanPhone.length > 12) {
        return 'Longitud de teléfono fuera de rango (debe tener entre 8 y 12 dígitos)';
    }

    let localNum = cleanPhone;
    if (cleanPhone.startsWith('56') && cleanPhone.length >= 11) {
        localNum = cleanPhone.slice(2);
    }

    // Teléfonos repetitivos tipo 111111111, 123456789
    if (/^(\d)\1{7,}$/.test(localNum) || localNum === '123456789' || localNum === '987654321') {
        return 'Número de teléfono falso repetitivo';
    }

    if (localNum.length === 9) {
        const firstDigit = localNum.charAt(0);
        if (!['2', '3', '4', '5', '6', '7', '8', '9'].includes(firstDigit)) {
            return 'Dígito inicial inválido para teléfono en Chile';
        }
    }

    return null;
}

module.exports = { isBotSubmission, validateName, validateEmail, validatePhone };
