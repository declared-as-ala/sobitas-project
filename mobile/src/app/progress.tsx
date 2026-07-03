import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fitnessApi } from '../services/api';
import { theme } from '../constants/theme';
import { useFitnessStore } from '../store/fitness';
import { useAuthStore } from '../store/auth';
import Input from '../components/Input';
import Button from '../components/Button';
import { TrendingUp, Scale, Plus, Calendar } from 'lucide-react-native';

export default function ProgressScreen() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { queueLog, isOnline } = useFitnessStore();

  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [success, setSuccess] = useState(false);

  // 1. Fetch weight progress history — backend returns { history, weeklyChange, monthlyChange }
  const { data: progressData, isLoading, refetch } = useQuery({
    queryKey: ['body-progress'],
    queryFn: async () => {
      const res = await fitnessApi.get('/body-progress');
      return res.data;
    },
    enabled: isAuthenticated && isOnline,
  });

  const progressHistory: any[] = progressData?.history || [];

  const handleLogProgress = () => {
    if (!weight || isNaN(Number(weight))) return;
    setIsLogging(true);
    setSuccess(false);

    const today = new Date().toISOString().split('T')[0];
    const payload = {
      weight: parseFloat(weight),
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      date: today,
    };

    // Queue log (offline-first!)
    queueLog('progress', payload);

    setWeight('');
    setBodyFat('');
    setIsLogging(false);
    setSuccess(true);

    if (isOnline) {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['body-progress'] });
        refetch();
      }, 500);
    }
  };

  const getWeightDifference = () => {
    if (!progressHistory || progressHistory.length < 2) return null;
    const sorted = [...progressHistory].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sorted[0].weight;
    const previous = sorted[1].weight;
    const diff = latest - previous;
    return {
      value: Math.abs(diff).toFixed(1),
      isLoss: diff < 0,
      isGain: diff > 0,
    };
  };

  const diff = getWeightDifference();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Statistics Highlight Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, theme.shadows.light]}>
          <Scale size={24} color={theme.colors.primary} />
          <Text style={styles.statValue}>
            {progressHistory && progressHistory.length > 0
              ? `${progressHistory[0].weight} kg`
              : '-- kg'}
          </Text>
          <Text style={styles.statLabel}>Poids Actuel</Text>
        </View>

        <View style={[styles.statCard, theme.shadows.light]}>
          <TrendingUp size={24} color={diff?.isLoss ? theme.colors.success : theme.colors.primary} />
          <Text style={styles.statValue}>
            {diff ? `${diff.isLoss ? '-' : '+'}${diff.value} kg` : '-- kg'}
          </Text>
          <Text style={styles.statLabel}>Évolution</Text>
        </View>
      </View>

      {/* 2. Weight Logging Card Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enregistrer vos mesures</Text>
        <View style={styles.card}>
          {success && <Text style={styles.successBanner}>Mesure enregistrée !</Text>}

          <View style={styles.inputsRow}>
            <Input
              label="Poids (kg)"
              placeholder="Ex: 78.5"
              keyboardType="numeric"
              containerStyle={{ flex: 1, marginRight: theme.spacing.sm }}
              value={weight}
              onChangeText={(t) => {
                setWeight(t);
                setSuccess(false);
              }}
            />
            <Input
              label="Masse grasse % (optionnel)"
              placeholder="Ex: 14"
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
              value={bodyFat}
              onChangeText={(t) => {
                setBodyFat(t);
                setSuccess(false);
              }}
            />
          </View>

          <Button
            title="Valider la mesure"
            isLoading={isLogging}
            onPress={handleLogProgress}
          />
        </View>
      </View>

      {/* 3. Weight History Logs list */}
      <View style={[styles.section, { marginBottom: theme.spacing.xl }]}>
        <Text style={styles.sectionTitle}>Historique des pesées</Text>
        <View style={styles.historyListCard}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : progressHistory && progressHistory.length > 0 ? (
            progressHistory.map((log: any) => (
              <View key={log.id.toString()} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Calendar size={18} color={theme.colors.textMuted} style={{ marginRight: theme.spacing.sm }} />
                  <Text style={styles.historyDate}>{new Date(log.date).toLocaleDateString()}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyWeight}>{log.weight} kg</Text>
                  {log.bodyFat && <Text style={styles.historyFat}>({log.bodyFat}% MG)</Text>}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucun historique enregistré pour le moment.</Text>
          )}
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  statCard: {
    width: (Dimensions.get('window').width - 48) / 2,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
    marginVertical: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputsRow: {
    flexDirection: 'row',
  },
  successBanner: {
    color: theme.colors.success,
    backgroundColor: '#DEF7EC',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    textAlign: 'center',
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.md,
  },
  historyListCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyWeight: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  historyFat: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginLeft: 6,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
});
