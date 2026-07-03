import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAuthStore } from '../../store/auth';
import { theme } from '../../constants/theme';
import { router } from 'expo-router';
import { User, ClipboardList, Heart, Calendar, Settings, LogOut, ChevronRight, Edit3 } from 'lucide-react-native';

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
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.phone}>{user?.phone || 'Pas de téléphone renseigné'}</Text>
        </View>
      </View>

      {/* 2. Menu options links */}
      <View style={styles.menuSection}>
        <Text style={styles.menuLabel}>Boutique & Commandes</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/orders')}>
            <View style={styles.menuTitleRow}>
              <ClipboardList size={20} color={theme.colors.text} style={styles.menuIcon} />
              <Text style={styles.menuTitle}>Historique des commandes</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/wishlist')}>
            <View style={styles.menuTitleRow}>
              <Heart size={20} color={theme.colors.text} style={styles.menuIcon} />
              <Text style={styles.menuTitle}>Mes Favoris</Text>
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
              <Calendar size={20} color={theme.colors.text} style={styles.menuIcon} />
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
              <Settings size={20} color={theme.colors.text} style={styles.menuIcon} />
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
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  email: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  phone: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
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
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
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
    marginBottom: theme.spacing.xl,
  },
  logoutText: {
    color: theme.colors.error,
    fontWeight: theme.typography.weights.bold,
  },
});
