import { BrandMark } from '@/components/brand';
import { Row } from '@/components/ui/layout';
import { MD } from '@/constants/breakpoints';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';

import { NavProgress } from './nav-progress';
import { SiteNavigation } from './site-navigation';

export function SiteHeader() {
  const { width } = useWindowDimensions();
  const shouldBrandMarkShrink = width < MD;

  return (
    <>
      <NavProgress />
      <Row
        asChild
        align="end"
        justify="between"
        px={{ initial: '1', sm: '2', lg: '6', xl: '9' }}
        py={{ initial: '2', sm: '2', lg: '4' }}
      >
        <header>
          <BrandMark asLink={true} short={shouldBrandMarkShrink} />
          <SiteNavigation />
        </header>
      </Row>
    </>
  );
}
