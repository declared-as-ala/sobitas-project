'use client';

/** A two-step buying tool: choose available products, then verify the pack. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, m, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import type { Product } from '@/types';
import type { PackGroup } from './steps';
import { ProductPicker } from './ProductPicker';
import { StepRecap } from './StepRecap';
import { PackSummary } from './PackSummary';
import { stepVariants } from './variants';

const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default);

type Stage = 'build' | 'review';
const STAGES: { key: Stage; short: string; label: string }[] = [
  { key: 'build', short: '1', label: 'Produits' },
  { key: 'review', short: '2', label: 'Votre pack' },
];

const CATEGORY_ART: Record<string, string> = {
  'sante-vitalite': '/images/pack-builder/categories/sante-vitalite.webp',
  proteines: '/images/pack-builder/categories/proteines.webp',
  'perte-de-poids': '/images/pack-builder/categories/perte-de-poids.webp',
  'prise-de-masse': '/images/pack-builder/categories/prise-de-masse.webp',
  performance: '/images/pack-builder/categories/performance.webp',
  equipement: '/images/pack-builder/categories/equipement.webp',
};

export interface PackWizardProps {
  groups: PackGroup[];
  pack: Record<number, number>;
  entries: { product: Product; qty: number }[];
  itemCount: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  tierLabel: string | null;
  nextTier: { percent: number; remaining: number } | null;
  quoteLoading: boolean;
  submitting: boolean;
  tiers: { min: number; percent: number }[];
  onAdd: (product: Product, img: HTMLElement | null) => void;
  onSetQty: (product: Product, qty: number) => void;
  onRemove: (product: Product) => void;
  onSubmit: () => void;
  footerRef: React.RefObject<HTMLDivElement | null>;
  tierTrackRef: React.RefObject<HTMLDivElement | null>;
}

function StageNav({ stage, hasItems, onChange }: { stage: Stage; hasItems: boolean; onChange: (stage: Stage) => void }) {
  const current = STAGES.findIndex((item) => item.key === stage);
  return (
    <nav aria-label="Étapes de composition" className="mb-3 shrink-0">
      <ol className="grid grid-cols-2 overflow-hidden rounded-xl border border-hairline bg-elevated">
        {STAGES.map((item, index) => {
          const active = item.key === stage;
          const completed = index < current;
          const disabled = item.key === 'review' && !hasItems;
          return (
            <li key={item.key} className="border-l border-hairline first:border-l-0">
              <button
                type="button"
                disabled={disabled}
                aria-current={active ? 'step' : undefined}
                onClick={() => onChange(item.key)}
                className={`flex min-h-[48px] w-full items-center justify-center gap-2 px-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-brand text-on-brand' : 'text-ink-2 [@media(hover:hover)]:hover:bg-sunken [@media(hover:hover)]:hover:text-ink-1'
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                    active ? 'border-on-brand/40' : completed ? 'border-ok text-ok' : 'border-hairline'
                  }`}
                  aria-hidden="true"
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : item.short}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function DiscountSteps({ tiers }: { tiers: { min: number; percent: number }[] }) {
  return (
    <div className="flex min-w-max items-center gap-1.5" aria-label="Paliers de remise">
      {tiers.map((tier) => (
        <span key={tier.min} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-hairline bg-elevated px-2.5 text-[11px] text-ink-2 sm:text-xs">
          <strong className="font-display text-sm font-extrabold text-brand sm:text-base">−{tier.percent}%</strong>
          dès {tier.min} DT
        </span>
      ))}
    </div>
  );
}

export function PackWizard(props: PackWizardProps) {
  const {
    groups, pack, entries, itemCount, subtotal, discountPercent, discountAmount,
    total, tierLabel, nextTier, quoteLoading, submitting, tiers, onAdd, onSetQty,
    onRemove, onSubmit, footerRef, tierTrackRef,
  } = props;
  const calm = useReducedMotion() === true;
  const [stage, setStage] = useState<Stage>('build');
  const [direction, setDirection] = useState(1);
  const [activeSlug, setActiveSlug] = useState(groups[0]?.slug ?? '');
  const stageRef = useRef<HTMLDivElement>(null);
  const hasNavigated = useRef(false);
  const activeGroup = groups.find((group) => group.slug === activeSlug) ?? groups[0];
  const stageIndex = STAGES.findIndex((item) => item.key === stage);

  const goToStage = useCallback((next: Stage) => {
    if (next === 'review' && itemCount === 0) return;
    const nextIndex = STAGES.findIndex((item) => item.key === next);
    setDirection(nextIndex >= stageIndex ? 1 : -1);
    setStage(next);
    hasNavigated.current = true;
  }, [itemCount, stageIndex]);

  useEffect(() => {
    if (!hasNavigated.current) return;
    stageRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  }, [calm, stage]);

  const selectedByGroup = useMemo(
    () => Object.fromEntries(groups.map((group) => [
      group.slug,
      group.products.reduce((count, product) => count + (pack[product.id] ?? 0), 0),
    ])),
    [groups, pack]
  );

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-0 flex-col">
          <StageNav stage={stage} hasItems={itemCount > 0} onChange={goToStage} />
          <AnimatePresence mode="wait" custom={direction}>
            <m.div
              key={stage}
              ref={stageRef}
              tabIndex={-1}
              custom={direction}
              variants={stepVariants(calm)}
              initial="enter"
              animate="center"
              exit="exit"
              className="min-h-0 outline-none"
            >
              {stage === 'build' && activeGroup && (
                <section aria-labelledby="pack-products-title" className="flex min-h-0 flex-col">
                  <div className="pt-pack-controls shrink-0 lg:sticky lg:top-0 lg:z-30 lg:bg-sunken lg:pb-2.5">
                    <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <h1 id="pack-products-title" className="font-display text-2xl font-extrabold uppercase leading-none tracking-[-0.01em] text-ink-1 [word-spacing:0.12em] sm:text-3xl">
                          Composez votre pack
                        </h1>
                      </div>
                      <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                        <DiscountSteps tiers={tiers} />
                      </div>
                    </div>

                    <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                      <div className="flex min-w-max snap-x snap-mandatory gap-2" role="tablist" aria-label="Rayons du pack">
                        {groups.map((group) => {
                          const active = group.slug === activeGroup.slug;
                          const selected = selectedByGroup[group.slug] ?? 0;
                          const art = CATEGORY_ART[group.slug];
                          return (
                            <button
                              key={group.slug}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              aria-controls="pack-products-panel"
                              onClick={() => setActiveSlug(group.slug)}
                              className={`inline-flex min-h-[46px] snap-start items-center gap-2 rounded-xl border py-1 pl-1 pr-3 text-xs font-semibold transition-[border-color,background-color,color,box-shadow,transform] active:scale-[0.98] sm:text-sm ${
                                active ? 'border-brand bg-brand text-on-brand shadow-[0_5px_16px_rgba(221,58,0,0.18)]' : 'border-hairline bg-elevated text-ink-2 [@media(hover:hover)]:hover:border-brand/60 [@media(hover:hover)]:hover:text-brand'
                              }`}
                            >
                              {art && (
                                <span className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-lg ${active ? 'bg-elevated/95' : 'bg-sunken'}`} aria-hidden="true">
                                  <Image src={art} alt="" fill sizes="36px" className="object-contain p-0.5" />
                                </span>
                              )}
                              <span>{group.label}</span>
                              {selected > 0 && (
                                <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${active ? 'bg-elevated text-ink-1' : 'bg-brand text-on-brand'}`}>
                                  {selected}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-pack-workspace min-h-0 flex-1 pt-2">
                    <div id="pack-products-panel" role="tabpanel" aria-label={activeGroup.label} className="pt-pack-products-scroll min-w-0">
                      <ProductPicker products={activeGroup.products} pack={pack} onAdd={onAdd} onSetQty={onSetQty} calm={calm} />
                    </div>
                    <PackSummary
                      entries={entries}
                      itemCount={itemCount}
                      subtotal={subtotal}
                      discountPercent={discountPercent}
                      discountAmount={discountAmount}
                      total={total}
                      nextTier={nextTier}
                      quoteLoading={quoteLoading}
                      tiers={tiers}
                      onRemove={onRemove}
                      onReview={() => goToStage('review')}
                      actionRef={footerRef}
                      tierTrackRef={tierTrackRef}
                    />
                  </div>
                </section>
              )}

              {stage === 'review' && (
                <div className="mx-auto max-w-3xl pb-8 lg:pb-0">
                  <StepRecap
                    entries={entries}
                    subtotal={subtotal}
                    discountPercent={discountPercent}
                    discountAmount={discountAmount}
                    total={total}
                    tierLabel={tierLabel}
                    nextTier={nextTier}
                    quoteLoading={quoteLoading}
                    submitting={submitting}
                    onRemove={onRemove}
                    onModify={() => goToStage('build')}
                    onSubmit={onSubmit}
                    calm={calm}
                  />
                </div>
              )}
            </m.div>
          </AnimatePresence>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
