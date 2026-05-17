import { Card } from '@/components/ui/card';
import { Column, Row } from '@/components/ui/layout';
import { Skeleton } from '@/components/ui/loading';

export function ItemCardSkeleton() {
  return (
    <Card aria-hidden="true">
      <Row gap="3" justify="between">
        <Column flexGrow="1" gap="1">
          <Skeleton height="2.6rem" width="70%" />
          <Skeleton height="2rem" width="40%" />
        </Column>
        <Skeleton height="2rem" width="6rem" />
      </Row>
    </Card>
  );
}
