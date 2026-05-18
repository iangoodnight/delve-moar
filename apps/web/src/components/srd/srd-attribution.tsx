import type { components } from '@delve-moar/api-types';

import { Text } from '@/components/ui/typography';

type ContentSource = components['schemas']['ContentSource'];

interface SrdAttributionProps {
  readonly contentSource: ContentSource;
}

export function SrdAttribution({ contentSource }: SrdAttributionProps) {
  return (
    <Text as="p" color="gray" size="1">
      Content from {contentSource.attribution},{' '}
      <a href={contentSource.licenseUrl} rel="noreferrer" target="_blank">
        {contentSource.license}
      </a>
      . Data compiled by{' '}
      <a href={contentSource.dataProviderUrl} rel="noreferrer" target="_blank">
        {contentSource.dataProvider}
      </a>
      .
    </Text>
  );
}
