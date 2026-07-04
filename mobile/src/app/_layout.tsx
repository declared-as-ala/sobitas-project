import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/auth';
import { useFitnessStore } from '../store/fitness';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const loadSession = useAuthStore((state) => state.loadSession);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setOnlineStatus = useFitnessStore((state) => state.setOnlineStatus);

  useEffect(() => {
    // 1. Load active user session on startup
    loadSession();

    // 2. Setup NetInfo network observer for offline trackers sync queue
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnlineStatus(!!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: theme.typography.weights.bold,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}>
        {/* Main bottom tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Auth routes */}
        <Stack.Screen name="login" options={{ title: 'Connexion', headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Inscription', headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Onboarding Fitness', headerShown: false }} />
        
        {/* Core detail/utility screens */}
        <Stack.Screen name="product/[slug]" options={{ title: 'Produit' }} />
        <Stack.Screen name="cart" options={{ title: 'Mon Panier' }} />
        <Stack.Screen name="checkout" options={{ title: 'Caisse' }} />
        <Stack.Screen name="orders" options={{ title: 'Commandes' }} />
        <Stack.Screen name="ai-coach" options={{ title: 'AI Coach Fitness' }} />
        <Stack.Screen name="progress" options={{ title: 'Body Progress' }} />
        <Stack.Screen name="workouts/[id]" options={{ title: 'Séance' }} />
        <Stack.Screen name="workout-plan" options={{ title: 'Mon Programme' }} />
        <Stack.Screen name="supplement-stack" options={{ title: 'Supplement Stack' }} />
        <Stack.Screen name="rewards" options={{ title: 'Fidélité & Parrainage' }} />
        <Stack.Screen name="wishlist" options={{ title: 'Favoris' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Stack>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
