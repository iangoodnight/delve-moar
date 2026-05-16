export const paths = {
  home: {
    displayName: 'Home',
    path: '/',
    getHref: () => '/',
  },
  items: {
    displayName: 'Items',
    path: '/items',
    getHref: () => '/items',
  },
  itemDetail: {
    displayName: 'Item Detail',
    path: '/items/:id',
    getHref: (id: string) => `/items/${id}`,
  },
  monsters: {
    displayName: 'Monsters',
    path: '/monsters',
    getHref: () => '/monsters',
  },
  monsterDetail: {
    displayName: 'Monster Detail',
    path: '/monsters/:slug',
    getHref: (slug: string) => `/monsters/${slug}`,
  },
  spells: {
    displayName: 'Spells',
    path: '/spells',
    getHref: () => '/spells',
  },
  spellDetail: {
    displayName: 'Spell Detail',
    path: '/spells/:slug',
    getHref: (slug: string) => `/spells/${slug}`,
  },
};
