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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const register = useAuthStore((state) => state.register);
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const clearError = useAuthStore((state) => state.clearError);

  const handleRegister = async () => {
    setLocalError(null);
    if (!name || !phone || !email || !password || !confirmPassword) {
      setLocalError('Veuillez remplir tous les champs.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }

    const success = await register(name, phone, email, password);
    if (success) {
      router.replace('/onboarding'); // Redirect to fitness onboarding on first signup
    }
  };

  const displayedError = localError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.brandingHeader}>
          <View style={styles.logoCircle}>
            <Dumbbell size={32} color={theme.colors.white} />
          </View>
          <Text style={styles.logoText}>PROTEIN.TN</Text>
        </View>

        {/* Register Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Créer un compte</Text>

          {displayedError && <Text style={styles.errorBanner}>{displayedError}</Text>}

          <Input
            label="Nom & Prénom"
            placeholder="Ex: Wissem Debech"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setLocalError(null);
              clearError();
            }}
          />

          <Input
            label="Numéro de téléphone"
            placeholder="Ex: 98123456"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              setLocalError(null);
              clearError();
            }}
          />

          <Input
            label="Adresse Email"
            placeholder="Ex: client@domain.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setLocalError(null);
              clearError();
            }}
          />

          <Input
            label="Mot de passe"
            placeholder="Au moins 8 caractères, lettres + chiffres"
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setLocalError(null);
              clearError();
            }}
          />

          <Input
            label="Confirmer le mot de passe"
            placeholder="Entrez à nouveau le mot de passe"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setLocalError(null);
              clearError();
            }}
          />

          <Button
            title="S'inscrire"
            isLoading={isLoading}
            style={styles.submitBtn}
            onPress={handleRegister}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Déjà inscrit ?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
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
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  logoText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.secondary,
    letterSpacing: 1,
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
  loginLink: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },
});
