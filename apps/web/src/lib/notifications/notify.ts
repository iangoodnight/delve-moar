import type { ReactNode } from 'react';
import type { ExternalToast } from 'sonner';
import { toast } from 'sonner';

type NotifyOptions = ExternalToast;

// thin seam over sonner so features never import it directly. Presentation
// defaults (position, theme, duration) live on <AppToaster>; per-call options
// pass through here.
export const notify = {
  success: (message: ReactNode, options?: NotifyOptions) =>
    toast.success(message, options),
  error: (message: ReactNode, options?: NotifyOptions) =>
    toast.error(message, options),
  info: (message: ReactNode, options?: NotifyOptions) =>
    toast.info(message, options),
  warning: (message: ReactNode, options?: NotifyOptions) =>
    toast.warning(message, options),
};
