import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCartStore } from '../store/cart';
import { shopApi } from '../services/api';
import { theme } from '../constants/theme';
import { useAuthStore } from '../store/auth';
import { router } from 'expo-router';
import Input from '../components/Input';
import Button from '../components/Button';
import { CheckCircle } from 'lucide-react-native';

export default function CheckoutScreen() {
  const { items, couponCode, discountAmount, getCartTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [ville, setVille] = useState('');
  const [adresse, setAdresse] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  // Pre-fill fields if user details are available
  useEffect(() => {
    if (user) {
      const nameParts = user.name.split(' ');
      setNom(nameParts[1] || user.name);
      setPrenom(nameParts[0] || '');
      setEmail(user.email);
      setPhone(user.phone || '');
    }
  }, [user]);

  const subtotal = items.reduce((total, item) => {
    return total + (item.promoPrice ?? item.price) * item.quantity;
  }, 0);

  const deliveryFee = subtotal > 150 ? 0 : 7;
  const total = getCartTotal() + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!nom || !prenom || !phone || !region || !ville || !adresse) {
      setError('Veuillez remplir toutes les informations de livraison requises.');
      return;
    }

    setLoading(true);
    setError(null);

    // Format products for Laravel panier array
    const panier = items.map((item) => ({
      produit_id: item.id,
      quantite: item.quantity,
    }));

    const payload = {
      commande: {
        nom,
        prenom,
        email: email || undefined,
        phone,
        region,
        ville,
        adresse1: adresse,
        pays: 'Tunisie',
        user_id: user?.id || undefined,
        frais_livraison: deliveryFee,
      },
      panier,
      coupon_code: couponCode || undefined,
    };

    try {
      const res = await shopApi.post('/add_commande', payload);
      setOrderSuccess(res.data);
      clearCart();
    } catch (e: any) {
      const msg = e.response?.data?.message || "Une erreur s'est produite lors de l'enregistrement de votre commande. Veuillez réessayer.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // If order is successful, display receipt confirmation
  if (orderSuccess) {
    return (
      <View style={styles.successContainer}>
        <CheckCircle size={64} color={theme.colors.success} />
        <Text style={styles.successTitle}>Commande Confirmée !</Text>
        <Text style={styles.successSubtitle}>
          Merci pour votre commande. Notre équipe vous contactera par téléphone pour confirmer la livraison.
        </Text>
        
        <View style={styles.receiptCard}>
          <Text style={styles.receiptLabel}>Référence de la commande</Text>
          <Text style={styles.receiptValue}>#{orderSuccess.id || 'N/A'}</Text>
        </View>

        <Button
          title="Retourner à l'accueil"
          style={styles.successBtn}
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.title}>Informations de livraison</Text>

        <View style={styles.formCard}>
          <View style={styles.row}>
            <Input
              label="Prénom"
              placeholder="Prénom"
              containerStyle={{ flex: 1, marginRight: theme.spacing.sm }}
              value={prenom}
              onChangeText={setPrenom}
            />
            <Input
              label="Nom"
              placeholder="Nom"
              containerStyle={{ flex: 1 }}
              value={nom}
              onChangeText={setNom}
            />
          </View>

          <Input
            label="Numéro de téléphone"
            placeholder="Ex: 98123456"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Input
            label="Adresse Email (optionnel)"
            placeholder="Ex: client@domain.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            label="Gouvernorat (Région)"
            placeholder="Ex: Tunis, Sousse, Sfax"
            value={region}
            onChangeText={setRegion}
          />

          <Input
            label="Ville"
            placeholder="Ex: Marsa, Menzah, Riadh"
            value={ville}
            onChangeText={setVille}
          />

          <Input
            label="Adresse complète"
            placeholder="Numéro, rue, appartement, repère..."
            value={adresse}
            onChangeText={setAdresse}
          />
        </View>

        {/* Order review */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total à payer à la livraison</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Produits</Text>
            <Text style={styles.summaryValue}>{subtotal.toFixed(3)} TND</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.success }]}>Code Promo</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>-{discountAmount.toFixed(3)} TND</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Livraison</Text>
            <Text style={styles.summaryValue}>{deliveryFee.toFixed(3)} TND</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total à payer</Text>
            <Text style={styles.totalValue}>{total.toFixed(3)} TND</Text>
          </View>
        </View>

        <Button
          title="Confirmer ma commande"
          isLoading={loading}
          style={styles.submitBtn}
          onPress={handlePlaceOrder}
        />
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  summaryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  summaryTitle: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  summaryLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
  },
  summaryValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  totalLabel: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primary,
  },
  submitBtn: {
    marginBottom: theme.spacing.xl,
  },
  errorText: {
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  successTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  successSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  receiptCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    width: '80%',
    marginBottom: theme.spacing.xl,
  },
  receiptLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  receiptValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primary,
    marginTop: 4,
  },
  successBtn: {
    width: '80%',
  },
});
