// Zod schema for the SRD spell `content` JSON blob.
//
// The API stores spell content as opaque JSON (typed as
// `{ [key: string]: unknown }` in the OpenAPI spec). The shape comes from
// dnd5eapi.co / 5e-bits/5e-database. This schema validates the fields the
// spell detail UI consumes; everything else passes through via looseObject so
// future SRD additions do not reject spells wholesale.
import * as z from 'zod';

const referenceSchema = z.looseObject({
  index: z.string(),
  name: z.string(),
  url: z.string().optional(),
});

export const srdSpellContentSchema = z.looseObject({
  // Identity (redundant with top-level SpellDetail fields, included for completeness)
  name: z.string(),
  level: z.number().int(),
  school: referenceSchema,

  // Casting
  casting_time: z.string(),
  range: z.string(),
  components: z.array(z.string()),
  material: z.string().optional(),
  duration: z.string(),
  concentration: z.boolean(),
  ritual: z.boolean().optional(),

  // Description
  desc: z.array(z.string()),
  higher_level: z.array(z.string()).optional(),

  // Caster classes
  classes: z.array(referenceSchema).optional(),
});

export type SrdSpellContent = z.infer<typeof srdSpellContentSchema>;
export type SrdSpellReference = z.infer<typeof referenceSchema>;
