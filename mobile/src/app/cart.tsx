import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useCartStore, CartItem } from '../store/cart';
import { getProductImageUrl, shopApi } from '../services/api';
import { theme } from '../constants/theme';
import { router } from 'expo-router';
import { Trash2, Plus, Minus, Ticket, X, ChevronRight } from 'lucide-react-native';
import Input from '../components/Input';
import Button from '../components/Button';

export default function CartScreen() {
  const { items, updateQuantity, removeItem, couponCode, discountAmount, setCoupon, getCartTotal } = useCartStore();
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const subtotal = items.reduce((total, item) => {
    return total + (item.promoPrice ?? item.price) * item.quantity;
  }, 0);

  const deliveryFee = subtotal > 150 ? 0 : 7; // free delivery for orders above 150 TND
  const total = getCartTotal() + deliveryFee;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await shopApi.post('/coupons/apply', {
        coupon_code: couponInput.trim(),
        total: subtotal,
      });

      // Assuming res.data returns { valid: true, discount: number }
      if (res.data?.valid) {
        setCoupon(couponInput.trim(), Number(res.data.discount));
      } else {
        setCouponError('Code coupon invalide.');
      }
    } catch (e: any) {
      setCouponError(e.response?.data?.message || 'Erreur lors de l\'application du coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null, 0);
    setCouponInput('');
  };

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const activePrice = item.promoPrice ?? item.price;
    return (
      <View style={styles.itemRow}>
        <Image
          source={{ uri: getProductImageUrl(item.cover) }}
          style={styles.itemImage}
        />
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.itemPrice}>{activePrice.toFixed(3)} TND</Text>
          
          <View style={styles.quantityRow}>
            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                <Minus size={16} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                <Plus size={16} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.trashBtn}>
              <Trash2 size={16} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Votre panier est vide</Text>
        <Text style={styles.emptySubtitle}>Ajoutez des produits de qualité supérieure pour vos entraînements.</Text>
        <Button title="Découvrir la boutique" style={styles.emptyBtn} onPress={() => router.push('/(tabs)/shop')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cart items list */}
        <FlatList
          data={items}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          style={styles.itemsList}
        />

        {/* Promo code apply section */}
        <View style={styles.couponSection}>
          <Text style={styles.sectionLabel}>Code Promo / Coupon</Text>
          {couponCode ? (
            <View style={styles.appliedCouponRow}>
              <View style={styles.couponBadge}>
                <Ticket size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.couponBadgeText}>{couponCode}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <X size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInputRow}>
              <Input
                placeholder="Entrez votre code"
                containerStyle={styles.couponInput}
                style={{ height: 48 }}
                value={couponInput}
                onChangeText={setCouponInput}
              />
              <TouchableOpacity
                style={styles.couponBtn}
                onPress={handleApplyCoupon}
                disabled={couponLoading}>
                {couponLoading ? (
                  <ActivityIndicator color={theme.colors.white} size="small" />
                ) : (
                  <Text style={styles.couponBtnText}>Appliquer</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          {couponError && <Text style={styles.couponErrorText}>{couponError}</Text>}
        </View>

        {/* Summary total section */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Récapitulatif de la commande</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelText}>Sous-total</Text>
            <Text style={styles.summaryValueText}>{subtotal.toFixed(3)} TND</Text>
          </View>
          
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabelText, { color: theme.colors.success }]}>Remise</Text>
              <Text style={[styles.summaryValueText, { color: theme.colors.success }]}>-{discountAmount.toFixed(3)} TND</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelText}>Livraison</Text>
            <Text style={styles.summaryValueText}>
              {deliveryFee === 0 ? 'Gratuite' : `${deliveryFee.toFixed(3)} TND`}
            </Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{total.toFixed(3)} TND</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA to Checkout */}
      <View style={styles.footerBar}>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/checkout')}>
          <Text style={styles.checkoutBtnText}>Passer à la caisse</Text>
          <ChevronRight size={20} color={theme.colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    lineHeight: 20,
  },
  emptyBtn: {
    width: '80%',
  },
  itemsList: {
    marginTop: theme.spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemImage: {
    width: 75,
    height: 75,
    resizeMode: 'contain',
    marginRight: theme.spacing.md,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.primary,
    marginTop: 4,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#F8F9FA',
  },
  counterBtn: {
    padding: 8,
  },
  counterValue: {
    paddingHorizontal: theme.spacing.md,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  trashBtn: {
    padding: 8,
  },
  couponSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponInput: {
    flex: 2,
    marginBottom: 0,
    marginRight: theme.spacing.sm,
  },
  couponBtn: {
    width: 90,
    height: 48,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponBtnText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.xs,
  },
  appliedCouponRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.orangeLight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  couponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponBadgeText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },
  couponErrorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    marginTop: theme.spacing.xs,
  },
  summaryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: 100, // safety margin from checkout button bar
  },
  summaryTitle: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  summaryLabelText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
  },
  summaryValueText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  totalLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primary,
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  checkoutBtn: {
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.md,
    marginRight: 6,
  },
});

