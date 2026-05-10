// Zod schema for the SRD `contentSource` JSON blob.
//
// The same shape ships with monsters, spells, and items (the seed pipeline
// uses one constant); this schema is feature-local for now and would lift to
// a shared layer when items/spells need it in #48 / #49.
import * as z from 'zod';

export const srdContentSourceSchema = z.looseObject({
  type: z.string(),
  license: z.string(),
  license_url: z.string(),
  attribution: z.string(),
  data_provider: z.string(),
  data_provider_url: z.string(),
});

export type SrdContentSource = z.infer<typeof srdContentSourceSchema>;
