import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { shopApi } from '../../services/api';
import { theme } from '../../constants/theme';
import ProductCard from '../../components/ProductCard';
import { useAuthStore } from '../../store/auth';
import { router } from 'expo-router';
import { MessageSquare, Calculator, Flame, ChevronRight, Award } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { isAuthenticated, user } = useAuthStore();

  // 1. Fetch Home shop data (banners, flash sales, categories)
  const { data: homeData, isLoading } = useQuery({
    queryKey: ['accueil'],
    queryFn: async () => {
      const res = await shopApi.get('/accueil');
      return res.data;
    },
  });

  // 2. Fetch loyalty points if logged in
  const { data: loyaltyData } = useQuery({
    queryKey: ['loyalty-summary', user?.id],
    queryFn: async () => {
      const res = await shopApi.get('/profil');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const categories = homeData?.categories || [];
  const flashSales = homeData?.ventes_flash || [];
  const bestSellers = homeData?.best_sellers || [];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Header Banner/Promotion */}
      <View style={styles.heroBanner}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600' }}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroSubtitle}>PROTEIN.TN ELITE</Text>
          <Text style={styles.heroTitle}>BUILD YOUR LEGACY</Text>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => router.push('/(tabs)/shop')}>
            <Text style={styles.heroButtonText}>Acheter maintenant</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Loyalty Point summary card */}
      {isAuthenticated ? (
        <View style={[styles.loyaltyCard, theme.shadows.medium]}>
          <View style={styles.loyaltyHeader}>
            <View style={styles.loyaltyPointsWrapper}>
              <Award size={24} color={theme.colors.primary} />
              <Text style={styles.loyaltyLabel}>Points Fidélité</Text>
            </View>
            <Text style={styles.pointsValue}>
              {loyaltyData?.loyalty_points_balance || 0} pts
            </Text>
          </View>
          <TouchableOpacity
            style={styles.rewardsButton}
            onPress={() => router.push('/(tabs)/rewards')}>
            <Text style={styles.rewardsButtonText}>Voir mes avantages</Text>
            <ChevronRight size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.loginPromoCard, theme.shadows.medium]}
          onPress={() => router.push('/login')}>
          <View style={styles.loginPromoText}>
            <Text style={styles.loginPromoTitle}>Rejoignez le Club Protein.tn</Text>
            <Text style={styles.loginPromoSubtitle}>Cumulez des points, débloquez des réductions.</Text>
          </View>
          <View style={styles.loginPromoBtn}>
            <Text style={styles.loginPromoBtnText}>Connexion</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 3. Quick entry widgets */}
      <View style={styles.shortcutsRow}>
        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => router.push('/ai-coach')}>
          <View style={[styles.shortcutIconWrapper, { backgroundColor: '#E0F2FE' }]}>
            <MessageSquare size={24} color="#0284C7" />
          </View>
          <Text style={styles.shortcutTitle}>AI Coach</Text>
          <Text style={styles.shortcutDesc}>Conseils fitness</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={() => router.push('/calculator')}>
          <View style={[styles.shortcutIconWrapper, { backgroundColor: '#FEE2E2' }]}>
            <Calculator size={24} color={theme.colors.error} />
          </View>
          <Text style={styles.shortcutTitle}>Calculateur</Text>
          <Text style={styles.shortcutDesc}>BMR & Calories</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Categories Scroll */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Catégories</Text>
      </View>
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.categoriesList}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => router.push({ pathname: '/(tabs)/shop', params: { categorySlug: item.slug } })}>
            <View style={styles.categoryCircle}>
              <Image
                source={{ uri: item.cover ? `http://localhost/storage/${item.cover}` : 'https://via.placeholder.com/60' }}
                style={styles.categoryImg}
              />
            </View>
            <Text style={styles.categoryLabel} numberOfLines={1}>
              {item.designation_fr}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* 5. Ventes Flash (Flash sales) */}
      {flashSales.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Flame size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>Ventes Flash</Text>
            </View>
          </View>
          <FlatList
            data={flashSales}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.flashList}
            renderItem={({ item }: { item: any }) => (
              <View style={{ marginRight: theme.spacing.md }}>
                <ProductCard
                  product={item}
                  onPress={() => router.push(`/product/${item.slug}`)}
                />
              </View>
            )}
          />
        </View>
      )}

      {/* 6. Best Sellers Grid */}
      <View style={[styles.section, { marginBottom: theme.spacing.xl }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meilleures Ventes</Text>
        </View>
        <View style={styles.productsGrid}>
          {bestSellers.slice(0, 6).map((item: any) => (
            <ProductCard
              key={item.id.toString()}
              product={item}
              onPress={() => router.push(`/product/${item.slug}`)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBanner: {
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  heroSubtitle: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.heavy,
    letterSpacing: 2,
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.heavy,
    marginVertical: theme.spacing.xs,
  },
  heroButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  heroButtonText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.xs,
  },
  loyaltyCard: {
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
  },
  loyaltyPointsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loyaltyLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    marginLeft: theme.spacing.xs,
    color: theme.colors.text,
  },
  pointsValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  rewardsButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
  },
  rewardsButtonText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
    marginRight: 4,
  },
  loginPromoCard: {
    backgroundColor: theme.colors.secondary,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loginPromoText: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  loginPromoTitle: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.md,
  },
  loginPromoSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  loginPromoBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
  },
  loginPromoBtnText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.xs,
  },
  shortcutsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  shortcutCard: {
    width: (width - 48) / 2,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shortcutIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  shortcutTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  shortcutDesc: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginTop: theme.spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
    textTransform: 'uppercase',
  },
  categoriesList: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: theme.spacing.lg,
    width: 70,
  },
  categoryCircle: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  categoryImg: {
    width: '80%',
    height: '80%',
    borderRadius: theme.borderRadius.round,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    width: '100%',
  },
  flashList: {
    paddingLeft: theme.spacing.md,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'space-between',
  },
});
