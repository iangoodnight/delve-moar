import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { H1 } from '@/components/ui/typography';
import { MonsterFilters, MonsterGrid } from '@/features/monsters/components';

export default function Monsters() {
  return (
    <Column gap="4">
      <Head title="Monsters" description="Browse monsters." />
      <H1>Monsters</H1>
      <MonsterFilters />
      <MonsterGrid />
    </Column>
  );
}
