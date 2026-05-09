export const MONSTER_TYPES = [
  'aberration',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'fey',
  'fiend',
  'giant',
  'humanoid',
  'monstrosity',
  'ooze',
  'plant',
  'swarm of tiny beasts',
  'undead',
] as const;

export type MonsterType = (typeof MONSTER_TYPES)[number];
