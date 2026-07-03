import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  FlatList,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fitnessApi } from '../../services/api';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/auth';
import { router } from 'expo-router';
import { Award, Share2, Ticket, Check, RefreshCw, UserCheck } from 'lucide-react-native';
import Button from '../../components/Button';
import Input from '../../components/Input';

export default function RewardsScreen() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [redeemSuccessMsg, setRedeemSuccessMsg] = useState<string | null>(null);
  const [redeemErrorMsg, setRedeemErrorMsg] = useState<string | null>(null);

  // 1. Fetch loyalty points balance and transactions
  const { data: loyalty, isLoading: isLoyaltyLoading, refetch: refetchLoyalty } = useQuery({
    queryKey: ['loyalty-summary'],
    queryFn: async () => {
      const res = await fitnessApi.get('/loyalty');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // 2. Fetch referral code & referred list
  const { data: referralData, isLoading: isReferralLoading, refetch: refetchReferrals } = useQuery({
    queryKey: ['referral-data'],
    queryFn: async () => {
      const res = await fitnessApi.get('/referrals');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // 3. Redeem referral mutation
  const redeemMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fitnessApi.post('/referrals/redeem', { referralCode: code });
      return res.data;
    },
    onSuccess: (data) => {
      setRedeemSuccessMsg(data.message || 'Code parrainage appliqué avec succès !');
      setRedeemErrorMsg(null);
      setReferralCodeInput('');
      queryClient.invalidateQueries({ queryKey: ['loyalty-summary'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Code parrainage invalide ou déjà utilisé.';
      setRedeemErrorMsg(message);
      setRedeemSuccessMsg(null);
    },
  });

  const handleShareReferral = async () => {
    if (!referralData?.referralCode) return;
    try {
      await Share.share({
        message: `Rejoins-moi sur Protein.tn, utilise mon code de parrainage : ${referralData.referralCode} pour gagner 50 points fidélité bonus dès ton inscription ! 🏋️‍♂️`,
      });
    } catch (e) {
      console.error('Failed to share referral code', e);
    }
  };

  const handleRedeem = () => {
    if (!referralCodeInput.trim()) return;
    redeemMutation.mutate(referralCodeInput.trim());
  };

  const getSourceLabel = (src: string) => {
    switch (src) {
      case 'check_in':
        return 'Check-in Quotidien';
      case 'workout':
        return 'Séance Entraînement';
      case 'referral':
        return 'Parrainage';
      case 'purchase':
        return 'Achat Boutique';
      default:
        return 'Bonus';
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Award size={40} color={theme.colors.textMuted} />
        <Text style={styles.promoText}>Connectez-vous pour rejoindre le programme de fidélité et parrainer vos amis.</Text>
        <Button title="Se connecter" style={styles.promoBtn} onPress={() => router.push('/login')} />
      </View>
    );
  }

  if (isLoyaltyLoading || isReferralLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Loyalty Balance Card */}
      <View style={[styles.loyaltyCard, theme.shadows.medium]}>
        <View style={styles.badgeColumn}>
          <Award size={48} color={theme.colors.primary} />
          <Text style={styles.tierName}>Statut {loyalty?.tier || 'Bronze'}</Text>
          <Text style={styles.tierDiscount}>{loyalty?.discountPercent || 0}% Réduction Boutique</Text>
        </View>

        <View style={styles.progressSection}>
          <Text style={styles.pointsDisplay}>
            {loyalty?.points || 0} <Text style={styles.pointsSub}>Points</Text>
          </Text>
          {loyalty?.nextTier !== 'Max' ? (
            <>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${loyalty?.progressPercent || 0}%` }]} />
              </View>
              <Text style={styles.progressText}>
                Plus que {loyalty?.pointsToNextTier || 0} pts pour devenir {loyalty?.nextTier || 'Silver'} !
              </Text>
            </>
          ) : (
            <Text style={styles.progressText}>Félicitations, vous avez atteint le niveau maximum ! 🚀</Text>
          )}
        </View>
      </View>

      {/* 2. Referral program */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parrainez vos amis</Text>
        <View style={styles.card}>
          <Text style={styles.cardDesc}>
            Partagez votre code unique. Votre ami reçoit 50 points d'inscription et vous recevez 100 points lors de sa première commande.
          </Text>
          
          <View style={styles.shareRow}>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{referralData?.referralCode || 'PT-XXXX'}</Text>
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={handleShareReferral}>
              <Share2 size={18} color={theme.colors.white} />
              <Text style={styles.shareButtonText}>Partager</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. Redeem referral input code */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Utiliser un code parrain</Text>
        <View style={styles.card}>
          <Text style={styles.cardDesc}>Vous venez de rejoindre ? Entrez le code de votre parrain.</Text>
          <View style={styles.redeemRow}>
            <Input
              placeholder="Ex: PT-JOHN-12"
              containerStyle={{ flex: 2, marginBottom: 0, marginRight: theme.spacing.sm }}
              style={{ height: 48 }}
              value={referralCodeInput}
              onChangeText={setReferralCodeInput}
            />
            <TouchableOpacity
              style={styles.redeemBtn}
              onPress={handleRedeem}
              disabled={redeemMutation.isPending}>
              {redeemMutation.isPending ? (
                <ActivityIndicator color={theme.colors.white} size="small" />
              ) : (
                <Text style={styles.redeemBtnText}>Valider</Text>
              )}
            </TouchableOpacity>
          </View>
          {redeemSuccessMsg && <Text style={styles.successText}>{redeemSuccessMsg}</Text>}
          {redeemErrorMsg && <Text style={styles.errorText}>{redeemErrorMsg}</Text>}
        </View>
      </View>

      {/* 4. Points History Transactions list */}
      <View style={[styles.section, { marginBottom: theme.spacing.xl }]}>
        <Text style={styles.sectionTitle}>Historique des gains</Text>
        <View style={styles.card}>
          {loyalty?.history && loyalty.history.length > 0 ? (
            loyalty.history.map((tx: any) => (
              <View key={tx.id.toString()} style={styles.txRow}>
                <View>
                  <Text style={styles.txSource}>{getSourceLabel(tx.source)}</Text>
                  <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.txPoints}>+{tx.points} pts</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucun point encore cumulé.</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  promoText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  promoBtn: {
    width: '80%',
  },
  loyaltyCard: {
    backgroundColor: theme.colors.secondary,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  badgeColumn: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  tierName: {
    color: theme.colors.white,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.heavy,
    marginTop: theme.spacing.sm,
  },
  tierDiscount: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    marginTop: 4,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
  },
  pointsDisplay: {
    color: theme.colors.white,
    fontSize: theme.typography.sizes.display,
    fontWeight: theme.typography.weights.heavy,
  },
  pointsSub: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.regular,
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
    marginVertical: theme.spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
  },
  progressText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
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
  cardDesc: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeContainer: {
    flex: 1.5,
    height: 48,
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  codeText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  shareButton: {
    flex: 1,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
    marginLeft: 6,
  },
  redeemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redeemBtn: {
    width: 90,
    height: 48,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemBtnText: {
    color: theme.colors.white,
    fontWeight: theme.typography.weights.bold,
  },
  successText: {
    color: theme.colors.success,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    marginTop: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    marginTop: theme.spacing.sm,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  txSource: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  txDate: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  txPoints: {
    fontSize: theme.typography.sizes.sm + 1,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.success,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
});
