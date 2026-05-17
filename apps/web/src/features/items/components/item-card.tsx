import { Link as ReactRouterLink } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Column, Row } from '@/components/ui/layout';
import { Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import type { ItemSummary } from '@/features/items/api';
import { getRarityOption, ITEM_CATEGORIES } from '@/features/items/constants';

import styles from './item-card.module.css';

interface ItemCardProps {
  readonly item: ItemSummary;
}

function categoryLabel(value: string | null): string {
  if (!value) return 'Uncategorized';
  return ITEM_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function ItemCard({ item }: Readonly<ItemCardProps>) {
  const rarity = getRarityOption(item.rarity);

  return (
    <Card asChild>
      <ReactRouterLink
        className={styles['item-card']}
        data-item={item.slug}
        to={paths.itemDetail.getHref(item.slug)}
      >
        <Row align="start" gap="3" justify="between">
          <Column gap="1">
            <Text size="4" weight="bold">
              {item.name}
            </Text>
            <Text color="gray" size="2">
              {categoryLabel(item.itemCategory)}
            </Text>
          </Column>
          {rarity && (
            <Badge color={rarity.badgeColor} variant="soft">
              {rarity.label}
            </Badge>
          )}
        </Row>
      </ReactRouterLink>
    </Card>
  );
}
