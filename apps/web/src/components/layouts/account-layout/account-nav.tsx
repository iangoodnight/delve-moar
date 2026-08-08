import { BooksIcon, UserIcon } from '@phosphor-icons/react';
import { NavLink } from 'react-router-dom';

import { Flex } from '@/components/ui/layout';
import { paths } from '@/config/paths';
import { classNames } from '@/utils/style/class-names';

import styles from './account-nav.module.css';

function linkClass({ isActive }: { isActive: boolean }) {
  return classNames(styles['link'], isActive ? styles['active'] : undefined);
}

export function AccountNav() {
  return (
    <Flex asChild direction={{ initial: 'row', md: 'column' }} gap="1">
      <nav aria-label="Account">
        <NavLink className={linkClass} end to={paths.account.getHref()}>
          <UserIcon aria-hidden="true" /> Account
        </NavLink>
        <NavLink className={linkClass} to={paths.accountBooks.getHref()}>
          <BooksIcon aria-hidden="true" /> My books
        </NavLink>
      </nav>
    </Flex>
  );
}
