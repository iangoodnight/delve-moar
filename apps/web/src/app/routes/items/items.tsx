import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { H1 } from '@/components/ui/typography';
import { ItemFilters, ItemGrid } from '@/features/items/components';

export default function Items() {
  return (
    <Column gap="4">
      <Head title="Items" description="Browse SRD items." />
      <H1>Items</H1>
      <ItemFilters />
      <ItemGrid />
    </Column>
  );
}
