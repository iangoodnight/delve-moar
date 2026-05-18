import type { components } from '@delve-moar/api-types';

import { Column, Grid, Row, Section } from '@/components/ui/layout';
import { H1, Strong, Text } from '@/components/ui/typography';
import type { Monster } from '@/features/monsters/api';

import { AbilityScores } from './ability-scores';
import { ActionsBlock } from './actions-block';
import { formatArmorClass, formatSpeed } from './format';
import styles from './monster-stat-block.module.css';
import { TraitsBlock } from './traits-block';

type SrdMonsterContent = components['schemas']['SrdMonsterContent'];

interface MonsterStatBlockProps {
  readonly monster: Monster;
}

function IdentityBlock({ content }: { readonly content: SrdMonsterContent }) {
  return (
    <Row
      align="end"
      className={styles['identity']}
      gap="2"
      justify="between"
      wrap="wrap"
    >
      <H1>{content.name}</H1>
      <Text as="p" color="gray" mb="2" size="2">
        {content.size} {content.type}, {content.alignment}
      </Text>
    </Row>
  );
}

function CombatStat({
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

function CombatBlock({ content }: { readonly content: SrdMonsterContent }) {
  return (
    <figure className={styles['combat-block']}>
      <figcaption>Combat</figcaption>
      <Grid columns={{ initial: '1', md: '3' }} gap="3">
        <CombatStat label="Speed" value={formatSpeed(content.speed)} />
        <CombatStat
          label="Armor Class"
          value={formatArmorClass(content.armorClass)}
        />
        <CombatStat
          label="Hit Points"
          value={`${String(content.hitPoints)} (${content.hitDice})`}
        />
      </Grid>
    </figure>
  );
}

export function MonsterStatBlock({ monster }: MonsterStatBlockProps) {
  const { content } = monster;
  return (
    <Column>
      <IdentityBlock content={content} />
      <Section size="1">
        <Column gap="4">
          <CombatBlock content={content} />
          <AbilityScores content={content} />
          <TraitsBlock monster={monster} />
        </Column>
      </Section>
      <ActionsBlock
        title="Special Abilities"
        entries={content.specialAbilities}
      />
      {content.legendaryActions && (
        <ActionsBlock
          title="Legendary Actions"
          entries={content.legendaryActions}
        />
      )}
      <ActionsBlock title="Actions" entries={content.actions} />
      {content.reactions && (
        <ActionsBlock title="Reactions" entries={content.reactions} />
      )}
    </Column>
  );
}
