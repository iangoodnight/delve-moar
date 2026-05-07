import type { Meta, StoryObj } from '@storybook/react-vite';

import { BrandMark } from '@/components/brand';
import { Column } from '@/components/ui/layout';
import {
  Blockquote,
  Code,
  Em,
  H1,
  H2,
  H3,
  H4,
  Kbd,
  Paragraph,
  Quote,
  Strong,
  Text,
} from '@/components/ui/typography';

import { BookPage } from './specimens/book-page';
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
    <BookPage eyebrow="Identity" folio="i">
      <Column align="center" gap="5" py="6">
        <BrandMark asLink={false} />
        <Text
          as="div"
          align="center"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '18px',
            color: 'var(--gray-11)',
            maxWidth: '40ch',
          }}
        >
          A homebrew-first utility suite for dungeon masters who care more about
          the table than the tooling.
        </Text>
      </Column>
    </BookPage>
  ),
};

export const BrandSpecimen: Story = {
  render: () => (
    <BookPage eyebrow="Brand" folio="ii">
      <H2>Major Mono Display</H2>
      <Paragraph>
        The wordmark voice. Used for the brand mark, section dividers, and small
        flourishes only. Never set running text in this face.
      </Paragraph>
      <SpecimenBlock label="Specimen" meta="OFL 1.1 / single weight">
        <div
          style={{
            fontFamily: 'var(--font-brand)',
            fontSize: '40px',
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
          0123456789 &amp; / : .
        </div>
      </SpecimenBlock>
      <SpecimenBlock label="Display only" meta="never used for prose">
        <div
          style={{
            fontFamily: 'var(--font-brand)',
            fontSize: '24px',
            letterSpacing: '0.05em',
          }}
        >
          ROLL FOR INITIATIVE
        </div>
      </SpecimenBlock>
    </BookPage>
  ),
};

export const HeadingScale: Story = {
  render: () => (
    <BookPage eyebrow="Heading scale" folio="iii">
      <Paragraph>
        Headings step down through four sizes, all in Space Grotesk. H1 anchors
        the page; H4 is the smallest allowed heading level. Below that, use a
        bold body run.
      </Paragraph>
      <SpecimenBlock label="H1" meta="48 / 700">
        <H1>The Tarrasque rises from its slumber.</H1>
      </SpecimenBlock>
      <SpecimenBlock label="H2" meta="36 / 600">
        <H2>The Tarrasque rises from its slumber.</H2>
      </SpecimenBlock>
      <SpecimenBlock label="H3" meta="28 / 500">
        <H3>The Tarrasque rises from its slumber.</H3>
      </SpecimenBlock>
      <SpecimenBlock label="H4" meta="22 / 500">
        <H4>The Tarrasque rises from its slumber.</H4>
      </SpecimenBlock>
    </BookPage>
  ),
};

export const BodySpecimen: Story = {
  render: () => (
    <BookPage eyebrow="Body" folio="iv">
      <H2>Atkinson Hyperlegible</H2>
      <Paragraph>
        A wizard&apos;s most prized possession is rarely the spellbook itself.
        It is the long, patient process of <Em>copying</Em> a new spell into it:
        the inks measured in gold, the diagrams traced by candle, the afternoons
        lost to a single stubborn glyph. The book is only the residue.
      </Paragraph>
      <Paragraph>
        Body text uses Atkinson Hyperlegible at a 16px base with{' '}
        <Strong>1.6 line-height</Strong> for comfortable reading at paragraph
        length. Every UI surface that carries running prose, from spell
        descriptions to encounter notes, uses this combination.
      </Paragraph>
      <SpecimenBlock label="Letterforms" meta="why this typeface">
        <Column gap="2">
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '24px',
              letterSpacing: '0.05em',
              color: 'var(--gray-12)',
            }}
          >
            Il1 / O0 / rn m / Cc Gg
          </div>
          <Text size="2" color="gray">
            Atkinson Hyperlegible disambiguates the letterforms most commonly
            confused by low-vision readers and OCR.
          </Text>
        </Column>
      </SpecimenBlock>
    </BookPage>
  ),
};

export const InlineElements: Story = {
  render: () => (
    <BookPage eyebrow="Inline emphasis" folio="v">
      <H2>Inline elements</H2>
      <Paragraph>
        Use semantic inline elements to mark intent within prose. They each
        carry a different signal and a different visual weight. Reach for
        Radix&apos;s components rather than raw HTML so styling stays
        centralized.
      </Paragraph>
      <SpecimenBlock label="Em" meta="emphasis / italic">
        <Paragraph>
          The lich knew, then, what the rest of the council had only{' '}
          <Em>suspected</Em>: the wards on the lower vault had been undisturbed
          for three centuries.
        </Paragraph>
      </SpecimenBlock>
      <SpecimenBlock label="Strong" meta="importance / bold">
        <Paragraph>
          Casting <Strong>fireball</Strong> at 4th level deals an additional 1d6
          fire damage. <Strong>Always</Strong> double-check the radius before
          targeting.
        </Paragraph>
      </SpecimenBlock>
      <SpecimenBlock label="Code" meta="named entities, slugs, dice notation">
        <Paragraph>
          The party finds a <Code>flame-tongue</Code> longsword in the treasure
          hoard. On a hit, roll <Code>2d6</Code> additional fire damage.
        </Paragraph>
      </SpecimenBlock>
      <SpecimenBlock label="Kbd" meta="DCs, keys, callouts">
        <Paragraph>
          The trapped door requires a <Kbd>DC 15</Kbd> Dexterity check to
          disarm. Press <Kbd>?</Kbd> in the app to open the keyboard shortcuts
          panel.
        </Paragraph>
      </SpecimenBlock>
      <SpecimenBlock label="Quote" meta="inline quotation">
        <Paragraph>
          Gygax once wrote that{' '}
          <Quote>
            the secret we should never let the gamemasters know is that they
            don&apos;t need any rules
          </Quote>
          , which has aged well even as the rules have multiplied.
        </Paragraph>
      </SpecimenBlock>
    </BookPage>
  ),
};

export const BlockquoteSpecimen: Story = {
  render: () => (
    <BookPage eyebrow="Block quotation" folio="vi">
      <H2>Blockquote</H2>
      <Paragraph>
        For quoted passages of more than a sentence, use Blockquote. It indents
        and italicizes by default and reads as a deliberate aside in running
        prose.
      </Paragraph>
      <SpecimenBlock label="Flavor text" meta="from a sourcebook">
        <Blockquote>
          The dungeon does not test you. It indexes you. Every door you do not
          open is a paragraph the place writes about who you were when you stood
          before it.
        </Blockquote>
      </SpecimenBlock>
      <SpecimenBlock label="With attribution" meta="prose + cite">
        <Blockquote>
          A wizard is just a librarian with a grudge against the laws of
          physics, and a librarian is just a wizard who has not yet decided
          which laws to break.
        </Blockquote>
        <Text as="div" color="gray" size="2" mt="2">
          attributed to Mordenkainen the Mage, apocryphal
        </Text>
      </SpecimenBlock>
    </BookPage>
  ),
};

export const MonoSpecimen: Story = {
  render: () => (
    <BookPage eyebrow="Mono" folio="vii">
      <H2>JetBrains Mono</H2>
      <Paragraph>
        Inline, mono signals a named game entity. A spell like{' '}
        <Code>mage-hand</Code> or an item like <Code>flame-tongue</Code>. In a
        block, it serves stat lines and code.
      </Paragraph>
      <SpecimenBlock label="Stat block" meta="14px / 1.5">
        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            lineHeight: 'var(--line-height-mono)',
            background: 'var(--gray-3)',
            padding: '14px 16px',
            borderRadius: '8px',
            margin: 0,
          }}
        >
          {`STR 30 (+10)   DEX 11 (+0)   CON 30 (+10)
INT  3 (-4)   WIS  9 (-1)   CHA 11 (+0)
challenge_rating: 30  (155,000 XP)`}
        </pre>
      </SpecimenBlock>
    </BookPage>
  ),
};

export const Pairing: Story = {
  render: () => (
    <BookPage eyebrow="In context" folio="viii">
      <H2>Pairing</H2>
      <Paragraph>
        Here is how the four roles combine on a typical surface, a spell detail
        card, so you can see the system working as a whole.
      </Paragraph>
      <Column align="center" py="4">
        <PairingExample />
      </Column>
    </BookPage>
  ),
};
