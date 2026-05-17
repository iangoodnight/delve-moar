import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { amuletOfHealthItem } from '@/features/items/__tests__/amulet-of-health-fixture';
import { longswordItem } from '@/features/items/__tests__/longsword-fixture';

import { ItemDetailBlock } from '../item-detail-block';

function renderBlock(item = longswordItem) {
  return render(
    <Theme>
      <ItemDetailBlock item={item} />
    </Theme>,
  );
}

describe('ItemDetailBlock — equipment (longsword)', () => {
  it('renders the item name as an H1', () => {
    renderBlock();
    expect(
      screen.getByRole('heading', { level: 1, name: /longsword/i }),
    ).toBeInTheDocument();
  });

  it('renders the humanized category in the header', () => {
    renderBlock();
    expect(screen.getByText('Weapon')).toBeInTheDocument();
  });

  it('omits a rarity badge for mundane items', () => {
    renderBlock();
    expect(screen.queryByText(/^Rare$/)).not.toBeInTheDocument();
  });

  it('renders cost', () => {
    renderBlock();
    expect(screen.getByText('15 gp')).toBeInTheDocument();
  });

  it('renders weight in pounds', () => {
    renderBlock();
    expect(screen.getByText('3 lb.')).toBeInTheDocument();
  });

  it('renders weapon type with range', () => {
    renderBlock();
    expect(screen.getByText('Martial (Melee)')).toBeInTheDocument();
  });

  it('renders damage', () => {
    renderBlock();
    expect(screen.getByText('1d8 slashing')).toBeInTheDocument();
  });

  it('renders two-handed damage', () => {
    renderBlock();
    expect(screen.getByText('1d10 slashing')).toBeInTheDocument();
  });

  it('renders weapon properties joined by commas', () => {
    renderBlock();
    expect(screen.getByText('Versatile')).toBeInTheDocument();
  });

  it('does not render an empty description section when desc is empty', () => {
    renderBlock();
    expect(
      screen.queryByRole('heading', { name: /description/i }),
    ).not.toBeInTheDocument();
  });
});

describe('ItemDetailBlock — magic item (amulet of health)', () => {
  it('renders the rarity badge', () => {
    renderBlock(amuletOfHealthItem);
    expect(screen.getByText('Rare')).toBeInTheDocument();
  });

  it('renders the wondrous-items category label', () => {
    renderBlock(amuletOfHealthItem);
    expect(screen.getByText('Wondrous Items')).toBeInTheDocument();
  });

  it('renders the attunement requirement', () => {
    renderBlock(amuletOfHealthItem);
    expect(screen.getByText('requires attunement')).toBeInTheDocument();
  });

  it('renders the description paragraphs', () => {
    renderBlock(amuletOfHealthItem);
    expect(screen.getByText(/Constitution score is 19/i)).toBeInTheDocument();
  });

  it('renders the Description heading when desc is non-empty', () => {
    renderBlock(amuletOfHealthItem);
    expect(
      screen.getByRole('heading', { name: /description/i }),
    ).toBeInTheDocument();
  });
});

describe('ItemDetailBlock — armor edge cases', () => {
  it('renders armor class, str minimum, and stealth disadvantage when present', () => {
    const chainMail = {
      ...longswordItem,
      slug: 'chain-mail',
      name: 'Chain Mail',
      itemCategory: 'armor',
      content: {
        name: 'Chain Mail',
        cost: { quantity: 75, unit: 'gp' },
        weight: 55,
        armor_category: 'Heavy',
        armor_class: { base: 16, dex_bonus: false, max_bonus: null },
        str_minimum: 13,
        stealth_disadvantage: true,
      },
    };
    render(
      <Theme>
        <ItemDetailBlock item={chainMail} />
      </Theme>,
    );
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText(/Str 13/)).toBeInTheDocument();
    expect(screen.getByText('Disadvantage')).toBeInTheDocument();
  });

  it('formats AC with Dex bonus and max bonus', () => {
    const halfPlate = {
      ...longswordItem,
      slug: 'half-plate',
      name: 'Half Plate',
      itemCategory: 'armor',
      content: {
        name: 'Half Plate',
        armor_category: 'Medium',
        armor_class: { base: 15, dex_bonus: true, max_bonus: 2 },
      },
    };
    render(
      <Theme>
        <ItemDetailBlock item={halfPlate} />
      </Theme>,
    );
    expect(screen.getByText('15 + Dex (max 2)')).toBeInTheDocument();
  });
});

describe('ItemDetailBlock — accessibility', () => {
  it('has no accessibility violations on a mundane weapon', async () => {
    const { container } = renderBlock();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations on a magic item', async () => {
    const { container } = renderBlock(amuletOfHealthItem);
    expect(await axe(container)).toHaveNoViolations();
  });
});
