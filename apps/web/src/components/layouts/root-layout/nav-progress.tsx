import { useEffect, useRef } from 'react';
import { useNavigation } from 'react-router-dom';

import styles from './nav-progress.module.css';

const DATA_PHASE = 'phase';
const PHASES = {
  IDLE: 'idle',
  LOADING: 'loading',
  COMPLETING: 'completing',
} as const;
const TIMER_DURATION_MS = 350; // duration of the "completing" phase in ms

export function NavProgress() {
  const { state } = useNavigation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (state === PHASES.LOADING) {
      el.dataset[DATA_PHASE] = PHASES.LOADING;
      return;
    }

    if (el.dataset[DATA_PHASE] === PHASES.LOADING) {
      el.dataset[DATA_PHASE] = PHASES.COMPLETING;
      const timer = setTimeout(() => {
        el.dataset[DATA_PHASE] = PHASES.IDLE;
      }, TIMER_DURATION_MS);
      return () => {
        clearTimeout(timer);
      };
    }
    // else no-op
    return;
  }, [state]);

  return (
    <div
      aria-hidden="true"
      className={styles['nav-progress']}
      data-phase="idle"
      ref={containerRef}
    >
      <div className={styles['bar']} />
    </div>
  );
}
