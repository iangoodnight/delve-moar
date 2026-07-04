"""Request and response schemas for account self-service (#280)."""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.auth import UserResponse
from app.schemas.base import AppSchema


class AccountDeleteRequest(AppSchema):
    """Payload to delete the current account.

    The current password is required as a re-authentication step, so a
    stolen session alone cannot destroy the account. Deletion is
    irreversible.
    """

    password: str = Field(
        min_length=1,
        max_length=128,
        description="The account's current password, for re-authentication.",
    )


class AccountExportBook(AppSchema):
    """One of the user's owned books, with its content membership ids.

    Content is referenced by id rather than inlined: the export is a record
    of what the user has collected, not a copy of the SRD catalog.
    """

    id: uuid.UUID = Field(description="Unique identifier for the book.")
    name: str = Field(description="Display name of the book.")
    slug: str | None = Field(
        description="Stable handle for system books; null for user books."
    )
    description: str | None = Field(description="Longer description, if any.")
    is_public: bool = Field(
        description="Whether the book is readable by anyone."
    )
    is_system: bool = Field(
        description="Whether this is a read-only system book."
    )
    created_at: datetime = Field(description="When the book was created.")
    updated_at: datetime = Field(description="When the book was last updated.")
    monster_ids: list[uuid.UUID] = Field(
        description="Ids of the monsters collected in this book."
    )
    spell_ids: list[uuid.UUID] = Field(
        description="Ids of the spells collected in this book."
    )
    item_ids: list[uuid.UUID] = Field(
        description="Ids of the items collected in this book."
    )


class AccountExport(AppSchema):
    """A portable copy of everything stored for the current account."""

    exported_at: datetime = Field(description="When this export was generated.")
    account: UserResponse = Field(
        description="The account record (the owner's own view)."
    )
    books: list[AccountExportBook] = Field(
        description="The books the account owns, with their content ids."
    )
