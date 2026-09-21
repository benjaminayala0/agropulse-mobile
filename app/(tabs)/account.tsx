import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

export default function AccountScreen() {
  const router = useRouter();
  const { user, userRole, activeOrg, signOut } = useAuth();
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Cerrar Sesión', '¿Deseas salir del sistema AgroPulse?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const getRoleBadge = () => {
    switch (userRole) {
      case 'producer':
        return { label: 'Productor (Control Total)', color: colors.primary, icon: 'shield-checkmark' as const };
      case 'operator':
        return { label: 'Operador de Riego (Válvulas)', color: colors.water, icon: 'water' as const };
      case 'advisor':
      default:
        return { label: 'Asesor Agrónomo (Solo Lectura)', color: colors.statusOptimal, icon: 'eye' as const };
    }
  };

  const roleInfo = getRoleBadge();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tarjeta de Perfil & Rol */}
      <View style={styles.profileCard}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>
            {user?.email ? user.email.slice(0, 2).toUpperCase() : 'AG'}
          </Text>
        </View>
        <Text style={styles.userEmail}>{user?.email || 'productor@agropulse.test'}</Text>

        <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '1A', borderColor: roleInfo.color }]}>
          <Ionicons name={roleInfo.icon} size={14} color={roleInfo.color} />
          <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
        </View>
      </View>

      {/* Establecimiento Activo */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Establecimiento Activo</Text>
        <View style={styles.orgRow}>
          <Ionicons name="business-outline" size={24} color={colors.primary} />
          <View style={styles.orgDetails}>
            <Text style={styles.orgName}>{activeOrg?.name || 'Estancia Didáctica Concordia'}</Text>
            <Text style={styles.orgRegion}>{activeOrg?.region || 'Concordia, Entre Ríos'}</Text>
          </View>
        </View>
      </View>

      {/* Diagnóstico de conexión y estado */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.diagToggle}
          onPress={() => setShowDiagnostics(!showDiagnostics)}
          activeOpacity={0.7}
        >
          <View style={styles.diagToggleHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Diagnóstico y Estado del Sistema</Text>
          </View>
          <Ionicons name={showDiagnostics ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {showDiagnostics && (
          <View style={styles.diagContent}>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>User ID (UID):</Text>
              <Text style={styles.diagValueMono}>{user?.id || 'demo-user-concordia-01'}</Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Rol Activo en RLS:</Text>
              <Text style={[styles.diagValue, { fontWeight: '700', color: roleInfo.color }]}>{userRole}</Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Último tick recibido:</Text>
              <Text style={styles.diagValue}>Hace 3 s (vía Realtime)</Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Lag aparente:</Text>
              <Text style={[styles.diagValue, { color: colors.statusOptimal, fontWeight: '700' }]}>~140 ms</Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Backend Streaming:</Text>
              <Text style={styles.diagValue}>Redpanda / Kafka (worker interno)</Text>
            </View>
          </View>
        )}
      </View>

      {/* Botón Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
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
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  orgDetails: {
    flex: 1,
  },
  orgName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orgRegion: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  diagToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diagContent: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 8,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  diagValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  diagValueMono: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: 8,
    marginBottom: 24,
  },
  logoutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
});
