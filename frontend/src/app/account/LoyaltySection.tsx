'use client';

import { useState, useEffect } from 'react';
import { getLoyaltyCard, getLoyaltyTransactions } from '@/services/api';
import type { LoyaltyCardData, LoyaltyTransaction } from '@/types/loyalty';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Star, Gift, TrendingUp, Clock, CreditCard, QrCode } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

export function LoyaltySection() {
  const [cardData, setCardData] = useState<LoyaltyCardData | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [card, txData] = await Promise.all([getLoyaltyCard(), getLoyaltyTransactions()]);
        setCardData(card);
        setTransactions(txData.transactions);
      } catch {
        setError('Impossible de charger votre carte fidélité.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !cardData) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>{error ?? 'Carte fidélité non disponible.'}</p>
      </div>
    );
  }

  const { card, points, monetary_value, can_redeem, min_redeem } = cardData;

  const typeColor = (type: string) => {
    switch (type) {
      case 'earn': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'redeem': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'reversal': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">

      {/* Loyalty Card Visual */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div
          className="relative rounded-2xl overflow-hidden text-white p-6 h-48"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}
        >
          {/* Decorative circles */}
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-40px] left-[-40px] w-40 h-40 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)' }} />

          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-bold text-emerald-400 tracking-wide">protein.tn</p>
                <p className="text-xs text-white/50 uppercase tracking-widest">Carte Fidélité</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full border border-emerald-400/50 text-emerald-400">
                Premium
              </span>
            </div>

            <div>
              <p className="font-mono text-sm text-white/50 mb-1">{card.card_number}</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">Points disponibles</p>
                  <p className="text-3xl font-black text-emerald-400">{points.toLocaleString('fr-TN')}</p>
                  <p className="text-sm text-white/70">≈ {monetary_value.toFixed(3)} DT</p>
                </div>
                <div className="text-right text-xs text-white/30">
                  Émise le {card.issued_at ?? '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Star className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mes points</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{points.toLocaleString('fr-TN')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Gift className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Valeur disponible</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{monetary_value.toFixed(3)} DT</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Statut carte</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{card.status}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="w-5 h-5" /> Code QR de la carte
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-white p-3 rounded-xl border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(card.qr_token)}&bgcolor=ffffff&color=0f172a&margin=4`}
              alt="QR Code carte fidélité"
              width={150}
              height={150}
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <p className="font-semibold text-gray-900 dark:text-white">Présentez ce code en boutique</p>
            <p>Scannez votre QR code à la caisse pour cumuler ou utiliser vos points.</p>
            {can_redeem ? (
              <p className="text-emerald-600 font-medium">
                ✓ Vous pouvez utiliser {points} points = {monetary_value.toFixed(3)} DT lors de votre prochain achat.
              </p>
            ) : (
              <p className="text-gray-400">
                Minimum {min_redeem} points pour utiliser. Il vous manque {Math.max(0, min_redeem - points)} points.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border-emerald-200 dark:border-emerald-700">
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Programme de fidélité</h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <li>• <strong>1 DT</strong> dépensé = <strong>1 point</strong> gagné</li>
            <li>• <strong>10 points</strong> = <strong>1 DT</strong> de réduction</li>
            <li>• Points gagnés après livraison confirmée</li>
            <li>• Utilisables dès {min_redeem} points accumulés</li>
          </ul>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5" /> Historique des points
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Aucune transaction pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor(tx.type)}`}>
                      {tx.type_label}
                    </span>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-200">{tx.description}</p>
                      {tx.order_number && (
                        <p className="text-xs text-gray-400">Commande #{tx.order_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.points >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.points >= 0 ? '+' : ''}{tx.points} pts
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.date).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
