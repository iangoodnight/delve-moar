import { ListIcon } from '@phosphor-icons/react';
import { IconButton, Popover, VisuallyHidden } from '@radix-ui/themes';

import { Column } from '@/components/ui/layout';

import { LINKS } from './links';
import { MobileLink } from './mobile-link';
import styles from './mobile-navigation.module.css';

export function MobileNavigation() {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <IconButton
          aria-label="Open navigation menu"
          className={styles['mobile-navigation-trigger']}
          mb="1"
          mr="2"
          size="3"
          variant="ghost"
        >
          <ListIcon size={24} weight="bold" />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content
        align="end"
        className={styles['mobile-navigation-content']}
        side="bottom"
      >
        <VisuallyHidden>
          <h2>Site navigation</h2>
        </VisuallyHidden>
        <nav aria-label="Primary">
          <Column asChild gap="1">
            <ul>
              {LINKS.map(({ to, label }) => (
                <li key={to}>
                  <MobileLink to={to}>{label}</MobileLink>
                </li>
              ))}
            </ul>
          </Column>
        </nav>
      </Popover.Content>
    </Popover.Root>
  );
}
