import type { HeadingProps, TextProps } from '@radix-ui/themes';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Column, Row } from '@/components/ui/layout';

import {
  Blockquote,
  Code,
  Em,
  H1,
  H2,
  H3,
  H4,
  Heading,
  Kbd,
  Label,
  Link,
  Paragraph,
  Quote,
  Strong,
  Text,
} from './index';

const SIZE_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
const WEIGHT_OPTIONS = ['light', 'regular', 'medium', 'bold'] as const;
const COLOR_OPTIONS = [
  undefined,
  'gray',
  'gold',
  'bronze',
  'brown',
  'yellow',
  'amber',
  'orange',
  'tomato',
  'red',
  'ruby',
  'crimson',
  'pink',
  'plum',
  'purple',
  'violet',
  'iris',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'jade',
  'green',
  'grass',
  'lime',
  'mint',
  'sky',
] as const;

interface ShowcaseArgs {
  readonly headingSize: NonNullable<HeadingProps['size']>;
  readonly headingWeight: NonNullable<HeadingProps['weight']>;
  readonly headingColor: HeadingProps['color'];
  readonly paragraphSize: NonNullable<TextProps['size']>;
  readonly paragraphWeight: NonNullable<TextProps['weight']>;
  readonly paragraphColor: TextProps['color'];
  readonly labelSize: NonNullable<TextProps['size']>;
  readonly labelWeight: NonNullable<TextProps['weight']>;
  readonly labelColor: TextProps['color'];
  readonly textSize: NonNullable<TextProps['size']>;
  readonly textWeight: NonNullable<TextProps['weight']>;
  readonly textColor: TextProps['color'];
}

const meta: Meta<ShowcaseArgs> = {
  title: 'Components/Typography/Showcase',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Live preview of every typography component. Use the controls panel to adjust each section independently. For full prop documentation, see the [Components/Typography/Overview](?path=/docs/components-typography-overview--docs) page or the linked Radix docs.',
      },
    },
  },
  argTypes: {
    headingSize: {
      control: 'inline-radio',
      options: SIZE_OPTIONS,
      table: { category: 'Heading playground' },
    },
    headingWeight: {
      control: 'inline-radio',
      options: WEIGHT_OPTIONS,
      table: { category: 'Heading playground' },
    },
    headingColor: {
      control: 'select',
      options: COLOR_OPTIONS,
      table: { category: 'Heading playground' },
    },
    paragraphSize: {
      control: 'inline-radio',
      options: SIZE_OPTIONS,
      table: { category: 'Paragraph' },
    },
    paragraphWeight: {
      control: 'inline-radio',
      options: WEIGHT_OPTIONS,
      table: { category: 'Paragraph' },
    },
    paragraphColor: {
      control: 'select',
      options: COLOR_OPTIONS,
      table: { category: 'Paragraph' },
    },
    labelSize: {
      control: 'inline-radio',
      options: SIZE_OPTIONS,
      table: { category: 'Label' },
    },
    labelWeight: {
      control: 'inline-radio',
      options: WEIGHT_OPTIONS,
      table: { category: 'Label' },
    },
    labelColor: {
      control: 'select',
      options: COLOR_OPTIONS,
      table: { category: 'Label' },
    },
    textSize: {
      control: 'inline-radio',
      options: SIZE_OPTIONS,
      table: { category: 'Text playground' },
    },
    textWeight: {
      control: 'inline-radio',
      options: WEIGHT_OPTIONS,
      table: { category: 'Text playground' },
    },
    textColor: {
      control: 'select',
      options: COLOR_OPTIONS,
      table: { category: 'Text playground' },
    },
  },
  args: {
    headingSize: '6',
    headingWeight: 'medium',
    paragraphSize: '3',
    paragraphWeight: 'regular',
    labelSize: '4',
    labelWeight: 'medium',
    textSize: '3',
    textWeight: 'regular',
  },
};

export default meta;

type Story = StoryObj<ShowcaseArgs>;

function SectionHeading({ children }: { readonly children: string }) {
  return (
    <Label
      as="span"
      color="gray"
      mt="5"
      size="1"
      style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
    >
      {children}
    </Label>
  );
}

export const Showcase: Story = {
  render: ({
    headingSize,
    headingWeight,
    headingColor,
    paragraphSize,
    paragraphWeight,
    paragraphColor,
    labelSize,
    labelWeight,
    labelColor,
    textSize,
    textWeight,
    textColor,
  }) => (
    <Column gap="4" style={{ maxWidth: '720px' }}>
      <SectionHeading>Headings (locked)</SectionHeading>
      <Paragraph color="gray" size="2">
        H1 through H4 are locked to the project design scale. Their{' '}
        <Code>size</Code> / <Code>weight</Code> props are ignored at render
        time. To customize, use the raw <Code>Heading</Code> playground below.
      </Paragraph>
      <Column gap="3">
        <H1>H1 — The Tarrasque rises from its slumber.</H1>
        <H2>H2 — The Tarrasque rises from its slumber.</H2>
        <H3>H3 — The Tarrasque rises from its slumber.</H3>
        <H4>H4 — The Tarrasque rises from its slumber.</H4>
      </Column>

      <SectionHeading>Heading playground (raw)</SectionHeading>
      <Paragraph color="gray" size="2">
        Direct Radix <Code>Heading</Code>. Adjust controls under{' '}
        <em>Heading playground</em>.
      </Paragraph>
      <Heading
        size={headingSize}
        weight={headingWeight}
        {...(headingColor !== undefined && { color: headingColor })}
      >
        The Tarrasque rises from its slumber.
      </Heading>

      <SectionHeading>Paragraph</SectionHeading>
      <Paragraph color="gray" size="2">
        Wraps <Code>Text as=&quot;p&quot;</Code> with locked body line-height.
        <Code>size</Code>, <Code>weight</Code>, <Code>color</Code> pass through.
      </Paragraph>
      <Paragraph
        size={paragraphSize}
        weight={paragraphWeight}
        {...(paragraphColor !== undefined && { color: paragraphColor })}
      >
        A wizard&apos;s most prized possession is rarely the spellbook itself.
        It is the long, patient process of <Em>copying</Em> a new spell into it:
        the inks measured in gold, the diagrams traced by candle, the afternoons
        lost to a single stubborn glyph. The book is only the residue.
      </Paragraph>

      <SectionHeading>Label</SectionHeading>
      <Paragraph color="gray" size="2">
        Defaults to a semantic <Code>&lt;label&gt;</Code>. For presentational
        use (eyebrows, badges, in-card meta), pass{' '}
        <Code>as=&quot;span&quot;</Code>.
      </Paragraph>
      <Column align="start" gap="2">
        <Label
          as="label"
          size={labelSize}
          weight={labelWeight}
          {...(labelColor !== undefined && { color: labelColor })}
        >
          Difficulty class
        </Label>
        <Label
          as="span"
          size={labelSize}
          weight={labelWeight}
          {...(labelColor !== undefined && { color: labelColor })}
        >
          As span (presentational)
        </Label>
      </Column>

      <SectionHeading>Text playground (raw)</SectionHeading>
      <Paragraph color="gray" size="2">
        Direct Radix <Code>Text</Code> for inline runs and ad-hoc blocks.
      </Paragraph>
      <Text
        as="span"
        size={textSize}
        weight={textWeight}
        {...(textColor !== undefined && { color: textColor })}
      >
        The party rests at the inn while the storm passes overhead.
      </Text>

      <SectionHeading>Inline elements</SectionHeading>
      <Paragraph color="gray" size="2">
        Semantic inline elements re-exported from Radix. Use them inside{' '}
        <Code>Paragraph</Code> or <Code>Text</Code>.
      </Paragraph>
      <Paragraph>
        The wizard <Em>knew</Em>, with sudden and <Strong>certain</Strong>{' '}
        clarity, that the <Code>mage-hand</Code> cantrip would not be enough.
        The trap required a <Kbd>DC 15</Kbd> Dex check, and the chronicler had
        written, <Quote>that night the lock yielded only to silver</Quote>.
      </Paragraph>

      <SectionHeading>Blockquote</SectionHeading>
      <Paragraph color="gray" size="2">
        Multi-sentence quotation. Indented and italicized by default.
      </Paragraph>
      <Blockquote>
        The dungeon does not test you. It indexes you. Every door you do not
        open is a paragraph the place writes about who you were when you stood
        before it.
      </Blockquote>

      <SectionHeading>Link</SectionHeading>
      <Paragraph color="gray" size="2">
        Inline anchor. For client-side navigation, wrap React Router{' '}
        <Code>&lt;Link&gt;</Code> with <Code>asChild</Code>.
      </Paragraph>
      <Paragraph>
        Read the full bestiary entry for <Link href="#">the Tarrasque</Link>{' '}
        before running this encounter.
      </Paragraph>

      <SectionHeading>Heading scale reference</SectionHeading>
      <Paragraph color="gray" size="2">
        The locked sizes for each project heading level.
      </Paragraph>
      <Column gap="2">
        <Row align="baseline" gap="3">
          <Label as="span" color="gray" size="1" style={{ width: '40px' }}>
            H1
          </Label>
          <Text>48px / 700 / 1.2</Text>
        </Row>
        <Row align="baseline" gap="3">
          <Label as="span" color="gray" size="1" style={{ width: '40px' }}>
            H2
          </Label>
          <Text>36px / 600 / 1.2</Text>
        </Row>
        <Row align="baseline" gap="3">
          <Label as="span" color="gray" size="1" style={{ width: '40px' }}>
            H3
          </Label>
          <Text>28px / 500 / 1.2</Text>
        </Row>
        <Row align="baseline" gap="3">
          <Label as="span" color="gray" size="1" style={{ width: '40px' }}>
            H4
          </Label>
          <Text>22px / 500 / 1.2</Text>
        </Row>
      </Column>
    </Column>
  ),
};
