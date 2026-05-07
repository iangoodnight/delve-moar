import type { FlexProps } from '@radix-ui/themes';
import { Flex } from '@radix-ui/themes';

export type ColumnProps = Omit<FlexProps, 'direction'>;

export function Column(props: Readonly<ColumnProps>) {
  return <Flex {...props} direction="column" />;
}
