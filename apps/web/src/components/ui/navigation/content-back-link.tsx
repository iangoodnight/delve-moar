import { useSearchParams } from 'react-router-dom';

import { paths } from '@/config/paths';

import { RouterLink } from './router-link';

interface ContentBackLinkProps {
  readonly listHref: string;
  readonly listLabel: string;
}

// On a content detail page, returns the visitor to the book they followed a row
// from (via ?fromBook), otherwise to the content list.
export function ContentBackLink({
  listHref,
  listLabel,
}: Readonly<ContentBackLinkProps>) {
  const [searchParams] = useSearchParams();
  const fromBook = searchParams.get('fromBook');

  if (fromBook !== null && fromBook !== '') {
    return (
      <RouterLink to={paths.accountBookDetail.getHref(fromBook)}>
        Back to book
      </RouterLink>
    );
  }
  return <RouterLink to={listHref}>{listLabel}</RouterLink>;
}
