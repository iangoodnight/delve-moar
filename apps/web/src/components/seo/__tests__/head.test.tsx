import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { renderWithProvider } from '@/testing/setup';

import { Head } from '../head';

describe('Head component', () => {
  it('renders the default title', async () => {
    renderWithProvider(<Head />);

    await waitFor(() => {
      expect(document.title).toBe('DelveMoar');
    });
  });

  it('renders a custom title', async () => {
    renderWithProvider(<Head title="Test Page" />);

    await waitFor(() => {
      expect(document.title).toBe('Test Page | DelveMoar');
    });
  });

  it('renders a description meta tag', async () => {
    renderWithProvider(<Head description="This is a test description." />);

    await waitFor(() => {
      const meta = document.querySelector('meta[name="description"]');
      expect(meta).toBeInTheDocument();
      expect(meta?.getAttribute('content')).toBe('This is a test description.');
    });
  });

  it('sets the lang attribute on the html element', async () => {
    renderWithProvider(<Head />);

    await waitFor(() => {
      const html = document.querySelector('html');
      expect(html).toHaveAttribute('lang', 'en');
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProvider(
      <Head title="Accessibility Test" description="Testing accessibility." />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
