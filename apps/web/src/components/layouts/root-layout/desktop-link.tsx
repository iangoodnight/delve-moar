import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import type { LinkProps } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';

import { classNames } from '@/utils/style/class-names';

import styles from './desktop-link.module.css';

export function DesktopLink({ className, to, ...props }: Readonly<LinkProps>) {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  return (
    <NavigationMenu.Link active={isActive} asChild>
      <Link
        className={classNames(styles['desktop-link'], className)}
        to={to}
        {...props}
      />
    </NavigationMenu.Link>
  );
}
