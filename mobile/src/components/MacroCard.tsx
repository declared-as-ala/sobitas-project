import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import CircularProgress from './CircularProgress';

interface MacroCardProps {
  calories: { consumed: number; target: number };
  protein: { consumed: number; target: number };
  carbs: { consumed: number; target: number };
  fat: { consumed: number; target: number };
}

export const MacroCard: React.FC<MacroCardProps> = ({
  calories,
  protein,
  carbs,
  fat,
}) => {
  const calPercent = Math.min(100, Math.round((calories.consumed / calories.target) * 100)) || 0;
  const protPercent = Math.min(100, Math.round((protein.consumed / protein.target) * 100)) || 0;
  const carbsPercent = Math.min(100, Math.round((carbs.consumed / carbs.target) * 100)) || 0;
  const fatPercent = Math.min(100, Math.round((fat.consumed / fat.target) * 100)) || 0;

  return (
    <View style={[styles.card, theme.shadows.light]}>
      {/* Calories Circular Summary */}
      <View style={styles.calorieSection}>
        <CircularProgress progress={calPercent} size={88} strokeWidth={9} color={theme.colors.primary}>
          <Text style={styles.ringPercent}>{calPercent}%</Text>
        </CircularProgress>
        <View style={styles.calorieTextWrapper}>
          <Text style={styles.calorieValue}>
            {calories.consumed} <Text style={styles.calorieMuted}>/ {calories.target} kcal</Text>
          </Text>
          <Text style={styles.label}>Calories journalières</Text>
        </View>
      </View>

      {/* Macros Split Row */}
      <View style={styles.macrosRow}>
        {/* Protein */}
        <View style={styles.macroCol}>
          <Text style={styles.macroTitle}>Protéines</Text>
          <View style={styles.macroBarBg}>
            <View style={[styles.macroBarFill, { width: `${protPercent}%`, backgroundColor: theme.colors.primary }]} />
          </View>
          <Text style={styles.macroValue}>
            {protein.consumed}g<Text style={styles.macroMuted}>/{protein.target}g</Text>
          </Text>
        </View>

        {/* Carbs */}
        <View style={styles.macroCol}>
          <Text style={styles.macroTitle}>Glucides</Text>
          <View style={styles.macroBarBg}>
            <View style={[styles.macroBarFill, { width: `${carbsPercent}%`, backgroundColor: '#F59E0B' }]} />
          </View>
          <Text style={styles.macroValue}>
            {carbs.consumed}g<Text style={styles.macroMuted}>/{carbs.target}g</Text>
          </Text>
        </View>

        {/* Fat */}
        <View style={styles.macroCol}>
          <Text style={styles.macroTitle}>Lipides</Text>
          <View style={styles.macroBarBg}>
            <View style={[styles.macroBarFill, { width: `${fatPercent}%`, backgroundColor: '#10B981' }]} />
          </View>
          <Text style={styles.macroValue}>
            {fat.consumed}g<Text style={styles.macroMuted}>/{fat.target}g</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  calorieSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  ringPercent: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primary,
  },
  calorieTextWrapper: {
    flexDirection: 'column',
    marginLeft: theme.spacing.md,
  },
  calorieValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
  },
  calorieMuted: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.regular,
    color: theme.colors.textMuted,
  },
  label: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  macroTitle: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 6,
  },
  macroBarBg: {
    height: 6,
    width: '80%',
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
    marginBottom: 6,
  },
  macroBarFill: {
    height: '100%',
    borderRadius: theme.borderRadius.round,
  },
  macroValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  macroMuted: {
    fontSize: 10,
    fontWeight: theme.typography.weights.regular,
    color: theme.colors.textMuted,
  },
});
export default MacroCard;
