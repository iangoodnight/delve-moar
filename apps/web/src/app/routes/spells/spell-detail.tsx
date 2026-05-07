import { useParams } from 'react-router-dom';

import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { Code, H1, Paragraph } from '@/components/ui/typography';
import { paths } from '@/config/paths';

export default function SpellDetail() {
  const { id } = useParams<{ id: string }>();
  const safeId = id ?? '';

  return (
    <Column gap="4">
      <Head
        title={`Spell ${safeId}`}
        description={`Detail page for spell ${safeId}.`}
      />
      <H1>Spell {safeId}</H1>
      <Paragraph>
        Stub detail page. The route matched on <Code>/spells/{safeId}</Code>.
      </Paragraph>
      <RouterLink to={paths.spells.path}>Back to Spells</RouterLink>
    </Column>
  );
}
