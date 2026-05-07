import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { BrandMark } from '../brand-mark';

// The wordmark is composed from multiple <span>s ("D" + "elve" + "M" + "oar")
// rather than a single text node, so text queries target the individual parts.
// Note: `short={true}` wraps "elve" and "oar" in <VisuallyHidden> rather than
// removing them — they're CSS-hidden but remain in the accessible tree, so the
// visible difference is not testable from jsdom and is verified via Storybook.

describe('BrandMark', () => {
  describe('asLink={false} (default)', () => {
    it('renders the wordmark without a router context', () => {
      // Crucially: no MemoryRouter wrapper. The unlinked variant must render
      // outside a router so it works in Storybook, isolated previews, etc.
      render(<BrandMark />);

      expect(screen.getByText('elve')).toBeInTheDocument();
      expect(screen.getByText('oar')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('asLink={true}', () => {
    it('renders the wordmark as a link to home with an accessible "Home" suffix', () => {
      render(
        <MemoryRouter initialEntries={['/monsters']}>
          <BrandMark asLink />
        </MemoryRouter>,
      );

      const link = screen.getByRole('link', { name: /delvemoar.*home/i });
      expect(link).toHaveAttribute('href', '/');
    });

    it('marks the link as current when on the home route', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <BrandMark asLink />
        </MemoryRouter>,
      );

      expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page');
    });

    it('does not set aria-current when away from home', () => {
      render(
        <MemoryRouter initialEntries={['/spells']}>
          <BrandMark asLink />
        </MemoryRouter>,
      );

      expect(screen.getByRole('link')).not.toHaveAttribute('aria-current');
    });
  });
});
