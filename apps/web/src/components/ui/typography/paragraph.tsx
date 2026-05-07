import type { TextProps as RadixTextProps } from '@radix-ui/themes';
import { Text as RadixText } from '@radix-ui/themes';

import { classNames } from '@/utils/style/class-names';

export type ParagraphProps = Readonly<
  Omit<Extract<RadixTextProps, { as: 'p' }>, 'as'>
>;

export function Paragraph({ className, ...rest }: ParagraphProps) {
  return (
    <RadixText
      as="p"
      size="3"
      className={classNames('paragraph', className)}
      {...rest}
    />
  );
}
