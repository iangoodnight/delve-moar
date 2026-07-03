import type { components } from '@delve-moar/api-types';
import { BookmarkSimpleIcon, CaretDownIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { RouterLink } from '@/components/ui/navigation';
import { Popover } from '@/components/ui/popover';
import { Text } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useAuth } from '@/lib/auth';
import { classNames } from '@/utils/style/class-names';

import type { ContentType } from '../api';
import {
  getOwnedBooksQueryOptions,
  useAddContentToBook,
  useRemoveContentFromBook,
} from '../api';

import styles from './add-to-book-control.module.css';

type BookMembership = components['schemas']['BookMembership'];

interface AddToBookControlProps {
  readonly contentType: ContentType;
  readonly contentId: string;
  readonly memberships: BookMembership[] | null | undefined;
}

// Splits on auth so each branch keeps a stable hook order. Mount this keyed by
// contentId so the optimistic state resets when the content changes.
export function AddToBookControl(props: Readonly<AddToBookControlProps>) {
  const { status } = useAuth();
  if (status !== 'authenticated') {
    return <SignInToSavePrompt />;
  }
  return <AddToBookMenu {...props} />;
}

// Anonymous: the muted control opens a popover (tap-friendly, so it works on
// touch and by keyboard) prompting sign-in, carrying the current URL so login
// returns here.
function SignInToSavePrompt() {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button
          className={classNames(styles['trigger'], styles['disabled-trigger'])}
          color="gray"
          variant="soft"
        >
          <BookmarkSimpleIcon aria-hidden="true" />
          <span className={styles['trigger-label']}>Add to book</span>
        </Button>
      </Popover.Trigger>
      <Popover.Content maxWidth="18rem" size="1">
        <Text size="2">
          <RouterLink state={{ from: returnTo }} to={paths.login.getHref()}>
            Log in
          </RouterLink>{' '}
          to save this to one of your books.
        </Text>
      </Popover.Content>
    </Popover.Root>
  );
}

function AddToBookMenu({
  contentType,
  contentId,
  memberships,
}: Readonly<AddToBookControlProps>) {
  const { data, isLoading } = useQuery(getOwnedBooksQueryOptions());
  const books = data?.data ?? [];
  const addMutation = useAddContentToBook();
  const removeMutation = useRemoveContentFromBook();

  const [checkedIds, setCheckedIds] = useState(
    () => new Set((memberships ?? []).map((membership) => membership.id)),
  );
  const count = checkedIds.size;
  const isSaved = count > 0;

  const toggle = (bookId: string, nextChecked: boolean) => {
    setCheckedIds((prev) => withMembership(prev, bookId, nextChecked));
    const mutation = nextChecked ? addMutation : removeMutation;
    mutation.mutate(
      { bookId, contentType, contentId },
      {
        onError: () => {
          setCheckedIds((prev) => withMembership(prev, bookId, !nextChecked));
        },
      },
    );
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button className={styles['trigger']} variant="soft">
          <BookmarkSimpleIcon
            aria-hidden="true"
            weight={isSaved ? 'fill' : 'regular'}
          />
          <span className={styles['trigger-label']}>
            {count > 0
              ? `In ${String(count)} book${count === 1 ? '' : 's'}`
              : 'Add to book'}
          </span>
          <CaretDownIcon aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" className={styles['content']}>
        {isLoading && (
          <DropdownMenu.Item disabled>Loading...</DropdownMenu.Item>
        )}
        {!isLoading && books.length === 0 && (
          <DropdownMenu.Item asChild>
            <Link to={paths.accountBooks.getHref()}>Create a book</Link>
          </DropdownMenu.Item>
        )}
        {books.map((book) => (
          <DropdownMenu.CheckboxItem
            key={book.id}
            checked={checkedIds.has(book.id)}
            onCheckedChange={(checked) => {
              toggle(book.id, checked);
            }}
            onSelect={(event) => {
              event.preventDefault();
            }}
          >
            <span className={styles['item-label']}>{book.name}</span>
          </DropdownMenu.CheckboxItem>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

function withMembership(
  ids: ReadonlySet<string>,
  bookId: string,
  present: boolean,
): Set<string> {
  const next = new Set(ids);
  if (present) {
    next.add(bookId);
  } else {
    next.delete(bookId);
  }
  return next;
}
