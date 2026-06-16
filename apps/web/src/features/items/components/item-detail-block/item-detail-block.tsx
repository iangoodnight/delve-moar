import type { components } from '@delve-moar/api-types';

import { Markdown } from '@/components/markdown';
import { Badge } from '@/components/ui/badge';
import { Box, Column, Grid, Row, Section } from '@/components/ui/layout';
import { H1, H2, Paragraph, Strong, Text } from '@/components/ui/typography';
import type { Item } from '@/features/items/api';
import { getRarityOption, ITEM_CATEGORIES } from '@/features/items/constants';

import styles from './item-detail-block.module.css';

type SrdItemContent = components['schemas']['SrdItemContent'];

function categoryLabel(value: string | null): string {
  if (!value) return 'Uncategorized';
  return ITEM_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function formatCost(cost: NonNullable<SrdItemContent['cost']>): string {
  return `${String(cost.quantity)} ${cost.unit}`;
}

function formatWeight(weight: number): string {
  return `${String(weight)} lb.`;
}

function formatDamage(damage: NonNullable<SrdItemContent['damage']>): string {
  const dice = damage.damageBonus
    ? `${damage.damageDice} + ${String(damage.damageBonus)}`
    : damage.damageDice;
  return `${dice} ${damage.damageType.name.toLowerCase()}`;
}

function formatArmorClass(
  ac: NonNullable<SrdItemContent['armorClass']>,
): string {
  if (ac.dexBonus && ac.maxBonus !== null && ac.maxBonus !== undefined) {
    return `${String(ac.base)} + Dex (max ${String(ac.maxBonus)})`;
  }
  if (ac.dexBonus) {
    return `${String(ac.base)} + Dex`;
  }
  return String(ac.base);
}

function formatRange(range: NonNullable<SrdItemContent['range']>): string {
  if (range.long !== null && range.long !== undefined) {
    return `${String(range.normal)}/${String(range.long)} ft.`;
  }
  return `${String(range.normal)} ft.`;
}

interface ItemStatProps {
  readonly label: string;
  readonly value: string;
}

function ItemStat({ label, value }: Readonly<ItemStatProps>) {
  return (
    <Row gap="2">
      <Text as="div" ml="4" size="3">
        <Strong>{label}:</Strong>
      </Text>
      <Text as="div">{value}</Text>
    </Row>
  );
}

function buildStats(content: SrdItemContent): readonly ItemStatProps[] {
  const stats: ItemStatProps[] = [];
  if (content.cost) {
    stats.push({ label: 'Cost', value: formatCost(content.cost) });
  }
  if (content.weight !== undefined && content.weight !== null) {
    stats.push({ label: 'Weight', value: formatWeight(content.weight) });
  }
  if (content.weaponCategory) {
    stats.push({
      label: 'Weapon Type',
      value: content.weaponRange
        ? `${content.weaponCategory} (${content.weaponRange})`
        : content.weaponCategory,
    });
  }
  if (content.damage) {
    stats.push({ label: 'Damage', value: formatDamage(content.damage) });
  }
  if (content.twoHandedDamage) {
    stats.push({
      label: 'Two-Handed Damage',
      value: formatDamage(content.twoHandedDamage),
    });
  }
  if (content.range) {
    stats.push({ label: 'Range', value: formatRange(content.range) });
  }
  if (content.properties && content.properties.length > 0) {
    stats.push({
      label: 'Properties',
      value: content.properties.map((p) => p.name).join(', '),
    });
  }
  if (content.armorCategory) {
    stats.push({ label: 'Armor Type', value: content.armorCategory });
  }
  if (content.armorClass) {
    stats.push({
      label: 'Armor Class',
      value: formatArmorClass(content.armorClass),
    });
  }
  if (
    content.strMinimum !== undefined &&
    content.strMinimum !== null &&
    content.strMinimum > 0
  ) {
    stats.push({
      label: 'Strength Required',
      value: `Str ${String(content.strMinimum)}`,
    });
  }
  if (content.stealthDisadvantage) {
    stats.push({ label: 'Stealth', value: 'Disadvantage' });
  }
  if (content.requiresAttunement) {
    stats.push({ label: 'Attunement', value: content.requiresAttunement });
  }
  return stats;
}

interface ItemDetailBlockProps {
  readonly item: Item;
}

export function ItemDetailBlock({ item }: Readonly<ItemDetailBlockProps>) {
  const { content } = item;
  const rarity = getRarityOption(item.rarity);
  const stats = buildStats(content);

  return (
    <Column>
      <Row align="end" gap="2" justify="between" wrap="wrap">
        <H1>{item.name}</H1>
        <Row align="center" gap="2" mb="2">
          <Paragraph className="text-oblique" color="gray" m="0" size="2">
            {categoryLabel(item.itemCategory)}
          </Paragraph>
          {rarity && (
            <Badge color={rarity.badgeColor} variant="soft">
              {rarity.label}
            </Badge>
          )}
        </Row>
      </Row>

      {stats.length > 0 && (
        <Section size="1">
          <figure className={styles['properties-block']}>
            <figcaption>Properties</figcaption>
            <Grid columns={{ initial: '1', md: '3' }} gap="3">
              {stats.map((stat) => (
                <ItemStat
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                />
              ))}
            </Grid>
          </figure>
        </Section>
      )}

      {content.desc && content.desc.length > 0 && (
        <Section size="1">
          <Column gap="2">
            <H2>Description</H2>
            <Box className="text-constraint" ml={{ initial: '0', sm: '4' }}>
              <Markdown>{content.desc.join('\n\n')}</Markdown>
            </Box>
          </Column>
        </Section>
      )}
    </Column>
  );
}
