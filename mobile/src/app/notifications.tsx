import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import Button from '../components/Button';
import { Bell, ShieldAlert, Sparkles } from 'lucide-react-native';

export default function NotificationsScreen() {
  const [workoutsReminder, setWorkoutsReminder] = useState(false);
  const [refillsReminder, setRefillsReminder] = useState(false);
  const [hydrationReminder, setHydrationReminder] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load preferences from local storage
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const stored = await AsyncStorage.getItem('protein-notification-prefs');
        if (stored) {
          const parsed = JSON.parse(stored);
          setWorkoutsReminder(!!parsed.workouts);
          setRefillsReminder(!!parsed.refills);
          setHydrationReminder(!!parsed.hydration);
        }
      } catch (e) {
        console.error('Failed to load notification preferences', e);
      }
    };
    loadPrefs();
  }, []);

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      // 1. Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Veuillez activer les notifications dans les paramètres de votre téléphone pour recevoir nos alertes.'
        );
        setLoading(false);
        return;
      }

      // 2. Persist preferences
      const preferences = {
        workouts: workoutsReminder,
        refills: refillsReminder,
        hydration: hydrationReminder,
      };
      await AsyncStorage.setItem('protein-notification-prefs', JSON.stringify(preferences));

      // 3. Configure local scheduling
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (hydrationReminder) {
        // Schedule hydration reminders every 2 hours
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Hydratation 💧',
            body: 'C\'est l\'heure de boire un verre d\'eau pour maintenir vos performances.',
          },
          trigger: {
            seconds: 60 * 120, // 2 hours
            repeats: true,
          } as any,
        });
      }

      Alert.alert('Succès', 'Vos préférences de notification ont été enregistrées avec succès.');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible d\'enregistrer les préférences.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.bellCircle}>
          <Bell size={28} color={theme.colors.white} />
        </View>
        <Text style={styles.title}>Centre de Notifications</Text>
        <Text style={styles.subtitle}>Ajustez les rappels et alertes de votre coach Protein.tn.</Text>
      </View>

      <View style={styles.card}>
        {/* Workout Switch */}
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Rappels d'Entraînement</Text>
            <Text style={styles.settingDesc}>Recevoir une notification les jours d'entraînement planifiés.</Text>
          </View>
          <Switch
            value={workoutsReminder}
            onValueChange={setWorkoutsReminder}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={workoutsReminder ? theme.colors.white : '#F4F3F0'}
          />
        </View>

        {/* Refills Switch */}
        <View style={[styles.settingRow, styles.borderedRow]}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Alertes Stock Compléments</Text>
            <Text style={styles.settingDesc}>Être prévenu lorsque votre stock de compléments est bas.</Text>
          </View>
          <Switch
            value={refillsReminder}
            onValueChange={setRefillsReminder}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={refillsReminder ? theme.colors.white : '#F4F3F0'}
          />
        </View>

        {/* Hydration Switch */}
        <View style={[styles.settingRow, styles.borderedRow]}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Rappels d'Hydratation</Text>
            <Text style={styles.settingDesc}>Notifications régulières pour boire de l'eau (toutes les 2 heures).</Text>
          </View>
          <Switch
            value={hydrationReminder}
            onValueChange={setHydrationReminder}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={hydrationReminder ? theme.colors.white : '#F4F3F0'}
          />
        </View>
      </View>

      <Button
        title="Enregistrer les préférences"
        style={styles.saveBtn}
        isLoading={loading}
        onPress={handleSavePreferences}
      />
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
  header: {
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  bellCircle: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  borderedRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  settingText: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingTitle: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  settingDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  saveBtn: {
    marginBottom: theme.spacing.xl,
  },
});
