import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { H1 } from '@/components/ui/typography';
import { paths } from '@/config/paths';

export default function Spells() {
  return (
    <Column gap="4">
      <Head title="Spells" description="Browse spells." />
      <H1>Spells</H1>
      <RouterLink to={paths.spellDetail.getHref('example-spell-id')}>
        View Example Spell Detail
      </RouterLink>
    </Column>
  );
}
