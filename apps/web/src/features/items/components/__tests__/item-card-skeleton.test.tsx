import { Theme } from '@radix-ui/themes';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { ItemCardSkeleton } from '../item-card-skeleton';

function renderSkeleton() {
  return render(
    <Theme>
      <ItemCardSkeleton />
    </Theme>,
  );
}

describe('ItemCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = renderSkeleton();
    expect(container.firstChild).toBeInTheDocument();
  });

  it('is hidden from assistive technology', () => {
    const { container } = renderSkeleton();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderSkeleton();
    expect(await axe(container)).toHaveNoViolations();
  });
});
