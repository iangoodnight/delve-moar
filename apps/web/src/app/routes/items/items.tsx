import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1 } from '@/components/ui/typography';
import { paths } from '@/config/paths';

export default function Items() {
  return (
    <Column gap="4">
      <Head title="Items" description="Browse items." />
      <H1>Items</H1>
      <RouterLink to={paths.itemDetail.getHref('example-item-id')}>
        View Example Item Detail
      </RouterLink>
    </Column>
  );
}
