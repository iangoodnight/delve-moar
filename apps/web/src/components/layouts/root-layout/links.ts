import { paths } from '@/config/paths';

export interface LinkDescriptor {
  readonly to: string;
  readonly label: string;
}

export const LINKS: readonly LinkDescriptor[] = [
  {
    to: paths.monsters.path,
    label: 'Monsters',
  },
  {
    to: paths.items.path,
    label: 'Items',
  },
  {
    to: paths.spells.path,
    label: 'Spells',
  },
];
