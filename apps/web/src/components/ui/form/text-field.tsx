import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { IconButton, TextField as RadixTextField } from '@radix-ui/themes';
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react';
import { useState } from 'react';

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
  type,
  ...props
}: Readonly<TextFieldProps>) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  // A password field swaps to a plain text input while revealed.
  const resolvedType = isPassword && revealed ? 'text' : type;

  return (
    <FieldWrapper error={error} helpText={helpText} id={id} label={label}>
      {({ id: fieldId, describedBy, invalid }) => (
        <RadixTextField.Root
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
          id={fieldId}
          ref={ref}
          {...props}
          {...(resolvedType !== undefined ? { type: resolvedType } : {})}
        >
          {isPassword && (
            <RadixTextField.Slot side="right">
              <IconButton
                aria-label={revealed ? 'Hide password' : 'Show password'}
                onClick={() => {
                  setRevealed((current) => !current);
                }}
                size="1"
                type="button"
                variant="ghost"
              >
                {revealed ? <EyeSlashIcon /> : <EyeIcon />}
              </IconButton>
            </RadixTextField.Slot>
          )}
        </RadixTextField.Root>
      )}
    </FieldWrapper>
  );
}
