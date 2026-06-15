import { Column, Grid, Row, Section } from '@/components/ui/layout';
import { Skeleton } from '@/components/ui/loading';

const DESC_PARAGRAPH_COUNT = 2;
const ITEM_STAT_COUNT = 2;

// Decorative placeholder; the loading announcement lives on the page wrapper
// via aria-busy. Mirrors the rough shape of ItemDetailBlock.
export function ItemDetailSkeleton() {
  return (
    <Column aria-hidden="true">
      <Row align="end" gap="2" justify="between" wrap="wrap">
        <Skeleton height="5.76rem" width="30rem" />
        <Skeleton height="2.24rem" mb="2" width="13.4rem" />
      </Row>
      <Section size="1">
        <Column gap="1">
          <Skeleton
            height="calc(3rem - calc(var(--space-1) / 2)"
            width="12rem"
          />
          <Grid columns={{ initial: '1', md: '3' }} gap="3">
            {Array.from({ length: ITEM_STAT_COUNT }).map((_, i) => (
              <Skeleton
                key={i}
                height="calc(2.4rem - calc(var(--space-1) / 2)"
                ml="4"
                width="18rem"
              />
            ))}
          </Grid>
        </Column>
      </Section>
      <Section size="1">
        <Column gap="2">
          <Skeleton height="4.32rem" width="26rem" />
          {Array.from({ length: DESC_PARAGRAPH_COUNT }).map((_, i) => (
            <Skeleton
              key={i}
              height="5.1rem"
              ml="4"
              mt={i === 0 ? '0' : '3'}
              width="calc(100% - var(--space-4))"
            />
          ))}
        </Column>
      </Section>
      <Skeleton height="1.6rem" width="80%" />
    </Column>
  );
}
