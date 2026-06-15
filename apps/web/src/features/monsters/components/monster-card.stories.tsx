import type { Meta, StoryObj } from '@storybook/react-vite';

import { Column } from '@/components/ui/layout';

import type { MonsterSummary } from '../api/get-monsters';

import { MonsterCard } from './monster-card';
import { MonsterCardSkeleton } from './monster-card-skeleton';

const meta: Meta<typeof MonsterCard> = {
  title: 'Features/Monsters/MonsterCard',
  component: MonsterCard,
  parameters: {
    docs: {
      description: {
        component:
          'Single monster summary card. The full surface is a router link to the detail page. Used in the catalog grid on `/monsters`.',
      },
    },
  },
  decorators: [
    (Story) => (
      <Column gap="3" style={{ maxWidth: '480px' }}>
        <Story />
      </Column>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof MonsterCard>;

const ADULT_RED_DRAGON: MonsterSummary = {
  slug: 'adult-red-dragon',
  name: 'Adult Red Dragon',
  monsterType: 'dragon',
  challengeRating: '17',
};

const TARRASQUE: MonsterSummary = {
  slug: 'tarrasque',
  name: 'Tarrasque',
  monsterType: 'monstrosity',
  challengeRating: '30',
};

const KOBOLD: MonsterSummary = {
  slug: 'kobold',
  name: 'Kobold',
  monsterType: 'humanoid',
  challengeRating: '1/8',
};

const SWARM: MonsterSummary = {
  slug: 'swarm-of-rats',
  name: 'Swarm of Rats',
  monsterType: 'swarm of tiny beasts',
  challengeRating: '1/4',
};

const UNTYPED: MonsterSummary = {
  slug: 'something-strange',
  name: 'Something Strange and Long-Named',
  monsterType: null,
  challengeRating: '5',
};

export const Default: Story = {
  args: { monster: ADULT_RED_DRAGON },
};

export const HighCR: Story = {
  args: { monster: TARRASQUE },
};

export const FractionalCR: Story = {
  args: { monster: KOBOLD },
};

export const MultiWordType: Story = {
  args: { monster: SWARM },
};

export const UnknownType: Story = {
  args: { monster: UNTYPED },
};

export const Grid: Story = {
  render: () => (
    <>
      <MonsterCard monster={ADULT_RED_DRAGON} />
      <MonsterCard monster={TARRASQUE} />
      <MonsterCard monster={KOBOLD} />
      <MonsterCard monster={SWARM} />
      <MonsterCard monster={UNTYPED} />
    </>
  ),
};

export const Loading: Story = {
  render: () => <MonsterCardSkeleton />,
};

export const LoadingGrid: Story = {
  render: () => (
    <>
      <MonsterCardSkeleton />
      <MonsterCardSkeleton />
      <MonsterCardSkeleton />
    </>
  ),
};
