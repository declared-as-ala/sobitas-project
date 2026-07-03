import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Use over dark/photo backgrounds (white-ish frost). Defaults to true. */
  light?: boolean;
  intensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  light = true,
  intensity = 40,
}) => {
  return (
    <View style={[styles.wrapper, style]}>
      <BlurView
        intensity={intensity}
        tint={light ? 'light' : 'dark'}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={light ? theme.gradients.glassLight : ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.1)']}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.border,
          { borderColor: light ? theme.colors.glassBorder : theme.colors.glassBorderDark },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 3 },
    }),
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
  },
  content: {
    padding: theme.spacing.md,
  },
});

export default GlassCard;
