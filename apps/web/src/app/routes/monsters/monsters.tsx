import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1 } from '@/components/ui/typography';
import { paths } from '@/config/paths';

export default function Monsters() {
  return (
    <Column gap="4">
      <Head title="Monsters" description="Browse monsters." />
      <H1>Monsters</H1>
      <RouterLink to={paths.monsterDetail.getHref('example-monster-id')}>
        View Example Monster Detail
      </RouterLink>
    </Column>
  );
}
