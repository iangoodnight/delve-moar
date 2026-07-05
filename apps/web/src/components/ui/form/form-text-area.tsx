import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { TextArea } from './text-area';

interface FormTextAreaProps extends Omit<
  ComponentPropsWithoutRef<typeof TextArea>,
  'error' | 'name' | 'ref' | 'value' | 'defaultValue'
> {
  readonly name: string;
  readonly label: ReactNode;
}

// react-hook-form-bound textarea. Subscribing to field state here (rather than
// reading formState in the parent render-prop) keeps it reactive under the
// React Compiler, matching FormTextField.
export function FormTextArea({
  name,
  label,
  ...props
}: Readonly<FormTextAreaProps>) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({
    name,
    control,
    defaultValue: '',
  });

  return (
    <TextArea
      label={label}
      {...props}
      {...field}
      error={fieldState.error?.message}
      value={typeof field.value === 'string' ? field.value : ''}
    />
  );
}
