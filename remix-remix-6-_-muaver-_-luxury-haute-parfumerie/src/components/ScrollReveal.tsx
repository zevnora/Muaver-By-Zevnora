import React, { useEffect, useRef, ReactNode, ElementType } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delayIndex?: number;
  as?: ElementType;
}

/**
 * Lightweight, resilient scroll reveal container.
 * - Elements are 100% VISIBLE by default in CSS (opacity: 1, transform: none).
 * - If inside or near viewport on mount, never hidden.
 * - Subtle fade-up is only attached if element is strictly below the viewport.
 * - Safety fallback timeout guarantees element is revealed within 500ms even if observer never fires.
 * - Disconnects observer once revealed.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delayIndex = 0,
  as: Component = 'div',
}) => {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // 1. Reduced motion check
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-revealed');
      return;
    }

    // 2. Immediate viewport check: if anywhere near viewport or above fold, reveal immediately without animation
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || (typeof document !== 'undefined' ? document.documentElement.clientHeight : 800);
    if (rect.top <= windowHeight + 100) {
      el.classList.add('is-revealed');
      return;
    }

    // 3. Fallback if IntersectionObserver is missing
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-revealed');
      return;
    }

    // 4. Element is below viewport: attach animation class
    el.classList.add('has-scroll-anim');

    // 5. Safety timeout: reveal after 500ms regardless to prevent stuck invisible elements
    const safetyTimer = setTimeout(() => {
      if (el) {
        el.classList.add('is-revealed');
      }
    }, 500);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            clearTimeout(safetyTimer);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '100px 0px 100px 0px', // trigger well before it scrolls into view
        threshold: 0,
      }
    );

    observer.observe(el);

    return () => {
      clearTimeout(safetyTimer);
      observer.disconnect();
    };
  }, []);

  const delayClass = delayIndex > 0 ? `scroll-reveal-delay-${Math.min(delayIndex, 4)}` : '';

  return (
    <Component
      ref={elementRef}
      className={`scroll-reveal ${delayClass} ${className}`.trim()}
    >
      {children}
    </Component>
  );
};
