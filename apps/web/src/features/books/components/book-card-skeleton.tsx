import { Card } from '@/components/ui/card';
import { Column, Row } from '@/components/ui/layout';
import { Skeleton } from '@/components/ui/loading';

export function BookCardSkeleton() {
  return (
    <Card aria-hidden="true" size="3">
      <Column gap="2">
        <Row align="center" gap="2" justify="between">
          <Skeleton height="2.4rem" width="60%" />
          <Row gap="3">
            <Skeleton height="2rem" width="2rem" />
            <Skeleton height="2rem" width="2rem" />
          </Row>
        </Row>
        <Skeleton height="1.6rem" width="95%" />
        <Skeleton height="1.6rem" width="70%" />
        <Row mt="2">
          <Skeleton height="1.4rem" width="9rem" />
        </Row>
      </Column>
    </Card>
  );
}
