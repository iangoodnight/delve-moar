import type { ReactNode } from 'react';
import { useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import type { z } from 'zod';

import { FormButton } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { FormMethods } from '@/components/ui/form';
import { Form } from '@/components/ui/form';
import { Column, Row } from '@/components/ui/layout';
import { Tooltip } from '@/components/ui/tooltip';

interface FormDialogProps<
  TOutput extends FieldValues,
  TInput extends FieldValues,
> {
  readonly trigger: ReactNode;
  readonly triggerTooltip?: string | undefined;
  readonly title: ReactNode;
  readonly description: ReactNode;
  readonly schema: z.ZodType<TOutput, TInput>;
  // wire the mutation here and call close() in its onSuccess; field-bound
  // errors stay inline via methods.setError, so the dialog holds open on them.
  readonly onSubmit: (
    values: TOutput,
    methods: FormMethods<TOutput, TInput>,
    close: () => void,
  ) => void;
  // just the fields; the primitive owns the field column and the footer.
  readonly children: (methods: FormMethods<TOutput, TInput>) => ReactNode;
  readonly submitLabel: ReactNode;
  readonly submitIcon?: ReactNode;
  readonly submitting?: boolean;
}

// see the Design System > Dialogs doc for usage guidance
export function FormDialog<
  TOutput extends FieldValues,
  TInput extends FieldValues,
>({
  trigger,
  triggerTooltip,
  title,
  description,
  schema,
  onSubmit,
  children,
  submitLabel,
  submitIcon,
  submitting = false,
}: Readonly<FormDialogProps<TOutput, TInput>>) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      {triggerTooltip === undefined ? (
        <Dialog.Trigger>{trigger}</Dialog.Trigger>
      ) : (
        <Tooltip content={triggerTooltip}>
          <Dialog.Trigger>{trigger}</Dialog.Trigger>
        </Tooltip>
      )}
      <Dialog.Content>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description size="2">{description}</Dialog.Description>
        <Form
          onSubmit={(values, methods) => {
            onSubmit(values, methods, close);
          }}
          schema={schema}
        >
          {(methods) => (
            <Column gap="2" mt="4">
              {children(methods)}
              <Row gap="3" justify="end" mt="2" wrap="wrap-reverse">
                <Dialog.Close>
                  <FormButton color="red" type="button" variant="soft">
                    Cancel
                  </FormButton>
                </Dialog.Close>
                <FormButton icon={submitIcon} loading={submitting}>
                  {submitLabel}
                </FormButton>
              </Row>
            </Column>
          )}
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
