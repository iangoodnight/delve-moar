import { TextArea as RadixTextArea } from '@radix-ui/themes';
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react';

import { FieldWrapper } from './field-wrapper';

interface TextAreaProps extends Omit<
  ComponentPropsWithoutRef<typeof RadixTextArea>,
  'id'
> {
  readonly label: ReactNode;
  readonly error?: string | undefined;
  readonly helpText?: ReactNode;
  readonly id?: string | undefined;
  // React 19 passes ref as a plain prop; spread RHF register()/field onto this.
  readonly ref?: Ref<HTMLTextAreaElement>;
}

export function TextArea({
  label,
  error,
  helpText,
  id,
  ref,
  ...props
}: Readonly<TextAreaProps>) {
  return (
    <FieldWrapper error={error} helpText={helpText} id={id} label={label}>
      {({ id: fieldId, describedBy, invalid }) => (
        <RadixTextArea
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
          id={fieldId}
          ref={ref}
          {...props}
        />
      )}
    </FieldWrapper>
  );
}
