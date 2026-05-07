import type { FlexProps } from '@radix-ui/themes';
import { Flex } from '@radix-ui/themes';

export type RowProps = Omit<FlexProps, 'direction'>;

export function Row(props: Readonly<RowProps>) {
  // nine times out of ten we use it centered, so set it as a default
  return <Flex align="center" {...props} direction="row" />;
}
