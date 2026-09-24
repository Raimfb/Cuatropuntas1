# Especificación de Requerimientos: Spec 021 - Automatización y Blindaje de Parámetros Operativos en Cal.com
**Feature ID:** `021_calcom_booking_limits_automation`  
**Metodología:** Spec-Driven Development (SDD) / EARS  
**Estado:** IMPLEMENTED  

---

## 1. Resumen Ejecutivo y Diagnóstico Operativo

Constructora Cuatropuntas SpA gestiona las citas en terreno de sus prospectos a través de la integración oficial de Cal.com (`https://cal.com/cuatropuntas.com/visita-tecnica`), vinculada directamente al embudo del cotizador web (`api/quote.js`), a los correos de diagnóstico con Ficha Técnica PDF (Spec 020) y a los canales conversacionales (Spec 015).

### Diagnóstico del Problema Operativo:
Actualmente, el tipo de evento `visita-tecnica` (ID `6800545`) presenta una configuración permisiva en la plataforma Cal.com:
1. **Anticipación Mínima Insuficiente:** `minimumBookingNotice: 120` (solo 2 horas). Esto permite que prospectos agenden visitas para el mismo día de su cotización. En una constructora habitacional que opera en toda la Región Metropolitana, esto genera un riesgo crítico: visitas imprevistas que no cuentan con la debida preparación de antecedentes técnicos (cálculo de cotas, revisión de plano regulador comunal, verificación de empalmes y asignación de director de obra).
2. **Buffer de Traslado sin Blindaje Contractual:** Los traslados entre comunas periféricas y residenciales de Santiago (ej. Chicureo, Peñalolén, Lo Barnechea, Las Condes) exigen un tiempo de colchón obligatorio post-visita (`afterEventBuffer`) de al menos 45 minutos para evitar solapamientos por congestión vehicular.
3. **Ventana de Reserva Indefinida:** Actualmente la ventana futura de reservas está deshabilitada (`bookingWindow: { disabled: true }`), lo que permite agendamientos con meses de anticipación, congelando cupos en agendas cuya factibilidad de cuadrillas y precios unitarios por UF pueden fluctuar en el tiempo.

### Objetivo de la Spec 021:
Gobernar, blindar y auditar programáticamente los parámetros operativos del evento `visita-tecnica` en Cal.com mediante un script de administración técnica (`scripts/configure-calcom-event.js`), con soporte para simulaciones (`--dry-run`), manejo seguro de credenciales conforme al arnés de seguridad del proyecto, y una suite de pruebas automatizada (`tests/calcom-config.spec.js`) que certifique la invariabilidad de las políticas operativas.

---

## 2. Requerimientos Funcionales en Notación EARS

### 2.1. Políticas de Blindaje de Agenda en Cal.com

- **[EARS-021-01] Anticipación Mínima de 24 Horas (Anti Same-Day):**  
  **Cuando** un usuario o prospecto acceda a la agenda pública `visita-tecnica` en Cal.com,  
  el sistema de agendamiento **DEBE** restringir los horarios disponibles a un mínimo de 1440 minutos (`minimumBookingNotice: 1440`) respecto al momento exacto de la consulta,  
  impidiendo de forma absoluta cualquier reserva para el mismo día calendario.

- **[EARS-021-02] Colchón de Traslado Simétrico (Buffers Previos y Posteriores):**  
  **Cuando** se confirme una visita a terreno,  
  el sistema de agendamiento **DEBE** bloquear automáticamente una ventana de amortiguación simétrica de 45 minutos previa (`beforeEventBuffer: 45`) y 45 minutos posterior (`afterEventBuffer: 45`) al evento,  
  protegiendo la logística de traslado vehicular de los directores de obra tanto de ida como de vuelta en la Región Metropolitana.

- **[EARS-021-03] Ventana Futura Rodante Acotada a 14 Días Calendario:**  
  **Cuando** se listen los días habilitados para agendar en el calendario,  
  el sistema **DEBE** limitar el horizonte visible a una ventana rodante de 14 días calendario (`bookingWindow: { type: "calendarDays", value: 14, rolling: true }`),  
  garantizando que la prospección comercial y los presupuestos calculados en UF se mantengan vigentes y en sincronía con la capacidad operativa mensual.

---

### 2.2. Script de Administración y Sincronización (`scripts/configure-calcom-event.js`)

- **[EARS-021-04] Detección Segura de Credenciales y Cero Fallos en CI/CD:**  
  **Al ejecutarse** el script `scripts/configure-calcom-event.js`,  
  el script **DEBE** cargar de forma segura las variables de entorno desde `.env.local` o `.env` utilizando `dotenv`.  
  **Si** la variable `CAL_API_KEY` no se encuentra definida en el entorno,  
  el script **DEBE** emitir un mensaje de advertencia limpio por `stdout`/`stderr` y finalizar con código de salida 0 (`process.exit(0)`), evitando romper pipelines de CI/CD o despliegues automatizados en entornos donde no se requiera sincronizar Cal.com.

- **[EARS-021-05] Resolución Automática del Event Type por Slug:**  
  **Cuando** se ejecute la sincronización con una clave API válida,  
  el script **DEBE** consultar la API v2 de Cal.com (`GET https://api.cal.com/v2/event-types?username=cuatropuntas.com` con cabecera `cal-api-version: 2024-06-14`),  
  localizar de forma determinista el evento cuyo `slug` sea exactamente `visita-tecnica`, y extraer su `id` numérico.  
  **Si** el evento no es encontrado, el script **DEBE** notificar el error con salida controlada.

- **[EARS-021-06] Modo de Simulación (--dry-run):**  
  **Cuando** el script sea invocado con la bandera `--dry-run`,  
  el script **DEBE** inspeccionar y comparar la configuración actual del evento remoto contra los parámetros objetivo (1440 min de aviso, 45 min buffer antes/después, 14 días ventana rodante),  
  imprimir el reporte del diff en consola de forma legible,  
  y finalizar **SIN** emitir ninguna petición mutacional (`PATCH`) a la API de Cal.com.

- **[EARS-021-07] Ejecución Idempotente y Actualización en la API:**  
  **En ausencia de la bandera `--dry-run`**,  
  el script **DEBE** enviar una petición `PATCH` a `https://api.cal.com/v2/event-types/{eventTypeId}` con el payload estandarizado:
  ```json
  {
    "minimumBookingNotice": 1440,
    "beforeEventBuffer": 45,
    "afterEventBuffer": 45,
    "bookingWindow": {
      "type": "calendarDays",
      "value": 14,
      "rolling": true
    }
  }
  ```
  y verificar que la respuesta HTTP retorne código 200 con `status: "success"`.  
  Si los parámetros remotos ya coinciden al 100% con los objetivos, el script **DEBE** reportar que el evento ya se encuentra sincronizado (idempotencia).

---

### 2.3. Blindaje de Seguridad y Suite de Pruebas

- **[EARS-021-08] Protección Estricta de Secretos en Control de Versiones:**  
  El sistema **DEBE** asegurar que ningún archivo que contenga la clave API (`.env`, `.env.local`, tokens) sea añadido al árbol de Git.  
  Queda prohibido imprimir la clave en texto plano en terminal o logs.

- **[EARS-021-09] Suite Automatizada TDD (`tests/calcom-config.spec.js`):**  
  El arnés de pruebas **DEBE** verificar:
  1. La existencia física y exportación modular de las funciones del script (`loadConfig`, `buildEventPayload`, `syncCalcomEvent`).
  2. La construcción rigurosa del payload conforme a la especificación de Cal.com v2.
  3. El comportamiento tolerante a fallos cuando no existe `CAL_API_KEY`.
  4. La preservación del modo `--dry-run` sin llamadas mutacionales de red.
  5. El manejo determinista de códigos de respuesta HTTP y reintentos ante anomalías de red.

- **[EARS-021-10] Cero Regresiones en la Suite Existente:**  
  La ejecución de `npx playwright test` **DEBE** mantener el 100% de los 122 tests existentes en estado verde.
