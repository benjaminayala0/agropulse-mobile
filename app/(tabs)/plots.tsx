import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

const MOCK_PLOTS = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Costa 1',
    crop: 'Citrus (Naranjas Valencia)',
    status: 'optimal',
    statusLabel: 'Óptimo',
    statusColor: colors.statusOptimal,
    moisture: 35.4,
    temp: 22.8,
    valveStatus: 'Cerrada',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Costa 2',
    crop: 'Citrus (Mandarinas Criollas)',
    status: 'dry',
    statusLabel: 'Seco (Riego Requerido)',
    statusColor: colors.statusDry,
    moisture: 18.2,
    temp: 26.1,
    valveStatus: 'Cerrada',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Monte A',
    crop: 'Soja 1ra',
    status: 'stale',
    statusLabel: 'Sin señal (>15m)',
    statusColor: colors.statusStale,
    moisture: 28.0,
    temp: 21.0,
    valveStatus: 'Cerrada',
  },
];

export default function PlotsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_PLOTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.plotCard}
            activeOpacity={0.8}
            onPress={() => router.push(('/plot/' + item.id) as any)}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.plotName}>{item.name}</Text>
                <Text style={styles.cropText}>{item.crop}</Text>
              </View>
              <View style={[styles.statusBadge, { borderColor: item.statusColor }]}>
                <View style={[styles.dot, { backgroundColor: item.statusColor }]} />
                <Text style={[styles.statusText, { color: item.statusColor }]}>{item.statusLabel}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Humedad Suelo</Text>
                <Text style={styles.metricValue}>{item.moisture}%</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Temperatura</Text>
                <Text style={styles.metricValue}>{item.temp} °C</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Válvula</Text>
                <Text style={styles.metricValue}>{item.valveStatus}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.viewDetailText}>Ver detalle y ordenar riego</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  plotCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  plotName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cropText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
