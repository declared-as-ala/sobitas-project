import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fitnessApi } from '../services/api';
import { theme } from '../constants/theme';
import { useAuthStore } from '../store/auth';
import Input from '../components/Input';
import Button from '../components/Button';
import { Calculator, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';

export default function CalculatorScreen() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [activity, setActivity] = useState('moderate');
  const [goal, setGoal] = useState('muscle_gain');

  const [calculated, setCalculated] = useState<any | null>(null);

  // Fetch current fitness profile to pre-fill if authenticated
  const { data: profile } = useQuery({
    queryKey: ['fitness-profile-calc'],
    queryFn: async () => {
      const res = await fitnessApi.get('/fitness-profile');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (profile) {
      setWeight(profile.weight?.toString() || '');
      setHeight(profile.height?.toString() || '');
      setAge(profile.age?.toString() || '');
      setGender(profile.gender || 'male');
      setActivity(profile.activityLevel || 'moderate');
      setGoal(profile.goal || 'muscle_gain');
    }
  }, [profile]);

  // Calculate targets mathematically (fallback/offline calculation matching NestJS algorithms!)
  const handleCalculate = () => {
    if (!weight || !height || !age) {
      Alert.alert('Erreur', 'Veuillez remplir le poids, la taille et l\'âge.');
      return;
    }

    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age, 10);

    // BMR (Mifflin-St Jeor)
    let bmr = 10 * w + 6.25 * h - 5 * a;
    if (gender === 'male') {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    // TDEE multipliers
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const tdee = Math.round(bmr * (multipliers[activity] || 1.2));

    // Target Calories adjustments
    let caloriesTarget = tdee;
    if (goal === 'weight_loss') {
      caloriesTarget -= 500;
    } else if (goal === 'muscle_gain') {
      caloriesTarget += 300;
    }

    // Macros split (standard athletic target ratios)
    const proteinTarget = Math.round(w * 2); // 2g protein per kg
    const fatTarget = Math.round((caloriesTarget * 0.25) / 9); // 25% fat
    const carbsTarget = Math.round((caloriesTarget - (proteinTarget * 4 + fatTarget * 9)) / 4);

    setCalculated({
      bmr: Math.round(bmr),
      tdee,
      calories: caloriesTarget,
      protein: proteinTarget,
      carbs: carbsTarget,
      fat: fatTarget,
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fitnessApi.post('/fitness-profile', {
        gender,
        age: parseInt(age, 10),
        height: parseFloat(height),
        weight: parseFloat(weight),
        activityLevel: activity,
        goal,
        dailyCalorieTarget: calculated.calories,
        dailyProteinTarget: calculated.protein,
        dailyCarbsTarget: calculated.carbs,
        dailyFatTarget: calculated.fat,
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Succès', 'Objectifs enregistrés dans votre profil fitness.');
      queryClient.invalidateQueries({ queryKey: ['fitness-profile'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible d\'enregistrer.');
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Entrez vos données de calcul</Text>
        
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
            onPress={() => setGender('male')}>
            <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>Homme</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
            onPress={() => setGender('female')}>
            <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>Femme</Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Poids (kg)"
          placeholder="Ex: 80"
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
        />

        <Input
          label="Taille (cm)"
          placeholder="Ex: 180"
          keyboardType="numeric"
          value={height}
          onChangeText={setHeight}
        />

        <Input
          label="Âge"
          placeholder="Ex: 26"
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
        />

        {/* Activity multiplier selection dropdown style */}
        <Text style={styles.label}>Niveau d'activité</Text>
        <View style={styles.optionsCol}>
          {[
            { id: 'sedentary', label: 'Sédentaire (Pas de sport)' },
            { id: 'light', label: 'Léger (1-3 séances/semaine)' },
            { id: 'moderate', label: 'Modéré (3-5 séances/semaine)' },
            { id: 'active', label: 'Très actif (Entraînement quotidien)' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.optionBadge, activity === item.id && styles.optionBadgeActive]}
              onPress={() => setActivity(item.id)}>
              <Text style={[styles.optionText, activity === item.id && styles.optionTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goal selection */}
        <Text style={[styles.label, { marginTop: theme.spacing.sm }]}>Objectif</Text>
        <View style={styles.optionsCol}>
          {[
            { id: 'muscle_gain', label: 'Prise de masse (Surplus)' },
            { id: 'weight_loss', label: 'Perte de poids (Déficit)' },
            { id: 'maintain', label: 'Maintien de forme' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.optionBadge, goal === item.id && styles.optionBadgeActive]}
              onPress={() => setGoal(item.id)}>
              <Text style={[styles.optionText, goal === item.id && styles.optionTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Calculer mes objectifs"
          style={{ marginTop: theme.spacing.md }}
          onPress={handleCalculate}
        />
      </View>

      {/* Display calculation result details */}
      {calculated && (
        <View style={[styles.resultCard, theme.shadows.medium]}>
          <View style={styles.resultHeader}>
            <Sparkles size={20} color={theme.colors.primary} />
            <Text style={styles.resultTitle}>Vos Objectifs Conseillés</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>BMR (Métabolisme de base)</Text>
            <Text style={styles.resultVal}>{calculated.bmr} kcal</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>TDEE (Calories de maintien)</Text>
            <Text style={styles.resultVal}>{calculated.tdee} kcal</Text>
          </View>

          <View style={[styles.resultRow, styles.mainResultRow]}>
            <Text style={styles.mainResultLabel}>Calories Cibles</Text>
            <Text style={styles.mainResultVal}>{calculated.calories} kcal/jour</Text>
          </View>

          <Text style={styles.macrosSubTitle}>Répartition des Macros :</Text>

          <View style={styles.macroSplitRow}>
            <View style={styles.macroSplitCol}>
              <Text style={[styles.macroLabel, { color: theme.colors.primary }]}>Protéines</Text>
              <Text style={styles.macroVal}>{calculated.protein}g</Text>
            </View>
            <View style={styles.macroSplitCol}>
              <Text style={[styles.macroLabel, { color: '#F59E0B' }]}>Glucides</Text>
              <Text style={styles.macroVal}>{calculated.carbs}g</Text>
            </View>
            <View style={styles.macroSplitCol}>
              <Text style={[styles.macroLabel, { color: '#10B981' }]}>Lipides</Text>
              <Text style={styles.macroVal}>{calculated.fat}g</Text>
            </View>
          </View>

          {isAuthenticated && (
            <Button
              title="Enregistrer ces objectifs"
              style={styles.saveBtn}
              isLoading={saveMutation.isPending}
              onPress={() => saveMutation.mutate()}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  genderRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  genderBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  genderBtnActive: {
    backgroundColor: theme.colors.orangeLight,
    borderColor: theme.colors.primary,
  },
  genderText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  genderTextActive: {
    color: theme.colors.primary,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  optionsCol: {
    marginBottom: theme.spacing.md,
  },
  optionBadge: {
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: '#F1F3F5',
    borderRadius: theme.borderRadius.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionBadgeActive: {
    backgroundColor: theme.colors.orangeLight,
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  optionTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  resultCard: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  resultTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.white,
    marginLeft: 6,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  resultLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: theme.typography.sizes.sm,
  },
  resultVal: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },
  mainResultRow: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginVertical: theme.spacing.sm,
  },
  mainResultLabel: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm + 1,
  },
  mainResultVal: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.heavy,
    fontSize: theme.typography.sizes.md + 1,
  },
  macrosSubTitle: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  macroSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  macroSplitCol: {
    flex: 1,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  macroVal: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.heavy,
    fontSize: theme.typography.sizes.md,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
  },
});
