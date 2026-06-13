import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { TextField } from './text-field';

interface FormTextFieldProps extends Omit<
  ComponentPropsWithoutRef<typeof TextField>,
  'error' | 'name' | 'ref' | 'value' | 'defaultValue'
> {
  readonly name: string;
  readonly label: ReactNode;
}

// react-hook-form-bound text field. Subscribing to field state here (rather
// than reading formState in the parent render-prop) is what keeps it
// reactive under the React Compiler: useController re-renders this component
// when its own value or error changes.
export function FormTextField({
  name,
  label,
  ...props
}: Readonly<FormTextFieldProps>) {
  const { control } = useFormContext();
  // defaultValue '' makes this a controlled-from-empty string field, so the
  // schema validates '' (its own rules) rather than tripping on undefined.
  const { field, fieldState } = useController({
    name,
    control,
    defaultValue: '',
  });

  return (
    <TextField
      label={label}
      {...props}
      {...field}
      // Coerce to a controlled string value (RHF seeds undefined when no
      // defaultValue is set, which React rejects on a controlled input).
      value={typeof field.value === 'string' ? field.value : ''}
      error={fieldState.error?.message}
    />
  );
}
