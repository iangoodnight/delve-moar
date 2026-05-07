import { Link as RadixLink } from '@radix-ui/themes';
import type { ComponentProps } from 'react';
import { Link as ReactRouterLink } from 'react-router-dom';

type RouterLinkProps = Omit<
  ComponentProps<typeof ReactRouterLink>,
  'className'
> &
  Pick<
    ComponentProps<typeof RadixLink>,
    'className' | 'color' | 'size' | 'underline' | 'weight'
  >;

export function RouterLink({
  className,
  color,
  size,
  to,
  underline,
  weight,
  ...props
}: Readonly<RouterLinkProps>) {
  const radixProps = {
    ...(className !== undefined && { className }),
    ...(color !== undefined && { color }),
    ...(size !== undefined && { size }),
    ...(underline !== undefined && { underline }),
    ...(weight !== undefined && { weight }),
  };

  return (
    <RadixLink asChild {...radixProps}>
      <ReactRouterLink to={to} {...props} />
    </RadixLink>
  );
}
