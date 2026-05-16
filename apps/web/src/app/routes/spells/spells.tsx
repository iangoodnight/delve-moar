import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { H1 } from '@/components/ui/typography';
import { SpellFilters, SpellGrid } from '@/features/spells/components';

export default function Spells() {
  return (
    <Column gap="4">
      <Head title="Spells" description="Browse SRD spells." />
      <H1>Spells</H1>
      <SpellFilters />
      <SpellGrid />
    </Column>
  );
}
