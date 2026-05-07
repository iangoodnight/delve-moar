import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import type * as ReactRouter from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouter>('react-router-dom');
  return {
    ...actual,
    useNavigation: () => ({ state: 'idle' }),
  };
});

const { RootLayout } = await import('../root-layout');

describe('RootLayout', () => {
  it('renders the site header and the children inside <main>', () => {
    render(
      <Theme>
        <MemoryRouter>
          <RootLayout>
            <p>Page contents</p>
          </RootLayout>
        </MemoryRouter>
      </Theme>,
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent('Page contents');
  });
});
