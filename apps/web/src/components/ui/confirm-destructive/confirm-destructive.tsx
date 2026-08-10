import { WarningIcon } from '@phosphor-icons/react';
import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { AlertDialog } from '@/components/ui/dialog';
import { Row } from '@/components/ui/layout';
import { Tooltip } from '@/components/ui/tooltip';

type ContentProps = ComponentProps<typeof AlertDialog.Content>;

interface ConfirmDestructiveProps extends Omit<
  ContentProps,
  'title' | 'children'
> {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  // omit for list-driven dialogs opened from an external control.
  readonly trigger?: ReactNode;
  readonly triggerTooltip?: string;
  readonly title: ReactNode;
  readonly description: ReactNode;
  // extra body above the actions, e.g. a re-auth password field.
  readonly children?: ReactNode;
  readonly confirmText: ReactNode;
  readonly confirmLoading?: boolean;
  readonly onConfirm?: () => void;
  readonly formId?: string;
}

export function ConfirmDestructive({
  open,
  onOpenChange,
  trigger,
  triggerTooltip,
  title,
  description,
  children,
  confirmText,
  confirmLoading = false,
  onConfirm,
  formId,
  ...props
}: Readonly<ConfirmDestructiveProps>) {
  return (
    <AlertDialog.Root onOpenChange={onOpenChange} open={open}>
      {trigger !== undefined &&
        (triggerTooltip === undefined ? (
          <AlertDialog.Trigger>{trigger}</AlertDialog.Trigger>
        ) : (
          <Tooltip content={triggerTooltip}>
            <AlertDialog.Trigger>{trigger}</AlertDialog.Trigger>
          </Tooltip>
        ))}
      <AlertDialog.Content
        minWidth={{ initial: '28rem', xs: '32rem' }}
        {...props}
      >
        <AlertDialog.Title color="red">
          <Row align="center" gap="2">
            <WarningIcon aria-hidden="true" weight="bold" />
            {title}
          </Row>
        </AlertDialog.Title>
        <AlertDialog.Description size="2">
          {description}
        </AlertDialog.Description>
        {children}
        <Row gap="3" justify="end" mt="4" wrap="wrap-reverse">
          <AlertDialog.Cancel>
            <Button color="red" type="button" variant="soft">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          {formId === undefined ? (
            <Button
              color="red"
              loading={confirmLoading}
              onClick={onConfirm}
              type="button"
            >
              {confirmText}
            </Button>
          ) : (
            <Button
              color="red"
              form={formId}
              loading={confirmLoading}
              type="submit"
            >
              {confirmText}
            </Button>
          )}
        </Row>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
