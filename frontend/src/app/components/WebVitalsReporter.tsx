'use client';

import { useReportWebVitals } from 'next/web-vitals';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Field diagnostics for the sitewide mobile INP issue reported by Search Console.
 * Values are sent to the existing GA property; this renders nothing and does not update React.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (typeof window.gtag !== 'function') return;
    const value = metric.name === 'CLS' ? Math.round(metric.value * 1000) : Math.round(metric.value);
    const attribution = metric.name === 'INP' && 'attribution' in metric && metric.attribution
      ? metric.attribution as Record<string, unknown>
      : null;
    window.gtag('event', 'web_vital', {
      event_category: 'Web Vitals',
      event_label: metric.id,
      metric_name: metric.name,
      metric_rating: metric.rating,
      metric_delta: metric.delta,
      value,
      ...(attribution && typeof attribution.interactionTarget === 'string'
        ? { interaction_target: attribution.interactionTarget }
        : {}),
      ...(attribution && typeof attribution.inputDelay === 'number'
        ? { input_delay: Math.round(attribution.inputDelay) }
        : {}),
      ...(attribution && typeof attribution.processingDuration === 'number'
        ? { processing_duration: Math.round(attribution.processingDuration) }
        : {}),
      ...(attribution && typeof attribution.presentationDelay === 'number'
        ? { presentation_delay: Math.round(attribution.presentationDelay) }
        : {}),
      non_interaction: true,
    });
  });
  return null;
}
