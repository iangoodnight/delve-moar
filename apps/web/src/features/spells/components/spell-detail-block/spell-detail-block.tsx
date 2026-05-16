import { DataList } from '@/components/ui/data-list';
import { Column, Row, Section } from '@/components/ui/layout';
import { H1, H2, Paragraph } from '@/components/ui/typography';
import type { Spell } from '@/features/spells/api';

import styles from './spell-detail-block.module.css';

interface SpellDetailBlockProps {
  readonly spell: Spell;
}

function formatComponents(spell: Spell): string {
  const parts = [...spell.content.components];
  if (spell.content.material) {
    return `${parts.join(', ')} (${spell.content.material})`;
  }
  return parts.join(', ');
}

export function SpellDetailBlock({ spell }: SpellDetailBlockProps) {
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
            <DataList.Item>
              <DataList.Label>Casting Time</DataList.Label>
              <DataList.Value>{content.casting_time}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Range</DataList.Label>
              <DataList.Value>{content.range}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Components</DataList.Label>
              <DataList.Value>{formatComponents(spell)}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Duration</DataList.Label>
              <DataList.Value>
                {content.concentration
                  ? `Concentration, up to ${content.duration}`
                  : content.duration}
              </DataList.Value>
            </DataList.Item>
            {content.ritual && (
              <DataList.Item>
                <DataList.Label>Ritual</DataList.Label>
                <DataList.Value>Yes</DataList.Value>
              </DataList.Item>
            )}
            {classes.length > 0 && (
              <DataList.Item>
                <DataList.Label>Classes</DataList.Label>
                <DataList.Value>
                  {classes.map((c) => c.name).join(', ')}
                </DataList.Value>
              </DataList.Item>
            )}
          </DataList.Root>
        </figure>
      </Section>

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

      {content.higher_level && content.higher_level.length > 0 && (
        <Section size="1">
          <Column gap="2">
            <H2>At Higher Levels</H2>
            <Column gap="2">
              {content.higher_level.map((paragraph, index) => (
                <Paragraph
                  className={styles['higher-level']}
                  key={index}
                  ml={{ initial: '0', sm: '4' }}
                >
                  {paragraph}
                </Paragraph>
              ))}
            </Column>
          </Column>
        </Section>
      )}
    </Column>
  );
}
