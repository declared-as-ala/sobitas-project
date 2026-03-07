'use client';

import { useState, useEffect } from 'react';

/**
 * Threshold in pixels: if the visible viewport height is this much smaller than
 * the window inner height, we consider the keyboard open (iOS/Android).
 */
const KEYBOARD_HEIGHT_THRESHOLD = 150;

/**
 * Detects whether the virtual keyboard is open on mobile (iOS Safari, Android Chrome).
 * Uses visualViewport when available; falls back to window resize.
 * Use this to hide the fixed CTA footer during input so the layout doesn't break.
 */
export function useKeyboardOpen(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    if (!vv) {
      // Fallback: no visualViewport (old browsers), assume keyboard closed
      return;
    }

    let rafId: number;
    const check = () => {
      rafId = requestAnimationFrame(() => {
        const visibleHeight = vv.height;
        const windowHeight = window.innerHeight;
        const gap = windowHeight - visibleHeight;
        setKeyboardOpen(gap > KEYBOARD_HEIGHT_THRESHOLD);
      });
    };

    check();
    vv.addEventListener('resize', check);
    vv.addEventListener('scroll', check);

    return () => {
      vv.removeEventListener('resize', check);
      vv.removeEventListener('scroll', check);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return keyboardOpen;
}
