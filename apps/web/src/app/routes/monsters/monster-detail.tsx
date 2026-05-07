import { useParams } from 'react-router-dom';

import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { Code, H1, Paragraph } from '@/components/ui/typography';
import { paths } from '@/config/paths';

export default function MonsterDetail() {
  const { id } = useParams<{ id: string }>();
  const safeId = id ?? '';

  return (
    <Column gap="4">
      <Head
        title={`Monster ${safeId}`}
        description={`Detail page for monster ${safeId}.`}
      />
      <H1>Monster {safeId}</H1>
      <Paragraph>
        Stub detail page. The route matched on <Code>/monsters/{safeId}</Code>.
      </Paragraph>
      <RouterLink to={paths.monsters.path}>Back to Monsters</RouterLink>
    </Column>
  );
}
