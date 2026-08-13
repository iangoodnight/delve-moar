import { z } from 'zod';

// Mirror the server's rules (apps/api/app/schemas/book.py) for fast client
// feedback. The server stays the source of truth.
export const BOOK_NAME_MAX_LENGTH = 255;
export const BOOK_DESCRIPTION_MAX_LENGTH = 2_000;

export const bookFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name.')
    .max(
      BOOK_NAME_MAX_LENGTH,
      `Use at most ${String(BOOK_NAME_MAX_LENGTH)} characters.`,
    ),
  description: z
    .string()
    .trim()
    .max(
      BOOK_DESCRIPTION_MAX_LENGTH,
      `Use at most ${String(BOOK_DESCRIPTION_MAX_LENGTH)} characters.`,
    ),
});
export type BookFormValues = z.infer<typeof bookFormSchema>;
