import type { HeadingProps } from '@radix-ui/themes';
import { Heading } from '@radix-ui/themes';

import { classNames } from '@/utils/style/class-names';

export function H1({ className, ...rest }: Readonly<HeadingProps>) {
  return <Heading as="h1" className={classNames('h1', className)} {...rest} />;
}

export function H2({ className, ...rest }: Readonly<HeadingProps>) {
  return <Heading as="h2" className={classNames('h2', className)} {...rest} />;
}

export function H3({ className, ...rest }: Readonly<HeadingProps>) {
  return (
    <Heading
      as="h3"
      className={classNames('h3', className)}
      weight="medium"
      {...rest}
    />
  );
}

export function H4({ className, ...rest }: Readonly<HeadingProps>) {
  return (
    <Heading
      as="h4"
      className={classNames('h4', className)}
      weight="medium"
      {...rest}
    />
  );
}

export type { HeadingProps } from '@radix-ui/themes';
export { Heading } from '@radix-ui/themes';
