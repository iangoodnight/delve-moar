import { InfoIcon } from '@phosphor-icons/react';
import { Popover } from '@radix-ui/themes';

import { IconButton } from '@/components/ui/button';

export type InfoPopoverProps = Popover.ContentProps;

export function InfoPopover(props: InfoPopoverProps) {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <IconButton aria-label="Info" radius="full" size="2" variant="ghost">
          <InfoIcon aria-hidden size={18} />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content {...props} />
    </Popover.Root>
  );
}
