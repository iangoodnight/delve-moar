import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import NotFound from './not-found';

describe('NotFound', () => {
  it('renders the 404 heading and message', () => {
    render(<NotFound />);
    expect(
      screen.getByRole('heading', { level: 1, name: /not found/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/404/)).toBeInTheDocument();
  });
});
