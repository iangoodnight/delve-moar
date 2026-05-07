import type { CSSProperties, ReactNode } from 'react';

import { Column, Container } from '@/components/ui/layout';
import { Label } from '@/components/ui/typography';

interface BookPageProps {
  readonly eyebrow?: string;
  readonly folio?: string;
  readonly children: ReactNode;
  readonly background?: CSSProperties['background'];
}

export function BookPage({
  eyebrow,
  folio,
  children,
  background = 'var(--gray-1)',
}: Readonly<BookPageProps>) {
  return (
    <div
      style={{
        background: 'var(--gray-2)',
        padding: '48px 24px',
        minHeight: '100vh',
      }}
    >
      <Container size="2">
        <div
          style={{
            background,
            border: '1px solid var(--gray-4)',
            borderRadius: '4px',
            padding: '72px 80px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
          }}
        >
          <Column gap="7">
            {eyebrow ? (
              <Label
                as="span"
                size="1"
                color="gray"
                style={{
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {eyebrow}
              </Label>
            ) : null}
            {children}
            {folio ? (
              <Label
                as="span"
                size="1"
                color="gray"
                align="center"
                style={{
                  letterSpacing: '0.18em',
                  marginTop: '24px',
                  paddingTop: '24px',
                  borderTop: '1px solid var(--gray-4)',
                }}
              >
                {folio}
              </Label>
            ) : null}
          </Column>
        </div>
      </Container>
    </div>
  );
}
