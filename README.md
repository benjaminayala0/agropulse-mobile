# AgroPulse — Precision Agriculture & Telemetry Platform 🌾

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo%20SDK-54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Expo Router](https://img.shields.io/badge/Expo%20Router-v5-black?logo=expo&logoColor=white)](https://docs.expo.dev/router/introduction/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20RLS%20%7C%20Realtime-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Redpanda](https://img.shields.io/badge/Redpanda-Kafka%20Streaming-FF3A00?logo=apachekafka&logoColor=white)](https://redpanda.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**AgroPulse** es una plataforma móvil empresarial de monitoreo agronómico y control de riego asíncrono en tiempo real, diseñada para establecimientos agropecuarios de precisión. 

Construida con una arquitectura reactiva distribuida, combina un cliente móvil moderno (**React Native + Expo Router + TypeScript**), un backend asíncrono multi-inquilino sobre **Supabase (PostgreSQL, Row Level Security y WebSockets Realtime)** y un motor de streaming de eventos de telemetría IoT basado en **Redpanda (Apache Kafka compatible)**.

---

## 🏛️ Arquitectura del Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       CLIENTE MÓVIL (REACT NATIVE)                     │
│                                                                         │
│   Expo Application (Tabs: Mapa | Lotes | Alertas | Cuenta/Diagnóstico)  │
│   • Renderizado de Polígonos GeoJSON + Semáforo Agronómico              │
│   • Detección de presencia física en parcela (expo-location / GPS)      │
│   • Emisión de órdenes de riego (idempotencia vía client_request_id)    │
│   • Subscripción WebSockets a telemetría en vivo (Supabase Realtime)    │
└──────────────────┬─────────────────────────────▲────────────────────────┘
                   │ HTTPS / Bearer JWT (RLS)    │ WebSockets (Realtime)
                   ▼                             │
┌────────────────────────────────────────────────┴────────────────────────┐
│                        DATA & AUTH LAYER (SUPABASE)                     │
│                                                                         │
│   PostgreSQL Engine + Row Level Security (RLS)                          │
│   • Aislamiento Multi-Tenant por Organización                           │
│   • Control de Acceso Basado en Roles (Producer / Operator / Advisor)   │
│   • Canales Realtime: readings, valves, irrigation_commands, alerts     │
│   • Vista v_plots_status (cálculo dinámico de semáforo agronómico)      │
└──────────────────▲─────────────────────────────┬────────────────────────┘
                   │ INSERT readings             │ SELECT pending
                   │ UPDATE valves / commands    │ commands
┌──────────────────┴─────────────────────────────▼────────────────────────┐
│                       INGESTIÓN Y STREAMING (INFRA)                     │
│                                                                         │
│   Worker Node.js (Stream Consumer & Valve Automation Engine)            │
│   • Consumidor del topic 'soil.moisture' -> Persistencia en Postgres    │
│   • Engine de riego: transición asíncrona pending -> applied (2 a 4s)   │
│                               ▲                                         │
│                               │ Protocolo Kafka                         │
│   Redpanda Cluster            ┼─────────────────────────────────────────┤
│   • Broker Topic 'soil.moisture' │ Redpanda Console (Web UI :8080)      │
│                               ▲                                         │
│                               │ Producción de telemetría (cada 5s)      │
│   Simulador IoT (Suelo y Microclima)                                    │
│   • Telemetría periódica multivariable (humedad, temperatura, batería)  │
│   • Simulación de desconexión de nodo para estado 'stale' (>15 min)     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 🛡️ Decisión de Diseño: Aislamiento del Cliente respecto al Broker de Streaming

El dispositivo móvil **nunca se conecta directamente al broker de Kafka / Redpanda**. Esta decisión de ingeniería responde a cuatro fundamentos críticos:

1. **Eficiencia en Redes Rurales Restringidas (3G / 4G Campo)**:  
   Los protocolos binarios de Kafka requieren conexiones TCP persistentes de baja latencia con sondeos continuos (*heartbeats*). En entornos rurales con cobertura intermitente, esto genera degradación de batería, saturación del canal y frecuentes desconexiones por timeout.
2. **Seguridad y Perímetro de Autorización Granular (RLS)**:  
   Un broker Kafka estándar no valida autorización a nivel de fila (*Row Level Security*) para clientes finales no confiables. Delegar la persistencia en PostgreSQL permite que **Supabase Auth + RLS** auditen y filtren exactamente qué lotes y lecturas pertenecen a cada usuario.
3. **Control de Presión (*Backpressure*) y Consumo de Recursos**:  
   En despliegues reales, una red de sensores IoT puede generar miles de mensajes por segundo. El worker backend absorbe este caudal, realiza agregaciones o inserciones por lotes y distribuye al cliente únicamente las actualizaciones relevantes vía WebSockets livianos.
4. **Idempotencia y Trazabilidad Transaccional**:  
   El ciclo de vida de una orden de riego requiere validación transaccional (evitar que dos operarios abran la misma válvula en paralelo). La base de datos relacional actúa como árbitro atómico del estado del sistema.

---

## 📱 Capacidades y Módulos de la Aplicación

### 1. Control de Acceso y Selección de Rol (`/(auth)/login`)
* Autenticación con tokens JWT sobre Supabase Auth.
* Matriz de perfiles de usuario preconfigurados:
  * 🌾 **Productor Agropecuario** (`productor@agropulse.test`): Permisos totales de supervisión, modificación de umbrales y ejecución de riego.
  * 🚜 **Operador de Riego** (`operador@agropulse.test`): Capacidad operativa para ejecutar y cancelar aperturas de válvulas.
  * 📋 **Asesor Agronómico** (`asesor@agropulse.test`): Rol de solo lectura para análisis de curvas de humedad (las acciones de control de válvulas quedan bloqueadas por UI y rechazadas por RLS).

### 2. Tablero Satelital con Semáforo Agronómico (`/(tabs)/map`)
* Renderizado de geometrías de parcelas (lotes) georreferenciadas en **Concordia, Entre Ríos**.
* Semáforo de estado de humedad calculado dinámicamente:
  * 🟢 **Óptimo**: Humedad actual entre los umbrales agronómicos de la especie.
  * 🔴 **Seco (Riego Requerido)**: Humedad por debajo del umbral mínimo de seguridad hídrica.
  * 🔵 **Húmedo / Saturado**: Humedad por encima de la capacidad de campo recomendada.
  * ⚪ **Sin Señal (*Stale*)**: Estación meteorológica sin reportar datos por más de 15 minutos (nodo desconectado).
* **GPS "Estoy en el lote"**: Valida mediante geolocalización (`expo-location`) si las coordenadas del usuario se encuentran dentro del perímetro de la parcela seleccionada.

### 3. Vista de Lotes y Métricas Operativas (`/(tabs)/plots`)
* Listado de parcelas con indicadores de cultivo, porcentaje de humedad actual, temperatura ambiente del suelo y estado de válvulas asociadas.
* Navegación fluida y adaptada al detalle de cada parcela.

### 4. Detalle de Parcela & Control de Válvula (`/plot/[id]`)
* **Gráfico de Humedad Temporal**: Curva histórica de las últimas 6 horas (mínimo 12 puntos) con referencia visual de los umbrales agronómicos (mínimo y óptimo).
* **Consumo Realtime**: Los nuevos puntos de telemetría y los cambios de válvulas actualizan la pantalla en tiempo real sin requerir recarga manual.
* **Control de Riego Idempotente**:
  * Emisión de comando con token de idempotencia (`client_request_id` UUID v4).
  * Estados de ejecución asíncrona: `pending` ➔ `applied` con respuesta visual en $\le 5$ segundos.
  * Bloqueo contra envíos duplicados accidentales durante la ejecución.

### 5. Diagnóstico de Telemetría y Perfil (`/(tabs)/account`)
* Diagnóstico de conexión en tiempo real: UID del usuario, rol activo en RLS, latencia aparente de red y última actualización de telemetría recibida.
* Cierre de sesión seguro y gestión de sesión persistente.

---

## 🔒 Modelo de Seguridad (Row Level Security - RLS)

Todas las tablas cuentan con políticas de seguridad a nivel de fila (`RLS` habilitado en PostgreSQL):

| Tabla | Operación | Rol Productor | Rol Operador | Rol Asesor |
| :--- | :--- | :---: | :---: | :---: |
| `plots`, `stations`, `readings` | `SELECT` | ✅ Permitido | ✅ Permitido | ✅ Permitido |
| `valves` | `SELECT` / `UPDATE` | ✅ Permitido | ✅ Permitido | 👁️ Solo Lectura |
| `irrigation_commands` | `INSERT` (Ordenar riego) | ✅ Permitido | ✅ Permitido | ❌ Denegado por RLS |
| `irrigation_commands` | `UPDATE` (Cancelar/Cerrar) | ✅ Permitido | ✅ Permitido | ❌ Denegado por RLS |
| `alerts` | `SELECT` / `UPDATE` | ✅ Permitido | ✅ Permitido | ✅ Permitido |

---

## 🛠️ Tecnologías y Dependencias Principales

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Mobile Runtime** | React Native `0.81.5`, Expo SDK `54` | Núcleo de la aplicación multiplataforma |
| **Enrutamiento** | Expo Router `v5` (File-based Routing) | Arquitectura de navegación tipada y modular |
| **Lenguaje** | TypeScript `5.9` | Tipado estático estricto y prevención de errores |
| **Backend & Base de Datos** | Supabase (PostgreSQL 15+) | Almacenamiento relacional, vistas y RLS |
| **Tiempo Real** | Supabase Realtime (WebSockets) | Notificación push de lecturas y estados de válvulas |
| **Streaming Broker** | Redpanda (C++ Kafka compatible) | Cola de mensajería para ingestión masiva de sensores |
| **Consumidor / Engine** | Node.js Worker (`KafkaJS` + Docker) | Desacoplamiento de eventos y despacho de comandos |

---

## 🚀 Guía de Instalación y Ejecución

### Requisitos Previos
* [Node.js](https://nodejs.org/) (versión 20 o superior)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para el bus de streaming local)
* [Expo Go](https://expo.dev/client) instalado en tu dispositivo físico Android o iOS

---

### 1. Iniciar Infraestructura de Streaming (Redpanda + Worker)

Desde la raíz del repositorio, levantar el stack de contenedores:

```bash
cd infra
docker compose up -d
```

Servicios activos:
* **Broker Kafka (Redpanda)**: Puerto `9092`
* **Redpanda Console**: Disponible en el navegador en [http://localhost:8080](http://localhost:8080) para auditar en tiempo real los mensajes del topic `soil.moisture` y el estado del cluster.
* **Worker Ingestion Engine**: Contenedor en segundo plano procesando telemetría continua y ejecutando las órdenes de apertura de válvulas.

---

### 2. Configurar Base de Datos en Supabase

1. En el panel de control de tu proyecto Supabase, abrir el **SQL Editor**.
2. Ejecutar el script [`supabase/migrations/20260920000000_init_agropulse_schema.sql`](supabase/migrations/20260920000000_init_agropulse_schema.sql) para instanciar las tablas, restricciones, funciones de seguridad y publicación Realtime.
3. Ejecutar el script [`supabase/seed.sql`](supabase/seed.sql) para inicializar los datos de prueba del establecimiento Concordia, parcelas, sensores, válvulas y usuarios preconfigurados.

---

### 3. Configuración del Entorno y Ejecución Móvil

Regresar al directorio raíz del proyecto y preparar las variables de entorno:

```bash
cp .env.example .env
```

Configurar las credenciales en el archivo `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

Instalar paquetes e iniciar el bundler Metro:

```bash
npm install
npx expo start
```

Escanear el código QR resultante con la cámara (iOS) o la app **Expo Go** (Android).

---

## 🧪 Matriz de Verificación y Pruebas de Demostración

Para validar el funcionamiento integral de la solución:

1. **Prueba de Ingestión en Tiempo Real**:
   * Observar el gráfico de humedad en el detalle de una parcela (`/plot/1`). Cada vez que el sensor emite un nuevo valor a través de Redpanda, el gráfico y el porcentaje se actualizan automáticamente vía WebSockets.
2. **Prueba de Control de Válvula con Idempotencia**:
   * Iniciar sesión como Productor u Operador.
   * En el detalle del lote, presionar el botón **"Regar 30 min"**.
   * Verificar la transición inmediata a estado `pending` y la posterior confirmación `applied` emitida por el worker en $\le 5$ segundos.
3. **Prueba de Seguridad RLS**:
   * Iniciar sesión con el usuario Asesor (`asesor@agropulse.test`).
   * Observar cómo las acciones de riego quedan deshabilitadas o son rechazadas a nivel de base de datos con código `403 Forbidden`, confirmando la efectividad de las políticas RLS.
4. **Inspección de Streaming**:
   * Abrir [http://localhost:8080](http://localhost:8080) y verificar la llegada periódica de mensajes JSON al topic `soil.moisture`.
