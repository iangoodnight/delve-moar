import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { notify } from '../notify';

// spy the shared sonner singleton notify delegates to; replacing the module
// won't bind here because the app setup pre-imports notify against real sonner.
describe('notify', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates each level to the matching sonner toast', () => {
    const success = vi.spyOn(toast, 'success').mockReturnValue('');
    const error = vi.spyOn(toast, 'error').mockReturnValue('');
    const info = vi.spyOn(toast, 'info').mockReturnValue('');
    const warning = vi.spyOn(toast, 'warning').mockReturnValue('');

    notify.success('saved');
    notify.error('boom');
    notify.info('heads up');
    notify.warning('careful');

    expect(success).toHaveBeenCalledWith('saved', undefined);
    expect(error).toHaveBeenCalledWith('boom', undefined);
    expect(info).toHaveBeenCalledWith('heads up', undefined);
    expect(warning).toHaveBeenCalledWith('careful', undefined);
  });

  it('forwards per-call options', () => {
    const error = vi.spyOn(toast, 'error').mockReturnValue('');

    notify.error('boom', { duration: 9_000 });

    expect(error).toHaveBeenCalledWith('boom', { duration: 9_000 });
  });
});
