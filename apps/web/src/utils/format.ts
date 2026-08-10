// Shared, delve-moar-specific string formatters. Kept pure and feature-agnostic
// so any feature can render SRD values consistently. General-purpose string
// helpers (capitalize, etc.) come from @goodnight-dev/string; the item taxonomy
// labels live in src/constants; these are the domain transforms.

// The API returns spell level as a display string: "Cantrip" or an ordinal
// ("1st", "3rd"). Cantrip stands alone; numbered levels get a "Level" suffix.
export function formatSpellLevel(level: string): string {
  return level === 'Cantrip' ? level : `${level} Level`;
}
