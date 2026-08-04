'use client';
import { useEffect } from 'react';

/**
 * Global scroll-reveal observer.
 * Watches every [data-reveal] element across all pages.
 * Adds class "is-revealed" when element enters viewport.
 * CSS in globals.css handles the transition.
 *
 * Supports:
 *   data-reveal-dir="up|left|right|fade"   → direction (default: up)
 *   data-reveal-delay="80|160|240|320|400" → stagger delay in ms
 *
 * Note: page.tsx uses its own inline rv() system on top of this.
 * Inline styles always override CSS, so there is no conflict.
 */
export default function RevealObserver() {
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    let mo: MutationObserver   | null = null;

    const addToObserver = (el: Element) => {
      if (!el.classList.contains('is-revealed')) io?.observe(el);
    };

    const timer = setTimeout(() => {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el    = entry.target as HTMLElement;
            const delay = parseInt(el.dataset.revealDelay ?? '0', 10);

            const reveal = () => {
              el.classList.add('is-revealed');
              io?.unobserve(el);
            };

            if (delay > 0) setTimeout(reveal, delay);
            else           reveal();
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -28px 0px' }
      );

      // Observe all existing [data-reveal] elements
      document.querySelectorAll('[data-reveal]').forEach(addToObserver);

      // Watch for dynamically added elements (React state changes, loading → loaded)
      mo = new MutationObserver(() => {
        document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach(addToObserver);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }, 100); // 100ms — enough to avoid flash, short enough for snappy feel

    return () => {
      clearTimeout(timer);
      io?.disconnect();
      mo?.disconnect();
    };
  }, []);

  return null;
}
