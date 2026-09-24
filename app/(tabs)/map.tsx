import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

interface MapPlot {
  id: string;
  name: string;
  crop: string;
  hectares: number;
  status: 'optimal' | 'dry' | 'wet' | 'stale';
  statusLabel: string;
  statusColor: string;
  moisture: number;
  temp: number;
  coordinatesLabel: string;
}

const LOTS: MapPlot[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Costa 1',
    crop: 'Citrus (Naranjas)',
    hectares: 18.5,
    status: 'optimal',
    statusLabel: 'Óptimo',
    statusColor: colors.statusOptimal,
    moisture: 35.4,
    temp: 22.8,
    coordinatesLabel: '-31.3710, -58.0380',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Costa 2',
    crop: 'Citrus (Mandarinas)',
    hectares: 14.2,
    status: 'dry',
    statusLabel: 'Seco (Requiere Riego)',
    statusColor: colors.statusDry,
    moisture: 18.2,
    temp: 26.1,
    coordinatesLabel: '-31.3710, -58.0310',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Monte A',
    crop: 'Soja 1ra',
    hectares: 32.0,
    status: 'stale',
    statusLabel: 'Sin señal (>15m)',
    statusColor: colors.statusStale,
    moisture: 28.0,
    temp: 21.0,
    coordinatesLabel: '-31.3795, -58.0360',
  },
];

export default function MapScreen() {
  const router = useRouter();
  const [selectedPlot, setSelectedPlot] = useState<MapPlot>(LOTS[1]);
  const [gpsActive, setGpsActive] = useState(false);

  const handleGpsCheck = () => {
    setGpsActive(true);
    setSelectedPlot(LOTS[0]);
  };

  return (
    <View style={styles.container}>
      {/* Barra superior de ubicación */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="map-outline" size={20} color={colors.white} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.estanciaName}>Estancia Concordia</Text>
            <Text style={styles.regionName}>Concordia, Entre Ríos · 3 Lotes</Text>
          </View>
        </View>

        {/* Semáforo de referencia rápido */}
        <View style={styles.legendBar}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.statusOptimal }]} />
            <Text style={styles.legendText}>Óptimo</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.statusDry }]} />
            <Text style={styles.legendText}>Seco</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.statusStale }]} />
            <Text style={styles.legendText}>Sin señal</Text>
          </View>
        </View>
      </View>

      {/* Visualización de Lotes en Terreno */}
      <ScrollView contentContainerStyle={styles.scrollArea}>
        {gpsActive && (
          <View style={styles.gpsBanner}>
            <Ionicons name="navigate-circle" size={22} color={colors.statusOptimal} />
            <View style={{ flex: 1 }}>
              <Text style={styles.gpsTitle}>Ubicación GPS Detectada</Text>
              <Text style={styles.gpsSubtitle}>
                Estás dentro del polígono de <Text style={{ fontWeight: '700' }}>Costa 1</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.gpsClose}
              onPress={() => setGpsActive(false)}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>Lotes de la Estancia</Text>

        {/* Parcelas interactivas con código semáforo */}
        <View style={styles.plotsGrid}>
          {LOTS.map((plot) => {
            const isSelected = selectedPlot.id === plot.id;
            return (
              <TouchableOpacity
                key={plot.id}
                style={[
                  styles.plotParcelCard,
                  { borderColor: plot.statusColor },
                  isSelected && styles.plotParcelSelected,
                ]}
                onPress={() => setSelectedPlot(plot)}
                activeOpacity={0.8}
              >
                <View style={styles.parcelHeader}>
                  <View style={styles.parcelTitleBox}>
                    <Text style={styles.parcelName}>{plot.name}</Text>
                    <Text style={styles.parcelCrop}>{plot.crop}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: plot.statusColor + '20', borderColor: plot.statusColor },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: plot.statusColor }]} />
                    <Text style={[styles.statusPillText, { color: plot.statusColor }]}>
                      {plot.statusLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.parcelMetrics}>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Humedad</Text>
                    <Text style={[styles.metricNumber, { color: plot.statusColor }]}>
                      {plot.moisture}%
                    </Text>
                  </View>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Temperatura</Text>
                    <Text style={styles.metricNumber}>{plot.temp} °C</Text>
                  </View>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Superficie</Text>
                    <Text style={styles.metricNumber}>{plot.hectares} ha</Text>
                  </View>
                </View>

                <View style={styles.parcelFooter}>
                  <Text style={styles.coordsText}>📍 {plot.coordinatesLabel}</Text>
                    <TouchableOpacity
                      style={[styles.openDetailBtn, { backgroundColor: plot.statusColor }]}
                      onPress={() => router.push(('/plot/' + plot.id) as any)}
                    >
                    <Text style={styles.openDetailText}>Abrir Lote & Riego</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.white} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB GPS: Estoy en el lote */}
      <TouchableOpacity
        style={[styles.gpsFab, gpsActive && styles.gpsFabActive]}
        activeOpacity={0.85}
        onPress={handleGpsCheck}
      >
        <Ionicons name="locate" size={24} color={colors.white} />
        <Text style={styles.gpsFabText}>¿Estoy en el lote?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  estanciaName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  regionName: {
    color: colors.primaryLight,
    fontSize: 12,
  },
  legendBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '500',
  },
  scrollArea: {
    padding: 16,
    paddingBottom: 100,
  },
  gpsBanner: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.statusOptimal,
    elevation: 2,
  },
  gpsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.statusOptimal,
  },
  gpsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  gpsClose: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  plotsGrid: {
    gap: 14,
  },
  plotParcelCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    elevation: 2,
  },
  plotParcelSelected: {
    backgroundColor: '#FAFCFA',
    borderWidth: 2,
    transform: [{ scale: 1.01 }],
  },
  parcelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  parcelTitleBox: {
    flex: 1,
  },
  parcelName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  parcelCrop: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  parcelMetrics: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metricBlock: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  parcelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordsText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  openDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openDetailText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  gpsFab: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  gpsFabActive: {
    backgroundColor: colors.statusOptimal,
  },
  gpsFabText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
