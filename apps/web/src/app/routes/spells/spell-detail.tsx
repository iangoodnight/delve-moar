import { useParams } from 'react-router-dom';

import { Head } from '@/components/seo/head';
import { SrdAttribution } from '@/components/srd';
import { Callout } from '@/components/ui/callout';
import { Box, Column } from '@/components/ui/layout';
import { ContentBackLink } from '@/components/ui/navigation';
import { paths } from '@/config/paths';
import { AddToBookControl } from '@/features/books';
import { useSpell } from '@/features/spells/api';
import {
  SpellDetailBlock,
  SpellDetailSkeleton,
} from '@/features/spells/components';
import { ApiError } from '@/lib/api-client';

export default function SpellDetail() {
  const { slug } = useParams<{ slug: string }>();
  const safeSlug = slug ?? '';

  const {
    data: spell,
    error,
    isLoading,
    isError,
  } = useSpell({ slug: safeSlug });

  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <Column aria-busy={isLoading} mb="8">
      <Head
        description={
          spell?.name
            ? `Details for ${spell.name}.`
            : `Detail page for spell ${safeSlug}.`
        }
        title={spell?.name ?? `Spell ${safeSlug}`}
      />
      {isLoading && <SpellDetailSkeleton />}
      {isError && isNotFound && (
        <Callout.Root color="amber" role="alert">
          <Callout.Text>Spell not found.</Callout.Text>
        </Callout.Root>
      )}
      {isError && !isNotFound && (
        <Callout.Root color="red" role="alert">
          <Callout.Text>Could not load spell. {error.message}</Callout.Text>
        </Callout.Root>
      )}
      {spell && (
        <>
          <SpellDetailBlock
            headerAction={
              <AddToBookControl
                key={spell.id}
                contentId={spell.id}
                contentType="spell"
                memberships={spell.bookMemberships}
              />
            }
            spell={spell}
          />
          <SrdAttribution contentSource={spell.contentSource} />
        </>
      )}
      <Box py="4">
        <ContentBackLink
          listHref={paths.spells.path}
          listLabel="Back to Spells"
        />
      </Box>
    </Column>
  );
}
