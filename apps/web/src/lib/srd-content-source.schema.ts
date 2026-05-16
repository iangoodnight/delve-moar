// Zod schema for the SRD `contentSource` JSON blob.
//
// Monsters, spells, and items all ship the same shape from the seed pipeline.
// Lives in lib so any feature can import it without crossing boundaries.
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
