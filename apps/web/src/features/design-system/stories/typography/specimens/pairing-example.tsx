import { Column } from '@/components/ui/layout';
import {
  Code,
  Em,
  H2,
  Label,
  Paragraph,
  Text,
} from '@/components/ui/typography';

export function PairingExample() {
  return (
    <article
      style={{
        maxWidth: '608px',
        padding: '32px 36px',
        border: '1px solid var(--gray-5)',
        borderRadius: '12px',
        background: 'var(--gray-1)',
      }}
    >
      <Column gap="2">
        <Label
          as="span"
          size="1"
          color="indigo"
          style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          SRD 5.1 / Spell
        </Label>
        <H2>Fireball</H2>
        <Text as="div" color="gray" mb="3">
          <Em>3rd-level evocation</Em>
        </Text>
        <Paragraph>
          A bright streak flashes from your pointing finger to a point you
          choose within range and then blossoms with a low roar into an
          explosion of flame. Each creature in a 20-foot-radius sphere centered
          on that point must make a <Code>DEX save</Code> or take{' '}
          <Code>8d6</Code> fire damage on a failed save, or half as much on a
          successful one.
        </Paragraph>
        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            lineHeight: 'var(--line-height-mono)',
            background: 'var(--gray-3)',
            padding: '14px 16px',
            borderRadius: '8px',
            margin: '12px 0 0',
            overflowX: 'auto',
          }}
        >
          {`components:   V, S, M (a tiny ball of bat guano and sulfur)
castingTime:  1 action
range:        150 feet
duration:     instantaneous`}
        </pre>
      </Column>
    </article>
  );
}
