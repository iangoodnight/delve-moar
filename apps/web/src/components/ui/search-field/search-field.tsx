import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { IconButton } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { classNames } from '@/utils/style/class-names';

import styles from './search-field.module.css';

interface SearchFieldProps extends Omit<
  ComponentPropsWithoutRef<typeof TextField.Root>,
  'value' | 'defaultValue' | 'onChange' | 'onSubmit'
> {
  // controlled value; omit (with defaultValue) for an uncontrolled field
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: (value: string) => void;
  // fired on Enter, e.g. to move focus into the results
  readonly onSubmit?: (value: string) => void;
  // overrides the default clear (which empties the field)
  readonly onClear?: () => void;
  // opt in to a global "/" shortcut that focuses this field
  readonly focusOnSlash?: boolean;
  readonly ref?: Ref<HTMLInputElement>;
}

function isTypingTarget(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    element.isContentEditable
  );
}

// see the Design System > SearchField doc for usage guidance
export function SearchField({
  value,
  defaultValue,
  onChange,
  onSubmit,
  onClear,
  focusOnSlash = false,
  className,
  onKeyDown,
  ref,
  ...props
}: Readonly<SearchFieldProps>) {
  const innerRef = useRef<HTMLInputElement>(null);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const currentValue = value ?? uncontrolled;

  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const setValue = (next: string) => {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  };

  const clear = () => {
    if (onClear) {
      onClear();
      return;
    }
    setValue('');
    innerRef.current?.focus();
  };

  useEffect(() => {
    if (!focusOnSlash) return;
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTypingTarget(document.activeElement)) return;
      event.preventDefault();
      innerRef.current?.focus();
    };
    document.addEventListener('keydown', onGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', onGlobalKeyDown);
    };
  }, [focusOnSlash]);

  return (
    <TextField.Root
      {...props}
      className={classNames(styles['root'], className)}
      onChange={(event) => {
        setValue(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onSubmit?.(currentValue);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          clear();
        }
        onKeyDown?.(event);
      }}
      ref={setRef}
      type="search"
      value={currentValue}
    >
      <TextField.Slot side="left">
        <MagnifyingGlassIcon
          aria-hidden="true"
          className={styles['search-icon']}
        />
      </TextField.Slot>
      {currentValue.length > 0 && (
        <TextField.Slot side="right">
          <IconButton
            aria-label="Clear search"
            className={styles['clear']}
            color="red"
            onClick={clear}
            radius="full"
            size="1"
            type="button"
            variant="ghost"
          >
            <XIcon aria-hidden="true" />
          </IconButton>
        </TextField.Slot>
      )}
    </TextField.Root>
  );
}
