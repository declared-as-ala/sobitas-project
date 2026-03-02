'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView, type Variants } from 'motion/react';

// ─── Animated SVG Icons (premium, minimal, animatable) ───────────────────────

function IconTruck({ className, isHovered }: { className?: string; isHovered?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <motion.g
        animate={isHovered ? { x: [0, 2, 0] } : {}}
        transition={{ duration: 0.6, repeat: isHovered ? Infinity : 0, repeatDelay: 0.2 }}
      >
        <path d="M4 28h4l4-8h10v8h14l4-12H28V8H4v20z" />
      </motion.g>
      <motion.circle
        cx="14"
        cy="36"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 1.2, repeat: isHovered ? Infinity : 0, ease: 'linear' }}
      />
      <motion.circle
        cx="34"
        cy="36"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 1.2, repeat: isHovered ? Infinity : 0, ease: 'linear' }}
      />
    </svg>
  );
}

function IconShield({ className, isHovered }: { className?: string; isHovered?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <motion.path
        d="M24 4L8 10v10c0 10 8 18 16 22 8-4 16-12 16-22V10L24 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0.6, opacity: 0.8 }}
        animate={
          isHovered
            ? { pathLength: 1, opacity: 1 }
            : { pathLength: 0.85, opacity: 0.9 }
        }
        transition={{ duration: 0.5 }}
      />
      <motion.path
        d="M18 24l4 4 8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          isHovered
            ? { pathLength: 1, opacity: 1 }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 0.4, delay: isHovered ? 0.2 : 0 }}
      />
    </svg>
  );
}

function IconCreditCard({ className, isHovered }: { className?: string; isHovered?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <motion.rect
        x="4"
        y="12"
        width="40"
        height="28"
        rx="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={
          isHovered
            ? { scale: [1, 1.02, 1], transition: { duration: 0.6 } }
            : {}
        }
      />
      <motion.line
        x1="4"
        y1="20"
        x2="44"
        y2="20"
        strokeWidth="1.5"
        animate={
          isHovered
            ? { opacity: [1, 0.4, 1], transition: { duration: 1.2, repeat: Infinity } }
            : { opacity: 1 }
        }
      />
      <motion.rect
        x="12"
        y="28"
        width="16"
        height="3"
        rx="1"
        fill="currentColor"
        initial={false}
        animate={
          isHovered
            ? { opacity: [0.4, 1, 0.4], transition: { duration: 1.5, repeat: Infinity } }
            : { opacity: 0.5 }
        }
      />
    </svg>
  );
}

function IconHeadphones({ className, isHovered }: { className?: string; isHovered?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <motion.path
        d="M8 24v-4a16 16 0 0132 0v4"
        strokeLinecap="round"
        animate={isHovered ? { scaleY: [1, 1.1, 1], originY: 1 } : {}}
        transition={{ duration: 0.5 }}
      />
      <motion.path
        d="M8 24h4a4 4 0 014 4v8a4 4 0 01-4 4H8a4 4 0 01-4-4v-8a4 4 0 014-4z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.path
        d="M36 24h4a4 4 0 014 4v8a4 4 0 01-4 4h-4a4 4 0 01-4-4v-8a4 4 0 014-4z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[20, 24, 28].map((x, i) => (
        <motion.line
          key={x}
          x1={x}
          y1="20"
          x2={x}
          y2="12"
          strokeWidth="1.2"
          strokeLinecap="round"
          animate={
            isHovered
              ? {
                  scaleY: [1, 1.4, 1],
                  opacity: [0.6, 1, 0.6],
                  transition: { duration: 0.8, delay: i * 0.1, repeat: Infinity },
                }
              : {}
          }
        />
      ))}
    </svg>
  );
}

// ─── Feature data ───────────────────────────────────────────────────────────

const features = [
  {
    id: 'delivery',
    Icon: IconTruck,
    title: 'Livraison Rapide',
    description: 'Livraison gratuite à partir de 300 DT dans toute la Tunisie',
  },
  {
    id: 'authentic',
    Icon: IconShield,
    title: 'Produits Authentiques',
    description: "100% originaux avec certificats d'authenticité",
  },
  {
    id: 'payment',
    Icon: IconCreditCard,
    title: 'Paiement Sécurisé',
    description: 'Paiement à la livraison ou par carte bancaire',
  },
  {
    id: 'support',
    Icon: IconHeadphones,
    title: 'Support 24/7',
    description: "Notre équipe est disponible pour vous aider",
  },
];

// ─── Animation variants ─────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 24,
    },
  },
};

// ─── Feature card component ────────────────────────────────────────────────

function FeatureCard({
  feature,
  index,
  isInView,
}: {
  feature: (typeof features)[0];
  index: number;
  isInView: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = feature.Icon;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative"
    >
      <motion.article
        className="relative h-full rounded-2xl overflow-hidden bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl border border-white/60 dark:border-gray-700/50"
        initial={false}
        animate={{
          y: hovered ? -6 : 0,
          scale: hovered ? 1.02 : 1,
          boxShadow: hovered
            ? '0 24px 48px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px -8px rgba(220,38,38,0.25)'
            : '0 4px 24px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className="relative z-10 flex flex-col items-center text-center px-6 py-8 sm:py-10">
          {/* Icon wrapper with idle float + hover glow */}
          <motion.div
            className="mb-5 sm:mb-6 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-100 to-red-200/80 dark:from-red-950/80 dark:to-red-900/60 shadow-lg shadow-red-900/10 dark:shadow-red-950/30 border border-red-200/50 dark:border-red-800/40"
            animate={{
              y: hovered ? -4 : [0, -3, 0],
              boxShadow: hovered
                ? '0 0 32px -4px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.8)'
                : '0 4px 16px -4px rgba(220,38,38,0.2), inset 0 1px 0 rgba(255,255,255,0.6)',
              transition: {
                y: hovered ? { duration: 0.25 } : { duration: 3, repeat: Infinity, repeatType: 'reverse' },
                boxShadow: { duration: 0.25 },
              },
            }}
          >
            <span className="text-red-600 dark:text-red-400 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
              <Icon isHovered={hovered} />
            </span>
          </motion.div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            {feature.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-[260px]">
            {feature.description}
          </p>
        </div>
      </motion.article>
    </motion.div>
  );
}

// ─── Section (mobile: carousel with scroll-snap, desktop: grid) ───────────────

const MOBILE_BREAKPOINT = 768;

export function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px', amount: 0.2 });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(true);

  const CAROUSEL_GAP = 16;

  const updateCarouselIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const cardWidth = el.clientWidth * 0.88;
    const step = cardWidth + CAROUSEL_GAP;
    const index = Math.round(el.scrollLeft / step);
    setCarouselIndex(Math.min(Math.max(0, index), features.length - 1));
  }, []);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateCarouselIndex, { passive: true });
    return () => el.removeEventListener('scroll', updateCarouselIndex);
  }, [updateCarouselIndex]);

  const scrollToIndex = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.clientWidth * 0.88;
    const step = cardWidth + CAROUSEL_GAP;
    el.scrollTo({ left: index * step, behavior: 'smooth' });
  };

  return (
    <section
      ref={ref}
      className="relative py-16 sm:py-20 lg:py-24 overflow-hidden bg-gradient-to-b from-gray-50 via-gray-100/80 to-gray-50 dark:from-gray-950 dark:via-gray-900/80 dark:to-gray-950"
      aria-labelledby="features-heading"
    >
      {/* Subtle gradient orbs (premium SaaS-style) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        aria-hidden
      >
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="features-heading" className="sr-only">
          Pourquoi choisir SOBITAS
        </h2>

        {/* Mobile: horizontal carousel (scroll-snap). Desktop: grid */}
        <motion.div
          ref={scrollRef}
          role="region"
          aria-label="Avantages Sobitas"
          className="flex md:grid overflow-x-auto md:overflow-visible gap-4 sm:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-4 snap-x md:snap-none pb-10 md:pb-0 scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className="flex-shrink-0 w-[88%] sm:w-[85%] md:w-auto md:flex-shrink snap-start snap-always"
              style={{ scrollSnapAlign: 'start' }}
            >
              <FeatureCard
                feature={feature}
                index={index}
                isInView={isInView}
              />
            </div>
          ))}
        </motion.div>

        {/* Dots: mobile only, keyboard accessible */}
        {isMobile && (
          <div
            className="flex justify-center gap-2 mt-4 md:hidden"
            role="tablist"
            aria-label="Slide des avantages"
          >
            {features.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={carouselIndex === index}
                aria-label={`Avantage ${index + 1} sur ${features.length}`}
                onClick={() => scrollToIndex(index)}
                className="h-2 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                style={{
                  width: carouselIndex === index ? 20 : 8,
                  backgroundColor: carouselIndex === index
                    ? 'rgb(220, 38, 38)'
                    : 'rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
