"""Pydantic models for SRD spell content payload.

Flatter shape than monsters or items — spells carry a single block of
metadata (casting time, range, components, duration, concentration,
ritual flag, classes) plus a multi-paragraph description and an
optional `higher_level` array. No nested action-shaped entries.

ContentBase carries `extra='allow'` for any future SRD additions
(area_of_effect, attack_type, dc, damage, healing, ...) that the
detail UI doesn't render today.
"""

from app.schemas.content_base import ContentBase
from app.schemas.srd_reference import SrdReference


class SrdSpellContent(ContentBase):
    """SRD spell content payload."""

    # Identity (also surfaced as top-level SpellDetail fields).
    name: str
    level: int
    school: SrdReference

    # Casting
    casting_time: str
    range: str
    components: list[str]
    material: str | None = None
    duration: str
    concentration: bool
    ritual: bool | None = None

    # Description
    desc: list[str]
    higher_level: list[str] | None = None

    # Caster classes
    classes: list[SrdReference] | None = None
