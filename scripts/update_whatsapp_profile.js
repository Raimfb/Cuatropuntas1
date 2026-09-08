const fs = require('fs');
const path = require('path');

// Script para consultar y actualizar el perfil oficial del Bot de WhatsApp en Meta Cloud API
async function updateProfile() {
    const token = process.env.WHATSAPP_TOKEN || "EAAUzVSuHpoUBSEBulsLUwIarFJ2cbVYOK55khaTUUdZAR8MClTADrZCuqbtvR4jrqU5eXoIPAfVQuBngNpbFPcEpwUVXOowN739ALW3swwLciCH7yWwsrQcOc9S7cgL1rJ73x74n5GmebXguoD8PVWhV1mBPala99XSTUu5vj6c4tknalggt4gtpCSwQZDZD";
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1243578125508024";

    if (!token) {
        console.error("❌ ERROR: WHATSAPP_TOKEN no está definido.");
        process.exit(1);
    }

    console.log(`🔍 Consultando perfil actual de WhatsApp (Phone ID: ${phoneId})...`);

    // 1. Obtener perfil actual
    const getUrl = `https://graph.facebook.com/v20.0/${phoneId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`;
    
    try {
        const getResp = await fetch(getUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getData = await getResp.json();
        console.log("📋 Perfil actual en Meta:", JSON.stringify(getData, null, 2));

        // 2. Actualizar información corporativa (Descripción, Web, Email, Categoría)
        console.log("\n🚀 Actualizando datos corporativos de Cuatropuntas en Meta...");
        const postUrl = `https://graph.facebook.com/v20.0/${phoneId}/whatsapp_business_profile`;
        
        const updatePayload = {
            messaging_product: "whatsapp",
            about: "Constructora Cuatropuntas SpA | Casas, Ampliaciones y Subsidios en RM",
            description: "Empresa constructora líder en la Región Metropolitana de Santiago. Especialistas en Casas Nuevas Llave en Mano, Segundos Pisos, Quinchos, Remodelaciones y Proyectos con Subsidio MINVU en Sitio Propio.",
            email: "contacto@cuatropuntas.com",
            websites: [
                "https://www.cuatropuntas.com",
                "https://www.cuatropuntas.com/precios"
            ],
            vertical: "PROF_SERVICES" // Categoría oficial en Meta
        };

        const postResp = await fetch(postUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
        });

        const postData = await postResp.json();
        if (postResp.ok) {
            console.log("✅ Datos corporativos de WhatsApp Business actualizados con éxito:", postData);
        } else {
            console.error("⚠️ Error actualizando datos de perfil:", postData);
        }

    } catch (err) {
        console.error("❌ Error conectando con Meta Graph API:", err.message);
    }
}

updateProfile();
