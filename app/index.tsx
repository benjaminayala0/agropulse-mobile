import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

export default function IndexScreen() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (session) {
      router.replace('/(tabs)/map');
    } else {
      router.replace('/(auth)/login');
    }
  }, [session, isLoading]);

  return (
    <View style={styles.container}>
      <View style={styles.brandBox}>
        <Text style={styles.brandIcon}>🌾</Text>
        <Text style={styles.brandTitle}>AgroPulse</Text>
        <Text style={styles.brandSubtitle}>Agricultura de Precisión</Text>
      </View>
      <ActivityIndicator size="large" color={colors.white} style={styles.spinner} />
      <Text style={styles.loadingText}>Iniciando sistema de campo...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandIcon: {
    fontSize: 54,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: colors.primaryLight,
    marginTop: 4,
    fontWeight: '500',
  },
  spinner: {
    marginVertical: 16,
  },
  loadingText: {
    fontSize: 13,
    color: colors.primaryLight,
    fontWeight: '500',
  },
});
