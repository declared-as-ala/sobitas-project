import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { getProductImageUrl } from '../services/api';
import { theme } from '../constants/theme';
import { useCartStore } from '../store/cart';
import { ShoppingBag } from 'lucide-react-native';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // Two columns grid with padding

interface ProductCardProps {
  product: {
    id: number;
    designation_fr: string;
    cover: string | null;
    prix: number | string;
    promo: number | string | null;
    slug: string;
    rupture?: number; // Out of stock indicator
  };
  onPress?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const addItem = useCartStore((state) => state.addItem);
  const isOutOfStock = product.rupture === 1;

  const price = Number(product.prix);
  const promoPrice = product.promo ? Number(product.promo) : null;
  const discountPercent = promoPrice ? Math.round(((price - promoPrice) / price) * 100) : 0;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleAddToCart = (e: any) => {
    e.stopPropagation(); // Avoid triggering onPress of card
    if (isOutOfStock) return;

    addItem({
      id: product.id,
      name: product.designation_fr,
      cover: product.cover,
      price: price,
      promoPrice: promoPrice,
      slug: product.slug,
    });
  };

  return (
    <AnimatedTouchable
      activeOpacity={0.92}
      style={[styles.card, theme.shadows.light, animatedStyle]}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: 100 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
      onPress={onPress}>
      {/* Product Image & Badges */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getProductImageUrl(product.cover) }}
          style={styles.image}
          resizeMode="cover"
        />
        {promoPrice && (
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </LinearGradient>
        )}
        {isOutOfStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Rupture</Text>
          </View>
        )}
      </View>

      {/* Info Container */}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={2}>
          {product.designation_fr}
        </Text>

        <View style={styles.priceRow}>
          <View style={styles.priceWrapper}>
            {promoPrice ? (
              <>
                <Text style={styles.promoPrice}>{promoPrice.toFixed(3)} TND</Text>
                <Text style={styles.oldPrice}>{price.toFixed(3)} TND</Text>
              </>
            ) : (
              <Text style={styles.price}>{price.toFixed(3)} TND</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.cartButton, isOutOfStock && styles.cartButtonDisabled]}
            disabled={isOutOfStock}
            onPress={handleAddToCart}>
            <ShoppingBag size={18} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: '#F8F9FA',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.round,
  },
  discountText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
  },
  infoContainer: {
    padding: theme.spacing.sm,
  },
  name: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    height: 38,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  priceWrapper: {
    flex: 1,
  },
  price: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  promoPrice: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  oldPrice: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  cartButton: {
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.xs,
  },
  cartButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
});
export default ProductCard;
