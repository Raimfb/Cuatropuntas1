# Especificación de Requerimientos: Spec 030 - Agente Guardián SEO / GEO Diario (Autonomous Monitor)
**Feature ID:** `030_guardian_seo_geo_diario`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Diagnóstico

### 1.1. Contexto y Necesidad Operativa
Con el embudo comercial de 4 tipologías, el blindaje de URLs canónicas sin `.html` y la matriz de precios SSOT operando en producción (`https://www.cuatropuntas.com`), cualquier regresión silenciosa en infraestructura (como bloqueos `403` de WAF/CDN a bots de IA, caída de `llms.txt` o `sitemap.xml`, corrupción sintáctica de bloques `JSON-LD` o desincronización de precios en `Offer`/`AggregateOffer`) impacta directamente la visibilidad orgánica en Google y la citación en motores generativos (ChatGPT Search, Perplexity, Gemini, Claude y Meta AI).

### 1.2. Objetivo
Implementar un **Agente Guardián SEO / GEO Diario** autónomo (`scripts/seo-geo-guardian.js`), orquestado mediante GitHub Actions (`.github/workflows/seo-geo-guardian.yml`), que audite en vivo las 3 capas de salud técnica, semántica y generativa de `https://www.cuatropuntas.com`, clasifique hallazgos bajo umbrales estrictos (`CRÍTICO`, `ADVERTENCIA`, `OK`) y despache alertas ejecutivas sin falsos positivos únicamente ante fallos críticos reales.

---

## 2. Arquitectura de las 3 Capas de Auditoría y Umbrales de Severidad

### 2.1. Clasificación de Severidades
- **`CRÍTICO` (Bloqueante / Alerta Inmediata):**
  * Cualquier crawler oficial (`Googlebot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Meta-ExternalAgent`) recibe código HTTP distinto de `200 OK` (ej. `403`, `404`, `500`) en `/` o `/servicios/casas-nuevas`.
  * Caída o respuesta vacía en `/robots.txt`, `/llms.txt`, `/llms-full.txt` o `/sitemap.xml`.
  * Presencia de URLs sucias con extensión `.html` en `/sitemap.xml` o `/llms-full.txt` (riesgo de bucles `308`).
  * Bloqueo (`Disallow: /`) en `robots.txt` para `OAI-SearchBot`, `ChatGPT-User` o `PerplexityBot`.
  * Error de sintaxis JSON en cualquier bloque `<script type="application/ld+json">` de las páginas principales.
  * Discrepancia entre los precios declarados en `Offer` / `AggregateOffer` y la Matriz Oficial SSOT (`19 UF` Casa Nueva, `22 UF` Ampliación, `11` a `13 UF` Remodelación, `12 UF` Quincho).
- **`ADVERTENCIA` (No bloqueante / Informativo en Summary):**
  * Latencia elevada en respuestas HTTP (> 4.000 ms).
  * Clave `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` ausente o límite de cuota temporal durante el probing AEO/GEO de Capa 3.
  * Oportunidades de mejora semántica detectadas durante el probing consultivo de Gemini.
- **`OK` (Saludable):**
  * Verificación superada cumpliendo el 100% de las reglas técnicas y de negocio SSOT.

---

## 3. Requerimientos Funcionales en Notación EARS

### 3.1. Capa 1: Accesibilidad de Crawlers IA y Salud Técnica

- **[EARS-030-01] Simulación de Crawlers Clásicos y Generativos:**  
  * **Cuando** se ejecute el Agente Guardián, el sistema **DEBE** realizar peticiones `GET` reales hacia `https://www.cuatropuntas.com/` y `https://www.cuatropuntas.com/servicios/casas-nuevas` simulando los `User-Agent` de `Googlebot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Google-Extended` y `Meta-ExternalAgent`.
  * **Si** alguna petición retorna un código de estado distinto de `200`, el sistema **DEBE** registrar un hallazgo `CRÍTICO`.

- **[EARS-030-02] Auditoría de Artefactos de Indexación (`/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`):**  
  * **Cuando** el Agente descargue `/robots.txt`, `/llms.txt`, `/llms-full.txt` y `/sitemap.xml`, el sistema **DEBE** verificar que respondan `HTTP 200 OK` y posean contenido no vacío.
  * **Si** `/sitemap.xml` o `/llms-full.txt` contienen cualquier URL de `cuatropuntas.com` terminada en `.html`, el sistema **DEBE** registrar un hallazgo `CRÍTICO` (prevención de redirecciones `308`).
  * **Si** `/robots.txt` no permite explícitamente o bloquea a `OAI-SearchBot`, `ChatGPT-User` o `PerplexityBot`, el sistema **DEBE** registrar un hallazgo `CRÍTICO`.

### 3.2. Capa 2: Integridad de Datos Estructurados (`JSON-LD`) y Coherencia SSOT

- **[EARS-030-03] Extracción y Validación Sintáctica de `JSON-LD`:**  
  * **Cuando** se auditen las rutas `/`, `/precios`, `/servicios/casas-nuevas`, `/servicios/segundos-pisos`, `/servicios/remodelaciones` y `/servicios/quinchos`, el sistema **DEBE** extraer todos los bloques `<script type="application/ld+json">` y parsearlos con `JSON.parse`.
  * **Si** una página carece de `JSON-LD` o contiene JSON malformado, el sistema **DEBE** registrar un hallazgo `CRÍTICO`.

- **[EARS-030-04] Verificación de Precios contra Matriz Oficial SSOT:**  
  * **Cuando** se analicen las entidades `Service` / `Product` y sus nodos `Offer` / `AggregateOffer` en cada ruta, el sistema **DEBE** validar:
    - `/` y `/precios`: `lowPrice: "11"` y `highPrice: "27"` (`UF/m²`).
    - `/servicios/casas-nuevas`: `lowPrice: "19"` y `highPrice: "25"` (`UF/m²`).
    - `/servicios/segundos-pisos`: `lowPrice: "22"` y `highPrice: "27"` (`UF/m²`).
    - `/servicios/remodelaciones`: `lowPrice: "11"` y `highPrice: "13"` (`UF/m²`).
    - `/servicios/quinchos`: `lowPrice: "12"` y `highPrice: "15"` (`UF/m²`).
  * **Si** algún precio difiere de la matriz SSOT, el sistema **DEBE** registrar un hallazgo `CRÍTICO`.

### 3.3. Capa 3: Probing AEO/GEO con Gemini API y Alertas sin Falsos Positivos

- **[EARS-030-05] Probing Consultivo AEO/GEO con Gemini API:**  
  * **Si** está definida la variable `GEMINI_API_KEY` o `GOOGLE_GENERATIVE_AI_API_KEY`, el sistema **DEBE** ejecutar 2 consultas de comprador real en la Región Metropolitana (1. Ampliación de segundo piso en Santiago y 2. Construcción de quincho llave en mano en la RM) evaluando la claridad de citación y oportunidades de contenido para Constructora Cuatropuntas SpA.
  * **Si** la API Key no está configurada o la API externa experimenta un error transitorio de red/cuota, el sistema **DEBE** registrarlo como `ADVERTENCIA` informativa sin provocar un fallo `CRÍTICO` falso positivo.

- **[EARS-030-06] Despacho de Alertas Ejecutivas y Modo `--dry-run`:**  
  * **Cuando** se detecte al menos 1 fallo `CRÍTICO` y el script **NO** se ejecute con `--dry-run`, el sistema **DEBE** enviar un correo electrónico de alerta estructurado a `contacto@cuatropuntas.com` mediante la configuración SMTP existente (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` o `ZOHO_USER`/`ZOHO_PASS`) y, si `WHATSAPP_TOKEN` está disponible, notificar al número comercial oficial `56979092027` desde el Phone Number ID operativo `1243578125508024` usando prioridad `type: "template"` con una plantilla aprobada (`WHATSAPP_ALERT_TEMPLATE` / `alerta_guardian_cuatropuntas` en WABA `910870268041946`) para garantizar entrega 24/7 fuera de la ventana de 24 horas de Meta, con fallback a `type: "text"` únicamente si el envío con plantilla falla.
  * **Cuando** se ejecute con `--dry-run` o haya `0` errores críticos, el sistema **NO DEBE** despachar correos ni mensajes externos.

### 3.4. Automatización en GitHub Actions

- **[EARS-030-07] Ejecución Programada y Resumen en GitHub Actions:**  
  * El workflow `.github/workflows/seo-geo-guardian.yml` **DEBE** ejecutarse diariamente a las `11:00 UTC` (`08:00 AM` Chile) vía `cron: '0 11 * * *'` y soportar ejecución manual (`workflow_dispatch`).
  * El script **DEBE** escribir un reporte Markdown completo en `$GITHUB_STEP_SUMMARY` cuando dicha variable de entorno esté presente y salir con código `1` únicamente si el conteo de hallazgos `CRÍTICO` es mayor a `0`.
