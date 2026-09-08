// --- SERVIDOR ACTUALIZADO (VERSIÓN VERCEL) ---
// Si ves esto, tienes la versión correcta.

const path = require('path');
const dotenv = require('dotenv');

// Cargar .env
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const express = require('express');
const chatHandler = require('./api/chat');

const app = express();
const PORT = 3000;

app.use(express.json());

// --- ESTA ES LA LÍNEA CLAVE PARA VERCEL ---
// Sirve los archivos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

const contactHandler = require('./api/contact');

app.post('/api/chat', async (req, res) => {
    try {
        await chatHandler(req, res);
    } catch (error) {
        console.error("Error en el local:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        await contactHandler(req, res);
    } catch (error) {
        console.error("Error en local (contact):", error);
        res.status(500).json({ error: error.message });
    }
});

const quoteHandler = require('./api/quote');

app.post('/api/quote', async (req, res) => {
    try {
        await quoteHandler(req, res);
    } catch (error) {
        console.error("Error en local (quote):", error);
        res.status(500).json({ error: error.message });
    }
});

const blogPublishHandler = require('./api/blog-publish');

app.post('/api/blog-publish', async (req, res) => {
    try {
        await blogPublishHandler(req, res);
    } catch (error) {
        console.error("Error en local (blog-publish):", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor Vercel-Ready corriendo en http://localhost:3000`);
});

