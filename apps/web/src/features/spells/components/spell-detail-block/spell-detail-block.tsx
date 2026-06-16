import type { ReactNode } from 'react';

import { Markdown } from '@/components/markdown';
import { DataList } from '@/components/ui/data-list';
import { Box, Column, Row, Section } from '@/components/ui/layout';
import { H1, H2, Paragraph } from '@/components/ui/typography';
import type { Spell } from '@/features/spells/api';

import styles from './spell-detail-block.module.css';

interface SpellDetailBlockProps {
  readonly spell: Spell;
}

function formatComponents(spell: Readonly<Spell>): string {
  const parts = [...spell.content.components];
  if (spell.content.material) {
    return `${parts.join(', ')} (${spell.content.material})`;
  }
  return parts.join(', ');
}

interface SpellDetailRowProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly term: string;
}

function SpellDetailRow({
  children,
  className,
  term,
}: Readonly<SpellDetailRowProps>) {
  return (
    <DataList.Item className={className}>
      <DataList.Label>{term}</DataList.Label>
      <DataList.Value className="text-constraint">{children}</DataList.Value>
    </DataList.Item>
  );
}

export function SpellDetailBlock({ spell }: Readonly<SpellDetailBlockProps>) {
  const { content } = spell;
  const classes = content.classes ?? [];

  return (
    <Column>
      <Row align="end" gap="2" justify="between" wrap="wrap">
        <H1>{spell.name}</H1>
        <Paragraph
          className="text-transform-capitalize text-oblique"
          color="gray"
          mb="2"
          size="2"
        >
          {spell.level} {spell.school ? `— ${spell.school}` : ''}
        </Paragraph>
      </Row>

      <Section size="1">
        <figure>
          <figcaption className={styles['spell-data-caption']}>
            Spell Details
          </figcaption>
          <DataList.Root
            className={styles['spell-data']}
            orientation={{ initial: 'vertical', xs: 'horizontal' }}
            size="1"
          >
            <SpellDetailRow term="Casting Time">
              {content.castingTime}
            </SpellDetailRow>
            <SpellDetailRow term="Range">{content.range}</SpellDetailRow>
            <SpellDetailRow term="Components">
              {formatComponents(spell)}
            </SpellDetailRow>
            <SpellDetailRow term="Duration">
              {content.concentration
                ? `Concentration, up to ${content.duration}`
                : content.duration}
            </SpellDetailRow>
            {content.ritual && (
              <SpellDetailRow term="Ritual">Yes</SpellDetailRow>
            )}
            {classes.length > 0 && (
              <SpellDetailRow term="Classes">
                {classes.map((c) => c.name).join(', ')}
              </SpellDetailRow>
            )}
          </DataList.Root>
        </figure>
      </Section>

      <Section size="1">
        <Column gap="2">
          <H2>Description</H2>
          <Box className="text-constraint" ml={{ initial: '0', sm: '4' }}>
            <Markdown>{content.desc.join('\n\n')}</Markdown>
          </Box>
        </Column>
      </Section>

      {content.higherLevel && content.higherLevel.length > 0 && (
        <Section size="1">
          <Column gap="2">
            <H2>At Higher Levels</H2>
            <Box className="text-constraint" ml={{ initial: '0', sm: '4' }}>
              <Markdown>{content.higherLevel.join('\n\n')}</Markdown>
            </Box>
          </Column>
        </Section>
      )}
    </Column>
  );
}
