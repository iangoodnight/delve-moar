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
    path: '/items/:slug',
    getHref: (slug: string) => `/items/${slug}`,
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
  login: {
    displayName: 'Log in',
    path: '/login',
    getHref: () => '/login',
  },
  signup: {
    displayName: 'Sign up',
    path: '/signup',
    getHref: () => '/signup',
  },
  forgotPassword: {
    displayName: 'Forgot password',
    path: '/forgot-password',
    getHref: () => '/forgot-password',
  },
  // Target of the password-reset email link; reads the token from ?token=.
  resetPassword: {
    displayName: 'Reset password',
    path: '/reset-password',
    getHref: () => '/reset-password',
  },
  // Target of the verification email link; reads the token from ?token=.
  verifyEmail: {
    displayName: 'Verify email',
    path: '/verify-email',
    getHref: () => '/verify-email',
  },
  // Target of the email-change confirmation link; reads the token from ?token=.
  confirmEmailChange: {
    displayName: 'Confirm email change',
    path: '/confirm-email-change',
    getHref: () => '/confirm-email-change',
  },
  account: {
    displayName: 'Account',
    path: '/account',
    getHref: () => '/account',
  },
  accountBooks: {
    displayName: 'My Books',
    path: '/account/books',
    getHref: () => '/account/books',
  },
  accountBookDetail: {
    displayName: 'Book',
    path: '/account/books/:bookId',
    getHref: (bookId: string) => `/account/books/${bookId}`,
  },
};
