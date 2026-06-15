import { useParams } from 'react-router-dom';

import { Head } from '@/components/seo/head';
import { SrdAttribution } from '@/components/srd';
import { Callout } from '@/components/ui/callout';
import { Box, Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { paths } from '@/config/paths';
import { useMonster } from '@/features/monsters/api';
import {
  MonsterDetailSkeleton,
  MonsterStatBlock,
} from '@/features/monsters/components';
import { ApiError } from '@/lib/api-client';

export default function MonsterDetail() {
  const { slug } = useParams<{ slug: string }>();
  const safeSlug = slug ?? '';

  const {
    data: monster,
    error,
    isLoading,
    isError,
  } = useMonster({ slug: safeSlug });

  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <Column aria-busy={isLoading} mb="8">
      <Head
        description={
          monster?.name
            ? `Stat block for ${monster.name}.`
            : `Detail page for monster ${safeSlug}.`
        }
        title={monster?.name ?? `Monster ${safeSlug}`}
      />
      {isLoading && <MonsterDetailSkeleton />}
      {isError && isNotFound && (
        <Callout.Root color="amber" role="alert">
          <Callout.Text>Monster not found.</Callout.Text>
        </Callout.Root>
      )}
      {isError && !isNotFound && (
        <Callout.Root color="red" role="alert">
          <Callout.Text>Could not load monster. {error.message}</Callout.Text>
        </Callout.Root>
      )}
      {monster && (
        <>
          <MonsterStatBlock monster={monster} />
          <SrdAttribution contentSource={monster.contentSource} />
        </>
      )}
      <Box py="4">
        <RouterLink to={paths.monsters.path}>Back to Monsters</RouterLink>
      </Box>
    </Column>
  );
}
