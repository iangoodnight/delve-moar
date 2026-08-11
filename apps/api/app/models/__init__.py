"""ORM model registry.

Importing this package registers all models with ``Base.metadata``,
which is required for Alembic autogenerate and runtime schema awareness.
"""

from app.models.book import Book, BookItem, BookMonster, BookSpell
from app.models.campaign import Campaign, CampaignBook, CampaignMember
from app.models.email_token import EmailToken, EmailTokenPurpose
from app.models.item import Item
from app.models.monster import Monster
from app.models.session import Session
from app.models.spell import Spell
from app.models.user import User

__all__ = [
    "Book",
    "BookItem",
    "BookMonster",
    "BookSpell",
    "Campaign",
    "CampaignBook",
    "CampaignMember",
    "EmailToken",
    "EmailTokenPurpose",
    "Item",
    "Monster",
    "Session",
    "Spell",
    "User",
]
