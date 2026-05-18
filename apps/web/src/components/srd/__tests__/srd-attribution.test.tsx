import type { components } from '@delve-moar/api-types';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { SrdAttribution } from '../srd-attribution';

type ContentSource = components['schemas']['ContentSource'];

const CONTENT_SOURCE: ContentSource = {
  type: 'srd',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'Wizards of the Coast LLC',
  dataProvider: '5e-bits/5e-database',
  dataProviderUrl: 'https://github.com/5e-bits/5e-database',
};

function renderAttribution() {
  return render(
    <Theme>
      <SrdAttribution contentSource={CONTENT_SOURCE} />
    </Theme>,
  );
}

describe('SrdAttribution', () => {
  it('renders the license link from contentSource.license / licenseUrl', () => {
    renderAttribution();
    const licenseLink = screen.getByRole('link', { name: 'CC BY 4.0' });
    expect(licenseLink).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
  });

  it('renders the data provider link from contentSource.dataProvider / dataProviderUrl', () => {
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
