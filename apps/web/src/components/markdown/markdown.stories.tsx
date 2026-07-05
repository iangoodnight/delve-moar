import type { Meta, StoryObj } from '@storybook/react-vite';

import { Markdown } from './markdown';

const meta = {
  component: Markdown,
  title: 'Components/Markdown',
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

const SAMPLE = [
  'This paragraph has **bold** text, _italic_ text, inline `code`, and a',
  '[link to the SRD](https://example.com/srd).',
  '',
  'An unordered list:',
  '',
  '- First item',
  '- Second item',
  '- Third item',
  '',
  'An ordered list:',
  '',
  '1. Step one',
  '2. Step two',
  '',
  '> A blockquote, for flavor text and quotations.',
].join('\n');

const DEGRADES = [
  'Markdown tables are outside the supported subset, so they degrade to plain',
  'text rather than rendering as a table:',
  '',
  '| Size | HP | AC |',
  '| --- | --- | --- |',
  '| Tiny | 20 | 18 |',
  '| Small | 25 | 16 |',
].join('\n');

export const Overview: Story = {
  args: { children: SAMPLE },
};

export const UnsupportedDegradesToText: Story = {
  args: { children: DEGRADES },
};
