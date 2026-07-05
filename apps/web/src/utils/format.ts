// Shared string formatters. Kept pure and feature-agnostic so any feature can
// render SRD values consistently (the item taxonomy labels live in
// src/constants; these are the transforms).

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// The API returns spell level as a display string: "Cantrip" or an ordinal
// ("1st", "3rd"). Cantrip stands alone; numbered levels get a "Level" suffix.
export function formatSpellLevel(level: string): string {
  return level === 'Cantrip' ? level : `${level} Level`;
}
