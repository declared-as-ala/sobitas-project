import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { shopApi, getProductImageUrl } from '../services/api';
import { theme } from '../constants/theme';
import { useAuthStore } from '../store/auth';
import { router } from 'expo-router';
import { ClipboardList, ChevronRight, X, PhoneCall } from 'lucide-react-native';
import Button from '../components/Button';

export default function OrdersScreen() {
  const { isAuthenticated } = useAuthStore();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // 1. Fetch user orders
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['client-orders'],
    queryFn: async () => {
      const res = await shopApi.get('/client_commandes');
      // Format response based on pagination wrapper
      return res.data?.data || res.data || [];
    },
    enabled: isAuthenticated,
  });

  // 2. Fetch single order details when clicked
  const { data: detailsData, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['order-details', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await shopApi.post(`/detail_commande/${selectedOrderId}`);
      return res.data;
    },
    enabled: !!selectedOrderId,
  });

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'nouvelle':
      case 'new':
      case 'en attente':
        return { bg: '#E0F2FE', text: '#0284C7' };
      case 'livré':
      case 'delivered':
      case 'payé':
        return { bg: '#DEF7EC', text: theme.colors.success };
      case 'annulé':
      case 'canceled':
        return { bg: '#FDE8E8', text: theme.colors.error };
      default:
        return { bg: '#F1F5F9', text: theme.colors.textMuted };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'nouvelle':
      case 'new':
        return 'En attente';
      case 'livré':
      case 'delivered':
        return 'Livré';
      case 'annulé':
      case 'canceled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.etat);
    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.8}
        onPress={() => setSelectedOrderId(item.id)}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>Commande {item.numero}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {getStatusLabel(item.etat)}
            </Text>
          </View>
        </View>
        
        <View style={styles.orderBody}>
          <Text style={styles.orderMeta}>Date : {new Date(item.created_at).toLocaleDateString()}</Text>
          <Text style={styles.orderTotal}>{Number(item.prix_ttc).toFixed(3)} TND</Text>
        </View>
        
        <View style={styles.orderFooter}>
          <Text style={styles.viewDetailsText}>Voir le détail</Text>
          <ChevronRight size={16} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <ClipboardList size={40} color={theme.colors.textMuted} />
        <Text style={styles.promoText}>Connectez-vous pour voir vos commandes.</Text>
        <Button title="Se connecter" style={{ width: '80%' }} onPress={() => router.push('/login')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : ordersData.length === 0 ? (
        <View style={styles.centerContainer}>
          <ClipboardList size={40} color={theme.colors.textMuted} />
          <Text style={styles.promoText}>Vous n'avez pas encore passé de commande.</Text>
          <Button title="Visiter la boutique" style={{ width: '80%' }} onPress={() => router.push('/(tabs)/shop')} />
        </View>
      ) : (
        <FlatList
          data={ordersData}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}

      {/* Order Details Modal */}
      <Modal
        visible={!!selectedOrderId}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedOrderId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détail Commande</Text>
              <TouchableOpacity onPress={() => setSelectedOrderId(null)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {isDetailsLoading ? (
              <View style={styles.modalCenterContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : detailsData ? (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Status card */}
                <View style={styles.detailsStatusCard}>
                  <Text style={styles.detailsNumber}>Numéro : {detailsData.commande?.numero}</Text>
                  <Text style={styles.detailsMeta}>
                    Passée le : {new Date(detailsData.commande?.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.detailsTotal}>Total : {Number(detailsData.commande?.prix_ttc).toFixed(3)} TND</Text>
                </View>

                {/* Items List */}
                <Text style={styles.detailsSectionLabel}>Produits</Text>
                {detailsData.details?.map((item: any) => (
                  <View key={item.id.toString()} style={styles.itemRow}>
                    <Image
                      source={{ uri: getProductImageUrl(item.product?.cover) }}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemName} numberOfLines={2}>{item.product?.designation_fr}</Text>
                      <Text style={styles.itemQtyPrice}>
                        Quantité : {item.qte} x {Number(item.prix_unitaire).toFixed(3)} TND
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Delivery Information */}
                <Text style={styles.detailsSectionLabel}>Adresse de Livraison</Text>
                <View style={styles.deliveryCard}>
                  <Text style={styles.deliveryText}>
                    {detailsData.commande?.prenom} {detailsData.commande?.nom}
                  </Text>
                  <Text style={styles.deliveryText}>{detailsData.commande?.adresse1}</Text>
                  <Text style={styles.deliveryText}>
                    {detailsData.commande?.ville}, {detailsData.commande?.region}
                  </Text>
                  <Text style={styles.deliveryText}>Tél : {detailsData.commande?.phone}</Text>
                </View>

                {/* Contact support button */}
                <TouchableOpacity style={styles.supportBtn} activeOpacity={0.8}>
                  <PhoneCall size={18} color={theme.colors.white} style={{ marginRight: theme.spacing.sm }} />
                  <Text style={styles.supportBtnText}>Contacter le support client</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  promoText: {
    fontSize: theme.typography.sizes.sm + 1,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  orderCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
  },
  orderNumber: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  orderMeta: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
  },
  orderTotal: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.text,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  viewDetailsText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginRight: 4,
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
    height: '80%',
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
  modalCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flex: 1,
    marginTop: theme.spacing.md,
  },
  detailsStatusCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  detailsNumber: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  detailsMeta: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  detailsTotal: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primary,
    marginTop: 8,
  },
  detailsSectionLabel: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginVertical: theme.spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginRight: theme.spacing.md,
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  itemQtyPrice: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  deliveryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  deliveryText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  supportBtn: {
    backgroundColor: theme.colors.secondary,
    height: 50,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  supportBtnText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },
});

