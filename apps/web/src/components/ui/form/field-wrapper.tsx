import { ArrowRightIcon, ProhibitIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useId } from 'react';

import { Label, Text } from '@/components/ui/typography';
import { classNames } from '@/utils/style/class-names';

import styles from './field-wrapper.module.css';

interface FieldRenderProps {
  readonly id: string;
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
}

interface FieldWrapperProps {
  readonly label: ReactNode;
  readonly error?: string | undefined;
  readonly helpText?: ReactNode;
  readonly id?: string | undefined;
  // Render-prop: wires the wrapper's id / aria-describedby / invalid state
  // onto the control (Radix input, textarea, custom), keeping aria ownership
  // in one place so any control composes the same way.
  readonly children: (field: Readonly<FieldRenderProps>) => ReactNode;
}

export function FieldWrapper({
  label,
  error,
  helpText,
  id,
  children,
}: Readonly<FieldWrapperProps>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const hasError = error !== undefined;
  const hasMessage = hasError || helpText !== undefined;

  return (
    <div
      className={styles['field-wrapper']}
      data-invalid={hasError ? '' : undefined}
    >
      <Label htmlFor={fieldId} size="2" className={styles['label']}>
        <span className={styles['icon-slot']} aria-hidden="true">
          <ArrowRightIcon
            weight="bold"
            className={classNames(styles['icon'], styles['icon-focus'])}
          />
          <ProhibitIcon
            weight="bold"
            className={classNames(styles['icon'], styles['icon-error'])}
          />
        </span>
        {label}
      </Label>
      {children({
        id: fieldId,
        describedBy: hasMessage ? messageId : undefined,
        invalid: hasError,
      })}
      <div id={messageId} className={styles['message']}>
        {hasError ? (
          <Text role="alert" size="1" color="red">
            {error}
          </Text>
        ) : helpText !== undefined ? (
          <Text
            size="1"
            className={classNames('text-muted', styles['help-text'])}
          >
            {helpText}
          </Text>
        ) : (
          // Hold exactly one line so swapping in an error never shifts layout.
          <Text size="1" aria-hidden="true">
            {' '}
          </Text>
        )}
      </div>
    </div>
  );
}
