import type { Meta, StoryObj } from '@storybook/react-vite';

import { PairingExample } from './specimens/pairing-example';
import { SpecimenBlock } from './specimens/specimen-block';

const meta: Meta = {
  title: 'Design System/Typography/Specimens',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

export const Wordmark: Story = {
  render: () => (
    <div
      style={{
        padding: '5rem 2rem',
        textAlign: 'center',
        background: 'var(--gray-1)',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-brand)',
          fontSize: 'clamp(3rem, 12vw, 7rem)',
          letterSpacing: '0.04em',
          margin: 0,
          color: 'var(--gray-12)',
        }}
      >
        DelveMoar
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1.125rem',
          color: 'var(--gray-11)',
          marginTop: '1.25rem',
          marginBottom: 0,
        }}
      >
        D&amp;D utility suite — homebrew-first DM tools.
      </p>
    </div>
  ),
};

export const BrandSpecimen: Story = {
  render: () => (
    <div style={{ padding: '2rem', maxWidth: '52rem' }}>
      <SpecimenBlock label="Major Mono Display" meta="OFL 1.1 · single weight">
        <div
          style={{
            fontFamily: 'var(--font-brand)',
            fontSize: '2.5rem',
            letterSpacing: '0.04em',
            lineHeight: 1.3,
          }}
        >
          ABCDEFGHIJKLM
          <br />
          NOPQRSTUVWXYZ
          <br />
          abcdefghijklm
          <br />
          nopqrstuvwxyz
          <br />
          0123456789 — &amp; / : .
        </div>
      </SpecimenBlock>
      <SpecimenBlock
        label="Brand voice — display only"
        meta="never used for prose"
      >
        <div
          style={{
            fontFamily: 'var(--font-brand)',
            fontSize: '1.5rem',
            letterSpacing: '0.05em',
          }}
        >
          ROLL FOR INITIATIVE
        </div>
      </SpecimenBlock>
    </div>
  ),
};

export const HeadingScale: Story = {
  render: () => {
    const steps = [
      {
        tag: 'h1' as const,
        size: '3rem',
        weight: 700,
        label: 'H1',
        meta: '48 / 700',
      },
      {
        tag: 'h2' as const,
        size: '2.25rem',
        weight: 600,
        label: 'H2',
        meta: '36 / 600',
      },
      {
        tag: 'h3' as const,
        size: '1.75rem',
        weight: 500,
        label: 'H3',
        meta: '28 / 500',
      },
      {
        tag: 'h4' as const,
        size: '1.375rem',
        weight: 500,
        label: 'H4',
        meta: '22 / 500',
      },
    ];
    return (
      <div style={{ padding: '2rem', maxWidth: '52rem' }}>
        {steps.map(({ tag: Tag, size, weight, label, meta }) => (
          <SpecimenBlock key={label} label={label} meta={meta}>
            <Tag
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: size,
                fontWeight: weight,
                lineHeight: 'var(--line-height-heading)',
                margin: 0,
                color: 'var(--gray-12)',
              }}
            >
              The Tarrasque rises from its slumber.
            </Tag>
          </SpecimenBlock>
        ))}
      </div>
    );
  },
};

export const BodySpecimen: Story = {
  render: () => (
    <div style={{ padding: '2rem', maxWidth: '38rem' }}>
      <SpecimenBlock label="Atkinson Hyperlegible" meta="16 / 1.6 · OFL 1.1">
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            lineHeight: 'var(--line-height-body)',
            margin: 0,
          }}
        >
          A wizard&apos;s most prized possession is rarely the spellbook itself
          — it is the long, patient process of <em>copying</em> a new spell into
          it: the inks measured in gold, the diagrams traced by candle, the
          afternoons lost to a single stubborn glyph. The book is only the
          residue.
        </p>
      </SpecimenBlock>
      <SpecimenBlock label="Distinguishable letterforms" meta="why this font">
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.5rem',
            letterSpacing: '0.05em',
            color: 'var(--gray-12)',
          }}
        >
          Il1 · O0 · rn m · Cc Gg
        </div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--gray-11)',
            marginTop: '0.5rem',
            marginBottom: 0,
          }}
        >
          Atkinson Hyperlegible disambiguates the letterforms most commonly
          confused by low-vision readers and OCR.
        </p>
      </SpecimenBlock>
    </div>
  ),
};

export const MonoSpecimen: Story = {
  render: () => (
    <div style={{ padding: '2rem', maxWidth: '52rem' }}>
      <SpecimenBlock label="JetBrains Mono" meta="variable 100–800 · OFL 1.1">
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            lineHeight: 'var(--line-height-body)',
            margin: '0 0 1rem',
          }}
        >
          Inline, mono signals a named game entity — a spell like{' '}
          <code
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9em',
              background: 'var(--gray-3)',
              padding: '0.05em 0.35em',
              borderRadius: '0.25em',
            }}
          >
            mage-hand
          </code>{' '}
          or an item like{' '}
          <code
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9em',
              background: 'var(--gray-3)',
              padding: '0.05em 0.35em',
              borderRadius: '0.25em',
            }}
          >
            flame-tongue
          </code>
          . In a block, it serves stat lines and code.
        </p>
        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            lineHeight: 'var(--line-height-mono)',
            background: 'var(--gray-3)',
            padding: '0.875rem 1rem',
            borderRadius: '0.5rem',
            margin: 0,
          }}
        >
          {`STR 30 (+10)   DEX 11 (+0)   CON 30 (+10)
INT  3 (-4)   WIS  9 (-1)   CHA 11 (+0)
challenge_rating: 30  (155,000 XP)`}
        </pre>
      </SpecimenBlock>
    </div>
  ),
};

export const Pairing: Story = {
  render: () => (
    <div
      style={{
        padding: '3rem 2rem',
        background: 'var(--gray-2)',
        minHeight: '100vh',
      }}
    >
      <PairingExample />
    </div>
  ),
};
