import { useParams } from 'react-router-dom';

import { Head } from '@/components/seo/head';
import { SrdAttribution } from '@/components/srd';
import { Callout } from '@/components/ui/callout';
import { Box, Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { paths } from '@/config/paths';
import { useItem } from '@/features/items/api';
import {
  ItemDetailBlock,
  ItemDetailSkeleton,
} from '@/features/items/components';
import { ApiError } from '@/lib/api-client';

export default function ItemDetail() {
  const { slug } = useParams<{ slug: string }>();
  const safeSlug = slug ?? '';

  const { data: item, error, isLoading, isError } = useItem({ slug: safeSlug });

  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <Column aria-busy={isLoading} mb="8">
      <Head
        title={item?.name ?? `Item ${safeSlug}`}
        description={
          item?.name
            ? `Details for ${item.name}.`
            : `Detail page for item ${safeSlug}.`
        }
      />
      {isLoading && <ItemDetailSkeleton />}
      {isError && isNotFound && (
        <Callout.Root color="amber" role="alert">
          <Callout.Text>Item not found.</Callout.Text>
        </Callout.Root>
      )}
      {isError && !isNotFound && (
        <Callout.Root color="red" role="alert">
          <Callout.Text>Could not load item. {error.message}</Callout.Text>
        </Callout.Root>
      )}
      {item && (
        <>
          <ItemDetailBlock item={item} />
          <SrdAttribution contentSource={item.contentSource} />
        </>
      )}
      <Box py="4">
        <RouterLink to={paths.items.path}>Back to Items</RouterLink>
      </Box>
    </Column>
  );
}
