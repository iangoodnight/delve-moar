import { render } from '@testing-library/react';
import type { Navigation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NavProgress } from '../nav-progress';

vi.mock('react-router-dom', () => ({
  useNavigation: vi.fn(() => ({ state: 'idle' })),
}));

const { useNavigation } = await import('react-router-dom');
const mockedUseNavigation = vi.mocked(useNavigation);

function nav(state: Navigation['state']): Navigation {
  return { state } as Navigation;
}

beforeEach(() => {
  vi.useFakeTimers();
  mockedUseNavigation.mockReturnValue(nav('idle'));
});

afterEach(() => {
  vi.useRealTimers();
  mockedUseNavigation.mockReset();
});

describe('NavProgress', () => {
  it('starts in the idle phase', () => {
    const { container } = render(<NavProgress />);
    const root = container.firstElementChild;

    expect(root).toHaveAttribute('data-phase', 'idle');
    expect(root).toHaveAttribute('aria-hidden', 'true');
  });

  it('transitions to loading when the navigation enters the loading state', () => {
    mockedUseNavigation.mockReturnValue(nav('loading'));
    const { container } = render(<NavProgress />);

    expect(container.firstElementChild).toHaveAttribute(
      'data-phase',
      'loading',
    );
  });

  it('runs completing -> idle after the loading state ends', () => {
    mockedUseNavigation.mockReturnValue(nav('loading'));
    const { container, rerender } = render(<NavProgress />);

    expect(container.firstElementChild).toHaveAttribute(
      'data-phase',
      'loading',
    );

    mockedUseNavigation.mockReturnValue(nav('idle'));
    rerender(<NavProgress />);
    expect(container.firstElementChild).toHaveAttribute(
      'data-phase',
      'completing',
    );
    const LOADING_DURATION_MS = 350;
    vi.advanceTimersByTime(LOADING_DURATION_MS);
    expect(container.firstElementChild).toHaveAttribute('data-phase', 'idle');
  });

  it('stays idle if the navigation never reaches loading', () => {
    mockedUseNavigation.mockReturnValue(nav('idle'));
    const { container, rerender } = render(<NavProgress />);

    mockedUseNavigation.mockReturnValue(nav('submitting'));
    rerender(<NavProgress />);

    expect(container.firstElementChild).toHaveAttribute('data-phase', 'idle');
  });
});
