import { Link as ReactRouterLink } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import { Column, Row } from '@/components/ui/layout';
import { Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import type { SpellSummary } from '@/features/spells/api';

import styles from './spell-card.module.css';

interface SpellCardProps {
  readonly spell: SpellSummary;
}

export function SpellCard({ spell }: Readonly<SpellCardProps>) {
  return (
    <Card asChild>
      <ReactRouterLink
        className={styles['spell-card']}
        data-spell={spell.slug}
        to={paths.spellDetail.getHref(spell.slug)}
      >
        <Row gap="3" justify="between">
          <Column gap="1">
            <Text size="4" weight="bold">
              {spell.name}
            </Text>
            <Text size="2">{spell.school ?? 'Unknown'}</Text>
          </Column>
          <Text color="gray" size="2">
            {spell.level}
          </Text>
        </Row>
      </ReactRouterLink>
    </Card>
  );
}
