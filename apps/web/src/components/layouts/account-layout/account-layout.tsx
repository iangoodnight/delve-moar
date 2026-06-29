import type { ReactNode } from 'react';

import { Box, Grid } from '@/components/ui/layout';

import styles from './account-layout.module.css';
import { AccountNav } from './account-nav';

interface AccountLayoutProps {
  readonly children: Readonly<ReactNode>;
}

// Account hub: a persistent section nav beside a wide content pane. Collapses
// to a nav row above the content below `md`; at `xl` the nav moves into the
// left gutter so the content fills the full container (see the module CSS).
export function AccountLayout({ children }: Readonly<AccountLayoutProps>) {
  return (
    <Grid
      className={styles['account-grid']}
      columns={{ initial: '1', md: '12.5rem minmax(0, 1fr)' }}
      gapX="6"
      gapY="4"
      mb="8"
    >
      <AccountNav />
      <Box minWidth="0">{children}</Box>
    </Grid>
  );
}
