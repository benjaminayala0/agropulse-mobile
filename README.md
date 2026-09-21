# AgroPulse — Precisión Agrícola & Riego Asíncrono 🌾

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo%20SDK-54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Expo Router](https://img.shields.io/badge/Expo%20Router-v5-black?logo=expo&logoColor=white)](https://docs.expo.dev/router/introduction/)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Redpanda](https://img.shields.io/badge/Redpanda-Kafka%20Streaming-FF3A00?logo=apachekafka&logoColor=white)](https://redpanda.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**AgroPulse** es una aplicación móvil de agricultura de precisión desarrollada con **React Native (Expo + TypeScript + Expo Router)** conectada a **Supabase (PostgreSQL + RLS + Realtime)** y un bus de streaming de eventos con **Redpanda (Kafka compatible)**. 

Ambientada en un establecimiento ficticio de **Concordia, Entre Ríos ("Estancia Didáctica Concordia")**, permite al productor monitorear la humedad de sus lotes en un mapa satelital con semáforo y ordenar riego con acuse de comando asíncrono e idempotencia estricta.

---

## 🏛️ Arquitectura del Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       DISPOSITIVO MÓVIL (REACT NATIVE)                  │
│                                                                         │
│   Expo App (Tabs: Mapa | Lotes | Alertas | Cuenta/Diagnóstico)          │
│   • Renderizado de Polígonos GeoJSON + Semáforo de estado               │
│   • GPS "Estoy en el lote" (expo-location)                              │
│   • Emisión de órdenes de riego (idempotencia con client_request_id)    │
│   • Subscripción WebSockets a lecturas y válvulas (Supabase Realtime)   │
└──────────────────┬─────────────────────────────▲────────────────────────┘
                   │ HTTPS / JWT (RLS)           │ Realtime (WebSockets)
                   ▼                             │
┌────────────────────────────────────────────────┴────────────────────────┐
│                        BACKEND AS A SERVICE (SUPABASE)                  │
│                                                                         │
│   Postgres Database + Row Level Security (RLS)                          │
│   • Perímetro de seguridad por organización y rol (producer/operator/   │
│     advisor)                                                            │
│   • Publicación Realtime: readings, valves, irrigation_commands, alerts │
│   • Vista v_plots_status (cálculo de semáforo: optimal, dry, wet, stale)│
└──────────────────▲─────────────────────────────┬────────────────────────┘
                   │ INSERT readings             │ SELECT pending
                   │ UPDATE valves / commands    │ commands
┌──────────────────┴─────────────────────────────▼────────────────────────┐
│                       PROCESOS BACKEND / STREAMING                      │
│                                                                         │
│   Worker Node.js (Consumer / Engine de Válvulas)                        │
│   • Consumer del topic 'soil.moisture' -> Inserta en Postgres (service) │
│   • Engine de irrigación: procesa comandos pending -> applied en 2-4s   │
│                               ▲                                         │
│                               │ Kafka Protocol                          │
│   Redpanda Broker (Streaming) ┼─────────────────────────────────────────┤
│   • Topic 'soil.moisture'     │ Console Web (Puerto 8080)               │
│                               ▲                                         │
│                               │ Produce ticks (cada 5s)                 │
│   Simulador IoT (Suelo y Clima)                                         │
│   • Emite telemetría continua para Costa 1 y Costa 2                    │
│   • Monte A inactivo para demostrar estado 'stale' (>15 min sin señal)  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Justificación de Arquitectura: ¿Por qué el móvil no se conecta directamente a Kafka?
La aplicación móvil **nunca se conecta directamente al broker Kafka/Redpanda**:
1. **Red móvil inestable en campo (3G/4G rural)**: Los protocolos nativos de Kafka asumen conexiones estables TCP de baja latencia con keep-alive continuo, consumiendo batería y datos de forma prohibitiva en dispositivos móviles.
2. **Seguridad y Control de Acceso (RLS)**: Kafka no posee integración nativa para filtrar granularmente filas por usuario final de la app. Supabase Auth + Postgres RLS garantizan que cada productor u operador solo vea los datos de sus propios lotes.
3. **Backpressure y Gestión de Memoria**: Un broker de telemetría masiva puede emitir cientos de miles de mensajes por segundo. Filtrar y persistir en el servidor evita sobrecargar la CPU del smartphone.
4. **Frontera de responsabilidades**: La app móvil solo requiere el estado actual y eventos procesados mediante WebSockets ligeros (Supabase Realtime).

---

## 📱 Pantallas y Flujos de Usuario

1. **Autenticación & Selección de Organización (`/login`)**:
   * Login con Supabase Auth. Botones de acceso rápido para demostración de roles:
     * 🌾 **Productor** (`productor@agropulse.test`): Control total, edición de umbrales y emisión de comandos.
     * 🚜 **Operador** (`operador@agropulse.test`): Emisión y cancelación de comandos de válvulas.
     * 📋 **Asesor** (`asesor@agropulse.test`): Solo lectura; comandos deshabilitados o denegados con 403.
2. **Mapa de Lotes & Semáforo (`/(tabs)/map`)**:
   * Polígonos de lotes con código de color dinámico:
     * 🟢 **Verde (Óptimo)**: Humedad entre umbral mínimo y máximo (Costa 1).
     * 🔴 **Rojo (Seco)**: Humedad < umbral mínimo de 25% (Costa 2).
     * 🔵 **Azul (Húmedo)**: Humedad > umbral máximo (45%).
     * ⚪ **Gris (Stale)**: Sin lectura reciente (> 15 min sin señal) (Monte A).
   * **FAB GPS "Estoy en el lote"**: Detección de presencia física dentro del polígono.
3. **Lista de Lotes (`/(tabs)/plots`)**:
   * Resumen agronómico por parcela con métricas en vivo (humedad, temperatura, estado de válvula).
4. **Detalle de Lote & Gráfico de Humedad**:
   * Historial de las últimas 6 horas (mínimo 12 puntos) con actualización automática por Realtime.
   * Válvulas del lote y botón **"Regar N minutos"** con estados `pending -> applied` en $\le 5$ s.
   * Idempotencia estricta vía `client_request_id`.
5. **Diagnóstico & Telemetría (`/(tabs)/account`)**:
   * UID del usuario autenticado, rol activo en RLS, lag aparente de red y último tick recibido.

---

## 🚀 Puesta en Marcha

### 1. Levantar Infraestructura Local (Redpanda + Worker + Simulador)

En una terminal, ingresar a la carpeta `infra/`:

```bash
cd infra
docker compose up -d
```

* **Redpanda Kafka Broker**: Puerto `9092`
* **Redpanda Web Console**: Abrir `http://localhost:8080` en el navegador para inspeccionar los topics (`soil.moisture`, `irrigation.commands`, etc.) y los mensajes generados en tiempo real.

### 2. Configurar Base de Datos en Supabase

1. Abrir el **SQL Editor** de tu proyecto Supabase.
2. Ejecutar el script `supabase/migrations/20260920000000_init_agropulse_schema.sql` (crea tablas, vistas, Realtime y RLS).
3. Ejecutar el script `supabase/seed.sql` (crea la Estancia Concordia, los lotes, estaciones, válvulas y lecturas históricas).

### 3. Iniciar la App Móvil

Copiar variables de entorno:
```bash
cp .env.example .env
```
*(Completar con la URL y anon key de tu proyecto Supabase).*

Instalar dependencias e iniciar:
```bash
npm install
npx expo start
```
Escanear el código QR con **Expo Go** en tu celular Android o iOS.
