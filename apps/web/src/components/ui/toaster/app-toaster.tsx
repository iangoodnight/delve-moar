import {
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { Toaster } from 'sonner';

import { classNames } from '@/utils/style/class-names';

import styles from './app-toaster.module.css';

const ICON_SIZE = 20;

// app-wide toast presentation. Mount inside <Theme> so the Radix tokens the
// CSS module references are in scope. notify (lib/notifications) is the seam
// callers use to raise toasts. Phosphor icons keep the iconography consistent
// with the rest of the app; they inherit the per-type color via .icon.
export function AppToaster() {
  return (
    <Toaster
      icons={{
        success: <CheckCircleIcon aria-hidden size={ICON_SIZE} />,
        error: <XCircleIcon aria-hidden size={ICON_SIZE} />,
        info: <InfoIcon aria-hidden size={ICON_SIZE} />,
        warning: <WarningIcon aria-hidden size={ICON_SIZE} />,
      }}
      position="bottom-right"
      theme="system"
      toastOptions={{
        classNames: {
          error: classNames(styles['error']),
          icon: classNames(styles['icon']),
          info: classNames(styles['info']),
          success: classNames(styles['success']),
          title: classNames(styles['title']),
          toast: classNames(styles['toast']),
          warning: classNames(styles['warning']),
        },
      }}
    />
  );
}
