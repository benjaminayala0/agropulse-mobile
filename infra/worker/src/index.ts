import { Kafka, Partitioners } from 'kafkajs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TICK_INTERVAL_MS = parseInt(process.env.TICK_INTERVAL_MS || '5000', 10);

console.log('====================================================');
console.log('🌾 AgroPulse — IoT Simulator & Backend Worker');
console.log(`🔌 Kafka Broker: ${KAFKA_BROKER}`);
console.log(`📡 Supabase URL: ${SUPABASE_URL ? SUPABASE_URL : 'NO CONFIGURADA'}`);
console.log('====================================================');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const kafka = new Kafka({
  clientId: 'agropulse-worker',
  brokers: [KAFKA_BROKER],
  retry: {
    initialRetryTime: 1000,
    retries: 10,
  },
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});
const consumer = kafka.consumer({ groupId: 'agropulse-db-consumers' });

// Estaciones iniciales de Concordia
const STATIONS = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    plotName: 'Costa 1',
    baseMoisture: 35.0,
    baseTemp: 23.0,
    isActive: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    plotName: 'Costa 2',
    baseMoisture: 18.0,
    baseTemp: 26.5,
    isActive: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    plotName: 'Monte A',
    baseMoisture: 28.0,
    baseTemp: 21.0,
    isActive: false, // Inactivo para simular sensor sin señal (>15m)
  },
];

async function initKafka() {
  const admin = kafka.admin();
  await admin.connect();
  const topics = ['soil.moisture', 'weather.tick', 'irrigation.commands', 'valve.status'];
  await admin.createTopics({
    topics: topics.map((t) => ({ topic: t, numPartitions: 1 })),
    waitForLeaders: true,
  });
  await admin.disconnect();
  console.log('✅ Topics de Redpanda inicializados exitosamente.');
}

// -----------------------------------------------------------------------------
// 1. Simulador IoT (Producer de Telemetría hacia Redpanda)
// -----------------------------------------------------------------------------
async function runSimulator() {
  await producer.connect();
  console.log('🚀 Simulador IoT conectado a Redpanda.');

  setInterval(async () => {
    for (const station of STATIONS) {
      if (!station.isActive) continue;

      // Variación aleatoria sutil
      const deltaMoisture = (Math.random() - 0.5) * 0.8;
      const moisture = Math.max(10, Math.min(80, station.baseMoisture + deltaMoisture));
      const temp = station.baseTemp + (Math.random() - 0.5) * 0.4;
      const timestamp = new Date().toISOString();

      const payload = {
        station_id: station.id,
        moisture_pct: parseFloat(moisture.toFixed(1)),
        temp_c: parseFloat(temp.toFixed(1)),
        ts: timestamp,
      };

      try {
        await producer.send({
          topic: 'soil.moisture',
          messages: [{ key: station.id, value: JSON.stringify(payload) }],
        });

        console.log(`[PRODUCED] [soil.moisture] Estación ${station.plotName} (${station.id.slice(0, 8)}...): ${payload.moisture_pct}% | ${payload.temp_c}°C`);
      } catch (err) {
        console.error('❌ Error publicando tick a Redpanda:', err);
      }
    }
  }, TICK_INTERVAL_MS);
}

// -----------------------------------------------------------------------------
// 2. Consumer (Lee de Redpanda e inserta en Supabase readings)
// -----------------------------------------------------------------------------
async function runConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'soil.moisture', fromBeginning: false });
  console.log('📥 Consumer suscrito a topic soil.moisture.');

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const data = JSON.parse(message.value.toString());
        console.log(`[CONSUMED] [soil.moisture] Procesando tick estación: ${data.station_id}`);

        // Inserta la lectura en Supabase
        const { error } = await supabase.from('readings').insert({
          station_id: data.station_id,
          measured_at: data.ts,
          moisture_pct: data.moisture_pct,
          temp_c: data.temp_c,
          rain_mm: 0.0,
          source: 'sensor',
        });

        if (error) {
          console.warn(`[UPSERT WARNING] Error guardando lectura: ${error.message}`);
        } else {
          console.log(`[UPSERT READING] Lectura guardada en Supabase para estación ${data.station_id.slice(0, 8)}`);
        }
      } catch (e) {
        console.error('❌ Error deserializando/guardando mensaje:', e);
      }
    },
  });
}

// -----------------------------------------------------------------------------
// 3. Procesador de Comandos de Riego (Worker de válvulas)
// -----------------------------------------------------------------------------
async function runIrrigationProcessor() {
  console.log('🚰 Procesador de comandos de riego iniciado (escuchando órdenes pending)...');

  setInterval(async () => {
    try {
      // Buscar comandos pendientes
      const { data: pendingCommands, error } = await supabase
        .from('irrigation_commands')
        .select('id, valve_id, action, duration_min')
        .eq('status', 'pending')
        .limit(5);

      if (error || !pendingCommands || pendingCommands.length === 0) return;

      for (const cmd of pendingCommands) {
        console.log(`[COMMAND PENDING] Procesando comando de riego ${cmd.id} en válvula ${cmd.valve_id}...`);

        // Simula tiempo de apertura física de válvula (1 a 3 segundos)
        await new Promise((res) => setTimeout(res, 2000));

        // 1. Abre o cierra la válvula
        const newStatus = cmd.action === 'close' ? 'closed' : 'open';
        await supabase
          .from('valves')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', cmd.valve_id);

        // 2. Marca el comando como aplicado
        await supabase
          .from('irrigation_commands')
          .update({ status: 'applied', applied_at: new Date().toISOString() })
          .eq('id', cmd.id);

        console.log(`[VALVE APPLIED] Válvula ${cmd.valve_id} ahora en estado '${newStatus}'. Comando ${cmd.id} APPLIED.`);
      }
    } catch (e) {
      console.warn('Error en bucle de comandos de riego:', e);
    }
  }, 3000);
}

async function start() {
  try {
    await initKafka();
    await runConsumer();
    await runSimulator();
    await runIrrigationProcessor();
  } catch (err) {
    console.error('❌ Fallo crítico al iniciar el worker:', err);
    process.exit(1);
  }
}

start();
