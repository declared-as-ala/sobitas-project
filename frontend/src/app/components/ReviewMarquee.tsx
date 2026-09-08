'use client';

import type { ReactNode } from 'react';
import styles from './ReviewMarquee.module.css';

/** Focus switches to a native, stationary rail before bringing the actual link into view.
 * Originals stay mounted; decorative loop copies never enter the keyboard order. */
export function ReviewMarquee({ children, reverse = false }: { children: ReactNode; reverse?: boolean }) {
  return (
    <div
      className={styles.row}
      onFocusCapture={(event) => {
        event.target.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.scrollLeft = 0;
      }}
    >
      <ul
        role="list"
        data-motion="review-marquee"
        className={`${styles.track} ${reverse ? styles.reverse : ''}`}
      >
        {children}
      </ul>
    </div>
  );
}
