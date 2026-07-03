import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { fitnessApi } from '../../services/api';
import { theme } from '../../constants/theme';
import { useLocalSearchParams, router } from 'expo-router';
import { Play, Pause, RotateCcw, Timer, Check } from 'lucide-react-native';
import Button from '../../components/Button';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SetCheckButton = ({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withTiming(1.15, { duration: 90 }, () => {
      scale.value = withTiming(1, { duration: 140 });
    });
    onPress();
  };

  return (
    <AnimatedTouchable
      style={[styles.setCheckBtn, checked && styles.setCheckBtnActive, animatedStyle]}
      onPress={handlePress}>
      {checked ? (
        <Check size={16} color={theme.colors.white} />
      ) : (
        <Text style={styles.setCheckText}>{label}</Text>
      )}
    </AnimatedTouchable>
  );
};

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();

  // Track checked sets: record mapping exerciseId -> array of booleans representing checks
  const [completedSets, setCompletedSets] = useState<Record<number, boolean[]>>({});
  
  // Stopwatch/timer states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Fetch program details with exercises list
  const { data: program, isLoading } = useQuery({
    queryKey: ['workout-details', id],
    queryFn: async () => {
      const res = await fitnessApi.get(`/workouts/${id}`);
      return res.data;
    },
  });

  // Complete workout log mutation
  const completeWorkoutMutation = useMutation({
    mutationFn: async () => {
      const logDetails = Object.entries(completedSets).map(([exId, sets]) => ({
        exerciseId: parseInt(exId, 10),
        setsLogged: sets.filter(Boolean).length,
      }));

      const res = await fitnessApi.post('/workouts/log', {
        programId: parseInt(id as string, 10),
        durationMinutes: Math.round(timerSeconds / 60) || 1,
        exercises: logDetails,
      });
      return res.data;
    },
    onSuccess: (data) => {
      Alert.alert(
        'Félicitations ! 🎉',
        `Séance terminée avec succès !\nVous avez gagné +${data.pointsEarned || 15} points fidélité Protein.tn.`,
        [{ text: 'Super !', onPress: () => {
          queryClient.invalidateQueries({ queryKey: ['loyalty-summary'] });
          router.replace('/(tabs)/fitness');
        }}]
      );
    },
    onError: (err: any) => {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible d\'enregistrer la séance.');
    },
  });

  // REST countdown timer runner
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleStartStopTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = () => {
    setTimerSeconds(0);
    setIsTimerRunning(false);
  };

  // Toggle set checkbox status
  const toggleSetCheck = (exerciseId: number, setIndex: number, totalSets: number) => {
    setCompletedSets((prev) => {
      const currentSets = prev[exerciseId] || new Array(totalSets).fill(false);
      const updatedSets = [...currentSets];
      updatedSets[setIndex] = !updatedSets[setIndex];
      return { ...prev, [exerciseId]: updatedSets };
    });
  };

  const formatTimerTime = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const remainingSeconds = sec % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const exercises = program?.exercises || [];

  return (
    <View style={styles.container}>
      {/* Timer Bar */}
      <LinearGradient
        colors={theme.gradients.dark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.timerBar, theme.shadows.heavy]}>
        <View style={styles.timerLeft}>
          <View style={styles.timerLabelRow}>
            <Timer size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.timerLabel}>SÉANCE EN COURS</Text>
          </View>
          <Text style={styles.timerValue}>{formatTimerTime(timerSeconds)}</Text>
        </View>
        <View style={styles.timerRight}>
          <TouchableOpacity
            style={[styles.timerIconBtn, isTimerRunning && styles.timerIconBtnActive]}
            onPress={handleStartStopTimer}>
            {isTimerRunning ? (
              <Pause size={20} color={theme.colors.white} fill={theme.colors.white} />
            ) : (
              <Play size={20} color={theme.colors.white} fill={theme.colors.white} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timerIconBtn, styles.resetBtn]} onPress={handleResetTimer}>
            <RotateCcw size={18} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.programTitle}>{program?.name}</Text>
        <Text style={styles.programDesc}>{program?.description}</Text>

        <Text style={styles.sectionTitle}>Exercices</Text>

        {exercises.map((ex: any, idx: number) => {
          const totalSets = ex.sets || 3;
          const userSets = completedSets[ex.id] || new Array(totalSets).fill(false);

          return (
            <View key={ex.id.toString()} style={styles.exerciseCard}>
              <Text style={styles.exName}>{idx + 1}. {ex.name}</Text>
              {ex.notes && <Text style={styles.exNotes}>{ex.notes}</Text>}
              
              <Text style={styles.exSchema}>
                Objectif : {ex.sets} séries x {ex.reps} reps {ex.restTime ? `(Repos: ${ex.restTime}s)` : ''}
              </Text>

              {/* Set checkers checkboxes row */}
              <View style={styles.setsCheckersRow}>
                {Array.from({ length: totalSets }).map((_, setIdx) => (
                  <SetCheckButton
                    key={setIdx}
                    checked={!!userSets[setIdx]}
                    label={`S${setIdx + 1}`}
                    onPress={() => toggleSetCheck(ex.id, setIdx, totalSets)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        <Button
          title="Terminer la séance d'entraînement"
          style={styles.completeBtn}
          isLoading={completeWorkoutMutation.isPending}
          onPress={() => completeWorkoutMutation.mutate()}
        />
      </ScrollView>
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
  },
  timerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  timerLeft: {
    flexDirection: 'column',
  },
  timerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  timerLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 34,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.white,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  timerRight: {
    flexDirection: 'row',
  },
  timerIconBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.glassBorderDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  timerIconBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  resetBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scrollContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  programTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
  },
  programDesc: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  exerciseCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  exName: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  exNotes: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  exSchema: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    marginTop: 6,
  },
  setsCheckersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
  },
  setCheckBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    backgroundColor: '#F8F9FA',
  },
  setCheckBtnActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  setCheckText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  completeBtn: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl + 40,
  },
});
