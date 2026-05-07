import type { ReactNode } from 'react';

import { Container, Grid } from '@/components/ui/layout';
import { ScrollArea } from '@/components/ui/scroll-area';

import { SiteHeader } from './site-header';

interface RootLayoutProps {
  readonly children: Readonly<ReactNode>;
}

export function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <Grid rows="auto 1fr">
      <SiteHeader />
      <ScrollArea>
        <Container pt="4" px={{ initial: '2', xs: '4', lg: '0' }} size="4">
          <main>{children}</main>
        </Container>
      </ScrollArea>
    </Grid>
  );
}
