// Zod schema for the SRD monster `content` JSON blob.
//
// The API stores monster content as opaque JSON (typed as
// `{ [key: string]: unknown }` in the OpenAPI spec). The shape comes from
// dnd5eapi.co / 5e-bits/5e-database. This schema validates the fields the
// stat-block UI consumes; everything else passes through via looseObject so
// future SRD additions or upstream renames do not reject monsters wholesale.
//
// If validation fails on an SRD-seeded monster, the seed pipeline likely
// drifted; surface a friendly error rather than rendering broken stats.
import * as z from 'zod';

const referenceSchema = z.looseObject({
  index: z.string(),
  name: z.string(),
  url: z.string().optional(),
});

const armorClassEntrySchema = z.looseObject({
  type: z.string(),
  value: z.number(),
  condition: z.string().optional(),
});

const speedSchema = z.looseObject({
  walk: z.string().optional(),
  fly: z.string().optional(),
  swim: z.string().optional(),
  climb: z.string().optional(),
  burrow: z.string().optional(),
  hover: z.boolean().optional(),
});

const sensesSchema = z.looseObject({
  passive_perception: z.number(),
  blindsight: z.string().optional(),
  darkvision: z.string().optional(),
  tremorsense: z.string().optional(),
  truesight: z.string().optional(),
});

const proficiencySchema = z.looseObject({
  value: z.number(),
  proficiency: referenceSchema,
});

// Action-shaped entries: actions, special_abilities, legendary_actions,
// reactions. We only render `name` + `desc`; the rest (damage, dc, usage,
// attack_bonus, ...) flows through unmodified.
const actionEntrySchema = z.looseObject({
  name: z.string(),
  desc: z.string(),
});

const abilityScore = z.number().int();

export const srdMonsterContentSchema = z.looseObject({
  // Identity
  name: z.string(),
  size: z.string(),
  type: z.string(),
  alignment: z.string(),

  // Combat stats
  armor_class: z.array(armorClassEntrySchema),
  hit_points: z.number(),
  hit_dice: z.string(),
  hit_points_roll: z.string().optional(),
  speed: speedSchema,

  // Ability scores
  strength: abilityScore,
  dexterity: abilityScore,
  constitution: abilityScore,
  intelligence: abilityScore,
  wisdom: abilityScore,
  charisma: abilityScore,

  // Proficiencies (saving throws + skills, distinguished by `proficiency.index`)
  proficiencies: z.array(proficiencySchema),

  // Damage and conditions
  damage_immunities: z.array(z.string()),
  damage_resistances: z.array(z.string()),
  damage_vulnerabilities: z.array(z.string()),
  condition_immunities: z.array(referenceSchema),

  // Senses, languages, CR, XP
  senses: sensesSchema,
  languages: z.string(),
  challenge_rating: z.number(),
  xp: z.number(),

  // Actions / abilities (always arrays, may be empty)
  actions: z.array(actionEntrySchema),
  special_abilities: z.array(actionEntrySchema),

  // Optional blocks (omitted when the monster has none)
  reactions: z.array(actionEntrySchema).optional(),
  legendary_actions: z.array(actionEntrySchema).optional(),
});

export type SrdMonsterContent = z.infer<typeof srdMonsterContentSchema>;
export type SrdMonsterAction = z.infer<typeof actionEntrySchema>;
export type SrdMonsterArmorClass = z.infer<typeof armorClassEntrySchema>;
export type SrdMonsterProficiency = z.infer<typeof proficiencySchema>;
export type SrdMonsterReference = z.infer<typeof referenceSchema>;
export type SrdMonsterSenses = z.infer<typeof sensesSchema>;
export type SrdMonsterSpeed = z.infer<typeof speedSchema>;
