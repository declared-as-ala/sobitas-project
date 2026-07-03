import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fitnessApi, shopApi } from '../services/api';
import { theme } from '../constants/theme';
import { useAuthStore } from '../store/auth';
import { router } from 'expo-router';
import { Calendar, Plus, AlertTriangle, ShieldAlert, Sparkles, X, ChevronRight } from 'lucide-react-native';
import Button from '../components/Button';
import Input from '../components/Input';

export default function SupplementStackScreen() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  
  // Form fields
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productName, setProductName] = useState('');
  const [dailyServing, setDailyServing] = useState('');
  const [currentStock, setCurrentStock] = useState('');

  // 1. Fetch user supplement stack
  const { data: stack, isLoading: isStackLoading } = useQuery({
    queryKey: ['supplement-stack'],
    queryFn: async () => {
      const res = await fitnessApi.get('/supplements/stack');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // 2. Fetch refill reminders (automatic servings warnings)
  const { data: warnings, isLoading: isWarningsLoading } = useQuery({
    queryKey: ['refill-reminders'],
    queryFn: async () => {
      const res = await fitnessApi.get('/supplements/refills');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // 3. Fetch advisor recommendations (catches catalog product matches in DB dynamically!)
  const { data: recommendations, isLoading: isRecsLoading } = useQuery({
    queryKey: ['supplement-recs'],
    queryFn: async () => {
      const res = await fitnessApi.get('/supplements/recommend');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Add item mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fitnessApi.post('/supplements/stack', {
        productId: selectedProductId || undefined,
        productName: productName.trim(),
        dailyServing: parseFloat(dailyServing),
        currentStockServings: parseInt(currentStock, 10),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplement-stack'] });
      queryClient.invalidateQueries({ queryKey: ['refill-reminders'] });
      setIsAddModalVisible(false);
      setProductName('');
      setSelectedProductId(null);
      setDailyServing('');
      setCurrentStock('');
    },
    onError: (err: any) => {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible d\'ajouter au stack.');
    },
  });

  const handleAdd = () => {
    if (!productName.trim() || !dailyServing || !currentStock) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    addMutation.mutate();
  };

  if (isStackLoading || isWarningsLoading || isRecsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Refill Alerts warnings banner */}
      {warnings && warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          <Text style={styles.warningsTitle}>⚠️ Alertes Stock Compléments</Text>
          {warnings.map((warn: any, idx: number) => (
            <View key={idx} style={styles.warningRow}>
              <AlertTriangle size={16} color={theme.colors.error} style={{ marginRight: 6 }} />
              <Text style={styles.warningText}>
                {warn.message} ({warn.daysRemaining} jours restants).
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 2. Current Supplement Stack */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mon Programme Actuel</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddModalVisible(true)}>
            <Plus size={16} color={theme.colors.white} />
            <Text style={styles.addBtnText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {stack && stack.length > 0 ? (
            stack.map((item: any) => (
              <View key={item.id.toString()} style={styles.stackRow}>
                <View>
                  <Text style={styles.stackName}>{item.productName}</Text>
                  <Text style={styles.stackMeta}>
                    Dosage : {item.dailyServing} portion/jour • Stock : {item.currentStockServings} restants
                  </Text>
                </View>
                <Calendar size={20} color={theme.colors.primary} />
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucun complément planifié.</Text>
          )}
        </View>
      </View>

      {/* 3. AI Advisor recommendations list */}
      <View style={[styles.section, { marginBottom: theme.spacing.xl }]}>
        <View style={styles.sectionHeader}>
          <Sparkles size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Recommandations Compléments</Text>
        </View>

        {recommendations && recommendations.length > 0 ? (
          recommendations.map((rec: any, idx: number) => (
            <View key={idx} style={styles.recCard}>
              <View style={styles.recHeader}>
                <Text style={styles.recGoal}>Cible : {rec.goal}</Text>
              </View>
              <Text style={styles.recLabel}>Produits suggérés sur Protein.tn :</Text>
              {rec.products.slice(0, 2).map((prod: any) => (
                <TouchableOpacity
                  key={prod.id.toString()}
                  style={styles.recProductRow}
                  onPress={() => router.push(`/product/${prod.slug}`)}>
                  <Text style={styles.recProductName} numberOfLines={1}>{prod.name}</Text>
                  <ChevronRight size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Remplissez d'abord l'onboarding pour générer des conseils.</Text>
        )}
      </View>

      {/* Add supplement to stack Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Planifier un complément</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Input
                label="Nom du complément / produit"
                placeholder="Ex: Gold Standard Whey"
                value={productName}
                onChangeText={setProductName}
              />

              <Input
                label="Servings par jour (dose journalière)"
                placeholder="Ex: 1"
                keyboardType="numeric"
                value={dailyServing}
                onChangeText={setDailyServing}
              />

              <Input
                label="Nombre total de portions (taille du pot)"
                placeholder="Ex: 60 servings"
                keyboardType="numeric"
                value={currentStock}
                onChangeText={setCurrentStock}
              />

              <Button
                title="Ajouter au planning"
                style={{ marginTop: theme.spacing.md }}
                isLoading={addMutation.isPending}
                onPress={handleAdd}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  warningsContainer: {
    backgroundColor: '#FEE2E2',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  warningsTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  warningText: {
    fontSize: 11,
    color: theme.colors.text,
    lineHeight: 16,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textTransform: 'uppercase',
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtnText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  stackName: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  stackMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  recCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  recHeader: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 6,
    marginBottom: 6,
  },
  recGoal: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  recLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  recProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  recProductName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    height: '65%',
    padding: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  modalScroll: {
    flex: 1,
    marginTop: theme.spacing.md,
  },
});

