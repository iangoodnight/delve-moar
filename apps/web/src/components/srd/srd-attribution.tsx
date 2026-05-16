import { Text } from '@/components/ui/typography';
import type { SrdContentSource } from '@/lib/srd-content-source.schema';

interface SrdAttributionProps {
  readonly contentSource: SrdContentSource;
}

export function SrdAttribution({ contentSource }: SrdAttributionProps) {
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
