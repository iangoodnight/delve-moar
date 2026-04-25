import type { CSSProperties, ReactNode } from 'react';

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
}: SpecimenBlockProps) {
  return (
    <section
      style={{
        padding: '1.25rem 0',
        borderBottom: '1px solid var(--gray-4)',
        ...style,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--gray-11)',
          }}
        >
          {label}
        </span>
        {meta ? (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--gray-10)',
            }}
          >
            {meta}
          </span>
        ) : null}
      </header>
      <div>{children}</div>
    </section>
  );
}
