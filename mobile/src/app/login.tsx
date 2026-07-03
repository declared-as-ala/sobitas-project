import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/auth';
import { theme } from '../constants/theme';
import Input from '../components/Input';
import Button from '../components/Button';
import { router } from 'expo-router';
import { Dumbbell } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const clearError = useAuthStore((state) => state.clearError);

  const handleLogin = async () => {
    if (!email || !password) return;
    const success = await login(email, password);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Branding Logo */}
        <View style={styles.brandingHeader}>
          <View style={styles.logoCircle}>
            <Dumbbell size={32} color={theme.colors.white} />
          </View>
          <Text style={styles.logoText}>PROTEIN.TN</Text>
          <Text style={styles.subtitle}>Votre partenaire performance</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Connexion</Text>

          {error && <Text style={styles.errorBanner}>{error}</Text>}

          <Input
            label="Adresse Email"
            placeholder="Ex: client@domain.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearError();
            }}
          />

          <Input
            label="Mot de passe"
            placeholder="Entrez votre mot de passe"
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearError();
            }}
          />

          <Button
            title="Se connecter"
            isLoading={isLoading}
            style={styles.submitBtn}
            onPress={handleLogin}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.registerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  logoText: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.secondary,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  form: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  errorBanner: {
    color: theme.colors.error,
    backgroundColor: '#FFF0F0',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.error,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  submitBtn: {
    marginTop: theme.spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    marginRight: 6,
  },
  registerLink: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },
});
