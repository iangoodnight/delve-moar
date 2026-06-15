import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { notify } from '@/lib/notifications';

import { AppToaster } from '../app-toaster';

describe('AppToaster', () => {
  it('renders a toast raised through the notify seam', async () => {
    render(<AppToaster />);

    notify.error('Something went wrong');

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });
});
