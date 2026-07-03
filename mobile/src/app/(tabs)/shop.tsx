import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { shopApi } from '../../services/api';
import { theme } from '../../constants/theme';
import ProductCard from '../../components/ProductCard';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';

const SORT_OPTIONS = [
  { id: 'popular', label: 'Populaire' },
  { id: 'price_asc', label: 'Prix ↑' },
  { id: 'price_desc', label: 'Prix ↓' },
];

export default function ShopScreen() {
  const params = useLocalSearchParams();
  const [searchText, setSearchText] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState('popular');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Track pagination
  const [page, setPage] = useState(1);

  // Fetch brands & categories for filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const brandsRes = await shopApi.get('/all_brands');
      const catsRes = await shopApi.get('/categories');
      return {
        brands: Array.isArray(brandsRes.data) ? brandsRes.data : brandsRes.data?.data || [],
        categories: Array.isArray(catsRes.data) ? catsRes.data : catsRes.data?.data || [],
      };
    },
  });

  // Fetch products
  const { data: productsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['shop-products', searchText, selectedBrand, selectedCategory, sortOption, minPrice, maxPrice, page],
    queryFn: async () => {
      const qParams: Record<string, any> = {
        page,
        per_page: 20,
        sort: sortOption,
      };
      
      if (searchText.trim()) qParams.search = searchText.trim();
      if (selectedBrand) qParams.brand_id = selectedBrand;
      if (selectedCategory) qParams.category_id = selectedCategory;
      if (minPrice) qParams.min_price = Number(minPrice);
      if (maxPrice) qParams.max_price = Number(maxPrice);

      const res = await shopApi.get('/all_products', { params: qParams });
      
      // Resolve different payload shapes returned by Laravel endpoints
      const products = res.data?.products || [];
      const formattedProducts = Array.isArray(products) ? products : products.data || [];
      return {
        products: formattedProducts,
        pagination: res.data?.pagination || null,
      };
    },
  });

  // Handle incoming category filter from home screen
  useEffect(() => {
    if (params.categorySlug && filterOptions?.categories) {
      const cat = filterOptions.categories.find((c: any) => c.slug === params.categorySlug);
      if (cat) {
        setSelectedCategory(cat.id);
        setPage(1);
      }
    }
  }, [params.categorySlug, filterOptions]);

  const handleResetFilters = () => {
    setSelectedBrand(null);
    setSelectedCategory(null);
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
    setIsFilterModalVisible(false);
  };

  const productsList = productsData?.products || [];

  return (
    <View style={styles.container}>
      {/* Search & Filter Header Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Rechercher un produit..."
            style={styles.searchInput}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              setPage(1);
            }}
          />
        </View>
        <TouchableOpacity onPress={() => setIsFilterModalVisible(true)}>
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.filterButton}>
            <SlidersHorizontal size={20} color={theme.colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Quick Sort Options Row */}
      <View style={styles.sortRow}>
        <Text style={styles.resultsCount}>
          {productsList.length} Produits trouvés
        </Text>
        <View style={styles.segmentedControl}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.segment, sortOption === opt.id && styles.segmentActive]}
              onPress={() => {
                setSortOption(opt.id);
                setPage(1);
              }}>
              <Text style={[styles.segmentText, sortOption === opt.id && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Products Listing Grid */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : productsList.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Aucun produit trouvé.</Text>
        </View>
      ) : (
        <FlatList
          data={productsList}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          columnWrapperStyle={styles.gridWrapper}
          contentContainerStyle={styles.listPadding}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.slug}`)}
            />
          )}
          onRefresh={refetch}
          refreshing={isFetching}
        />
      )}

      {/* Filter Options Modal */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres de recherche</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Category selector */}
              <Text style={styles.filterSectionLabel}>Catégories</Text>
              <View style={styles.optionsGrid}>
                {filterOptions?.categories.map((cat: any) => (
                  <TouchableOpacity
                    key={cat.id.toString()}
                    style={[styles.optionBadge, selectedCategory === cat.id && styles.optionBadgeActive]}
                    onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}>
                    <Text style={[styles.optionBadgeText, selectedCategory === cat.id && styles.optionBadgeTextActive]}>
                      {cat.designation_fr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Brand selector */}
              <Text style={styles.filterSectionLabel}>Marques</Text>
              <View style={styles.optionsGrid}>
                {filterOptions?.brands.map((brand: any) => (
                  <TouchableOpacity
                    key={brand.id.toString()}
                    style={[styles.optionBadge, selectedBrand === brand.id && styles.optionBadgeActive]}
                    onPress={() => setSelectedBrand(selectedBrand === brand.id ? null : brand.id)}>
                    <Text style={[styles.optionBadgeText, selectedBrand === brand.id && styles.optionBadgeTextActive]}>
                      {brand.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price range */}
              <Text style={styles.filterSectionLabel}>Tranche de prix (TND)</Text>
              <View style={styles.priceInputsRow}>
                <TextInput
                  placeholder="Min"
                  style={styles.priceInput}
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <View style={styles.priceDivider} />
                <TextInput
                  placeholder="Max"
                  style={styles.priceInput}
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>
            </ScrollView>

            {/* Modal actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
                <Text style={styles.resetBtnText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  setPage(1);
                  setIsFilterModalVisible(false);
                }}>
                <Text style={styles.applyBtnText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    height: 52,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm + 1,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  resultsCount: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 3,
  },
  segment: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.round,
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
  },
  segmentTextActive: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.md,
  },
  gridWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  listPadding: {
    paddingBottom: theme.spacing.xl + 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    height: '75%',
    padding: theme.spacing.md,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  modalScroll: {
    flex: 1,
    marginTop: theme.spacing.md,
  },
  filterSectionLabel: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#F1F3F5',
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionBadgeActive: {
    backgroundColor: theme.colors.orangeLight,
    borderColor: theme.colors.primary,
  },
  optionBadgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  optionBadgeTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  priceInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F3F5',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  priceDivider: {
    width: theme.spacing.md,
    height: 1,
    backgroundColor: theme.colors.textMuted,
    marginHorizontal: theme.spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  resetBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resetBtnText: {
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.bold,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  applyBtnText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
  },
});
