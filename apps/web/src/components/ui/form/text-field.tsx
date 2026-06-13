import { TextField as RadixTextField } from '@radix-ui/themes';
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react';

import { FieldWrapper } from './field-wrapper';

interface TextFieldProps extends Omit<
  ComponentPropsWithoutRef<typeof RadixTextField.Root>,
  'id'
> {
  readonly label: ReactNode;
  readonly error?: string | undefined;
  readonly helpText?: ReactNode;
  readonly id?: string | undefined;
  // React 19 passes ref as a plain prop; spread RHF register()/field onto this.
  readonly ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  error,
  helpText,
  id,
  ref,
  ...props
}: Readonly<TextFieldProps>) {
  return (
    <FieldWrapper label={label} error={error} helpText={helpText} id={id}>
      {({ id: fieldId, describedBy, invalid }) => (
        <RadixTextField.Root
          id={fieldId}
          ref={ref}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
      )}
    </FieldWrapper>
  );
}
