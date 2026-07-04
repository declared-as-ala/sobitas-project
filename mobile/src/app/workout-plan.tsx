import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { fitnessApi } from '../services/api';
import { theme } from '../constants/theme';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';
import {
  Dumbbell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw,
  Sparkles,
  Zap,
  TrendingUp,
  BatteryLow,
  ListChecks,
} from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WorkoutPlanExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
}

interface WorkoutPlanDay {
  dayNumber: number;
  label: string;
  muscleFocus: string;
  exercises: WorkoutPlanExercise[];
}

interface WeeklyProgression {
  week: number;
  focus: string;
}

interface GeneratedWorkoutPlan {
  programName: string;
  goal: string;
  daysPerWeek: number;
  days: WorkoutPlanDay[];
  weeklyProgression: WeeklyProgression[];
}

const PLAN_STORAGE_KEY = 'generated_workout_plan';
const DAY_OPTIONS: { value: number; hint: string }[] = [
  { value: 3, hint: 'Débutant' },
  { value: 4, hint: 'Équilibré' },
  { value: 5, hint: 'Intensif' },
];

/** Visual phase per week: first = kickoff, middle = progressive overload, last = deload/recovery. */
const getWeekPhaseIcon = (week: number, totalWeeks: number) => {
  if (week === 1) return { Icon: Zap, color: '#F59E0B' };
  if (week === totalWeeks) return { Icon: BatteryLow, color: '#0EA5E9' };
  return { Icon: TrendingUp, color: theme.colors.primary };
};

/** Rough session duration estimate from real set/rest data (not fabricated): work time ~40s/set + rest time. */
const estimateSessionMinutes = (exercises: WorkoutPlanExercise[]) => {
  const totalSeconds = exercises.reduce((sum, ex) => sum + ex.sets * (40 + ex.restSeconds), 0);
  return Math.max(15, Math.round(totalSeconds / 60));
};

export default function WorkoutPlanScreen() {
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [plan, setPlan] = useState<GeneratedWorkoutPlan | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PLAN_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as GeneratedWorkoutPlan;
          setPlan(saved);
          setDaysPerWeek(saved.daysPerWeek);
        }
      })
      .catch(() => {});
  }, []);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fitnessApi.post('/workout-plan/generate', { daysPerWeek });
      return res.data as GeneratedWorkoutPlan;
    },
    onSuccess: (data) => {
      setPlan(data);
      setExpandedDay(data.days[0]?.dayNumber ?? null);
      AsyncStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(data)).catch(() => {});
    },
    onError: (err: any) => {
      Alert.alert(
        'Erreur',
        err.response?.data?.message || 'Impossible de générer votre programme pour le moment.',
      );
    },
  });

  const toggleDay = (dayNumber: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDay(expandedDay === dayNumber ? null : dayNumber);
  };

  const handleRegenerate = () => {
    setPlan(null);
    setExpandedDay(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {!plan ? (
        <Animated.View entering={FadeIn.duration(280)}>
          <GlassCard light style={styles.setupCard}>
            <LinearGradient colors={theme.gradients.primary} style={styles.setupIconWrapper}>
              <Dumbbell size={32} color={theme.colors.white} />
            </LinearGradient>
            <Text style={styles.setupTitle}>Créez votre programme</Text>
            <Text style={styles.setupSubtitle}>
              Un programme sur 5 semaines généré par IA, basé sur votre profil et vos objectifs.
            </Text>

            <Text style={styles.setupQuestion}>Combien de jours par semaine pouvez-vous vous entraîner ?</Text>
            <View style={styles.daysRow}>
              {DAY_OPTIONS.map(({ value: d, hint }) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayOption, daysPerWeek === d && styles.dayOptionActive]}
                  onPress={() => setDaysPerWeek(d)}>
                  <Text style={[styles.dayOptionNumber, daysPerWeek === d && styles.dayOptionNumberActive]}>{d}</Text>
                  <Text style={[styles.dayOptionLabel, daysPerWeek === d && styles.dayOptionLabelActive]}>
                    jours / sem.
                  </Text>
                  <View style={[styles.dayOptionHintPill, daysPerWeek === d && styles.dayOptionHintPillActive]}>
                    <Text style={[styles.dayOptionHintText, daysPerWeek === d && styles.dayOptionHintTextActive]}>
                      {hint}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={generateMutation.isPending ? 'Génération en cours...' : 'Générer mon programme'}
              isLoading={generateMutation.isPending}
              onPress={() => generateMutation.mutate()}
              style={styles.generateBtn}
            />
          </GlassCard>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInUp.duration(280)}>
          {/* Program header */}
          <LinearGradient
            colors={theme.gradients.dark}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerCard, theme.shadows.heavy]}>
            <LinearGradient
              colors={theme.gradients.glassLight}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerCardShine}
              pointerEvents="none"
            />
            <View style={styles.headerTopRow}>
              <View style={styles.headerIconChip}>
                <Sparkles size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerProgramName} numberOfLines={2}>
                  {plan.programName}
                </Text>
                <Text style={styles.headerGoal}>
                  {plan.goal} · {plan.daysPerWeek} jours/semaine
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.regenerateLink} onPress={handleRegenerate}>
              <RotateCcw size={13} color={theme.colors.primary} />
              <Text style={styles.regenerateLinkText}>Changer ma disponibilité</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* 5-week calendar overview */}
          <View style={styles.sectionHeader}>
            <Calendar size={18} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Calendrier - 5 semaines</Text>
          </View>
          {plan.weeklyProgression.map((week) => {
            const { Icon: PhaseIcon, color: phaseColor } = getWeekPhaseIcon(
              week.week,
              plan.weeklyProgression.length,
            );
            return (
              <View key={week.week} style={styles.weekCard}>
                <View style={styles.weekHeaderRow}>
                  <View style={[styles.weekBadge, { backgroundColor: `${phaseColor}1A` }]}>
                    <PhaseIcon size={14} color={phaseColor} />
                    <Text style={[styles.weekBadgeText, { color: phaseColor }]}>S{week.week}</Text>
                  </View>
                  <Text style={styles.weekFocusText} numberOfLines={2}>
                    {week.focus}
                  </Text>
                </View>
                <View style={styles.weekDaysRow}>
                  {plan.days.map((day) => (
                    <View key={day.dayNumber} style={styles.weekDayPill}>
                      <Text style={styles.weekDayPillText}>J{day.dayNumber}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Workout list */}
          <View style={[styles.sectionHeader, { marginTop: theme.spacing.lg }]}>
            <Dumbbell size={18} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Vos séances</Text>
          </View>
          {plan.days.map((day) => {
            const isExpanded = expandedDay === day.dayNumber;
            const estimatedMinutes = estimateSessionMinutes(day.exercises);
            return (
              <View key={day.dayNumber} style={styles.dayCard}>
                <TouchableOpacity
                  style={styles.dayCardHeader}
                  activeOpacity={0.85}
                  onPress={() => toggleDay(day.dayNumber)}>
                  <View style={styles.dayCardNumberChip}>
                    <Text style={styles.dayCardNumberText}>{day.dayNumber}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayCardLabel}>{day.label}</Text>
                    <Text style={styles.dayCardFocus}>{day.muscleFocus}</Text>
                    <View style={styles.dayCardStatsRow}>
                      <View style={styles.dayCardStatItem}>
                        <ListChecks size={11} color={theme.colors.textMuted} />
                        <Text style={styles.dayCardStatText}>{day.exercises.length} exercices</Text>
                      </View>
                      <View style={styles.dayCardStatItem}>
                        <Clock size={11} color={theme.colors.textMuted} />
                        <Text style={styles.dayCardStatText}>~{estimatedMinutes} min</Text>
                      </View>
                    </View>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={20} color={theme.colors.textMuted} />
                  ) : (
                    <ChevronDown size={20} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.exerciseList}>
                    {day.exercises.map((ex, idx) => (
                      <View key={idx} style={styles.exerciseRow}>
                        <View style={styles.exerciseIndexChip}>
                          <Text style={styles.exerciseIndexText}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.exerciseName}>{ex.name}</Text>
                          <View style={styles.exerciseMetaRow}>
                            <Text style={styles.exerciseMeta}>
                              {ex.sets} séries × {ex.reps} reps
                            </Text>
                            <View style={styles.exerciseRestRow}>
                              <Clock size={11} color={theme.colors.textMuted} />
                              <Text style={styles.exerciseRestText}>{ex.restSeconds}s</Text>
                            </View>
                          </View>
                          {!!ex.notes && <Text style={styles.exerciseNotes}>{ex.notes}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>
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
  setupCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  setupIconWrapper: {
    width: 76,
    height: 76,
    borderRadius: theme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  setupTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
  },
  setupSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  setupQuestion: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  daysRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  dayOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginHorizontal: 4,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayOptionActive: {
    backgroundColor: theme.colors.orangeLight,
    borderColor: theme.colors.primary,
  },
  dayOptionNumber: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.textMuted,
  },
  dayOptionNumberActive: {
    color: theme.colors.primary,
  },
  dayOptionLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  dayOptionLabelActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  dayOptionHintPill: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dayOptionHintPillActive: {
    backgroundColor: theme.colors.primary,
  },
  dayOptionHintText: {
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
  },
  dayOptionHintTextActive: {
    color: theme.colors.white,
  },
  generateBtn: {
    width: '100%',
  },
  headerCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  headerCardShine: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    transform: [{ rotate: '20deg' }],
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconChip: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(255,107,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerProgramName: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.white,
  },
  headerGoal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  regenerateLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
  },
  regenerateLinkText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  weekCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.round,
    marginRight: theme.spacing.sm,
  },
  weekBadgeText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.heavy,
    marginLeft: 4,
  },
  weekFocusText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  weekDaysRow: {
    flexDirection: 'row',
  },
  weekDayPill: {
    width: 30,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  weekDayPillText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  dayCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  dayCardNumberChip: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  dayCardNumberText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primary,
  },
  dayCardLabel: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  dayCardFocus: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  dayCardStatsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  dayCardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  dayCardStatText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginLeft: 3,
  },
  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  exerciseIndexChip: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    marginTop: 1,
  },
  exerciseIndexText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  exerciseName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  exerciseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  exerciseMeta: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
    marginRight: theme.spacing.sm,
  },
  exerciseRestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseRestText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginLeft: 3,
  },
  exerciseNotes: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 3,
  },
});
