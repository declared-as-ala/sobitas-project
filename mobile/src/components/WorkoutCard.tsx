import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';
import { Dumbbell, ChevronRight } from 'lucide-react-native';

interface WorkoutCardProps {
  program: {
    id: number;
    name: string;
    description: string;
    category: string;
    difficulty: string;
    imageUrl?: string | null;
  };
  onPress?: () => void;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({ program, onPress }) => {
  const getDifficultyBadgeColor = () => {
    switch (program.difficulty.toLowerCase()) {
      case 'beginner':
        return theme.colors.success;
      case 'intermediate':
        return theme.colors.warning;
      case 'advanced':
        return theme.colors.error;
      default:
        return theme.colors.textMuted;
    }
  };

  const getCategoryLabel = () => {
    switch (program.category) {
      case 'muscle_gain':
        return 'Prise de masse';
      case 'fat_loss':
        return 'Perte de poids';
      case 'strength':
        return 'Force';
      case 'home':
        return 'Maison';
      default:
        return 'Fitness';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, theme.shadows.light]}
      onPress={onPress}>
      {/* Program Image (fallback to a nice solid color gradient with dumbbell icon if not provided) */}
      <View style={styles.imageWrapper}>
        {program.imageUrl ? (
          <Image source={{ uri: program.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Dumbbell size={32} color={theme.colors.white} />
          </View>
        )}
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{getCategoryLabel()}</Text>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyBadgeColor() }]}>
            <Text style={styles.difficultyText}>{program.difficulty}</Text>
          </View>
        </View>
      </View>

      {/* Program Details */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {program.name}
          </Text>
          <ChevronRight size={20} color={theme.colors.textMuted} />
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {program.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  imageWrapper: {
    height: 150,
    width: '100%',
    position: 'relative',
    backgroundColor: theme.colors.secondary,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
  },
  badgeRow: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  categoryText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  difficultyText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'capitalize',
  },
  content: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: theme.typography.sizes.md + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  description: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});
export default WorkoutCard;
