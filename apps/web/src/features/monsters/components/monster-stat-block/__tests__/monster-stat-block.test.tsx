import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { adultRedDragonMonster } from '@/features/monsters/__tests__/adult-red-dragon-fixture';

import { MonsterStatBlock } from '../monster-stat-block';

function renderStatBlock() {
  return render(
    <Theme>
      <MonsterStatBlock monster={adultRedDragonMonster} />
    </Theme>,
  );
}

describe('MonsterStatBlock', () => {
  it('renders the identity line: name heading, size + type + alignment', () => {
    renderStatBlock();
    expect(
      screen.getByRole('heading', { level: 1, name: /adult red dragon/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Huge dragon, chaotic evil/)).toBeInTheDocument();
  });

  it('renders combat stats: AC, HP with hit dice, speed', () => {
    renderStatBlock();
    expect(screen.getByText(/^Armor Class:?$/)).toBeInTheDocument();
    expect(screen.getByText('19 (natural)')).toBeInTheDocument();
    expect(screen.getByText(/^Hit Points:?$/)).toBeInTheDocument();
    expect(screen.getByText('256 (19d12)')).toBeInTheDocument();
    expect(screen.getByText(/^Speed:?$/)).toBeInTheDocument();
    expect(
      screen.getByText('40 ft., climb 40 ft., fly 80 ft.'),
    ).toBeInTheDocument();
  });

  it('renders a 6-cell ability scores grid with modifiers', () => {
    renderStatBlock();
    // The figcaption labels the figure, and the inner <ul> holds the cells.
    const list = screen.getByRole('list');
    expect(list).toHaveTextContent('STR');
    expect(list).toHaveTextContent('27 (+8)');
    expect(list).toHaveTextContent('CON');
    expect(list).toHaveTextContent('25 (+7)');
    expect(list).toHaveTextContent('CHA');
    expect(list).toHaveTextContent('21 (+5)');
  });

  it('renders the traits block with saves, skills, immunities, senses, languages, CR', () => {
    renderStatBlock();
    expect(screen.getByText('Saving Throws')).toBeInTheDocument();
    expect(screen.getByText('DEX +6, CON +13')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Perception +13, Stealth +6')).toBeInTheDocument();
    expect(screen.getByText('Damage Immunities')).toBeInTheDocument();
    expect(screen.getByText('fire')).toBeInTheDocument();
    expect(screen.getByText('Senses')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Blindsight 60 ft., Darkvision 120 ft., Passive Perception 23',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Languages')).toBeInTheDocument();
    expect(screen.getByText('Common, Draconic')).toBeInTheDocument();
    expect(screen.getByText('Challenge')).toBeInTheDocument();
    expect(screen.getByText(/17 \(18,000 XP\)/)).toBeInTheDocument();
    expect(screen.getByText('Proficiency Bonus')).toBeInTheDocument();
  });

  it('renders Special Abilities, Actions, and Legendary Actions sections', () => {
    renderStatBlock();
    expect(
      screen.getByRole('heading', { level: 2, name: /special abilities/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Legendary Resistance/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /^actions$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Bite\./)).toBeInTheDocument();
    expect(screen.getByText(/Claw\./)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /legendary actions/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Detect\./)).toBeInTheDocument();
  });

  it('omits Reactions when the monster has none', () => {
    renderStatBlock();
    expect(
      screen.queryByRole('heading', { level: 2, name: /reactions/i }),
    ).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderStatBlock();
    expect(await axe(container)).toHaveNoViolations();
  });
});
