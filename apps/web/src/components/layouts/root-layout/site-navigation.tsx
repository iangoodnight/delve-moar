import { Flex } from '@/components/ui/layout';

import { AuthMenu } from './auth-menu';
import { DesktopNavigation } from './desktop-navigation';
import { MobileMenu } from './mobile-menu';

// Desktop (>=520px): the primary links plus the account menu. Below that, a
// single slideout that carries both. The MobileMenu trigger hides itself at
// the breakpoint, so the two never show at once.
export function SiteNavigation() {
  return (
    <>
      <Flex
        align="center"
        display={{ initial: 'none', xs: 'flex' }}
        gap={{ initial: '3', lg: '5' }}
        pr="1"
      >
        <DesktopNavigation />
        <AuthMenu />
      </Flex>
      <MobileMenu />
    </>
  );
}
