import { ListIcon } from '@phosphor-icons/react';
import { Dialog, Separator, VisuallyHidden } from '@radix-ui/themes';
import { Link, useNavigate } from 'react-router-dom';

import { IconButton } from '@/components/ui/button';
import { Column } from '@/components/ui/layout';
import { Heading } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useAuth, useLogout } from '@/lib/auth';

import { LINKS } from './links';
import styles from './mobile-menu.module.css';

export function MobileMenu() {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const logout = useLogout();
  const isAuthenticated = status === 'authenticated' && user !== null;

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <IconButton
          aria-label="Open menu"
          className={styles['trigger']}
          mr="1"
          size="3"
          variant="ghost"
        >
          <ListIcon size={24} weight="bold" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content className={styles['content']}>
        <VisuallyHidden>
          <Dialog.Title>Site menu</Dialog.Title>
          <Dialog.Description>Account and site navigation</Dialog.Description>
        </VisuallyHidden>
        <Column gap="4">
          <Column asChild gap="1">
            <nav aria-label="Account">
              <Heading
                as="h2"
                className={styles['section-heading']}
                mb="1"
                size="1"
              >
                {isAuthenticated ? user.username : 'Account'}
              </Heading>
              {isAuthenticated ? (
                <>
                  <Dialog.Close>
                    <Link
                      className={styles['link']}
                      to={paths.account.getHref()}
                    >
                      Account
                    </Link>
                  </Dialog.Close>
                  <Dialog.Close>
                    <Link
                      className={styles['link']}
                      to={paths.accountBooks.getHref()}
                    >
                      My books
                    </Link>
                  </Dialog.Close>
                  <Dialog.Close>
                    <button
                      className={styles['link']}
                      onClick={() => {
                        logout.mutate(undefined, {
                          onSuccess: () => {
                            void navigate(paths.home.getHref());
                          },
                        });
                      }}
                      type="button"
                    >
                      Log out
                    </button>
                  </Dialog.Close>
                </>
              ) : (
                <>
                  <Dialog.Close>
                    <Link className={styles['link']} to={paths.login.getHref()}>
                      Log in
                    </Link>
                  </Dialog.Close>
                  <Dialog.Close>
                    <Link
                      className={styles['link']}
                      to={paths.signup.getHref()}
                    >
                      Sign up
                    </Link>
                  </Dialog.Close>
                </>
              )}
            </nav>
          </Column>

          <Separator size="4" />

          <Column asChild gap="1">
            <nav aria-label="Primary">
              <Heading
                as="h2"
                className={styles['section-heading']}
                mb="1"
                size="1"
              >
                Browse
              </Heading>
              {LINKS.map(({ to, label }) => (
                <Dialog.Close key={to}>
                  <Link className={styles['link']} to={to}>
                    {label}
                  </Link>
                </Dialog.Close>
              ))}
            </nav>
          </Column>
        </Column>
      </Dialog.Content>
    </Dialog.Root>
  );
}
