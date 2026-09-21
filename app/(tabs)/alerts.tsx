import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

const MOCK_ALERTS = [
  {
    id: '1',
    title: 'Humedad bajo umbral',
    description: 'Lote Costa 2 registra 18.2% de humedad (umbral mínimo: 25%). Se sugiere ordenar riego.',
    time: 'Hace 5 minutos',
    type: 'low_moisture',
    color: colors.statusDry,
    icon: 'water-outline' as const,
  },
  {
    id: '2',
    title: 'Estación sin señal (Stale)',
    description: 'Estación MA-Sonda Central del lote Monte A no emite ticks hace más de 15 minutos.',
    time: 'Hace 28 minutos',
    type: 'stale_station',
    color: colors.statusStale,
    icon: 'warning-outline' as const,
  },
];

export default function AlertsScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_ALERTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.alertCard}>
            <View style={[styles.iconBox, { backgroundColor: item.color + '1A' }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
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
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
