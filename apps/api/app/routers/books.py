"""Book endpoints -- content collections (ADR 0014).

CRUD for user-owned books plus read access to the public system books
(the SRD catalog). Reads are scoped to the owner-or-public rule; writes
are owner-only and never touch system books. The campaign-shared read
path arrives with #176/#172.
"""

import uuid
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import InstrumentedAttribute

from app.auth.dependencies import CurrentUser, require_csrf
from app.books_access import readable_books_predicate
from app.config import settings
from app.db import DbSession
from app.dependencies import (
    Pagination,
    SearchFilter,
    ordering_dep,
    search_dep,
)
from app.exceptions import AppError, get_or_404
from app.models import (
    Book,
    BookItem,
    BookMonster,
    BookSpell,
    Item,
    Monster,
    Spell,
    User,
)
from app.schemas.auth import Author
from app.schemas.books import BookCreate, BookDetail, BookSummary, BookUpdate
from app.schemas.errors import ErrorResponse
from app.schemas.items import ItemSummary
from app.schemas.monsters import MonsterSummary
from app.schemas.pagination import PaginatedResultset
from app.schemas.spells import SpellSummary
from app.utils import build_links, fetch_page, paginate

router = APIRouter(prefix="/books", tags=["Books"])

_BOOK_ORDERING = ordering_dep(
    {
        "name": Book.name,
        "created_at": Book.created_at,
        "updated_at": Book.updated_at,
    },
    default="name:asc",
)
BookOrdering = Annotated[list[Any], Depends(_BOOK_ORDERING)]

_BOOK_SEARCH = search_dep([Book.name, Book.description])
BookSearch = Annotated[SearchFilter, Depends(_BOOK_SEARCH)]

# Book-content listing mirrors each SRD list endpoint's search and ordering.
_BOOK_MONSTER_ORDERING = ordering_dep(
    {
        "challenge_rating": Monster.challenge_rating,
        "monster_type": Monster.monster_type,
        "name": Monster.name,
    },
    default="challenge_rating:asc,name:asc",
)
BookMonsterOrdering = Annotated[list[Any], Depends(_BOOK_MONSTER_ORDERING)]
_BOOK_MONSTER_SEARCH = search_dep([Monster.name, Monster.monster_type])
BookMonsterSearch = Annotated[SearchFilter, Depends(_BOOK_MONSTER_SEARCH)]

_BOOK_SPELL_ORDERING = ordering_dep(
    {"level": Spell.level, "name": Spell.name, "school": Spell.school},
    default="level:asc,name:asc",
)
BookSpellOrdering = Annotated[list[Any], Depends(_BOOK_SPELL_ORDERING)]
_BOOK_SPELL_SEARCH = search_dep([Spell.name])
BookSpellSearch = Annotated[SearchFilter, Depends(_BOOK_SPELL_SEARCH)]

_BOOK_ITEM_ORDERING = ordering_dep(
    {
        "item_category": Item.item_category,
        "name": Item.name,
        "rarity": Item.rarity,
    },
    default="item_category:asc,name:asc",
)
BookItemOrdering = Annotated[list[Any], Depends(_BOOK_ITEM_ORDERING)]
_BOOK_ITEM_SEARCH = search_dep([Item.name, Item.item_category])
BookItemSearch = Annotated[SearchFilter, Depends(_BOOK_ITEM_SEARCH)]


def _summary(book: Book, user: User) -> BookSummary:
    """Project a book to its summary, attaching the owner handle if mine."""
    owner = Author(username=user.username) if book.owner_id == user.id else None
    return BookSummary(
        id=book.id,
        name=book.name,
        slug=book.slug,
        description=book.description,
        is_public=book.is_public,
        is_system=book.is_system,
        owner=owner,
        created_at=book.created_at,
        updated_at=book.updated_at,
    )


def _detail(book: Book, user: User, counts: tuple[int, int, int]) -> BookDetail:
    """Project a book to its detail view with per-resource content counts."""
    monsters, spells, items = counts
    return BookDetail(
        **_summary(book, user).model_dump(),
        monster_count=monsters,
        spell_count=spells,
        item_count=items,
    )


async def _content_counts(
    db: DbSession, book_id: uuid.UUID
) -> tuple[int, int, int]:
    """Return the (monster, spell, item) counts for a book."""
    counts: list[int] = []
    for join in (BookMonster, BookSpell, BookItem):
        total = await db.scalar(
            select(func.count())
            .select_from(join)
            .where(join.book_id == book_id)
        )
        counts.append(total or 0)
    return counts[0], counts[1], counts[2]


async def _readable_or_404(
    db: DbSession, book_id: uuid.UUID, user: User
) -> Book:
    """Load a book the user may read (owner or public), else 404.

    Private books the user does not own return 404, not 403, so their
    existence is never revealed.
    """
    book = await db.get(Book, book_id)
    if book is None or not (book.owner_id == user.id or book.is_public):
        return get_or_404(None, resource="book", identifier=str(book_id))
    return book


async def _writable_or_error(
    db: DbSession, book_id: uuid.UUID, user: User
) -> Book:
    """Load a book the user may modify (owns, not a system book).

    404 if not even readable; 403 if readable (e.g. the public SRD book)
    but not the user's to change.
    """
    book = await _readable_or_404(db, book_id, user)
    if book.is_system or book.owner_id != user.id:
        raise AppError(
            status=status.HTTP_403_FORBIDDEN,
            developer_message=f"Book '{book_id}' is not owned by the user.",
            user_message="You can only modify your own books.",
            error_code="FORBIDDEN",
            more_info=f"{settings.public_url}/docs",
        )
    return book


@router.get(
    "",
    response_model=PaginatedResultset[BookSummary],
    summary="List books",
)
async def list_books(
    request: Request,
    db: DbSession,
    user: CurrentUser,
    params: Pagination,
    ordering: BookOrdering,
    search: BookSearch,
    scope: Annotated[
        Literal["all", "owned"],
        Query(
            description=(
                "Which books to include: 'all' (your books plus public "
                "books) or 'owned' (only books you created)."
            ),
        ),
    ] = "all",
) -> PaginatedResultset[BookSummary]:
    """List the user's books, optionally scoped to only the ones they own."""
    if scope == "owned":
        stmt = select(Book).where(Book.owner_id == user.id)
    else:
        stmt = select(Book).where(readable_books_predicate(user))
    if search.where is not None:
        stmt = stmt.where(search.where)
    total, rows = await fetch_page(
        db,
        stmt,
        ordering=[*search.order_priority, *ordering],
        params=params,
    )
    return paginate(
        data=[_summary(book, user) for book in rows],
        total=total,
        params=params,
        links=build_links(request, total, params.offset, params.limit),
    )


@router.post(
    "",
    response_model=BookDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a book",
    dependencies=[Depends(require_csrf)],
)
async def create_book(
    payload: BookCreate, db: DbSession, user: CurrentUser
) -> BookDetail:
    """Create a new, empty book owned by the current user."""
    book = Book(
        owner_id=user.id, name=payload.name, description=payload.description
    )
    db.add(book)
    await db.flush()
    await db.refresh(book)
    await db.commit()
    return _detail(book, user, (0, 0, 0))


@router.get(
    "/{book_id}",
    response_model=BookDetail,
    summary="Get a book",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Book not found",
        },
    },
)
async def get_book(
    book_id: uuid.UUID, db: DbSession, user: CurrentUser
) -> BookDetail:
    """Get a readable book (owner or public) with its content counts."""
    book = await _readable_or_404(db, book_id, user)
    return _detail(book, user, await _content_counts(db, book_id))


@router.patch(
    "/{book_id}",
    response_model=BookDetail,
    summary="Update a book",
    dependencies=[Depends(require_csrf)],
    responses={
        status.HTTP_403_FORBIDDEN: {
            "model": ErrorResponse,
            "description": "Not the book's owner",
        },
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Book not found",
        },
    },
)
async def update_book(
    book_id: uuid.UUID,
    payload: BookUpdate,
    db: DbSession,
    user: CurrentUser,
) -> BookDetail:
    """Update a book's name and/or description (owner-only)."""
    book = await _writable_or_error(db, book_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(book, field, value)
    await db.commit()
    await db.refresh(book)
    return _detail(book, user, await _content_counts(db, book_id))


@router.delete(
    "/{book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a book",
    dependencies=[Depends(require_csrf)],
    responses={
        status.HTTP_403_FORBIDDEN: {
            "model": ErrorResponse,
            "description": "Not the book's owner",
        },
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Book not found",
        },
    },
)
async def delete_book(
    book_id: uuid.UUID, db: DbSession, user: CurrentUser
) -> None:
    """Delete a book and its content memberships (owner-only).

    The owned content itself is untouched; only the collection and its
    join rows are removed.
    """
    book = await _writable_or_error(db, book_id, user)
    await db.delete(book)
    await db.commit()


async def _list_content(
    request: Request,
    db: DbSession,
    book_id: uuid.UUID,
    params: Pagination,
    ordering: list[Any],
    search: SearchFilter,
    content_model: Any,
    join_model: Any,
    join_fk: InstrumentedAttribute[Any],
    summary_cls: type[Any],
) -> PaginatedResultset[Any]:
    """List a book's content of one resource type, paged and filtered."""
    stmt = (
        select(content_model)
        .join(join_model, join_fk == content_model.id)
        .where(join_model.book_id == book_id)
    )
    if search.where is not None:
        stmt = stmt.where(search.where)
    total, rows = await fetch_page(
        db,
        stmt,
        ordering=[*search.order_priority, *ordering],
        params=params,
    )
    return paginate(
        data=[summary_cls.model_validate(row) for row in rows],
        total=total,
        params=params,
        links=build_links(request, total, params.offset, params.limit),
    )


async def _add_content(
    db: DbSession,
    book_id: uuid.UUID,
    content_model: Any,
    join_model: Any,
    join_fk: InstrumentedAttribute[Any],
    content_id: uuid.UUID,
    resource: str,
) -> None:
    """Add a content row to a book (idempotent); 404 if content is missing."""
    get_or_404(
        await db.get(content_model, content_id),
        resource=resource,
        identifier=str(content_id),
    )
    existing = await db.scalar(
        select(join_model).where(
            join_model.book_id == book_id, join_fk == content_id
        )
    )
    if existing is None:
        db.add(join_model(book_id=book_id, **{join_fk.key: content_id}))
        await db.commit()


async def _remove_content(
    db: DbSession,
    book_id: uuid.UUID,
    join_model: Any,
    join_fk: InstrumentedAttribute[Any],
    content_id: uuid.UUID,
) -> None:
    """Remove a content row from a book (idempotent)."""
    existing = await db.scalar(
        select(join_model).where(
            join_model.book_id == book_id, join_fk == content_id
        )
    )
    if existing is not None:
        await db.delete(existing)
        await db.commit()


_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorResponse,
        "description": "Book or content not found",
    },
}
_FORBIDDEN_OR_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorResponse,
        "description": "Not the book's owner",
    },
    **_NOT_FOUND,
}


@router.get(
    "/{book_id}/monsters",
    response_model=PaginatedResultset[MonsterSummary],
    summary="List a book's monsters",
    responses=_NOT_FOUND,
)
async def list_book_monsters(
    book_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: CurrentUser,
    params: Pagination,
    ordering: BookMonsterOrdering,
    search: BookMonsterSearch,
) -> PaginatedResultset[MonsterSummary]:
    """List the monsters in a readable book."""
    await _readable_or_404(db, book_id, user)
    return await _list_content(
        request,
        db,
        book_id,
        params,
        ordering,
        search,
        Monster,
        BookMonster,
        BookMonster.monster_id,
        MonsterSummary,
    )


@router.put(
    "/{book_id}/monsters/{monster_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Add a monster to a book",
    dependencies=[Depends(require_csrf)],
    responses=_FORBIDDEN_OR_NOT_FOUND,
)
async def add_book_monster(
    book_id: uuid.UUID,
    monster_id: uuid.UUID,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Add a monster to a book the user owns (idempotent)."""
    book = await _writable_or_error(db, book_id, user)
    await _add_content(
        db,
        book.id,
        Monster,
        BookMonster,
        BookMonster.monster_id,
        monster_id,
        "monster",
    )


@router.delete(
    "/{book_id}/monsters/{monster_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a monster from a book",
    dependencies=[Depends(require_csrf)],
    responses=_FORBIDDEN_OR_NOT_FOUND,
)
async def remove_book_monster(
    book_id: uuid.UUID,
    monster_id: uuid.UUID,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Remove a monster from a book the user owns (idempotent)."""
    book = await _writable_or_error(db, book_id, user)
    await _remove_content(
        db, book.id, BookMonster, BookMonster.monster_id, monster_id
    )


@router.get(
    "/{book_id}/spells",
    response_model=PaginatedResultset[SpellSummary],
    summary="List a book's spells",
    responses=_NOT_FOUND,
)
async def list_book_spells(
    book_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: CurrentUser,
    params: Pagination,
    ordering: BookSpellOrdering,
    search: BookSpellSearch,
) -> PaginatedResultset[SpellSummary]:
    """List the spells in a readable book."""
    await _readable_or_404(db, book_id, user)
    return await _list_content(
        request,
        db,
        book_id,
        params,
        ordering,
        search,
        Spell,
        BookSpell,
        BookSpell.spell_id,
        SpellSummary,
    )


@router.put(
    "/{book_id}/spells/{spell_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Add a spell to a book",
    dependencies=[Depends(require_csrf)],
    responses=_FORBIDDEN_OR_NOT_FOUND,
)
async def add_book_spell(
    book_id: uuid.UUID,
    spell_id: uuid.UUID,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Add a spell to a book the user owns (idempotent)."""
    book = await _writable_or_error(db, book_id, user)
    await _add_content(
        db, book.id, Spell, BookSpell, BookSpell.spell_id, spell_id, "spell"
    )


@router.delete(
    "/{book_id}/spells/{spell_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a spell from a book",
    dependencies=[Depends(require_csrf)],
    responses=_FORBIDDEN_OR_NOT_FOUND,
)
async def remove_book_spell(
    book_id: uuid.UUID,
    spell_id: uuid.UUID,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Remove a spell from a book the user owns (idempotent)."""
    book = await _writable_or_error(db, book_id, user)
    await _remove_content(db, book.id, BookSpell, BookSpell.spell_id, spell_id)


@router.get(
    "/{book_id}/items",
    response_model=PaginatedResultset[ItemSummary],
    summary="List a book's items",
    responses=_NOT_FOUND,
)
async def list_book_items(
    book_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: CurrentUser,
    params: Pagination,
    ordering: BookItemOrdering,
    search: BookItemSearch,
) -> PaginatedResultset[ItemSummary]:
    """List the items in a readable book."""
    await _readable_or_404(db, book_id, user)
    return await _list_content(
        request,
        db,
        book_id,
        params,
        ordering,
        search,
        Item,
        BookItem,
        BookItem.item_id,
        ItemSummary,
    )


@router.put(
    "/{book_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Add an item to a book",
    dependencies=[Depends(require_csrf)],
    responses=_FORBIDDEN_OR_NOT_FOUND,
)
async def add_book_item(
    book_id: uuid.UUID,
    item_id: uuid.UUID,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Add an item to a book the user owns (idempotent)."""
    book = await _writable_or_error(db, book_id, user)
    await _add_content(
        db, book.id, Item, BookItem, BookItem.item_id, item_id, "item"
    )


@router.delete(
    "/{book_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an item from a book",
    dependencies=[Depends(require_csrf)],
    responses=_FORBIDDEN_OR_NOT_FOUND,
)
async def remove_book_item(
    book_id: uuid.UUID,
    item_id: uuid.UUID,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Remove an item from a book the user owns (idempotent)."""
    book = await _writable_or_error(db, book_id, user)
    await _remove_content(db, book.id, BookItem, BookItem.item_id, item_id)
