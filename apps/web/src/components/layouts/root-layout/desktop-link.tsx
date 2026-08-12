import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import type { LinkProps } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';

import { useHoverPrefetch } from '@/hooks/use-hover-prefetch';
import { usePathPrefetch } from '@/lib/prefetch';
import { classNames } from '@/utils/style/class-names';

import styles from './desktop-link.module.css';

export function DesktopLink({ className, to, ...props }: Readonly<LinkProps>) {
  const { pathname } = useLocation();
  const isActive = pathname === to;
  // only a string `to` can key the registry
  const prefetch = usePathPrefetch(typeof to === 'string' ? to : '');
  const hover = useHoverPrefetch(prefetch);

  return (
    <NavigationMenu.Link active={isActive} asChild>
      <Link
        className={classNames(styles['desktop-link'], className)}
        to={to}
        {...hover}
        {...props}
      />
    </NavigationMenu.Link>
  );
}
