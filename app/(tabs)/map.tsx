import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

export default function MapScreen() {
  const [userLocationState, setUserLocationState] = useState<'idle' | 'checking' | 'found'>('idle');

  return (
    <View style={styles.container}>
      {/* Vista de lotes */}
      <View style={styles.mapArea}>
        <View style={styles.placeholderBox}>
          <Ionicons name="map" size={54} color={colors.primary} />
          <Text style={styles.mapTitle}>Mapa de Lotes — Concordia, Entre Ríos</Text>
          <Text style={styles.mapSubtitle}>Estancia Didáctica Concordia</Text>

          {/* Semáforo de referencia */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.statusOptimal }]} />
              <Text style={styles.legendText}>Óptimo</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.statusDry }]} />
              <Text style={styles.legendText}>Seco (Riego)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.statusWet }]} />
              <Text style={styles.legendText}>Húmedo</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.statusStale }]} />
              <Text style={styles.legendText}>Sin datos</Text>
            </View>
          </View>
        </View>

        {/* Botón de ubicación actual */}
        <TouchableOpacity
          style={styles.gpsFab}
          activeOpacity={0.8}
          onPress={() => setUserLocationState(userLocationState === 'found' ? 'idle' : 'found')}
        >
          <Ionicons name="locate" size={24} color={colors.white} />
        </TouchableOpacity>

        {userLocationState === 'found' && (
          <View style={styles.locationBanner}>
            <Ionicons name="location" size={18} color={colors.statusOptimal} />
            <Text style={styles.locationBannerText}>
              Estás en el lote: <Text style={{ fontWeight: '700' }}>Costa 1</Text> (GPS dentro del polígono)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderBox: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    width: '100%',
    maxWidth: 380,
  },
  mapTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  mapSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  gpsFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  locationBanner: {
    position: 'absolute',
    top: 20,
    backgroundColor: colors.card,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationBannerText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
});
