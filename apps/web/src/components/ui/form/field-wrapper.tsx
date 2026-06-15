import { ArrowRightIcon, ProhibitIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useId } from 'react';

import { Column } from '@/components/ui/layout';
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
    <Column
      className={styles['field-wrapper']}
      data-invalid={hasError ? '' : undefined}
    >
      <Label className={styles['label']} htmlFor={fieldId} size="2">
        <span aria-hidden="true" className={styles['icon-slot']}>
          <ArrowRightIcon
            className={classNames(styles['icon'], styles['icon-focus'])}
            weight="bold"
          />
          <ProhibitIcon
            className={classNames(styles['icon'], styles['icon-error'])}
            weight="bold"
          />
        </span>
        {label}
      </Label>
      {children({
        id: fieldId,
        describedBy: hasMessage ? messageId : undefined,
        invalid: hasError,
      })}
      <div className={styles['message']} id={messageId}>
        {hasError ? (
          <Text color="red" role="alert" size="1">
            {error}
          </Text>
        ) : helpText !== undefined ? (
          <Text
            className={classNames('text-muted', styles['help-text'])}
            size="1"
          >
            {helpText}
          </Text>
        ) : (
          // Hold exactly one line so swapping in an error never shifts layout.
          <Text aria-hidden="true" size="1">
            {' '}
          </Text>
        )}
      </div>
    </Column>
  );
}
