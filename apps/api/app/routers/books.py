"""Book endpoints -- content collections (ADR 0014).

CRUD for user-owned books plus read access to the public system books
(the SRD catalog). Reads are scoped to the owner-or-public rule; writes
are owner-only and never touch system books. The campaign-shared read
path arrives with #176/#172.
"""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import func, or_, select

from app.auth.dependencies import CurrentUser, require_csrf
from app.config import settings
from app.db import DbSession
from app.dependencies import (
    Pagination,
    SearchFilter,
    ordering_dep,
    search_dep,
)
from app.exceptions import AppError, get_or_404
from app.models import Book, BookItem, BookMonster, BookSpell, User
from app.schemas.auth import Author
from app.schemas.books import BookCreate, BookDetail, BookSummary, BookUpdate
from app.schemas.errors import ErrorResponse
from app.schemas.pagination import PaginatedResultset
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
) -> PaginatedResultset[BookSummary]:
    """List the user's own books plus the public system books.

    Args:
        request: Current request, used to build pagination links.
        db: Database session.
        user: The authenticated user.
        params: Pagination parameters.
        ordering: SQLAlchemy ordering expressions, injected by dependency.
        search: Parsed search filter over name and description.

    Returns:
        A paginated resultset of book summaries.
    """
    stmt = select(Book).where(
        or_(Book.owner_id == user.id, Book.is_public.is_(True))
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
    """Create a new, empty book owned by the current user.

    Args:
        payload: The new book's name and optional description.
        db: Database session.
        user: The authenticated user, who becomes the owner.

    Returns:
        The created book (empty, so all content counts are zero).
    """
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
    """Return a single book the user may read, with content counts.

    Args:
        book_id: The book's id.
        db: Database session.
        user: The authenticated user.

    Returns:
        The book detail.

    Raises:
        AppError: 404 if the book does not exist or is not readable.
    """
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
    """Update a book's name and/or description (owner-only).

    Args:
        book_id: The book's id.
        payload: Fields to change; only provided fields are applied.
        db: Database session.
        user: The authenticated user, who must own the book.

    Returns:
        The updated book detail.

    Raises:
        AppError: 404 if not readable, 403 if not the user's to change.
    """
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

    The content itself is untouched; only the collection and its join
    rows are removed (FK cascade).

    Args:
        book_id: The book's id.
        db: Database session.
        user: The authenticated user, who must own the book.

    Raises:
        AppError: 404 if not readable, 403 if not the user's to delete.
    """
    book = await _writable_or_error(db, book_id, user)
    await db.delete(book)
    await db.commit()
