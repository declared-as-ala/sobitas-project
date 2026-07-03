import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { fitnessApi } from '../../services/api';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/auth';
import { useFitnessStore } from '../../store/fitness';
import Button from '../../components/Button';
import GlassCard from '../../components/GlassCard';
import CircularProgress from '../../components/CircularProgress';
import { Camera, ImageIcon, Sparkles, ScanLine, RotateCcw, AlertCircle } from 'lucide-react-native';

interface ScannedImage {
  uri: string;
  base64: string;
  mimeType: string;
}

interface MealScanResult {
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
}

const CONFIDENCE_LABEL: Record<string, string> = {
  low: 'Estimation approximative',
  medium: 'Estimation correcte',
  high: 'Estimation fiable',
};

const CONFIDENCE_COLOR: Record<string, string> = {
  low: theme.colors.warning,
  medium: '#0EA5E9',
  high: theme.colors.success,
};

export default function MealScanScreen() {
  const { isAuthenticated } = useAuthStore();
  const { queueLog } = useFitnessStore();
  const [image, setImage] = useState<ScannedImage | null>(null);
  const [result, setResult] = useState<MealScanResult | null>(null);

  const scanMutation = useMutation({
    mutationFn: async () => {
      if (!image) throw new Error('no image');
      const res = await fitnessApi.post('/meal-scan', {
        imageBase64: image.base64,
        mimeType: image.mimeType,
      });
      return res.data as MealScanResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err: any) => {
      Alert.alert(
        'Erreur',
        err.response?.data?.message || "Impossible d'analyser cette photo pour le moment.",
      );
    },
  });

  const pickFromSource = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès pour scanner un repas.");
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      base64: true,
      quality: 0.5,
      allowsEditing: true,
      aspect: [4, 3],
    };

    const pickerResult =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (pickerResult.canceled || !pickerResult.assets?.[0]?.base64) return;

    const asset = pickerResult.assets[0];
    setImage({
      uri: asset.uri,
      base64: asset.base64!,
      mimeType: asset.mimeType || 'image/jpeg',
    });
    setResult(null);
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
  };

  const handleSaveToTracker = () => {
    if (!result) return;
    const today = new Date().toISOString().split('T')[0];
    queueLog('protein', {
      mealType: 'Scan repas',
      proteinAmount: result.protein,
      description: result.mealName,
      date: today,
    });
    Alert.alert('Enregistré', `${result.protein}g de protéines ajoutées à votre suivi du jour.`, [
      { text: 'OK', onPress: handleReset },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.introRow}>
        <View style={styles.introIconChip}>
          <ScanLine size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.introText}>
          Prenez en photo votre repas pour estimer instantanément ses calories et ses protéines.
        </Text>
      </View>

      {!image ? (
        <GlassCard light style={styles.pickerCard}>
          <View style={styles.pickerIconWrapper}>
            <Camera size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.pickerTitle}>Scanner un repas</Text>
          <Text style={styles.pickerSubtitle}>Prenez une photo nette, de préférence vue du dessus.</Text>

          <View style={styles.pickerButtonsRow}>
            <TouchableOpacity style={styles.pickerBtn} activeOpacity={0.85} onPress={() => pickFromSource('camera')}>
              <LinearGradient
                colors={theme.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pickerBtnGradient}>
                <Camera size={18} color={theme.colors.white} />
                <Text style={styles.pickerBtnText}>Prendre une photo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerBtnOutline}
              activeOpacity={0.85}
              onPress={() => pickFromSource('library')}>
              <ImageIcon size={18} color={theme.colors.text} />
              <Text style={styles.pickerBtnOutlineText}>Choisir depuis la galerie</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      ) : (
        <>
          <View style={styles.previewWrapper}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity style={styles.changePhotoBtn} onPress={handleReset}>
              <RotateCcw size={14} color={theme.colors.white} />
              <Text style={styles.changePhotoText}>Changer</Text>
            </TouchableOpacity>
          </View>

          {!result && (
            <Button
              title={scanMutation.isPending ? 'Analyse en cours...' : 'Analyser ce repas'}
              style={styles.analyzeBtn}
              isLoading={scanMutation.isPending}
              onPress={() => scanMutation.mutate()}
            />
          )}
        </>
      )}

      {result && (
        <LinearGradient
          colors={theme.gradients.dark}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.resultCard, theme.shadows.heavy]}>
          <View style={styles.resultHeader}>
            <View style={styles.resultHeaderIconChip}>
              <Sparkles size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.resultMealName} numberOfLines={2}>
              {result.mealName}
            </Text>
          </View>

          <View style={styles.calorieRingRow}>
            <CircularProgress progress={100} size={110} strokeWidth={10} color={theme.colors.primary}>
              <Text style={styles.ringCalories}>{result.calories}</Text>
              <Text style={styles.ringCaloriesUnit}>kcal</Text>
            </CircularProgress>
            <View style={styles.macroSideStats}>
              <View style={styles.macroSideRow}>
                <Text style={[styles.macroSideLabel, { color: theme.colors.primary }]}>Protéines</Text>
                <Text style={styles.macroSideVal}>{result.protein} g</Text>
              </View>
              <View style={styles.macroSideRow}>
                <Text style={[styles.macroSideLabel, { color: '#F59E0B' }]}>Glucides</Text>
                <Text style={styles.macroSideVal}>{result.carbs} g</Text>
              </View>
              <View style={styles.macroSideRow}>
                <Text style={[styles.macroSideLabel, { color: '#10B981' }]}>Lipides</Text>
                <Text style={styles.macroSideVal}>{result.fat} g</Text>
              </View>
            </View>
          </View>

          <View style={styles.confidenceRow}>
            <View style={[styles.confidenceDot, { backgroundColor: CONFIDENCE_COLOR[result.confidence] }]} />
            <Text style={styles.confidenceText}>{CONFIDENCE_LABEL[result.confidence]}</Text>
          </View>

          {!!result.notes && (
            <View style={styles.notesRow}>
              <AlertCircle size={14} color="rgba(255,255,255,0.6)" style={{ marginRight: 6, marginTop: 1 }} />
              <Text style={styles.notesText}>{result.notes}</Text>
            </View>
          )}

          {isAuthenticated ? (
            <Button title="Ajouter à mon suivi protéines" style={styles.saveBtn} onPress={handleSaveToTracker} />
          ) : (
            <Text style={styles.loginHint}>Connectez-vous pour enregistrer ce repas dans votre suivi.</Text>
          )}

          <TouchableOpacity style={styles.restartLink} onPress={handleReset}>
            <RotateCcw size={14} color={theme.colors.primary} />
            <Text style={styles.restartLinkText}>Scanner un autre repas</Text>
          </TouchableOpacity>
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
    paddingBottom: theme.spacing.xl + 80,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  introIconChip: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  introText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginTop: 8,
  },
  pickerCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  pickerIconWrapper: {
    width: 76,
    height: 76,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pickerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
  },
  pickerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  pickerButtonsRow: {
    width: '100%',
  },
  pickerBtn: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  pickerBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  pickerBtnText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
    marginLeft: 8,
  },
  pickerBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  pickerBtnOutlineText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
    marginLeft: 8,
  },
  previewWrapper: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  previewImage: {
    width: '100%',
    height: 260,
    backgroundColor: theme.colors.border,
  },
  changePhotoBtn: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  changePhotoText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    marginLeft: 4,
  },
  analyzeBtn: {
    marginBottom: theme.spacing.md,
  },
  resultCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  resultHeaderIconChip: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(255,107,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  resultMealName: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.white,
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
  macroSideStats: {
    flex: 1,
    marginLeft: theme.spacing.lg,
  },
  macroSideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  macroSideLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
  },
  macroSideVal: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.round,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: theme.typography.weights.medium,
  },
  notesRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
  },
  loginHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  restartLink: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  restartLinkText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    marginLeft: 4,
  },
});
