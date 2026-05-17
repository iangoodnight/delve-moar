import { Badge } from '@/components/ui/badge';
import { Column, Grid, Row, Section } from '@/components/ui/layout';
import { H1, H2, Paragraph, Strong, Text } from '@/components/ui/typography';
import type { Item, SrdItemContent } from '@/features/items/api';
import { getRarityOption, ITEM_CATEGORIES } from '@/features/items/constants';

import styles from './item-detail-block.module.css';

interface ItemDetailBlockProps {
  readonly item: Item;
}

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
  const dice = damage.damage_bonus
    ? `${damage.damage_dice} + ${String(damage.damage_bonus)}`
    : damage.damage_dice;
  return `${dice} ${damage.damage_type.name.toLowerCase()}`;
}

function formatArmorClass(
  ac: NonNullable<SrdItemContent['armor_class']>,
): string {
  if (ac.dex_bonus && ac.max_bonus !== null) {
    return `${String(ac.base)} + Dex (max ${String(ac.max_bonus)})`;
  }
  if (ac.dex_bonus) {
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

function ItemStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <Row gap="2">
      <Text as="div" ml="4" size="3">
        <Strong>{label}:</Strong>
      </Text>
      <Text as="div">{value}</Text>
    </Row>
  );
}

function buildStats(
  content: SrdItemContent,
): { label: string; value: string }[] {
  const stats: { label: string; value: string }[] = [];
  if (content.cost) {
    stats.push({ label: 'Cost', value: formatCost(content.cost) });
  }
  if (content.weight !== undefined) {
    stats.push({ label: 'Weight', value: formatWeight(content.weight) });
  }
  if (content.weapon_category) {
    stats.push({
      label: 'Weapon Type',
      value: content.weapon_range
        ? `${content.weapon_category} (${content.weapon_range})`
        : content.weapon_category,
    });
  }
  if (content.damage) {
    stats.push({ label: 'Damage', value: formatDamage(content.damage) });
  }
  if (content.two_handed_damage) {
    stats.push({
      label: 'Two-Handed Damage',
      value: formatDamage(content.two_handed_damage),
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
  if (content.armor_category) {
    stats.push({ label: 'Armor Type', value: content.armor_category });
  }
  if (content.armor_class) {
    stats.push({
      label: 'Armor Class',
      value: formatArmorClass(content.armor_class),
    });
  }
  if (content.str_minimum !== undefined && content.str_minimum > 0) {
    stats.push({
      label: 'Strength Required',
      value: `Str ${String(content.str_minimum)}`,
    });
  }
  if (content.stealth_disadvantage) {
    stats.push({ label: 'Stealth', value: 'Disadvantage' });
  }
  if (content.requires_attunement) {
    stats.push({ label: 'Attunement', value: content.requires_attunement });
  }
  return stats;
}

export function ItemDetailBlock({ item }: ItemDetailBlockProps) {
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
            {content.desc.map((paragraph, index) => (
              <Paragraph
                className={styles['desc-paragraph']}
                key={index}
                ml={{ initial: '0', sm: '4' }}
              >
                {paragraph}
              </Paragraph>
            ))}
          </Column>
        </Section>
      )}
    </Column>
  );
}
