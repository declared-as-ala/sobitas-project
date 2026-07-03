import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { shopApi, getProductImageUrl } from '../../services/api';
import { theme } from '../../constants/theme';
import { useCartStore } from '../../store/cart';
import { useLocalSearchParams, router } from 'expo-router';
import { Heart, ShoppingCart, Share2, ShieldAlert, BadgeCheck, Dumbbell } from 'lucide-react-native';
import Button from '../../components/Button';

export default function ProductDetailsScreen() {
  const { slug } = useLocalSearchParams();
  const addItem = useCartStore((state) => state.addItem);
  const [isFavorite, setIsFavorite] = useState(false);

  // Accordion toggle states
  const [showDesc, setShowDesc] = useState(true);
  const [showNutrition, setShowNutrition] = useState(false);

  // Fetch product details
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product-details', slug],
    queryFn: async () => {
      const res = await shopApi.get(`/product_details/${slug}`);
      return res.data;
    },
  });

  const price = product ? Number(product.prix) : 0;
  const promoPrice = product?.promo ? Number(product.promo) : null;
  const isOutOfStock = product?.rupture === 1;

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;
    addItem({
      id: product.id,
      name: product.designation_fr,
      cover: product.cover,
      price,
      promoPrice,
      slug: product.slug,
    });
    router.push('/cart');
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Découvre ${product.designation_fr} sur Protein.tn ! 🏋️‍♂️\nhttps://protein.tn/product/${product.slug}`,
      });
    } catch (e) {
      console.error('Sharing failed', e);
    }
  };

  // Supplement recommendations goal mapping helper
  const getGoalRecommendationBadge = () => {
    if (!product) return null;
    const name = product.designation_fr.toLowerCase();
    
    if (name.includes('whey') || name.includes('gainer') || name.includes('mass')) {
      return { goal: 'Prise de muscle', iconColor: theme.colors.primary };
    }
    if (name.includes('carnitine') || name.includes('burn') || name.includes('cla')) {
      return { goal: 'Perte de poids', iconColor: theme.colors.error };
    }
    if (name.includes('bcaa') || name.includes('glutamine') || name.includes('recovery') || name.includes('magnesium')) {
      return { goal: 'Récupération musculaire', iconColor: theme.colors.success };
    }
    if (name.includes('creatine') || name.includes('pre-workout') || name.includes('boost')) {
      return { goal: 'Force & Énergie', iconColor: theme.colors.warning };
    }
    
    return { goal: 'Santé quotidienne', iconColor: theme.colors.textMuted };
  };

  const goalBadge = getGoalRecommendationBadge();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Produit introuvable.</Text>
        <Button title="Retourner à la boutique" style={{ marginTop: theme.spacing.md }} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 1. Image cover & badges */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getProductImageUrl(product.cover) }}
            style={styles.image}
            resizeMode="contain"
          />
          
          {/* Action floating buttons */}
          <View style={styles.floatingActions}>
            <TouchableOpacity style={styles.actionCircle} onPress={() => setIsFavorite(!isFavorite)}>
              <Heart size={20} color={isFavorite ? theme.colors.error : theme.colors.text} fill={isFavorite ? theme.colors.error : 'transparent'} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCircle, { marginTop: theme.spacing.sm }]} onPress={handleShare}>
              <Share2 size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Core Meta Details */}
        <View style={styles.metaSection}>
          <Text style={styles.name}>{product.designation_fr}</Text>
          
          <View style={styles.badgeRow}>
            <View style={[styles.stockBadge, isOutOfStock ? styles.outStock : styles.inStock]}>
              <Text style={[styles.stockText, isOutOfStock ? styles.outStockText : styles.inStockText]}>
                {isOutOfStock ? 'Rupture' : 'En Stock'}
              </Text>
            </View>

            {goalBadge && (
              <View style={styles.goalRecommendationBadge}>
                <Dumbbell size={12} color={goalBadge.iconColor} style={{ marginRight: 4 }} />
                <Text style={styles.goalRecommendationText}>Idéal: {goalBadge.goal}</Text>
              </View>
            )}
          </View>

          <View style={styles.priceRow}>
            {promoPrice ? (
              <View style={styles.priceWrapper}>
                <Text style={styles.promoPrice}>{promoPrice.toFixed(3)} TND</Text>
                <Text style={styles.oldPrice}>{price.toFixed(3)} TND</Text>
              </View>
            ) : (
              <Text style={styles.price}>{price.toFixed(3)} TND</Text>
            )}
          </View>
        </View>

        {/* 3. Description Accordion */}
        <View style={styles.accordionContainer}>
          <TouchableOpacity style={styles.accordionHeader} onPress={() => setShowDesc(!showDesc)}>
            <View style={styles.accordionHeaderLeft}>
              <BadgeCheck size={20} color={theme.colors.primary} />
              <Text style={styles.accordionTitle}>Description & Bienfaits</Text>
            </View>
            <Text style={styles.toggleText}>{showDesc ? 'Réduire' : 'Afficher'}</Text>
          </TouchableOpacity>
          {showDesc && (
            <Text style={styles.accordionBody}>
              {product.description_fr || "Aucune description détaillée n'est disponible pour ce produit."}
            </Text>
          )}

          <TouchableOpacity style={[styles.accordionHeader, { borderTopWidth: 1, borderTopColor: theme.colors.border }]} onPress={() => setShowNutrition(!showNutrition)}>
            <View style={styles.accordionHeaderLeft}>
              <ShieldAlert size={20} color={theme.colors.primary} />
              <Text style={styles.accordionTitle}>Valeurs Nutritionnelles & Dosage</Text>
            </View>
            <Text style={styles.toggleText}>{showNutrition ? 'Réduire' : 'Afficher'}</Text>
          </TouchableOpacity>
          {showNutrition && (
            <View style={styles.accordionBody}>
              <Text style={styles.bodyBold}>Conseil d'utilisation :</Text>
              <Text style={styles.bodyParagraph}>
                Mélanger 1 portion avec de l'eau froide ou du lait. À consommer de préférence avant ou après l'entraînement selon vos objectifs.
              </Text>
              {product.nutrition_values && (
                <>
                  <Text style={[styles.bodyBold, { marginTop: theme.spacing.sm }]}>Valeurs :</Text>
                  <Text style={styles.bodyParagraph}>{product.nutrition_values}</Text>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 4. Bottom Cart CTA bar */}
      <View style={[styles.bottomBar, theme.shadows.heavy]}>
        <View style={styles.bottomBarPriceWrapper}>
          <Text style={styles.bottomBarLabel}>Prix Total</Text>
          <Text style={styles.bottomBarPrice}>{(promoPrice ?? price).toFixed(3)} TND</Text>
        </View>
        <TouchableOpacity
          style={[styles.cartSubmitBtn, isOutOfStock && styles.cartSubmitBtnDisabled]}
          disabled={isOutOfStock}
          onPress={handleAddToCart}>
          <ShoppingCart size={20} color={theme.colors.white} style={{ marginRight: theme.spacing.sm }} />
          <Text style={styles.cartSubmitBtnText}>Ajouter au panier</Text>
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
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textMuted,
  },
  imageContainer: {
    height: 300,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '90%',
    height: '90%',
  },
  floatingActions: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaSection: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  name: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: theme.spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginRight: theme.spacing.sm,
  },
  inStock: {
    backgroundColor: '#DEF7EC',
  },
  outStock: {
    backgroundColor: '#FDE8E8',
  },
  stockText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
  },
  inStockText: {
    color: theme.colors.success,
  },
  outStockText: {
    color: theme.colors.error,
  },
  goalRecommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  goalRecommendationText: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  priceRow: {
    marginTop: theme.spacing.xs,
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 22,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
  },
  promoPrice: {
    fontSize: 22,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  oldPrice: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  accordionContainer: {
    backgroundColor: theme.colors.card,
    marginTop: theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: 100, // Safe space from bottom CTA
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  toggleText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  accordionBody: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 22,
    paddingBottom: theme.spacing.md,
  },
  bodyBold: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  bodyParagraph: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBarPriceWrapper: {
    flexDirection: 'column',
  },
  bottomBarLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  bottomBarPrice: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
    marginTop: 2,
  },
  cartSubmitBtn: {
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    flex: 1,
    marginLeft: theme.spacing.lg,
    justifyContent: 'center',
  },
  cartSubmitBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
  cartSubmitBtnText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm + 1,
  },
});

// End of file
