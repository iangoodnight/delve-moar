import type { ReactNode } from 'react';

import { DataList } from '@/components/ui/data-list';
import type { Monster } from '@/features/monsters/api';

import {
  formatProficiencyList,
  formatReferenceList,
  formatSenses,
  formatSignedNumber,
  formatXp,
  partitionProficiencies,
} from './format';
import styles from './monster-stat-block.module.css';

interface TraitsBlockProps {
  readonly monster: Monster;
}

interface TraitRowProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly term: string;
}

function TraitRow({ children, className, term }: TraitRowProps) {
  return (
    <DataList.Item className={className}>
      <DataList.Label>{term}</DataList.Label>
      <DataList.Value>{children}</DataList.Value>
    </DataList.Item>
  );
}

export function TraitsBlock({ monster }: TraitsBlockProps) {
  const { content, challengeRating } = monster;
  const { saves, skills } = partitionProficiencies(content.proficiencies);

  return (
    <figure className={styles['traits-block']}>
      <figcaption>Traits</figcaption>
      <DataList.Root
        className={styles['traits-card']}
        orientation={{ initial: 'vertical', sm: 'horizontal' }}
        size="1"
      >
        {saves.length > 0 && (
          <TraitRow term="Saving Throws">
            {formatProficiencyList(saves)}
          </TraitRow>
        )}
        {skills.length > 0 && (
          <TraitRow term="Skills">{formatProficiencyList(skills)}</TraitRow>
        )}
        {content.damage_vulnerabilities.length > 0 && (
          <TraitRow
            className="text-transform-capitalize"
            term="Damage Vulnerabilities"
          >
            {content.damage_vulnerabilities.join(', ')}
          </TraitRow>
        )}
        {content.damage_resistances.length > 0 && (
          <TraitRow
            className="text-transform-capitalize"
            term="Damage Resistances"
          >
            {content.damage_resistances.join(', ')}
          </TraitRow>
        )}
        {content.damage_immunities.length > 0 && (
          <TraitRow
            className="text-transform-capitalize"
            term="Damage Immunities"
          >
            {content.damage_immunities.join(', ')}
          </TraitRow>
        )}
        {content.condition_immunities.length > 0 && (
          <TraitRow term="Condition Immunities">
            {formatReferenceList(content.condition_immunities)}
          </TraitRow>
        )}
        <TraitRow term="Senses">{formatSenses(content.senses)}</TraitRow>
        <TraitRow term="Languages">{content.languages || '-'}</TraitRow>
        <TraitRow term="Challenge">
          {challengeRating} ({formatXp(content.xp)} XP)
        </TraitRow>
        {content.proficiency_bonus !== undefined && (
          <TraitRow term="Proficiency Bonus">
            {formatSignedNumber(content.proficiency_bonus)}
          </TraitRow>
        )}
      </DataList.Root>
    </figure>
  );
}
