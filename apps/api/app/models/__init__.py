"""ORM model registry.

Importing this package registers all models with ``Base.metadata``,
which is required for Alembic autogenerate and runtime schema awareness.
"""

from app.models.campaign import Campaign
from app.models.item import Item
from app.models.monster import Monster
from app.models.session import Session
from app.models.spell import Spell
from app.models.user import User

__all__ = ["Campaign", "Item", "Monster", "Session", "Spell", "User"]
