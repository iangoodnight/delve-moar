import type { components } from '@delve-moar/api-types';

import { Column, Section } from '@/components/ui/layout';
import { H2, Paragraph, Strong } from '@/components/ui/typography';

type ActionEntry = components['schemas']['ActionEntry'];

interface ActionsBlockProps {
  readonly title: string;
  readonly entries: readonly ActionEntry[];
}

export function ActionsBlock({ title, entries }: Readonly<ActionsBlockProps>) {
  if (entries.length === 0) return null;
  return (
    <Section size="1">
      <Column gap="2">
        <H2>{title}</H2>
        {entries.map((entry) => (
          <Paragraph
            key={entry.name}
            className="text-constraint"
            ml={{ initial: '0', sm: '4' }}
          >
            <Strong>
              <em>{entry.name}.</em>
            </Strong>{' '}
            {entry.desc}
          </Paragraph>
        ))}
      </Column>
    </Section>
  );
}
