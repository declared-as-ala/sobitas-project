import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import ProductCard from '../components/ProductCard';
import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import Button from '../components/Button';

export default function WishlistScreen() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem('protein-favorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load favorites', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {favorites.length === 0 ? (
        <View style={styles.centerContainer}>
          <Heart size={44} color={theme.colors.textMuted} />
          <Text style={styles.promoText}>Votre liste de favoris est vide.</Text>
          <Button title="Visiter la boutique" style={{ width: '80%' }} onPress={() => router.push('/(tabs)/shop')} />
        </View>
      ) : (
        <FlatList
          data={favorites}
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
          onRefresh={loadFavorites}
          refreshing={loading}
        />
      )}
    </View>
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
  },
  promoText: {
    fontSize: theme.typography.sizes.sm + 1,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  gridWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  listPadding: {
    paddingBottom: theme.spacing.xl,
  },
});
