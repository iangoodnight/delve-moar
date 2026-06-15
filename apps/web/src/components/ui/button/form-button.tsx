import type { ButtonProps } from '@radix-ui/themes';
import { Button, Spinner } from '@radix-ui/themes';
import type { ReactNode, Ref } from 'react';

import { Row } from '@/components/ui/layout';
import { classNames } from '@/utils/style/class-names';

import styles from './form-button.module.css';

interface FormButtonProps extends ButtonProps {
  readonly icon?: ReactNode;
  readonly iconRight?: boolean;
  readonly ref?: Ref<HTMLButtonElement>;
}

export function FormButton({
  children,
  className,
  disabled,
  icon,
  iconRight = false,
  loading = false,
  ref,
  ...props
}: Readonly<FormButtonProps>) {
  const classNamesList = [styles['form-button'], className];

  const hasIcon = icon !== undefined;

  const renderedIcon = hasIcon ? (
    <Spinner loading={loading}>{icon}</Spinner>
  ) : null;

  return (
    <Button
      className={classNames(...classNamesList)}
      disabled={loading || disabled}
      loading={!hasIcon && loading}
      ref={ref}
      size="3"
      type="submit"
      variant="solid"
      {...props}
    >
      <Row align="center" gap="2" px="2">
        {!iconRight && renderedIcon}
        {children}
        {iconRight && renderedIcon}
      </Row>
    </Button>
  );
}
