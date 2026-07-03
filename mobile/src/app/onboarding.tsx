import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../constants/theme';
import { fitnessApi } from '../services/api';
import { router } from 'expo-router';
import Input from '../components/Input';
import Button from '../components/Button';
import { Dumbbell, ChevronRight, ChevronLeft } from 'lucide-react-native';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('muscle_gain');
  const [trainingLocation, setTrainingLocation] = useState('gym');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [dietaryPreference, setDietaryPreference] = useState('standard');
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(4);

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      if (!age || isNaN(Number(age)) || Number(age) < 12 || Number(age) > 100) {
        setError('Veuillez entrer un âge valide (entre 12 et 100).');
        return;
      }
    }
    if (step === 2) {
      if (!height || isNaN(Number(height)) || Number(height) < 100 || Number(height) > 250) {
        setError('Veuillez entrer une taille valide (entre 100 et 250 cm).');
        return;
      }
      if (!weight || isNaN(Number(weight)) || Number(weight) < 30 || Number(weight) > 300) {
        setError('Veuillez entrer un poids valide (entre 30 et 300 kg).');
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await fitnessApi.post('/fitness-profile', {
        gender,
        age: parseInt(age, 10),
        height: parseFloat(height),
        weight: parseFloat(weight),
        activityLevel,
        goal,
        trainingLocation,
        experienceLevel,
        dietaryPreference,
        trainingDaysPerWeek,
      });

      router.replace('/(tabs)/fitness');
    } catch (e: any) {
      const msg = e.response?.data?.message || "Échec de l'enregistrement du profil. Réessayez.";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top step indicator */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepIndicator}>Étape {step} sur 5</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressBarFill, { width: `${(step / 5) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* STEP 1: Gender & Age */}
        {step === 1 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>Commençons par faire connaissance</Text>
            <Text style={styles.stepSubtitle}>Ces données permettent de calculer précisément vos besoins caloriques.</Text>
            
            <Text style={styles.label}>Genre</Text>
            <View style={styles.selectionRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, gender === 'male' && styles.selectorBtnActive]}
                onPress={() => setGender('male')}>
                <Text style={[styles.selectorBtnText, gender === 'male' && styles.selectorBtnTextActive]}>Homme</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorBtn, gender === 'female' && styles.selectorBtnActive]}
                onPress={() => setGender('female')}>
                <Text style={[styles.selectorBtnText, gender === 'female' && styles.selectorBtnTextActive]}>Femme</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Votre Âge"
              placeholder="Ex: 25"
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />
          </View>
        )}

        {/* STEP 2: Height & Weight */}
        {step === 2 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>Vos mensurations actuelles</Text>
            <Text style={styles.stepSubtitle}>Entrez votre taille en centimètres et votre poids en kg.</Text>

            <Input
              label="Taille (cm)"
              placeholder="Ex: 178"
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />

            <Input
              label="Poids (kg)"
              placeholder="Ex: 75"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
          </View>
        )}

        {/* STEP 3: Activity Level & Goal */}
        {step === 3 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>Activité & Objectifs</Text>
            
            <Text style={styles.label}>Niveau d'activité physique</Text>
            {[
              { id: 'sedentary', label: 'Sédentaire', desc: 'Peu ou pas d\'exercice' },
              { id: 'light', label: 'Légèrement actif', desc: 'Exercice léger 1-3 fois/semaine' },
              { id: 'moderate', label: 'Modérément actif', desc: 'Entraînement 3-5 fois/semaine' },
              { id: 'active', label: 'Très actif', desc: 'Entraînement intense quotidien' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionCard, activityLevel === item.id && styles.optionCardActive]}
                onPress={() => setActivityLevel(item.id)}>
                <Text style={[styles.optionLabel, activityLevel === item.id && styles.optionLabelActive]}>{item.label}</Text>
                <Text style={styles.optionDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Objectif principal</Text>
            {[
              { id: 'muscle_gain', label: 'Prise de muscle', desc: 'Prendre de la masse musculaire' },
              { id: 'weight_loss', label: 'Perte de poids', desc: 'Brûler de la graisse en gardant le muscle' },
              { id: 'strength', label: 'Force pure', desc: 'Devenir plus fort sur les exercices' },
              { id: 'maintain', label: 'Maintien de forme', desc: 'Garder son poids et rester en bonne santé' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionCard, goal === item.id && styles.optionCardActive]}
                onPress={() => setGoal(item.id)}>
                <Text style={[styles.optionLabel, goal === item.id && styles.optionLabelActive]}>{item.label}</Text>
                <Text style={styles.optionDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP 4: Training Details */}
        {step === 4 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>Détails de l'entraînement</Text>

            <Text style={styles.label}>Lieu d'entraînement</Text>
            <View style={styles.selectionRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, trainingLocation === 'gym' && styles.selectorBtnActive]}
                onPress={() => setTrainingLocation('gym')}>
                <Text style={[styles.selectorBtnText, trainingLocation === 'gym' && styles.selectorBtnTextActive]}>Salle (Gym)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorBtn, trainingLocation === 'home' && styles.selectorBtnActive]}
                onPress={() => setTrainingLocation('home')}>
                <Text style={[styles.selectorBtnText, trainingLocation === 'home' && styles.selectorBtnTextActive]}>Maison (Home)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Niveau d'expérience</Text>
            <View style={styles.selectionRow}>
              {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.selectorBtn, { flex: 1 }, experienceLevel === lvl && styles.selectorBtnActive]}
                  onPress={() => setExperienceLevel(lvl)}>
                  <Text style={[styles.selectorBtnText, experienceLevel === lvl && styles.selectorBtnTextActive]}>
                    {lvl === 'beginner' ? 'Débutant' : lvl === 'intermediate' ? 'Inter' : 'Pro'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Nombre de jours d'entraînement / semaine</Text>
            <View style={styles.selectionRow}>
              {[2, 3, 4, 5, 6].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[styles.dayBtn, trainingDaysPerWeek === days && styles.dayBtnActive]}
                  onPress={() => setTrainingDaysPerWeek(days)}>
                  <Text style={[styles.dayBtnText, trainingDaysPerWeek === days && styles.dayBtnTextActive]}>{days}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 5: Nutrition Preference */}
        {step === 5 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>Préférences Alimentaires</Text>
            <Text style={styles.stepSubtitle}>Nous adapterons les conseils nutritionnels à vos besoins.</Text>

            {[
              { id: 'standard', label: 'Standard', desc: 'Mange de tout (viande, poulet, poissons)' },
              { id: 'vegetarian', label: 'Végétarien', desc: 'Pas de viande rouge ni blanche, mange des œufs/produits laitiers' },
              { id: 'vegan', label: 'Végétalien (Vegan)', desc: 'Aucune source animale' },
              { id: 'keto', label: 'Kéto (Cétogène)', desc: 'Riche en lipides, pauvre en glucides' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionCard, dietaryPreference === item.id && styles.optionCardActive]}
                onPress={() => setDietaryPreference(item.id)}>
                <Text style={[styles.optionLabel, dietaryPreference === item.id && styles.optionLabelActive]}>{item.label}</Text>
                <Text style={styles.optionDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step Navigation Actions */}
        <View style={styles.navigationRow}>
          {step > 1 ? (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <ChevronLeft size={20} color={theme.colors.text} style={{ marginRight: 4 }} />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          {step < 5 ? (
            <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
              <Text style={styles.nextButtonText}>Suivant</Text>
              <ChevronRight size={20} color={theme.colors.white} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={theme.colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Terminer</Text>
                  <Dumbbell size={18} color={theme.colors.white} style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stepHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
  },
  stepIndicator: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    marginTop: theme.spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  stepCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  stepSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  selectorBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selectorBtnActive: {
    backgroundColor: theme.colors.orangeLight,
    borderColor: theme.colors.primary,
  },
  selectorBtnText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  selectorBtnTextActive: {
    color: theme.colors.primary,
  },
  dayBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.round,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayBtnActive: {
    backgroundColor: theme.colors.orangeLight,
    borderColor: theme.colors.primary,
  },
  dayBtnText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  dayBtnTextActive: {
    color: theme.colors.primary,
  },
  optionCard: {
    backgroundColor: '#F1F3F5',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardActive: {
    backgroundColor: theme.colors.orangeLight,
    borderColor: theme.colors.primary,
  },
  optionLabel: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionLabelActive: {
    color: theme.colors.primary,
  },
  optionDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  errorText: {
    color: theme.colors.error,
    backgroundColor: '#FFF0F0',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.error,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
  },
  backButtonText: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  nextButton: {
    backgroundColor: theme.colors.secondary,
    height: 50,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm + 1,
  },
});
