import { Popover } from '@radix-ui/themes';
import type { LinkProps } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';

import { classNames } from '@/utils/style/class-names';

import styles from './mobile-link.module.css';

export function MobileLink({ className, to, ...props }: Readonly<LinkProps>) {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  return (
    <Popover.Close>
      <Link
        className={classNames(styles['mobile-link'], className)}
        aria-current={isActive ? 'page' : undefined}
        to={to}
        {...props}
      />
    </Popover.Close>
  );
}
