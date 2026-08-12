import {
  BooksIcon,
  SignInIcon,
  SignOutIcon,
  SwordIcon,
  UserCircleIcon,
  UserIcon,
} from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';

import { IconButton } from '@/components/ui/button';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { paths } from '@/config/paths';
import { useHoverPrefetch } from '@/hooks/use-hover-prefetch';
import { useAuth, useLogout } from '@/lib/auth';
import { usePathPrefetch } from '@/lib/prefetch';

export function AuthMenu() {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const logout = useLogout();
  const isAuthenticated = status === 'authenticated' && user !== null;
  const booksHover = useHoverPrefetch(usePathPrefetch(paths.accountBooks.path));

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton
          aria-label={
            isAuthenticated
              ? `Account menu, signed in as ${user.username}`
              : 'Account menu'
          }
          radius="full"
          size="3"
          variant="soft"
          {...(isAuthenticated ? {} : { color: 'gray' as const })}
        >
          <UserCircleIcon
            size={26}
            weight={isAuthenticated ? 'fill' : 'regular'}
          />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" variant="soft">
        {isAuthenticated ? (
          <>
            <DropdownMenu.Label>{user.username}</DropdownMenu.Label>
            <DropdownMenu.Item asChild>
              <Link to={paths.account.getHref()}>
                <UserIcon aria-hidden="true" /> Account
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link to={paths.accountBooks.getHref()} {...booksHover}>
                <BooksIcon aria-hidden="true" /> My books
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              color="red"
              onSelect={() => {
                logout.mutate(undefined, {
                  onSuccess: () => {
                    void navigate(paths.home.getHref());
                  },
                });
              }}
            >
              <SignOutIcon aria-hidden="true" /> Log out
            </DropdownMenu.Item>
          </>
        ) : (
          <>
            <DropdownMenu.Item asChild>
              <Link to={paths.login.getHref()}>
                <SignInIcon aria-hidden="true" /> Log in
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link to={paths.signup.getHref()}>
                <SwordIcon aria-hidden="true" /> Sign up
              </Link>
            </DropdownMenu.Item>
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
