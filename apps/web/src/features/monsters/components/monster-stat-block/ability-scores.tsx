import type { components } from '@delve-moar/api-types';

import { Box, Grid } from '@/components/ui/layout';
import { Text } from '@/components/ui/typography';

import { formatModifier } from './format';
import styles from './monster-stat-block.module.css';

type SrdMonsterContent = components['schemas']['SrdMonsterContent'];

interface AbilityScoresProps {
  readonly content: Pick<
    SrdMonsterContent,
    | 'strength'
    | 'dexterity'
    | 'constitution'
    | 'intelligence'
    | 'wisdom'
    | 'charisma'
  >;
}

const ABILITIES: readonly {
  key: keyof AbilityScoresProps['content'];
  label: string;
}[] = [
  { key: 'strength', label: 'STR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'WIS' },
  { key: 'charisma', label: 'CHA' },
];

export function AbilityScores({ content }: AbilityScoresProps) {
  return (
    <figure className={styles['ability-scores']}>
      <figcaption className={styles['ability-caption']}>
        Ability Scores
      </figcaption>
      <Grid
        asChild
        className={styles['ability-grid']}
        columns={{ initial: '3', sm: '6' }}
        gap="2"
      >
        <ul>
          {ABILITIES.map(({ key, label }) => {
            const score = content[key];
            return (
              <Box asChild className={styles['ability-cell']} key={key}>
                <li>
                  <Text as="div" className={styles['ability-label']} size="2">
                    {label}
                  </Text>
                  <Text as="div" size="4">
                    {score} ({formatModifier(score)})
                  </Text>
                </li>
              </Box>
            );
          })}
        </ul>
      </Grid>
    </figure>
  );
}
