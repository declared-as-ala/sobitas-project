'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { LinkWithLoading as Link } from '@/app/components/LinkWithLoading';
import { useAuth } from '@/contexts/AuthContext';
import { getBestSellers, getMemberDashboard, getStorageUrl } from '@/services/api';
import { getEffectivePrice } from '@/util/productPrice';
import { pointsToDt } from '@/util/loyaltyPoints';
import type { MemberDashboardData, Product } from '@/types';
import type { PubMedResearchFeed } from '@/services/pubmed';
import { ProtinaAmount, ProtinaMark } from '@/app/components/loyalty/Protina';

const formatter = new Intl.NumberFormat('fr-FR');

function shortName(name?: string): string {
  return (name || 'Membre').trim().split(/\s+/)[0] || 'Membre';
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-label="Chargement du tableau de bord">
      <div className="h-72 animate-pulse rounded-2xl bg-ink-1/10 lg:col-span-2" />
      <div className="h-72 animate-pulse rounded-2xl bg-ink-1/10" />
    </div>
  );
}

export function MemberDashboard({ research }: { research: PubMedResearchFeed }) {
  const { user, orders } = useAuth();
  const [dashboard, setDashboard] = useState<MemberDashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    const [dashboardResult, productsResult] = await Promise.allSettled([
      getMemberDashboard(),
      getBestSellers(),
    ]);
    if (dashboardResult.status === 'fulfilled') setDashboard(dashboardResult.value);
    else setFailed(true);
    if (productsResult.status === 'fulfilled') setProducts(productsResult.value.slice(0, 4));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const latestOrder = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return null;
    return [...orders].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
  }, [orders]);

  const balance = user?.points_balance ?? 0;
  const valueDt = user?.points_value_dt ?? pointsToDt(balance);
  const phoneVerified = !!user?.phone_verified;
  const completedMissions = dashboard?.missions.filter((mission) => mission.completed).length ?? 0;

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
      <section className="pt-slab relative isolate overflow-hidden rounded-2xl shadow-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_15%,rgba(220,58,0,0.32),transparent_36%),radial-gradient(circle_at_95%_82%,rgba(19,107,72,0.2),transparent_28%)]" />
        <div className="relative min-h-80 p-5 sm:p-6 lg:p-8">
          <div className="relative z-10 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Espace membre Protein.tn</p>
            <h1 className="mt-3 font-display text-3xl font-bold uppercase leading-[0.96] tracking-tight text-ink-1 sm:text-4xl lg:text-5xl">
              Marhbé, {shortName(user?.name)}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-2 sm:text-base">
              Suivez vos commandes, partagez votre expérience et transformez vos achats en avantages.
            </p>

            <div className="mt-6 flex flex-wrap items-end gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">Votre solde Protina</p>
                <p className="mt-1 font-display text-4xl font-bold tracking-tight tabular-nums text-ink-1">
                  {formatter.format(balance)} <span className="text-base text-brand">Protinas</span>
                </p>
                <p className="text-sm tabular-nums text-ink-3">soit {valueDt.toFixed(2)} DT à utiliser</p>
              </div>
              <ProtinaMark size="lg" className="h-[68px] w-[68px]" decorative={false} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {!phoneVerified ? (
                <Link href="/verify-phone" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-fill px-4 text-sm font-bold text-on-brand-fill transition-[filter] hover:brightness-95">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Vérifier mon compte
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-bold text-emerald-300">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Membre vérifié
                </span>
              )}
              <Link href="/account?section=fidelite" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-hairline bg-sunken px-4 text-sm font-semibold text-ink-1 hover:border-brand/60">
                Voir mes avantages <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="pt-member-companion pointer-events-none absolute -bottom-12 right-0 hidden lg:block">
            <Image
              src="/member/verified-companion.webp"
              alt=""
              fill
              sizes="350px"
              className="object-contain object-bottom"
              priority
            />
          </div>
        </div>

        <div className="pt-plate relative grid grid-cols-3 divide-x divide-hairline border-t border-hairline">
          {[
            { label: 'Commandes', value: dashboard?.summary.orders ?? orders.length },
            { label: 'Livrées', value: dashboard?.summary.delivered_orders ?? 0 },
            { label: 'Avis publiés', value: dashboard?.summary.reviews ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="px-3 py-4 text-center sm:px-6">
              <p className="font-display text-xl font-bold tabular-nums text-ink-1 sm:text-2xl">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3 sm:text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {loading ? <DashboardSkeleton /> : failed || !dashboard ? (
        <div className="rounded-2xl border border-hairline bg-elevated p-6 text-center shadow-sm">
          <p className="text-sm text-ink-2">Le tableau de bord n’a pas pu être actualisé.</p>
          <button type="button" onClick={() => void load()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/30 px-4 text-sm font-bold text-brand">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Réessayer
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
          <section aria-labelledby="missions-title" className="overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">À votre rythme</p>
                <h2 id="missions-title" className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-ink-1">Mes missions</h2>
              </div>
              <span className="rounded-full bg-sunken px-3 py-1.5 text-xs font-bold tabular-nums text-ink-2">{completedMissions}/{dashboard.missions.length}</span>
            </div>
            <ul className="grid gap-2 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4">
              {dashboard.missions.map((mission) => (
                <li key={mission.key} className="min-w-0">
                  <Link href={mission.href} className={`group flex min-h-[104px] items-start gap-3 rounded-xl border p-4 transition-colors ${mission.completed ? 'border-ok/20 bg-ok/5' : 'border-hairline bg-sunken hover:border-brand/35 hover:bg-brand/5'}`}>
                    <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${mission.completed ? 'border-ok/30 bg-ok/10 text-ok' : 'border-brand/25 bg-elevated text-brand'}`}>
                      {mission.completed ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : dashboard.missions.findIndex((item) => item.key === mission.key) + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold ${mission.completed ? 'text-ink-2 line-through decoration-ink-3/50' : 'text-ink-1'}`}>{mission.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-ink-3">{mission.description}</span>
                    </span>
                    {mission.reward_points !== null && mission.reward_points > 0 && (
                      <span className="shrink-0 rounded-full border border-brand/25 bg-elevated px-2.5 py-1 text-[11px] font-bold text-brand"><ProtinaAmount value={mission.reward_points} signed /></span>
                    )}
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-3 group-hover:text-brand" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="order-title" className="rounded-2xl border border-hairline bg-elevated p-5 shadow-sm sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Dernière activité</p>
            <h2 id="order-title" className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-ink-1">
              {latestOrder ? `Commande #${latestOrder.numero}` : 'Votre première commande'}
            </h2>
            {latestOrder ? (
              <>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-sunken p-3.5">
                  <div><p className="text-xs text-ink-3">Statut</p><p className="mt-0.5 text-sm font-semibold text-ink-1">{latestOrder.etat.replaceAll('_', ' ')}</p></div>
                  <p className="font-display text-lg font-bold tabular-nums text-brand">{Number(latestOrder.prix_ttc || 0).toFixed(2)} DT</p>
                </div>
                <Link href={`/account/orders/${latestOrder.id}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand/25 text-sm font-bold text-brand hover:bg-brand/5">
                  Suivre ma commande <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">Découvrez une sélection authentique, livrée partout en Tunisie.</p>
                <Link href="/shop" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-fill px-4 text-sm font-bold text-on-brand-fill transition-[filter] hover:brightness-95">
                  Découvrir la boutique
                </Link>
              </>
            )}
          </section>
        </div>
      )}

      {dashboard && dashboard.community.reviews.length > 0 && (
        <section aria-labelledby="community-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">La communauté Protein.tn</p>
              <h2 id="community-title" className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-ink-1">Les membres en parlent</h2>
            </div>
            <div className="hidden gap-4 text-right sm:flex">
              <div><p className="font-display text-lg font-bold tabular-nums text-ink-1">{formatter.format(dashboard.community.published_reviews)}</p><p className="text-[10px] uppercase tracking-wide text-ink-3">avis publiés</p></div>
              <div><p className="font-display text-lg font-bold tabular-nums text-ink-1">{formatter.format(dashboard.community.points_awarded)}</p><p className="text-[10px] uppercase tracking-wide text-ink-3">Protinas gagnées</p></div>
            </div>
          </div>
          <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
            {dashboard.community.reviews.map((review) => (
              <li key={review.id} className="flex w-[88%] max-w-sm shrink-0 snap-start flex-col rounded-2xl border border-hairline bg-elevated p-4 shadow-sm sm:w-auto sm:max-w-none sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 text-warn" aria-label={`${review.stars} étoiles sur 5`}>
                    {Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < review.stars ? 'fill-current' : 'text-ink-1/15'}`} aria-hidden="true" />)}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${review.author_status === 'verified_purchase' ? 'bg-ok/10 text-ink-1' : review.author_status === 'verified_member' ? 'bg-brand/10 text-ink-1' : 'bg-sunken text-ink-3'}`}>
                    {review.author_status === 'verified_purchase' ? 'Achat vérifié' : review.author_status === 'verified_member' ? 'Membre vérifié' : review.author_status === 'member' ? 'Membre' : 'Anonyme'}
                  </span>
                </div>
                <p className="mt-4 line-clamp-4 min-h-[5rem] text-sm leading-5 text-ink-2">“{review.comment}”</p>
                <div className="mt-auto flex items-center gap-3 border-t border-hairline pt-4">
                  {review.product?.cover && <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-canvas"><Image src={getStorageUrl(review.product.cover)} alt="" fill sizes="40px" className="object-contain p-1" /></span>}
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink-1">{review.name}</p>{review.product && <Link href={`/products/${review.product.slug}`} className="mt-1 flex min-h-11 items-start truncate pt-1 text-[11px] text-ink-3 hover:text-brand">{review.product.designation}</Link>}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-5">
        {products.length > 0 && (
          <section aria-labelledby="products-title" className="overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-sm xl:col-span-3">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Sélection du moment</p><h2 id="products-title" className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-ink-1">Produits populaires</h2></div>
              <Link href="/shop" className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-brand">Tout voir <ChevronRight className="h-4 w-4" /></Link>
            </div>
            <ul className="divide-y divide-hairline">
              {products.slice(0, 3).map((product) => (
                <li key={product.id}>
                  <Link href={`/products/${product.slug}`} className="group flex min-h-[88px] items-center gap-3 px-5 py-3 hover:bg-sunken sm:px-6">
                    <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-hairline bg-canvas"><Image src={getStorageUrl(product.cover)} alt="" fill sizes="64px" className="object-contain p-1.5" /></span>
                    <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-semibold leading-snug text-ink-1 group-hover:text-brand">{product.designation_fr}</span><span className="mt-1 block font-display text-base font-bold tabular-nums text-brand">{getEffectivePrice(product).toFixed(2)} DT</span></span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 group-hover:text-brand" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="research-title" className={`overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-sm ${products.length === 0 ? 'xl:col-span-5' : 'xl:col-span-2'}`}>
          <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Veille nutrition sportive</p><h2 id="research-title" className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-ink-1">La recherche évolue</h2></div>
            <span className="rounded-full bg-sunken px-2.5 py-1 text-[10px] font-semibold text-ink-3">{research.live ? 'Actualisé' : 'Sélection'}</span>
          </div>
          <ol className="divide-y divide-hairline px-5 sm:px-6">
            {research.studies.map((study, index) => (
              <li key={study.id}>
                <a href={study.url} target="_blank" rel="noreferrer" className="group grid grid-cols-[28px_minmax(0,1fr)_16px] items-start gap-3 py-4">
                  <span className="font-display text-xs font-bold tabular-nums text-brand">0{index + 1}</span>
                  <span className="min-w-0"><span className="line-clamp-3 text-sm font-semibold leading-snug text-ink-1 group-hover:text-brand">{study.title}</span><span className="mt-1 block truncate text-[11px] text-ink-3">{study.journal} · {study.publishedAt}</span></span>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-3 group-hover:text-brand" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
          <p className="border-t border-hairline px-5 py-3 text-[10px] leading-relaxed text-ink-3 sm:px-6">Source : PubMed. Contenu informatif, sans remplacer un avis médical.</p>
        </section>
      </div>
    </div>
  );
}
