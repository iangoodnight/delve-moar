"""Pydantic models for SRD monster content payload.

The deepest content shape of the three resources — monsters carry a full
statblock plus action-shaped entries (actions, special abilities,
legendary actions, reactions). Mirrors the FE Zod that lived at
`apps/web/src/features/monsters/api/srd-monster-content.schema.ts`
pre-#124.

ContentBase carries `extra='allow'` so action-entry rest fields (damage,
dc, usage, attack_bonus, ...) and any unmodeled SRD fields (forms,
image, proficiency_bonus on older payloads, updated_at, ...) pass
through without rejecting the row.
"""

from app.schemas.content_base import ContentBase
from app.schemas.srd_reference import SrdReference


class ArmorClassEntry(ContentBase):
    """One element of the AC array (monsters carry multiple AC sources)."""

    type: str
    value: int
    condition: str | None = None


class Speed(ContentBase):
    """Movement speeds. Strings like '40 ft.' verbatim from the SRD."""

    walk: str | None = None
    fly: str | None = None
    swim: str | None = None
    climb: str | None = None
    burrow: str | None = None
    hover: bool | None = None


class Senses(ContentBase):
    """Passive perception (required) plus optional special senses."""

    passive_perception: int
    blindsight: str | None = None
    darkvision: str | None = None
    tremorsense: str | None = None
    truesight: str | None = None


class Proficiency(ContentBase):
    """A saving-throw or skill proficiency; index on `proficiency.index`."""

    value: int
    proficiency: SrdReference


class ActionEntry(ContentBase):
    """An action-shaped entry (actions, special_abilities, reactions, etc.).

    We render `name` + `desc`; everything else (damage, dc, usage,
    attack_bonus, ...) flows through via extra='allow'.
    """

    name: str
    desc: str


class SrdMonsterContent(ContentBase):
    """SRD monster content payload."""

    # Identity
    name: str
    size: str
    type: str
    alignment: str

    # Combat
    armor_class: list[ArmorClassEntry]
    hit_points: int
    hit_dice: str
    hit_points_roll: str | None = None
    speed: Speed

    # Ability scores
    strength: int
    dexterity: int
    constitution: int
    intelligence: int
    wisdom: int
    charisma: int

    # Saving throws + skills, distinguished by `proficiency.index` prefix.
    proficiencies: list[Proficiency]

    # Damage and conditions
    damage_immunities: list[str]
    damage_resistances: list[str]
    damage_vulnerabilities: list[str]
    condition_immunities: list[SrdReference]

    # Senses, languages, CR, XP, proficiency bonus
    senses: Senses
    languages: str
    challenge_rating: float
    xp: int
    proficiency_bonus: int | None = None

    # Action arrays (always present, may be empty)
    actions: list[ActionEntry]
    special_abilities: list[ActionEntry]

    # Optional blocks (omitted when the monster has none)
    reactions: list[ActionEntry] | None = None
    legendary_actions: list[ActionEntry] | None = None
