// 1. CARGAR CONFIGURACIÓN ANTES DE NADA
const path = require('path');
const dotenv = require('dotenv');

// Intentar cargar .env explícitamente desde la carpeta del script
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("⚠️ Error cargando librería dotenv:", result.error);
}

console.log("---------------------------------------------------");
console.log("DEBUG INICIO SERVIDOR");
console.log("Ruta del .env:", envPath);
if (process.env.GEMINI_API_KEY) {
    console.log(`✅ CLAVE CARGADA CORRECTAMENTE: ${process.env.GEMINI_API_KEY.substring(0, 5)}...`);
} else {
    console.log("❌ ERROR CRÍTICO: La variable GEMINI_API_KEY está vacía después de cargar el .env");
}
console.log("---------------------------------------------------");

// 2. Cargar el resto de módulos
const express = require('express');
const chatHandler = require('./api/chat');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

app.post('/api/chat', async (req, res) => {
    // Debug en tiempo de ejecución
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ ERROR EN PETICIÓN: process.env.GEMINI_API_KEY perdió el valor.");
    }

    try {
        await chatHandler(req, res);
    } catch (error) {
        console.error("Error en el handler local:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`
    ✅ Servidor corriendo en http://localhost:3000
    
    >> Ve al navegador y prueba el chat.
    `);
});
