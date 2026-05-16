import { Column, Section } from '@/components/ui/layout';
import { H2, Paragraph, Strong } from '@/components/ui/typography';
import type { SrdMonsterAction } from '@/features/monsters/api';

import styles from './monster-stat-block.module.css';

interface ActionsBlockProps {
  readonly title: string;
  readonly entries: readonly SrdMonsterAction[];
}

export function ActionsBlock({ title, entries }: ActionsBlockProps) {
  if (entries.length === 0) return null;
  return (
    <Section className={styles['actions-block']} size="1">
      <Column gap="2">
        <H2>{title}</H2>
        {entries.map((entry) => (
          <Paragraph key={entry.name} ml={{ initial: '0', sm: '4' }}>
            <Strong>
              <em>{entry.name}.</em>
            </Strong>{' '}
            {entry.desc}
          </Paragraph>
        ))}
      </Column>
    </Section>
  );
}
