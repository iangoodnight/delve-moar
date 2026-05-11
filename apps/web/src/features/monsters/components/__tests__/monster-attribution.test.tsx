import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { adultRedDragonMonster } from '@/features/monsters/__tests__/adult-red-dragon-fixture';

import { MonsterAttribution } from '../monster-attribution';

function renderAttribution() {
  return render(
    <Theme>
      <MonsterAttribution contentSource={adultRedDragonMonster.contentSource} />
    </Theme>,
  );
}

describe('MonsterAttribution', () => {
  it('renders the license link from contentSource.license / license_url', () => {
    renderAttribution();
    const licenseLink = screen.getByRole('link', { name: 'CC BY 4.0' });
    expect(licenseLink).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
  });

  it('renders the data provider link from contentSource.data_provider / data_provider_url', () => {
    renderAttribution();
    const dataLink = screen.getByRole('link', { name: '5e-bits/5e-database' });
    expect(dataLink).toHaveAttribute(
      'href',
      'https://github.com/5e-bits/5e-database',
    );
  });

  it('uses the attribution string verbatim from contentSource', () => {
    renderAttribution();
    expect(
      screen.getByText(/Content from Wizards of the Coast LLC/),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderAttribution();
    expect(await axe(container)).toHaveNoViolations();
  });
});
