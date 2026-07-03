import React, { useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { shopApi } from '../../services/api';
import { theme } from '../../constants/theme';
import ProductCard from '../../components/ProductCard';
import { useAuthStore } from '../../store/auth';
import { router } from 'expo-router';
import {
  MessageSquare,
  Calculator,
  Flame,
  ChevronRight,
  ChevronLeft,
  Bell,
  Dumbbell,
  Zap,
  TrendingUp,
  Pill,
  FlaskConical,
  Cookie,
  Package,
  Droplets,
  Coffee,
  Apple,
  ShoppingBag,
  Heart,
  Brain,
  Moon,
  Shield,
  Activity,
  Target,
  Beef,
  Leaf,
  Blend,
  LucideIcon,
} from 'lucide-react-native';

const LOGO = require('../../../assets/images/branding/logo.png');

// Icon + accent color per category — keywords matched against slug + French designation.
const CATEGORY_ICON_MAP: { keywords: string[]; icon: LucideIcon; color: string }[] = [
  // Protein
  { keywords: ['whey', 'proteine', 'protein', 'isolat', 'caséine', 'casein', 'iso'], icon: Dumbbell, color: theme.colors.primary },
  // Creatine
  { keywords: ['creatine', 'créatine', 'kre-alkalyn'], icon: Zap, color: '#F59E0B' },
  // Mass / weight gainer
  { keywords: ['gainer', 'masse', 'weight-gain', 'prise-de-masse', 'hypercaloriq'], icon: TrendingUp, color: '#10B981' },
  // Vitamins & minerals
  { keywords: ['vitamine', 'mineraux', 'vitamin', 'mineral', 'zinc', 'magnesium', 'omega', 'collagene', 'collagen'], icon: Pill, color: '#8B5CF6' },
  // Fat burners & thermogenics
  { keywords: ['bruleur', 'graisse', 'fat-burner', 'thermogenic', 'minceur', 'diete', 'diète', 'perte'], icon: Flame, color: '#EF4444' },
  // Amino acids, BCAA, EAA
  { keywords: ['acide', 'amine', 'bcaa', 'eaa', 'glutamine', 'arginine', 'amino'], icon: FlaskConical, color: '#0EA5E9' },
  // Bars & snacks
  { keywords: ['barre', 'snack', 'collation', 'cookie', 'brownie', 'gateau'], icon: Cookie, color: '#D97706' },
  // Pre-workout & energy
  { keywords: ['pre-workout', 'preworkout', 'pre workout', 'energie', 'energy', 'booster', 'pump', 'nitric'], icon: Activity, color: '#FF4500' },
  // Post-workout & recovery
  { keywords: ['post-workout', 'recovery', 'recuperation', 'récupération', 'repair'], icon: Shield, color: '#06B6D4' },
  // Hydration & electrolytes
  { keywords: ['hydration', 'hydratation', 'electrolyte', 'eau', 'isotonique', 'boisson'], icon: Droplets, color: '#22D3EE' },
  // Testosterone & hormone support
  { keywords: ['testosterone', 'testostérone', 'hormone', 'tribulus', 'zma', 'booster-t', 'virilite'], icon: Target, color: '#DC2626' },
  // Sleep & recovery
  { keywords: ['sommeil', 'sleep', 'melatonin', 'mélatonin', 'nuit', 'night', 'relax'], icon: Moon, color: '#6366F1' },
  // Nootropics / focus / brain
  { keywords: ['nootropic', 'focus', 'concentration', 'cerveau', 'cognit', 'brain'], icon: Brain, color: '#A855F7' },
  // Health & wellness
  { keywords: ['sante', 'santé', 'wellness', 'bien-etre', 'bien-être', 'probiotique', 'probiot'], icon: Heart, color: '#EC4899' },
  // Vegan / plant-based
  { keywords: ['vegan', 'vegetal', 'végétal', 'plant', 'plante', 'bio', 'organic'], icon: Leaf, color: '#16A34A' },
  // Protein food / high-protein food
  { keywords: ['alimentaire', 'nourriture', 'food', 'repas', 'meal', 'riz', 'avoine', 'oat'], icon: Apple, color: '#84CC16' },
  // Beef protein / animal
  { keywords: ['boeuf', 'beef', 'animal', 'colostrum'], icon: Beef, color: '#B45309' },
  // Coffee / caffeine
  { keywords: ['cafe', 'café', 'coffee', 'caffeine', 'caféine'], icon: Coffee, color: '#78350F' },
  // Blends / all-in-one
  { keywords: ['blend', 'melange', 'mélange', 'all-in-one', 'stack', 'complex', 'complexe'], icon: Blend, color: '#7C3AED' },
  // Accessories / equipment
  { keywords: ['accessoire', 'equipement', 'shaker', 'sport', 'materiel'], icon: ShoppingBag, color: '#64748B' },
];

const getCategoryIcon = (category: any) => {
  const haystack = `${category?.slug || ''} ${category?.designation_fr || ''}`.toLowerCase();
  const match = CATEGORY_ICON_MAP.find((entry) => entry.keywords.some((kw) => haystack.includes(kw)));
  return match || { icon: Package, color: theme.colors.textMuted };
};

const CATEGORY_ITEM_WIDTH = 132;

export default function HomeScreen() {
  const { isAuthenticated } = useAuthStore();
  const categoriesRef = useRef<FlatList>(null);
  const [categoryPage, setCategoryPage] = useState(0);

  // 1. Fetch Home shop data (categories, flash sales, best sellers)
  const { data: homeData, isLoading } = useQuery({
    queryKey: ['accueil'],
    queryFn: async () => {
      const res = await shopApi.get('/accueil');
      return res.data;
    },
  });

  const categories = homeData?.categories || [];
  const flashSales = homeData?.ventes_flash || [];
  const bestSellers = homeData?.best_sellers || [];

  const scrollCategories = (direction: 'prev' | 'next') => {
    const nextPage = direction === 'next' ? categoryPage + 1 : Math.max(0, categoryPage - 1);
    setCategoryPage(nextPage);
    categoriesRef.current?.scrollToOffset({ offset: nextPage * CATEGORY_ITEM_WIDTH, animated: true });
  };

  const handleCategoriesScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCategoryPage(Math.round(e.nativeEvent.contentOffset.x / CATEGORY_ITEM_WIDTH));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Editorial hero — no photo, just logo + bold split-color typography */}
      <View style={styles.heroSection}>
        <View style={styles.heroTopRow}>
          <Image source={LOGO} style={styles.heroLogo} resizeMode="contain" />
          <TouchableOpacity
            style={styles.heroBellBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/notifications')}>
            <Bell size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroHeadlineBlock}>
          <Text style={styles.heroHeadline}>
            FUEL YOUR{'\n'}
            <Text style={styles.heroHeadlineAccent}>PROGRESS.</Text>
          </Text>
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroAccentBar}
          />
          <Text style={styles.heroSubtitle}>Compléments alimentaires premium 🇹🇳</Text>
        </View>

        <TouchableOpacity style={styles.heroButton} activeOpacity={0.85} onPress={() => router.push('/(tabs)/shop')}>
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroButtonGradient}>
            <Text style={styles.heroButtonText}>Découvrir la boutique</Text>
            <ChevronRight size={16} color={theme.colors.white} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick entry widgets */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity style={styles.shortcutPill} activeOpacity={0.85} onPress={() => router.push('/ai-coach')}>
            <MessageSquare size={18} color={theme.colors.primary} />
            <Text style={styles.shortcutPillText}>AI Coach</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutPill} activeOpacity={0.85} onPress={() => router.push('/calculator')}>
            <Calculator size={18} color={theme.colors.primary} />
            <Text style={styles.shortcutPillText}>Calculateur</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Categories carousel — icon cards, no cover images */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Catégories</Text>
        <View style={styles.carouselArrows}>
          <TouchableOpacity
            style={[styles.carouselArrowBtn, categoryPage === 0 && styles.carouselArrowBtnDisabled]}
            disabled={categoryPage === 0}
            onPress={() => scrollCategories('prev')}>
            <ChevronLeft size={16} color={categoryPage === 0 ? theme.colors.border : theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.carouselArrowBtn, categoryPage >= categories.length - 1 && styles.carouselArrowBtnDisabled]}
            disabled={categoryPage >= categories.length - 1}
            onPress={() => scrollCategories('next')}>
            <ChevronRight size={16} color={categoryPage >= categories.length - 1 ? theme.colors.border : theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        ref={categoriesRef}
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CATEGORY_ITEM_WIDTH}
        decelerationRate="fast"
        onMomentumScrollEnd={handleCategoriesScroll}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.categoriesList}
        renderItem={({ item }: { item: any }) => {
          const { icon: Icon, color } = getCategoryIcon(item);
          return (
            <TouchableOpacity
              style={styles.categoryCard}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(tabs)/shop', params: { categorySlug: item.slug } })}>
              <View style={[styles.categoryIconChip, { backgroundColor: `${color}1A` }]}>
                <Icon size={22} color={color} />
              </View>
              <Text style={styles.categoryLabel} numberOfLines={2}>
                {item.designation_fr}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* 3. Ventes Flash (Flash sales) */}
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

      {/* 4. Best Sellers Grid */}
      <View style={[styles.section, { marginBottom: theme.spacing.xl + 80 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meilleures Ventes</Text>
          <TouchableOpacity style={styles.seeAllRow} onPress={() => router.push('/(tabs)/shop')}>
            <Text style={styles.seeAllText}>Voir tout</Text>
            <ChevronRight size={14} color={theme.colors.primary} />
          </TouchableOpacity>
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
  heroSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLogo: {
    width: 110,
    height: 34,
  },
  heroBellBtn: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroHeadlineBlock: {
    marginTop: theme.spacing.xl,
  },
  heroHeadline: {
    color: theme.colors.text,
    fontSize: 42,
    lineHeight: 44,
    fontWeight: theme.typography.weights.heavy,
    letterSpacing: -0.5,
  },
  heroHeadlineAccent: {
    color: theme.colors.primary,
  },
  heroAccentBar: {
    width: 64,
    height: 6,
    borderRadius: theme.borderRadius.round,
    marginTop: theme.spacing.sm,
  },
  heroSubtitle: {
    fontSize: theme.typography.sizes.sm + 1,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    fontWeight: theme.typography.weights.medium,
  },
  heroButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
    marginTop: theme.spacing.lg,
  },
  heroButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
  },
  heroButtonText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
    marginRight: 4,
  },
  shortcutsRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.xl,
  },
  shortcutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    marginRight: theme.spacing.sm,
  },
  shortcutPillText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginLeft: 6,
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
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginRight: 2,
  },
  carouselArrows: {
    flexDirection: 'row',
  },
  carouselArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.xs,
  },
  carouselArrowBtnDisabled: {
    opacity: 0.4,
  },
  categoriesList: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  categoryCard: {
    width: CATEGORY_ITEM_WIDTH - 12,
    marginRight: 12,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  categoryIconChip: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    lineHeight: 16,
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
