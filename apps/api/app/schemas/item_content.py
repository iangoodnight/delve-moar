"""Pydantic models for SRD item content payload.

The `content` JSONB column on the `items` table is heterogeneous: mundane
equipment (weapons, armor, gear, tools) and magic items share one table,
with non-overlapping field sets per kind. The schema below covers the
union of fields the detail UI consumes. Everything past `name` is
optional; the renderer picks the subset that applies based on which
fields are populated.

ContentBase carries `extra='allow'` so unknown SRD fields (e.g.
`equipment_category`, `category_range`, `throw_range`, `special`,
`contents`) pass through silently — they just aren't part of the typed
contract.

A discriminated union (`weapon | armor | gear | wondrous-item | ...`)
sharpens the FE types but requires Pydantic's callable-discriminator
pattern because the SRD discriminator (`equipment_category.index`) is
nested. Deferred to a follow-up; the optional-everything shape below
matches what the FE Zod did pre-#124.
"""

from app.schemas.content_base import ContentBase


class Reference(ContentBase):
    """An SRD reference link (weapon property, damage type, ...)."""

    index: str
    name: str
    url: str | None = None


class Cost(ContentBase):
    """Item cost as a quantity + currency unit (gp, sp, cp, pp, ep)."""

    quantity: float
    unit: str


class Damage(ContentBase):
    """Weapon damage roll (dice + optional flat bonus + damage type)."""

    damage_dice: str
    damage_bonus: int | None = None
    damage_type: Reference


class Range(ContentBase):
    """Weapon range in feet. `long` is omitted on melee weapons."""

    normal: float
    long: float | None = None


class ArmorClass(ContentBase):
    """Armor's base AC plus Dex-bonus rules."""

    base: int
    dex_bonus: bool
    max_bonus: int | None = None


class SrdItemContent(ContentBase):
    """SRD item content payload."""

    name: str
    desc: list[str] | None = None

    # Common equipment
    cost: Cost | None = None
    weight: float | None = None

    # Weapon
    weapon_category: str | None = None
    weapon_range: str | None = None
    damage: Damage | None = None
    two_handed_damage: Damage | None = None
    properties: list[Reference] | None = None
    range: Range | None = None

    # Armor
    armor_category: str | None = None
    armor_class: ArmorClass | None = None
    str_minimum: int | None = None
    stealth_disadvantage: bool | None = None

    # Magic item
    requires_attunement: str | None = None
