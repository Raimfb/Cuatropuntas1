const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- INSTRUCCIONES ---
// 1. Pega tu clave abajo donde dice "PEGAR_AQUI..."
// 2. Guarda el archivo.
// 3. Ejecuta en la terminal: node test_key.js

const API_KEY = "AIzaSyC7swBOIidTJ3eWtxoO-m1guSqRcMhFMlE";

async function test() {
    console.log("----------------------------------------");
    console.log("🔍 Probando API Key: " + API_KEY.substring(0, 10) + "...");

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log("📡 Conectando con Google...");
        const result = await model.generateContent("Hola, esto es una prueba.");
        const response = await result.response;
        const text = response.text();

        console.log("✅ ¡ÉXITO! La clave funciona.");
        console.log("Respuesta recibida: " + text);
        console.log("----------------------------------------");

    } catch (error) {
        console.log("❌ ERROR FATAL:");
        console.error(error.message);
        if (error.message.includes("API key not valid")) {
            console.log("\n⚠️ CONCLUSIÓN: La clave está mal escrita o cancelada.");
        }
    }
}

test();
