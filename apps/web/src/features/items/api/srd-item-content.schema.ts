// Zod schema for the SRD item `content` JSON blob.
//
// Items are heterogeneous: mundane equipment (weapons, armor, tools, ...)
// and magic items share one table, and the SRD payload carries different
// fields per kind. The schema covers the union of fields the item detail UI
// consumes; everything else passes through via looseObject so future SRD
// additions do not reject items wholesale.
import * as z from 'zod';

const referenceSchema = z.looseObject({
  index: z.string(),
  name: z.string(),
  url: z.string().optional(),
});

const costSchema = z.looseObject({
  quantity: z.number(),
  unit: z.string(),
});

const damageSchema = z.looseObject({
  damage_dice: z.string(),
  damage_bonus: z.number().optional(),
  damage_type: referenceSchema,
});

const rangeSchema = z.looseObject({
  normal: z.number(),
  // Melee weapons omit `long` entirely; ranged / thrown weapons set it to a
  // number. Accept both undefined and null defensively.
  long: z.number().nullable().optional(),
});

const armorClassSchema = z.looseObject({
  base: z.number(),
  dex_bonus: z.boolean(),
  max_bonus: z.number().nullable(),
});

export const srdItemContentSchema = z.looseObject({
  // Identity (redundant with top-level ItemDetail fields, included for completeness)
  name: z.string(),

  // Description (often empty for simple equipment)
  desc: z.array(z.string()).optional(),

  // Common equipment fields
  cost: costSchema.optional(),
  weight: z.number().optional(),

  // Weapon
  weapon_category: z.string().optional(),
  weapon_range: z.string().optional(),
  damage: damageSchema.optional(),
  two_handed_damage: damageSchema.optional(),
  properties: z.array(referenceSchema).optional(),
  range: rangeSchema.optional(),

  // Armor
  armor_category: z.string().optional(),
  armor_class: armorClassSchema.optional(),
  str_minimum: z.number().optional(),
  stealth_disadvantage: z.boolean().optional(),

  // Magic item
  requires_attunement: z.string().optional(),
});

export type SrdItemContent = z.infer<typeof srdItemContentSchema>;
export type SrdItemReference = z.infer<typeof referenceSchema>;
