import { Column, Grid, Row, Section } from '@/components/ui/layout';
import { Skeleton } from '@/components/ui/loading';

const ABILITY_COUNT = 6;
const COMBAT_COUNT = 3;
const ACTION_COUNT = 2;

// Decorative placeholder; the loading announcement lives on the page wrapper
// via aria-busy.  Mirrors the rough shape of MonsterStatBlock so the layout
// doesn't shift when the real content lands.
export function MonsterDetailSkeleton() {
  return (
    <Column aria-hidden="true">
      <Row align="end" gap="2" justify="between" wrap="wrap">
        <Skeleton height="5.7rem" width="40%" />
        <Skeleton height="2rem" mb="2" width="20%" />
      </Row>
      <Section size="1">
        <Column gap="4">
          <Column gap="1">
            <Skeleton
              height="calc(3rem - calc(var(--space-1) / 2))"
              width="10rem"
            />
            <Grid columns={{ initial: '1', md: '3' }} gap="3">
              {Array.from({ length: COMBAT_COUNT }).map((_, i) => (
                <Skeleton
                  height="calc(2.4rem - calc(var(--space-1) / 2)"
                  key={i}
                  ml="4"
                  width="18rem"
                />
              ))}
            </Grid>
          </Column>
          <Column gap="1">
            <Skeleton
              height="calc(3rem - calc(var(--space-1) / 2)"
              width="14rem"
            />
            <Grid columns={{ initial: '3', sm: '6' }} gap="2">
              {Array.from({ length: ABILITY_COUNT }).map((_, i) => (
                <Skeleton
                  height="calc(6.4rem - calc(var(--space-1) / 2)"
                  key={i}
                />
              ))}
            </Grid>
          </Column>
          <Column gap="2">
            <Skeleton
              height="calc(3rem - calc(var(--space-1) / 2)"
              width="10rem"
            />
            <Skeleton
              height="calc(13.5rem - calc(var(--space-1) / 2)"
              width="100%"
            />
          </Column>
        </Column>
      </Section>
      <Section size="1">
        <Column gap="2">
          <Skeleton height="4.3rem" width="30%" />
          {Array.from({ length: ACTION_COUNT }).map((_, i) => (
            <Skeleton height="2.5rem" key={i} ml="4" />
          ))}
        </Column>
      </Section>
      <Skeleton height="1.6rem" width="80%" />
    </Column>
  );
}
