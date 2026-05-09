import { Theme } from '@radix-ui/themes';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { MonsterCardSkeleton } from '../monster-card-skeleton';

function renderSkeleton() {
  return render(
    <Theme>
      <MonsterCardSkeleton />
    </Theme>,
  );
}

describe('MonsterCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = renderSkeleton();
    expect(container.firstChild).toBeInTheDocument();
  });

  it('is hidden from assistive technology', () => {
    const { container } = renderSkeleton();
    // theme wraps everything in a div, so we query for the aria-hidden node
    // rather than asserting on the firstChild.  Loading state is communicated
    // separately via the parent grid's aria-busy.
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderSkeleton();
    expect(await axe(container)).toHaveNoViolations();
  });
});
