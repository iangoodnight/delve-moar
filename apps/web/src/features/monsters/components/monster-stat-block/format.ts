// Pure formatters for the monster stat block. Kept separate so they can be
// unit-tested without rendering React.
import type {
  SrdMonsterArmorClass,
  SrdMonsterProficiency,
  SrdMonsterReference,
  SrdMonsterSenses,
  SrdMonsterSpeed,
} from '@/features/monsters/api';

export function formatModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return `${mod >= 0 ? '+' : ''}${String(mod)}`;
}

export function formatSignedNumber(n: number): string {
  return `${n >= 0 ? '+' : ''}${String(n)}`;
}

export function formatXp(xp: number): string {
  return xp.toLocaleString('en-US');
}

export function formatArmorClass(entries: SrdMonsterArmorClass[]): string {
  return entries
    .map((entry) => {
      const annotations = [entry.type, entry.condition]
        .filter((part): part is string => Boolean(part))
        .join(', ');
      const valueStr = String(entry.value);
      return annotations ? `${valueStr} (${annotations})` : valueStr;
    })
    .join(', ');
}

export function formatSpeed(speed: SrdMonsterSpeed): string {
  const parts: string[] = [];
  if (speed.walk) parts.push(speed.walk);
  if (speed.burrow) parts.push(`burrow ${speed.burrow}`);
  if (speed.climb) parts.push(`climb ${speed.climb}`);
  if (speed.fly) {
    parts.push(`fly ${speed.fly}${speed.hover ? ' (hover)' : ''}`);
  }
  if (speed.swim) parts.push(`swim ${speed.swim}`);
  return parts.length > 0 ? parts.join(', ') : '0 ft.';
}

export function formatSenses(senses: SrdMonsterSenses): string {
  const parts: string[] = [];
  if (senses.blindsight) parts.push(`Blindsight ${senses.blindsight}`);
  if (senses.darkvision) parts.push(`Darkvision ${senses.darkvision}`);
  if (senses.tremorsense) parts.push(`Tremorsense ${senses.tremorsense}`);
  if (senses.truesight) parts.push(`Truesight ${senses.truesight}`);
  parts.push(`Passive Perception ${String(senses.passive_perception)}`);
  return parts.join(', ');
}

export function formatReferenceList(refs: SrdMonsterReference[]): string {
  return refs.map((r) => r.name).join(', ');
}

interface PartitionedProficiencies {
  saves: SrdMonsterProficiency[];
  skills: SrdMonsterProficiency[];
}

export function partitionProficiencies(
  profs: SrdMonsterProficiency[],
): PartitionedProficiencies {
  const saves: SrdMonsterProficiency[] = [];
  const skills: SrdMonsterProficiency[] = [];
  for (const p of profs) {
    if (p.proficiency.index.startsWith('saving-throw-')) {
      saves.push(p);
    } else if (p.proficiency.index.startsWith('skill-')) {
      skills.push(p);
    }
  }
  return { saves, skills };
}

export function formatProficiency(p: SrdMonsterProficiency): string {
  // "Skill: Perception" -> "Perception"; "Saving Throw: DEX" -> "DEX".
  const label = p.proficiency.name.split(': ')[1] ?? p.proficiency.name;
  return `${label} ${formatSignedNumber(p.value)}`;
}

export function formatProficiencyList(profs: SrdMonsterProficiency[]): string {
  return profs.map(formatProficiency).join(', ');
}
