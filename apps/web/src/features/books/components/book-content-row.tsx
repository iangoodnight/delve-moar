import { Card } from '@/components/ui/card';
import { Row } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { Text } from '@/components/ui/typography';

export interface BookContentRowData {
  readonly key: string;
  readonly name: string;
  readonly href: string;
  readonly meta: string;
}

type BookContentRowProps = Omit<BookContentRowData, 'key'>;

export function BookContentRow({
  name,
  href,
  meta,
}: Readonly<BookContentRowProps>) {
  return (
    <Card>
      <Row align="center" gap="3" justify="between">
        <RouterLink to={href} weight="medium">
          {name}
        </RouterLink>
        <Text color="gray" size="2">
          {meta}
        </Text>
      </Row>
    </Card>
  );
}
