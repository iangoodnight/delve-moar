import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { fireballSpell } from '@/features/spells/__tests__/fireball-fixture';

import { SpellDetailBlock } from '../spell-detail-block';

function renderBlock() {
  return render(
    <Theme>
      <SpellDetailBlock spell={fireballSpell} />
    </Theme>,
  );
}

describe('SpellDetailBlock', () => {
  it('renders the spell name as an H1', () => {
    renderBlock();
    expect(
      screen.getByRole('heading', { level: 1, name: /fireball/i }),
    ).toBeInTheDocument();
  });

  it('renders the level and school in the subtitle', () => {
    renderBlock();
    expect(screen.getByText(/3rd.*evocation/i)).toBeInTheDocument();
  });

  it('renders casting time', () => {
    renderBlock();
    expect(screen.getByText('1 action')).toBeInTheDocument();
  });

  it('renders range', () => {
    renderBlock();
    expect(screen.getByText('150 feet')).toBeInTheDocument();
  });

  it('renders components with material', () => {
    renderBlock();
    expect(
      screen.getByText(/V, S, M \(A tiny ball of bat guano and sulfur\)/),
    ).toBeInTheDocument();
  });

  it('renders duration without concentration prefix when concentration is false', () => {
    renderBlock();
    expect(screen.getByText('Instantaneous')).toBeInTheDocument();
    expect(screen.queryByText(/concentration/i)).not.toBeInTheDocument();
  });

  it('prepends "Concentration, up to" when the spell is concentration', () => {
    const concentrationSpell = {
      ...fireballSpell,
      content: {
        ...fireballSpell.content,
        concentration: true,
        duration: '1 minute',
      },
    };
    render(
      <Theme>
        <SpellDetailBlock spell={concentrationSpell} />
      </Theme>,
    );
    expect(
      screen.getByText('Concentration, up to 1 minute'),
    ).toBeInTheDocument();
  });

  it('renders all description paragraphs', () => {
    renderBlock();
    expect(screen.getByText(/A bright streak flashes/)).toBeInTheDocument();
    expect(screen.getByText(/The fire spreads/)).toBeInTheDocument();
  });

  it('renders the At Higher Levels section when present', () => {
    renderBlock();
    expect(
      screen.getByRole('heading', { name: /at higher levels/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1d6/)).toBeInTheDocument();
  });

  it('does not render At Higher Levels when absent', () => {
    const noHigherLevel = {
      ...fireballSpell,
      content: { ...fireballSpell.content, higher_level: undefined },
    };
    render(
      <Theme>
        <SpellDetailBlock spell={noHigherLevel} />
      </Theme>,
    );
    expect(
      screen.queryByRole('heading', { name: /at higher levels/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the caster classes list', () => {
    renderBlock();
    expect(screen.getByText(/Sorcerer, Wizard/)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderBlock();
    expect(await axe(container)).toHaveNoViolations();
  });
});
