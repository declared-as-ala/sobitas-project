import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { theme } from '../../constants/theme';
import { Home, ShoppingBag, Dumbbell, User, ScanLine, LucideIcon } from 'lucide-react-native';

const TabIcon = ({
  color,
  size,
  focused,
  Icon,
}: {
  color: string;
  size: number;
  focused: boolean;
  Icon: LucideIcon;
}) => (
  <View style={[styles.iconPill, focused && styles.iconPillActive]}>
    <Icon size={size} color={focused ? theme.colors.white : color} />
  </View>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: theme.typography.weights.bold,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
        headerStyle: {
          backgroundColor: theme.colors.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTitleStyle: {
          fontWeight: theme.typography.weights.bold,
          color: theme.colors.text,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarLabel: 'Accueil',
          headerTitle: 'Protein.tn',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon color={color} size={size} focused={focused} Icon={Home} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Boutique',
          tabBarLabel: 'Boutique',
          headerTitle: 'Boutique Proteine',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon color={color} size={size} focused={focused} Icon={ShoppingBag} />
          ),
        }}
      />
      <Tabs.Screen
        name="fitness"
        options={{
          title: 'Fitness',
          tabBarLabel: 'Fitness',
          headerTitle: 'Fitness & Nutrition',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon color={color} size={size} focused={focused} Icon={Dumbbell} />
          ),
        }}
      />
      <Tabs.Screen
        name="meal-scan"
        options={{
          title: 'Scanner',
          tabBarLabel: 'Scanner',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon color={color} size={size} focused={focused} Icon={ScanLine} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          headerTitle: 'Mon Compte',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon color={color} size={size} focused={focused} Icon={User} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: Platform.OS === 'ios' ? 28 : 16,
    height: 68,
    borderRadius: theme.borderRadius.lg,
    borderTopWidth: 0,
    paddingBottom: 0,
    paddingTop: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    ...theme.shadows.heavy,
  },
  iconPill: {
    width: 40,
    height: 32,
    borderRadius: theme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPillActive: {
    backgroundColor: theme.colors.primary,
  },
});
