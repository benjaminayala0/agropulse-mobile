import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { STATUS_COLORS, PlotStatus } from '../../src/types/domain';

interface PlotDetailData {
  id: string;
  name: string;
  crop: string;
  hectares: number;
  status: PlotStatus;
  currentMoisture: number;
  thresholdMin: number;
  thresholdMax: number;
  currentTemp: number;
  lastReadingTime: string;
  valveName: string;
  valveStatus: 'open' | 'closed';
  readings: { time: string; moisture: number; temp: number }[];
}

const PLOTS_DATA: Record<string, PlotDetailData> = {
  'b0000000-0000-0000-0000-000000000001': {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Costa 1',
    crop: 'Citrus (Naranjas Valencia)',
    hectares: 18.5,
    status: 'optimal',
    currentMoisture: 35.4,
    thresholdMin: 25.0,
    thresholdMax: 45.0,
    currentTemp: 22.8,
    lastReadingTime: 'Hace 2 minutos',
    valveName: 'Válvula Goteo Sector 1',
    valveStatus: 'closed',
    readings: [
      { time: '6h', moisture: 36.2, temp: 21.0 },
      { time: '5h', moisture: 35.8, temp: 21.5 },
      { time: '4h', moisture: 35.5, temp: 22.0 },
      { time: '3h', moisture: 35.0, temp: 22.4 },
      { time: '2h', moisture: 35.2, temp: 22.7 },
      { time: '1h', moisture: 35.3, temp: 22.8 },
      { time: 'Ahora', moisture: 35.4, temp: 22.8 },
    ],
  },
  'b0000000-0000-0000-0000-000000000002': {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Costa 2',
    crop: 'Citrus (Mandarinas Criollas)',
    hectares: 14.2,
    status: 'dry',
    currentMoisture: 18.2,
    thresholdMin: 25.0,
    thresholdMax: 45.0,
    currentTemp: 26.1,
    lastReadingTime: 'Hace 1 minuto',
    valveName: 'Válvula Principal Costa 2',
    valveStatus: 'closed',
    readings: [
      { time: '6h', moisture: 24.1, temp: 23.0 },
      { time: '5h', moisture: 22.8, temp: 23.9 },
      { time: '4h', moisture: 21.5, temp: 24.5 },
      { time: '3h', moisture: 20.2, temp: 25.2 },
      { time: '2h', moisture: 19.1, temp: 25.8 },
      { time: '1h', moisture: 18.5, temp: 26.0 },
      { time: 'Ahora', moisture: 18.2, temp: 26.1 },
    ],
  },
  'b0000000-0000-0000-0000-000000000003': {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Monte A',
    crop: 'Soja 1ra',
    hectares: 32.0,
    status: 'stale',
    currentMoisture: 28.0,
    thresholdMin: 25.0,
    thresholdMax: 45.0,
    currentTemp: 21.0,
    lastReadingTime: 'Hace 28 minutos (sin señal)',
    valveName: 'Válvula Aspersión Monte A',
    valveStatus: 'closed',
    readings: [
      { time: '6h', moisture: 29.5, temp: 20.5 },
      { time: '5h', moisture: 29.1, temp: 20.8 },
      { time: '4h', moisture: 28.7, temp: 21.0 },
      { time: '3h', moisture: 28.4, temp: 21.0 },
      { time: '2h', moisture: 28.0, temp: 21.0 },
      { time: '1h', moisture: 28.0, temp: 21.0 },
      { time: '28m', moisture: 28.0, temp: 21.0 },
    ],
  },
};

export default function PlotDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userRole } = useAuth();

  const plotData = (id && PLOTS_DATA[id]) || PLOTS_DATA['b0000000-0000-0000-0000-000000000002'];

  const [valveStatus, setValveStatus] = useState<'open' | 'closed'>(plotData.valveStatus);
  const [isIrrigating, setIsIrrigating] = useState(false);
  const [commandStatus, setCommandStatus] = useState<string | null>(null);

  const statusConfig = STATUS_COLORS[plotData.status];
  const canOperate = userRole === 'producer' || userRole === 'operator';

  const handleIrrigation = async () => {
    if (!canOperate) {
      Alert.alert('Acción no permitida', 'Tu rol actual de Asesor no tiene permisos para accionar válvulas.');
      return;
    }

    setIsIrrigating(true);
    setCommandStatus('Enviando comando...');

    // Orden de riego
    setTimeout(() => {
      setCommandStatus('Estado: pending (en cola)');
    }, 600);

    setTimeout(() => {
      const nextStatus = valveStatus === 'closed' ? 'open' : 'closed';
      setValveStatus(nextStatus);
      setIsIrrigating(false);
      setCommandStatus(nextStatus === 'open' ? 'Comando aplicado: Válvula abierta (30 min)' : 'Válvula cerrada');
      Alert.alert(
        'Riego Actualizado',
        nextStatus === 'open'
          ? `La válvula ${plotData.valveName} fue abierta por 30 minutos.`
          : `La válvula ${plotData.valveName} fue cerrada.`
      );
    }, 2200);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        },
      ]}
    >
      {/* Header con botón atrás */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.topTitleBox}>
          <Text style={styles.topTitle}>{plotData.name}</Text>
          <Text style={styles.topSubtitle}>{plotData.crop}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusConfig.badgeBg, borderColor: statusConfig.stroke }]}>
          <Text style={[styles.badgeText, { color: statusConfig.stroke }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* Tarjeta de métricas principales */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado Hídrico del Suelo</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Humedad Actual</Text>
            <Text style={[styles.metricHighlight, { color: statusConfig.stroke }]}>
              {plotData.currentMoisture}%
            </Text>
            <Text style={styles.metricNote}>Umbral mín: {plotData.thresholdMin}%</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Temperatura</Text>
            <Text style={styles.metricHighlight}>{plotData.currentTemp} °C</Text>
            <Text style={styles.metricNote}>Última lectura: {plotData.lastReadingTime}</Text>
          </View>
        </View>
      </View>

      {/* Gráfico de tendencia (Últimas 6 horas) */}
      <View style={styles.card}>
        <View style={styles.chartHeader}>
          <Text style={styles.cardTitle}>Evolución de Humedad (Últimas 6h)</Text>
          <Text style={styles.chartLegend}>Umbral mín ({plotData.thresholdMin}%)</Text>
        </View>

        <View style={styles.chartContainer}>
          {plotData.readings.map((r, idx) => {
            const heightPct = Math.min(100, Math.max(15, (r.moisture / 50) * 100));
            const isBelowMin = r.moisture < plotData.thresholdMin;
            return (
              <View key={idx} style={styles.barColumn}>
                <Text style={styles.barValue}>{r.moisture}%</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${heightPct}%`,
                        backgroundColor: isBelowMin ? colors.statusDry : colors.statusOptimal,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{r.time}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Control de Válvula y Riego */}
      <View style={styles.card}>
        <View style={styles.valveHeader}>
          <View style={styles.valveIconBox}>
            <Ionicons
              name={valveStatus === 'open' ? 'water' : 'water-outline'}
              size={24}
              color={valveStatus === 'open' ? colors.water : colors.textSecondary}
            />
          </View>
          <View style={styles.valveInfo}>
            <Text style={styles.valveName}>{plotData.valveName}</Text>
            <Text style={[styles.valveStatusText, { color: valveStatus === 'open' ? colors.water : colors.textSecondary }]}>
              Estado: {valveStatus === 'open' ? 'ABIERTA (Regando)' : 'CERRADA'}
            </Text>
          </View>
        </View>

        {commandStatus && (
          <View style={styles.commandStatusBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.commandStatusText}>{commandStatus}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.irrigateButton,
            valveStatus === 'open' && styles.stopButton,
            (!canOperate || isIrrigating) && styles.buttonDisabled,
          ]}
          onPress={handleIrrigation}
          disabled={!canOperate || isIrrigating}
          activeOpacity={0.8}
        >
          {isIrrigating ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons
                name={valveStatus === 'open' ? 'stop-circle-outline' : 'play-outline'}
                size={20}
                color={colors.white}
              />
              <Text style={styles.irrigateButtonText}>
                {valveStatus === 'open' ? 'Detener Riego' : 'Regar 30 minutos'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!canOperate && (
          <Text style={styles.roleNote}>
            🔒 Modo solo lectura: Inicia sesión como Productor u Operador para accionar válvulas.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  topBar: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitleBox: {
    flex: 1,
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  topSubtitle: {
    fontSize: 13,
    color: colors.primaryLight,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricHighlight: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginVertical: 4,
  },
  metricNote: {
    fontSize: 11,
    color: colors.textMuted,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  chartLegend: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 20,
    paddingBottom: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  barTrack: {
    width: 16,
    height: 90,
    backgroundColor: '#EEF2F6',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
  },
  valveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  valveIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.waterLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valveInfo: {
    flex: 1,
  },
  valveName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  valveStatusText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  commandStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  commandStatusText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  irrigateButton: {
    backgroundColor: colors.water,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  stopButton: {
    backgroundColor: colors.error,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  irrigateButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  roleNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
