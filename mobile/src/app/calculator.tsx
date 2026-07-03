import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { fitnessApi } from '../services/api';
import { theme } from '../constants/theme';
import { useAuthStore } from '../store/auth';
import Input from '../components/Input';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';
import CircularProgress from '../components/CircularProgress';
import { Sparkles, ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: 'Sédentaire (Pas de sport)' },
  { id: 'light', label: 'Léger (1-3 séances/semaine)' },
  { id: 'moderate', label: 'Modéré (3-5 séances/semaine)' },
  { id: 'active', label: 'Très actif (Entraînement quotidien)' },
];

const GOAL_OPTIONS = [
  { id: 'muscle_gain', label: 'Prise de masse (Surplus)' },
  { id: 'weight_loss', label: 'Perte de poids (Déficit)' },
  { id: 'maintain', label: 'Maintien de forme' },
];

const STEP_TITLES = ['Profil', 'Mensurations', 'Activité', 'Objectif'];

export default function CalculatorScreen() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const [step, setStep] = useState(0);
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
      setStep(1);
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
    setStep(4);
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

  const handleRestart = () => {
    setCalculated(null);
    setStep(0);
  };

  const isResultStep = step === 4;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Step progress dots */}
      {!isResultStep && (
        <View style={styles.progressRow}>
          {STEP_TITLES.map((title, i) => (
            <View key={title} style={styles.progressStepWrapper}>
              <View style={[styles.progressDot, i <= step && styles.progressDotActive]} />
              <Text style={[styles.progressLabel, i === step && styles.progressLabelActive]}>{title}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Step 0: Gender */}
      {step === 0 && (
        <GlassCard light style={styles.stepCard}>
          <Text style={styles.cardTitle}>Vous êtes...</Text>
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
          <Button title="Suivant" onPress={() => setStep(1)} />
        </GlassCard>
      )}

      {/* Step 1: Body stats */}
      {step === 1 && (
        <GlassCard light style={styles.stepCard}>
          <Text style={styles.cardTitle}>Vos mensurations</Text>
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
          <View style={styles.stepButtonsRow}>
            <Button title="Retour" variant="outline" style={styles.backBtn} onPress={() => setStep(0)} />
            <Button title="Suivant" style={styles.nextBtn} onPress={() => setStep(2)} />
          </View>
        </GlassCard>
      )}

      {/* Step 2: Activity level */}
      {step === 2 && (
        <GlassCard light style={styles.stepCard}>
          <Text style={styles.cardTitle}>Niveau d'activité</Text>
          <View style={styles.optionsCol}>
            {ACTIVITY_OPTIONS.map((item) => (
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
          <View style={styles.stepButtonsRow}>
            <Button title="Retour" variant="outline" style={styles.backBtn} onPress={() => setStep(1)} />
            <Button title="Suivant" style={styles.nextBtn} onPress={() => setStep(3)} />
          </View>
        </GlassCard>
      )}

      {/* Step 3: Goal */}
      {step === 3 && (
        <GlassCard light style={styles.stepCard}>
          <Text style={styles.cardTitle}>Votre objectif</Text>
          <View style={styles.optionsCol}>
            {GOAL_OPTIONS.map((item) => (
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
          <View style={styles.stepButtonsRow}>
            <Button title="Retour" variant="outline" style={styles.backBtn} onPress={() => setStep(2)} />
            <Button title="Calculer mes objectifs" style={styles.nextBtn} onPress={handleCalculate} />
          </View>
        </GlassCard>
      )}

      {/* Step 4: Result */}
      {isResultStep && calculated && (
        <LinearGradient
          colors={theme.gradients.dark}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.resultCard, theme.shadows.heavy]}>
          <TouchableOpacity style={styles.restartLink} onPress={handleRestart}>
            <ChevronLeft size={16} color={theme.colors.primary} />
            <Text style={styles.restartLinkText}>Recommencer</Text>
          </TouchableOpacity>

          <View style={styles.resultHeader}>
            <Sparkles size={20} color={theme.colors.primary} />
            <Text style={styles.resultTitle}>Vos Objectifs Conseillés</Text>
          </View>

          <View style={styles.calorieRingRow}>
            <CircularProgress progress={100} size={110} strokeWidth={10} color={theme.colors.primary}>
              <Text style={styles.ringCalories}>{calculated.calories}</Text>
              <Text style={styles.ringCaloriesUnit}>kcal/j</Text>
            </CircularProgress>
            <View style={styles.calorieSideStats}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>BMR</Text>
                <Text style={styles.resultVal}>{calculated.bmr} kcal</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>TDEE</Text>
                <Text style={styles.resultVal}>{calculated.tdee} kcal</Text>
              </View>
            </View>
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
        </LinearGradient>
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
    paddingBottom: theme.spacing.xl + 40,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  progressStepWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.border,
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
  },
  progressLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  progressLabelActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  stepCard: {
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  stepButtonsRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
  },
  backBtn: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  nextBtn: {
    flex: 2,
  },
  genderRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  genderBtn: {
    flex: 1,
    height: 52,
    backgroundColor: 'rgba(0,0,0,0.03)',
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
  optionsCol: {
    marginBottom: theme.spacing.sm,
  },
  optionBadge: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: theme.borderRadius.sm,
    marginBottom: 8,
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
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  restartLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  restartLinkText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    marginLeft: 2,
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
  calorieRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  ringCalories: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.white,
  },
  ringCaloriesUnit: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  calorieSideStats: {
    flex: 1,
    marginLeft: theme.spacing.lg,
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
