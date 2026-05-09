import { Link as ReactRouterLink } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import { Column, Row } from '@/components/ui/layout';
import { Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import type { MonsterSummary } from '@/features/monsters/api';

import styles from './monster-card.module.css';

interface MonsterCardProps {
  readonly monster: MonsterSummary;
}

export function MonsterCard({ monster }: Readonly<MonsterCardProps>) {
  return (
    <Card asChild>
      <ReactRouterLink
        className={styles['monster-card']}
        data-monster={monster.slug}
        to={paths.monsterDetail.getHref(monster.slug)}
      >
        <Row gap="3" justify="between">
          <Column gap="1">
            <Text size="4" weight="bold">
              {monster.name}
            </Text>
            <Text size="2">{monster.monsterType ?? 'Unknown'}</Text>
          </Column>
          <Text size="2" color="gray">
            CR {monster.challengeRating}
          </Text>
        </Row>
      </ReactRouterLink>
    </Card>
  );
}
