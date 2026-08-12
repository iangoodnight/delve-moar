import { paths } from '@/config/paths';
import { prefetchOwnedBooks } from '@/features/books/api';
import { prefetchItems } from '@/features/items/api';
import { prefetchMonsters } from '@/features/monsters/api';
import { prefetchSpells } from '@/features/spells/api';
import type { PrefetchRegistry } from '@/lib/prefetch';

// keyed by each nav link's exact `to`. in the app layer because it imports
// feature helpers, which components (where the nav lives) may not.
export const navPrefetch: PrefetchRegistry = {
  [paths.monsters.path]: prefetchMonsters,
  [paths.items.path]: prefetchItems,
  [paths.spells.path]: prefetchSpells,
  [paths.accountBooks.path]: prefetchOwnedBooks,
};
