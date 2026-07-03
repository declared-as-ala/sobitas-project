import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fitnessApi } from '../../services/api';
import { theme } from '../../constants/theme';
import MacroCard from '../../components/MacroCard';
import WorkoutCard from '../../components/WorkoutCard';
import { useAuthStore } from '../../store/auth';
import { useFitnessStore } from '../../store/fitness';
import { router } from 'expo-router';
import { GlassWater, Plus, Info, WifiOff, Dumbbell, ChevronRight } from 'lucide-react-native';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function FitnessScreen() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { isOnline, queueLog, localWaterLogs, localProteinLogs } = useFitnessStore();

  const [isWaterModalVisible, setIsWaterModalVisible] = useState(false);
  const [isProteinModalVisible, setIsProteinModalVisible] = useState(false);

  // Protein log form fields
  const [mealType, setMealType] = useState('Breakfast');
  const [proteinAmount, setProteinAmount] = useState('');
  const [mealDescription, setMealDescription] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch user fitness profile (goals, target stats)
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['fitness-profile'],
    queryFn: async () => {
      const res = await fitnessApi.get('/fitness-profile');
      return res.data;
    },
    enabled: isAuthenticated,
    retry: false,
  });

  // 2. Fetch today's water logs
  const { data: waterData, isLoading: isWaterLoading } = useQuery({
    queryKey: ['water-logs', today],
    queryFn: async () => {
      const res = await fitnessApi.get(`/water-tracker/${today}`);
      return res.data;
    },
    enabled: isAuthenticated && isOnline,
  });

  // 3. Fetch today's protein logs
  const { data: proteinData, isLoading: isProteinLoading } = useQuery({
    queryKey: ['protein-logs', today],
    queryFn: async () => {
      const res = await fitnessApi.get(`/protein-tracker/${today}`);
      return res.data;
    },
    enabled: isAuthenticated && isOnline,
  });

  // 4. Fetch workout programs matching goal
  const { data: programs, isLoading: isProgramsLoading } = useQuery({
    queryKey: ['fitness-programs', profile?.goal],
    queryFn: async () => {
      const res = await fitnessApi.get('/workouts', {
        params: profile?.goal ? { category: profile.goal } : {},
      });
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Resolve totals (using local store cache first as backup for offline-first behavior!)
  const waterTarget = profile?.dailyWaterTarget || 2500;
  const currentWater = isOnline && waterData ? waterData.total : (localWaterLogs[today] || 0);

  const proteinTarget = profile?.dailyProteinTarget || 150;
  const currentProtein = isOnline && proteinData ? proteinData.total : (localProteinLogs[today] || 0);

  // Handle Water Logging
  const handleLogWater = (amount: number) => {
    queueLog('water', {
      amount,
      date: today,
    });
    setIsWaterModalVisible(false);
    
    // Invalidate queries so it fetches fresh data if online
    if (isOnline) {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['water-logs'] }), 500);
    }
  };

  // Handle Protein Logging
  const handleLogProtein = () => {
    if (!proteinAmount || isNaN(Number(proteinAmount))) return;
    
    queueLog('protein', {
      mealType,
      proteinAmount: parseInt(proteinAmount, 10),
      description: mealDescription || undefined,
      date: today,
    });

    setProteinAmount('');
    setMealDescription('');
    setIsProteinModalVisible(false);

    if (isOnline) {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['protein-logs'] }), 500);
    }
  };

  // Render Guest / Onboarding Screens if needed
  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Info size={40} color={theme.colors.textMuted} />
        <Text style={styles.promoText}>Connectez-vous pour suivre vos objectifs fitness personnalisés.</Text>
        <Button title="Se connecter" style={styles.promoBtn} onPress={() => router.push('/login')} />
      </View>
    );
  }

  // If profile doesn't exist, prompt to onboarding
  if (!isProfileLoading && !profile) {
    return (
      <View style={styles.centerContainer}>
        <Dumbbell size={40} color={theme.colors.primary} />
        <Text style={styles.promoText}>Calculez vos calories, macros, et générez votre programme d'entraînement.</Text>
        <Button title="Commencer l'onboarding" style={styles.promoBtn} onPress={() => router.push('/onboarding')} />
      </View>
    );
  }

  if (isProfileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Offline Status Badge */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color={theme.colors.white} style={{ marginRight: 6 }} />
          <Text style={styles.offlineText}>Mode hors ligne. Vos suivis seront synchronisés.</Text>
        </View>
      )}

      {/* 1. Macro targets summary card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Objectifs Nutritionnels</Text>
        <MacroCard
          calories={{ consumed: Math.round(currentProtein * 4), target: profile.dailyCalorieTarget }}
          protein={{ consumed: currentProtein, target: proteinTarget }}
          carbs={{ consumed: 0, target: profile.dailyCarbsTarget }} // Tracked locally as simple placeholder
          fat={{ consumed: 0, target: profile.dailyFatTarget }}
        />
      </View>

      {/* 2. Trackers row (Water & Protein Buttons) */}
      <View style={styles.trackersRow}>
        {/* Water tracker card */}
        <View style={styles.trackerCard}>
          <View style={styles.trackerHeader}>
            <GlassWater size={24} color="#0284C7" />
            <Text style={styles.trackerTitle}>Eau</Text>
          </View>
          <Text style={styles.trackerValue}>{currentWater} / {waterTarget} ml</Text>
          <TouchableOpacity
            style={[styles.plusButton, { backgroundColor: '#E0F2FE' }]}
            onPress={() => setIsWaterModalVisible(true)}>
            <Plus size={20} color="#0284C7" />
          </TouchableOpacity>
        </View>

        {/* Protein tracker card */}
        <View style={styles.trackerCard}>
          <View style={styles.trackerHeader}>
            <Dumbbell size={24} color={theme.colors.primary} />
            <Text style={styles.trackerTitle}>Protéines</Text>
          </View>
          <Text style={styles.trackerValue}>{currentProtein} / {proteinTarget} g</Text>
          <TouchableOpacity
            style={[styles.plusButton, { backgroundColor: theme.colors.orangeLight }]}
            onPress={() => setIsProteinModalVisible(true)}>
            <Plus size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Link to Body progress weight history */}
      <TouchableOpacity
        style={styles.progressLinkCard}
        onPress={() => router.push('/progress')}>
        <View>
          <Text style={styles.progressLinkTitle}>Évolution du poids</Text>
          <Text style={styles.progressLinkSubtitle}>Graphiques et mensurations corporelles</Text>
        </View>
        <ChevronRight size={20} color={theme.colors.textMuted} />
      </TouchableOpacity>

      {/* 4. Workout Program List */}
      <View style={[styles.section, { marginBottom: theme.spacing.xl }]}>
        <Text style={styles.sectionTitle}>Programmes Suggérés</Text>
        {isProgramsLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : programs && programs.length > 0 ? (
          programs.map((prog: any) => (
            <WorkoutCard
              key={prog.id.toString()}
              program={prog}
              onPress={() => router.push(`/workouts/${prog.id}`)}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>Aucun programme disponible pour vos filtres.</Text>
        )}
      </View>

      {/* Water Selection Modal */}
      <Modal
        visible={isWaterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsWaterModalVisible(false)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setIsWaterModalVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ajouter de l'eau</Text>
            <View style={styles.waterButtonsRow}>
              <TouchableOpacity style={styles.waterOption} onPress={() => handleLogWater(250)}>
                <GlassWater size={32} color="#0284C7" />
                <Text style={styles.waterOptionText}>+ 250 ml</Text>
                <Text style={styles.waterOptionSub}>Tasse / Verre</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.waterOption} onPress={() => handleLogWater(500)}>
                <GlassWater size={40} color="#0284C7" />
                <Text style={styles.waterOptionText}>+ 500 ml</Text>
                <Text style={styles.waterOptionSub}>Bouteille</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Protein Logging Modal */}
      <Modal
        visible={isProteinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsProteinModalVisible(false)}>
        <View style={styles.slideModalOverlay}>
          <View style={styles.slideModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enregistrer des Protéines</Text>
              <TouchableOpacity onPress={() => setIsProteinModalVisible(false)}>
                <Text style={styles.closeText}>Fermer</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.label}>Repas / Moment</Text>
              <View style={styles.optionsRow}>
                {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Protein shake'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.badgeOption, mealType === type && styles.badgeOptionActive]}
                    onPress={() => setMealType(type)}>
                    <Text style={[styles.badgeOptionText, mealType === type && styles.badgeOptionTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Quantité de protéines (g)"
                placeholder="Ex: 30"
                keyboardType="numeric"
                value={proteinAmount}
                onChangeText={setProteinAmount}
              />

              <Input
                label="Description du repas (optionnel)"
                placeholder="Ex: Œufs brouillés avec pain complet"
                value={mealDescription}
                onChangeText={setMealDescription}
              />

              <Button title="Enregistrer" style={{ marginTop: theme.spacing.md }} onPress={handleLogProtein} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  promoText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  promoBtn: {
    width: '80%',
  },
  offlineBanner: {
    backgroundColor: theme.colors.error,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trackersRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  trackerCard: {
    width: (Dimensions.get('window').width - 48) / 2,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  trackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  trackerTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginLeft: 6,
  },
  trackerValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textMuted,
    marginVertical: theme.spacing.xs,
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  progressLinkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressLinkTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  progressLinkSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontStyle: 'italic',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  waterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: theme.spacing.sm,
  },
  waterOption: {
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  waterOptionText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  waterOptionSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  slideModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  slideModalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    height: '60%',
    padding: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
  },
  closeText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  modalScroll: {
    flex: 1,
    marginTop: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  badgeOption: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#F1F3F5',
    marginRight: 6,
    marginBottom: 6,
  },
  badgeOptionActive: {
    backgroundColor: theme.colors.orangeLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  badgeOptionText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  badgeOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
});
