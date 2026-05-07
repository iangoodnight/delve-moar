import * as NavigationMenu from '@radix-ui/react-navigation-menu';

import { DesktopLink } from './desktop-link';
import styles from './desktop-navigation.module.css';
import { LINKS } from './links';

export function DesktopNavigation() {
  return (
    <NavigationMenu.Root
      aria-label="Primary"
      className={styles['desktop-navigation']}
      orientation="horizontal"
    >
      <NavigationMenu.List>
        {LINKS.map(({ to, label }) => (
          <NavigationMenu.Item key={to}>
            <DesktopLink to={to}>{label}</DesktopLink>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
