import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/auth';
import { theme } from '../../constants/theme';
import { router } from 'expo-router';
import { User, ClipboardList, Heart, Calendar, Settings, LogOut, ChevronRight, Award } from 'lucide-react-native';

export default function ProfileScreen() {
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <User size={40} color={theme.colors.textMuted} />
        <Text style={styles.promoText}>Connectez-vous pour voir vos commandes, votre profil, et gérer votre compte.</Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Profile Header info */}
      <LinearGradient
        colors={theme.gradients.dark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerCard, theme.shadows.medium]}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.phone}>{user?.phone || 'Pas de téléphone renseigné'}</Text>
        </View>
      </LinearGradient>

      {/* 2. Menu options links */}
      <View style={styles.menuSection}>
        <Text style={styles.menuLabel}>Boutique & Commandes</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/orders')}>
            <View style={styles.menuTitleRow}>
              <View style={[styles.menuIconChip, { backgroundColor: '#E0F2FE' }]}>
                <ClipboardList size={18} color="#0284C7" />
              </View>
              <Text style={styles.menuTitle}>Historique des commandes</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/wishlist')}>
            <View style={styles.menuTitleRow}>
              <View style={[styles.menuIconChip, { backgroundColor: '#FEE2E2' }]}>
                <Heart size={18} color={theme.colors.error} />
              </View>
              <Text style={styles.menuTitle}>Mes Favoris</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowLast]}
            onPress={() => router.push('/rewards')}>
            <View style={styles.menuTitleRow}>
              <View style={[styles.menuIconChip, { backgroundColor: theme.colors.orangeLight }]}>
                <Award size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.menuTitle}>Fidélité & Parrainage</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.menuLabel}>Fitness & Compléments</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/supplement-stack')}>
            <View style={styles.menuTitleRow}>
              <View style={[styles.menuIconChip, { backgroundColor: theme.colors.orangeLight }]}>
                <Calendar size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.menuTitle}>Mon Planning de Compléments</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.menuLabel}>Paramètres</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/notifications')}>
            <View style={styles.menuTitleRow}>
              <View style={[styles.menuIconChip, { backgroundColor: '#F1F3F5' }]}>
                <Settings size={18} color={theme.colors.text} />
              </View>
              <Text style={styles.menuTitle}>Alertes & Notifications</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={theme.colors.error} style={{ marginRight: theme.spacing.sm }} />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  promoText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  loginBtn: {
    backgroundColor: theme.colors.primary,
    height: 52,
    width: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  loginBtnText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
  },
  headerCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: theme.borderRadius.round,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.white,
  },
  email: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  phone: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  menuSection: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  menuLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: theme.spacing.md,
  },
  menuCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconChip: {
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  menuTitle: {
    fontSize: theme.typography.sizes.sm + 1,
    color: theme.colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    height: 52,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl + 80,
  },
  logoutText: {
    color: theme.colors.error,
    fontWeight: theme.typography.weights.bold,
  },
});
