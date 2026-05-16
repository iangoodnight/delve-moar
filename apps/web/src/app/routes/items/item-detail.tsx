import { useParams } from 'react-router-dom';

import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { Code, H1, Paragraph } from '@/components/ui/typography';
import { paths } from '@/config/paths';

export default function ItemDetail() {
  const { slug } = useParams<{ slug: string }>();
  const safeSlug = slug ?? '';

  return (
    <Column gap="4">
      <Head
        title={`Item ${safeSlug}`}
        description={`Detail page for item ${safeSlug}.`}
      />
      <H1>Item {safeSlug}</H1>
      <Paragraph>
        Stub detail page. The route matched on <Code>/items/{safeSlug}</Code>.
      </Paragraph>
      <RouterLink to={paths.items.path}>Back to Items</RouterLink>
    </Column>
  );
}
