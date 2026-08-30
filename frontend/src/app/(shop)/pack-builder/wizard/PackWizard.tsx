'use client';

/**
 * Three-stage configurator: orientation, one freely navigable workspace, and review.
 * Pricing and cart state stay in PackBuilderClient; this file owns interaction and layout only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, m, useReducedMotion } from 'motion/react';
import { Check, ChevronRight, Target } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import type { Product } from '@/types';
import { GOAL_LABELS, type Goal } from '@/util/nutritionTargets';
import type { PackGroup } from './steps';
import type { GoalCovers } from './goalCovers';
import { StepGoal } from './StepGoal';
import { ProductPicker } from './ProductPicker';
import { StepRecap } from './StepRecap';
import { PackSummary } from './PackSummary';
import { stepVariants } from './variants';

const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default);

type Stage = 'goal' | 'build' | 'review';

const STAGES: { key: Stage; short: string; label: string }[] = [
  { key: 'goal', short: '1', label: 'Objectif' },
  { key: 'build', short: '2', label: 'Produits' },
  { key: 'review', short: '3', label: 'Votre pack' },
];

export interface PackWizardProps {
  groups: PackGroup[];
  goalCovers: GoalCovers;
  categoryOrder: string[] | null;
  goal: Goal | null;
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
  hasQuote: boolean;
  submitting: boolean;
  tiers: { min: number; percent: number }[];
  coveredSlugs: string[];
  onSelectGoal: (goal: Goal) => void;
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
    <nav aria-label="Étapes de composition" className="mb-8 sm:mb-10">
      <ol className="grid grid-cols-3 overflow-hidden rounded-xl border border-hairline bg-elevated">
        {STAGES.map((item, index) => {
          const active = item.key === stage;
          const completed = index < current || (item.key === 'build' && stage === 'review');
          const disabled = item.key === 'review' && !hasItems;

          return (
            <li key={item.key} className="border-l border-hairline first:border-l-0">
              <button
                type="button"
                disabled={disabled}
                aria-current={active ? 'step' : undefined}
                onClick={() => onChange(item.key)}
                className={`flex min-h-[52px] w-full items-center justify-center gap-2 px-2 text-xs font-semibold transition-colors sm:text-sm ${
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

export function PackWizard(props: PackWizardProps) {
  const {
    groups, goalCovers, categoryOrder, goal, pack, entries, itemCount, subtotal,
    discountPercent, discountAmount, total, tierLabel, nextTier, quoteLoading,
    hasQuote, submitting, tiers, coveredSlugs, onSelectGoal, onAdd, onSetQty,
    onRemove, onSubmit, footerRef, tierTrackRef,
  } = props;

  const calm = useReducedMotion() === true;
  const [stage, setStage] = useState<Stage>('goal');
  const [direction, setDirection] = useState(1);
  const [activeSlug, setActiveSlug] = useState(groups[0]?.slug ?? '');
  const stageRef = useRef<HTMLDivElement>(null);
  const hasNavigated = useRef(false);

  const orderedGroups = useMemo(() => {
    if (!categoryOrder) return groups;
    return [...groups].sort((a, b) => {
      const aRank = categoryOrder.indexOf(a.slug);
      const bRank = categoryOrder.indexOf(b.slug);
      return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
    });
  }, [categoryOrder, groups]);

  const activeGroup = orderedGroups.find((group) => group.slug === activeSlug) ?? orderedGroups[0];
  const labelBySlug = useMemo(() => Object.fromEntries(groups.map((group) => [group.slug, group.label])), [groups]);
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

  useEffect(() => {
    if (categoryOrder?.[0]) setActiveSlug(categoryOrder[0]);
  }, [categoryOrder]);

  const handleGoal = useCallback((selected: Goal) => {
    onSelectGoal(selected);
    goToStage('build');
  }, [goToStage, onSelectGoal]);

  const jumpToCategory = useCallback((slug: string) => {
    setActiveSlug(slug);
    goToStage('build');
  }, [goToStage]);

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
        {stage !== 'goal' && <h1 className="sr-only">Composez votre pack de compléments alimentaires</h1>}
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
            className="outline-none"
          >
            {stage === 'goal' && (
              <section aria-labelledby="pack-goal-title">
                <div className="mb-7 max-w-3xl sm:mb-9">
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
                    <Target className="h-4 w-4" aria-hidden="true" /> Pack sur mesure
                  </p>
                  <h1 id="pack-goal-title" className="font-display font-compressed text-4xl font-extrabold uppercase leading-none tracking-tight text-ink-1 sm:text-5xl lg:text-6xl">
                    Commencez par votre objectif
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">
                    Nous plaçons les catégories les plus utiles en premier. Rien n&apos;est bloqué et vous gardez la main.
                  </p>
                </div>

                <StepGoal goal={goal} covers={goalCovers} onSelect={handleGoal} onSkip={() => goToStage('build')} calm={calm} showHeader={false} />

                <div className="mt-8 rounded-2xl border border-hairline bg-elevated p-4 sm:p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-3">Remise automatique</p>
                  <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-rule">
                    {tiers.map((tier) => (
                      <div key={tier.min} className="bg-sunken px-2 py-4 text-center sm:px-4">
                        <p className="font-display text-xl font-extrabold tabular-nums text-brand sm:text-2xl">−{tier.percent}%</p>
                        <p className="mt-1 text-[11px] text-ink-2 sm:text-xs">dès {tier.min} DT</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-3">
                  <span className="font-semibold text-ink-2">Explorer directement :</span>
                  {groups.map((group) => (
                    <LinkWithLoading key={group.slug} href={`/${group.slug}`} className="inline-flex min-h-[44px] items-center gap-1 font-semibold underline-offset-4 [@media(hover:hover)]:hover:text-brand [@media(hover:hover)]:hover:underline">
                      {group.label} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </LinkWithLoading>
                  ))}
                </div>
              </section>
            )}

            {stage === 'build' && activeGroup && (
              <section aria-labelledby="pack-products-title">
                <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Étape 2 · Composition</p>
                    <h2 id="pack-products-title" className="mt-2 font-display font-compressed text-4xl font-extrabold uppercase leading-none tracking-tight text-ink-1 sm:text-5xl">
                      Composez librement
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2 sm:text-base">Ajoutez, comparez et changez de catégorie sans perdre votre sélection.</p>
                  </div>
                  {goal && (
                    <button type="button" onClick={() => goToStage('goal')} className="inline-flex min-h-[44px] w-fit items-center rounded-full border border-hairline bg-elevated px-4 text-xs font-semibold text-ink-2 transition-colors [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand">
                      Objectif : {GOAL_LABELS[goal].label}
                    </button>
                  )}
                </div>

                <div className="scrollbar-hide -mx-4 mb-6 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                  <div className="flex min-w-max gap-2" role="tablist" aria-label="Catégories du pack">
                    {orderedGroups.map((group) => {
                      const active = group.slug === activeGroup.slug;
                      const selected = selectedByGroup[group.slug] ?? 0;
                      return (
                        <button
                          key={group.slug}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setActiveSlug(group.slug)}
                          className={`inline-flex min-h-[46px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                            active ? 'border-brand bg-brand text-on-brand' : 'border-hairline bg-elevated text-ink-2 [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand'
                          }`}
                        >
                          {group.label}
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

                <div className="pt-pack-workspace">
                  <div role="tabpanel" aria-label={activeGroup.label} className="min-w-0">
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <h3 className="font-display text-xl font-extrabold uppercase tracking-tight text-ink-1 sm:text-2xl">{activeGroup.label}</h3>
                        <p className="mt-1 text-xs text-ink-3">{activeGroup.products.length} produits disponibles</p>
                      </div>
                    </div>
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
              <div className="mx-auto max-w-2xl">
                <StepRecap
                  entries={entries}
                  itemCount={itemCount}
                  subtotal={subtotal}
                  discountPercent={discountPercent}
                  discountAmount={discountAmount}
                  total={total}
                  tierLabel={tierLabel}
                  nextTier={nextTier}
                  quoteLoading={quoteLoading}
                  hasQuote={hasQuote}
                  submitting={submitting}
                  goal={goal}
                  coveredSlugs={coveredSlugs}
                  availableSlugs={groups.map((group) => group.slug)}
                  labelBySlug={labelBySlug}
                  onRemove={onRemove}
                  onJumpToCategory={jumpToCategory}
                  onSelectGoal={onSelectGoal}
                  onSubmit={onSubmit}
                  calm={calm}
                />
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}
