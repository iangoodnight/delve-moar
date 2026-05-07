import { DesktopNavigation } from './desktop-navigation';
import { MobileNavigation } from './mobile-navigation';

// wrapper renders both desktop and mobile navigations, swaps at 520px
export function SiteNavigation() {
  return (
    <>
      <DesktopNavigation />
      <MobileNavigation />
    </>
  );
}
