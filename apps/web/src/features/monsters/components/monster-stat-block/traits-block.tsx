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

interface TraitRowProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly term: string;
}

function TraitRow({ children, className, term }: Readonly<TraitRowProps>) {
  return (
    <DataList.Item className={className}>
      <DataList.Label>{term}</DataList.Label>
      <DataList.Value className="text-constraint">{children}</DataList.Value>
    </DataList.Item>
  );
}

interface TraitsBlockProps {
  readonly monster: Monster;
}

export function TraitsBlock({ monster }: Readonly<TraitsBlockProps>) {
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
        {content.damageVulnerabilities.length > 0 && (
          <TraitRow
            className="text-transform-capitalize"
            term="Damage Vulnerabilities"
          >
            {content.damageVulnerabilities.join(', ')}
          </TraitRow>
        )}
        {content.damageResistances.length > 0 && (
          <TraitRow
            className="text-transform-capitalize"
            term="Damage Resistances"
          >
            {content.damageResistances.join(', ')}
          </TraitRow>
        )}
        {content.damageImmunities.length > 0 && (
          <TraitRow
            className="text-transform-capitalize"
            term="Damage Immunities"
          >
            {content.damageImmunities.join(', ')}
          </TraitRow>
        )}
        {content.conditionImmunities.length > 0 && (
          <TraitRow term="Condition Immunities">
            {formatReferenceList(content.conditionImmunities)}
          </TraitRow>
        )}
        <TraitRow term="Senses">{formatSenses(content.senses)}</TraitRow>
        <TraitRow term="Languages">{content.languages || '-'}</TraitRow>
        <TraitRow term="Challenge">
          {challengeRating} ({formatXp(content.xp)} XP)
        </TraitRow>
        {content.proficiencyBonus !== undefined &&
          content.proficiencyBonus !== null && (
            <TraitRow term="Proficiency Bonus">
              {formatSignedNumber(content.proficiencyBonus)}
            </TraitRow>
          )}
      </DataList.Root>
    </figure>
  );
}
