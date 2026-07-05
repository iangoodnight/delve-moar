import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { InfoPopover } from '../info-popover';

describe('InfoPopover', () => {
  it('exposes a labelled trigger and reveals its content on click', async () => {
    const user = userEvent.setup();
    render(
      <Theme>
        <InfoPopover>Helpful details</InfoPopover>
      </Theme>,
    );

    expect(screen.queryByText('Helpful details')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Info' }));

    expect(await screen.findByText('Helpful details')).toBeInTheDocument();
  });
});
