import { useParams } from 'react-router-dom';

import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { Code, H1, Paragraph } from '@/components/ui/typography';
import { paths } from '@/config/paths';

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const safeId = id ?? '';

  return (
    <Column gap="4">
      <Head
        title={`Item ${safeId}`}
        description={`Detail page for item ${safeId}.`}
      />
      <H1>Item {safeId}</H1>
      <Paragraph>
        Stub detail page. The route matched on <Code>/items/{safeId}</Code>.
      </Paragraph>
      <RouterLink to={paths.items.path}>Back to Items</RouterLink>
    </Column>
  );
}
