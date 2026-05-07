import type { TextProps } from '@radix-ui/themes';
import { Text } from '@radix-ui/themes';

import { classNames } from '@/utils/style/class-names';

export type LabelProps = TextProps;

export function Label({ className, ...props }: Readonly<LabelProps>) {
  return (
    <Text
      as="label"
      className={classNames('label', className)}
      size="4"
      weight="medium"
      {...props}
    />
  );
}
