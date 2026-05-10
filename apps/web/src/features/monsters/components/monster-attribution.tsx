import { Text } from '@/components/ui/typography';
import type { SrdContentSource } from '@/features/monsters/api';

interface MonsterAttributionProps {
  readonly contentSource: SrdContentSource;
}

export function MonsterAttribution({ contentSource }: MonsterAttributionProps) {
  return (
    <Text as="p" color="gray" size="1">
      Content from {contentSource.attribution},{' '}
      <a href={contentSource.license_url} rel="noreferrer" target="_blank">
        {contentSource.license}
      </a>
      . Data compiled by{' '}
      <a
        href={contentSource.data_provider_url}
        rel="noreferrer"
        target="_blank"
      >
        {contentSource.data_provider}
      </a>
      .
    </Text>
  );
}
