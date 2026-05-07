import type { VisuallyHiddenProps } from '@radix-ui/themes';
import { VisuallyHidden } from '@radix-ui/themes';

interface ConditionallyHiddenProps extends Readonly<VisuallyHiddenProps> {
  readonly isHidden: boolean;
}

export function ConditionallyHidden({
  children,
  isHidden,
}: ConditionallyHiddenProps) {
  if (isHidden) {
    return <VisuallyHidden>{children}</VisuallyHidden>;
  }

  return <>{children}</>;
}
