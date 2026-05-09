import { useParams } from 'react-router-dom';

import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { Code, H1, Paragraph } from '@/components/ui/typography';
import { paths } from '@/config/paths';

export default function MonsterDetail() {
  const { slug } = useParams<{ slug: string }>();
  const safeSlug = slug ?? '';

  return (
    <Column gap="4">
      <Head
        title={`Monster ${safeSlug}`}
        description={`Detail page for monster ${safeSlug}.`}
      />
      <H1>Monster {safeSlug}</H1>
      <Paragraph>
        Stub detail page. The route matched on <Code>/monsters/{safeSlug}</Code>
        .
      </Paragraph>
      <RouterLink to={paths.monsters.path}>Back to Monsters</RouterLink>
    </Column>
  );
}
