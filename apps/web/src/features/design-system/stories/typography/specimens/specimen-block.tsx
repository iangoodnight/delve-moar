import type { CSSProperties, ReactNode } from 'react';

import { Column, Row } from '@/components/ui/layout';
import { Label } from '@/components/ui/typography';

interface SpecimenBlockProps {
  readonly label: string;
  readonly meta?: string;
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}

export function SpecimenBlock({
  label,
  meta,
  children,
  style,
}: Readonly<SpecimenBlockProps>) {
  return (
    <Column
      asChild
      gap="3"
      py="4"
      style={{
        borderBottom: '1px solid var(--gray-4)',
        ...style,
      }}
    >
      <section>
        <Row asChild align="baseline" justify="between">
          <header>
            <Label
              as="span"
              size="1"
              color="gray"
              style={{
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </Label>
            {meta ? (
              <Label
                as="span"
                size="1"
                color="gray"
                style={{ letterSpacing: '0.04em' }}
              >
                {meta}
              </Label>
            ) : null}
          </header>
        </Row>
        <div>{children}</div>
      </section>
    </Column>
  );
}
