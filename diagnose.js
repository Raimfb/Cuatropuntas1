const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log("🔍 --- DIAGNÓSTICO DE ARCHIVOS ---");
console.log("Carpeta actual:", process.cwd());

// 1. Listar archivos
const files = fs.readdirSync(process.cwd());
console.log("Archivos encontrados:", files);

// 2. Buscar variantes de .env
const envFile = files.find(f => f.startsWith('.env'));
if (!envFile) {
    console.log("❌ ERROR CRÍTICO: No existe ningún archivo que empiece por .env");
} else {
    console.log(`✅ Archivo encontrado: "${envFile}"`);

    if (envFile !== '.env') {
        console.log(`⚠️ CUIDADO: El archivo se llama "${envFile}", pero debería llamarse EXACTAMENTE ".env" (sin extensiones extra).`);
    }

    // 3. Leer contenido
    const content = fs.readFileSync(path.join(process.cwd(), envFile), 'utf-8');
    const parsed = dotenv.parse(content);

    if (parsed.GEMINI_API_KEY) {
        console.log("✅ Clave detectada dentro del archivo.");
        console.log(`🔑 Primeros 5 caracteres: ${parsed.GEMINI_API_KEY.substring(0, 5)}...`);
    } else {
        console.log("❌ EL ARCHIVO EXISTE PERO NO TIENE LA VARIABLE 'GEMINI_API_KEY'.");
        console.log("Contenido del archivo (oculto):", content.length > 0 ? "[Tiene texto]" : "[VACÍO]");
    }
}
console.log("---------------------------------------");
