# 0014. Book model: content collections, SRD as a system book

- Status: accepted
- Date: 2026-06-17

## Context

ADR 0011 established user-owned content (`owner_id`) attaching directly to
campaigns many-to-many, with SRD left outside the model as "global and public
regardless." Two needs surfaced that the direct attachment does not serve well.

First, a DM organizes homebrew into named, reusable collections: a set of
fantasy monsters, a separate set of sci-fi ones, a bundle of the monsters and
spells for one campaign. "Use these in this campaign" should mean enabling a
whole collection, not attaching content item-by-item. Direct content-to-campaign
attachment has no home for that collection as a first-class, reusable thing.

Second, the project needs a unit it can later publish or sell: a
creator-authored bundle of content, analogous to a published sourcebook (the way
online TTRPG platforms sell sourcebooks, or a community author shares a module).
Nothing in ADR 0011 is shaped to be that unit.

There is also a modeling wart: SRD living "outside the model" makes the content
model two-shaped (SRD versus homebrew), which complicates a uniform "what
content does this campaign have access to" story.

The forces are the same ones ADR 0011 weighed, now sharper. This is the first
time the app has private data; the access layer is security surface; whatever we
pick sets the shape of the authorization predicate, which ADR 0011 already
centralized into one module. And we want to avoid a painful structural migration
when monetization arrives.

## Decision

**We will introduce a "book": a named, owned collection of content, and make it
the layer through which content reaches campaigns.**

Concretely:

- **A book is a collection of content with an owner and no membership.** It has
  an `owner_id`, a name, a description, and a visibility (private by default,
  per ADR 0012). It holds content; it does not hold people. People live on
  campaigns.
- **Content associates to books many-to-many.** A piece of content can be in
  zero, one, or many books. The same custom monster can appear in a "fantasy"
  book and a "my campaign" book at once.
- **Campaigns enable books many-to-many.** A campaign grants its members access
  by enabling whole books ("this campaign uses SRD and Dave's Magic Expansion").
  In Phase 1b this is the only path content reaches a campaign; individual
  per-item grants are deferred.
- **SRD is one system-owned, public, read-only book.** The content model becomes
  uniform: everything lives in a book. Already-seeded SRD content is moved into
  the SRD book by a tested, reversible migration.
- **Each user gets an auto-created default "My Homebrew" book**, and content may
  also be book-less. New content can land in the default book with no ceremony,
  or stay book-less (private to its owner) and be added to books later. The
  content-to-book association is optional. Book-less content is simply not
  reachable by a campaign until it is placed in an enabled book.
- **Books are the future monetization unit.** Payments, pricing, a marketplace,
  and entitlement records are out of scope for Phase 1b. The decision here is
  only that the book is the bundle those features will later attach to, so they
  do not force a structural migration.

This revises ADR 0011's content-to-campaign attachment: the direct join is
replaced by content-to-book plus campaign-to-book. ADR 0011's other decisions
stand unchanged: ownership (`owner_id`) remains the root of write and delete
rights, writes and deletes stay owner-only, and the read rule still lives in the
single authorization module. That read rule gains one hop: a user may read
content if they own it, or they are a member of a campaign that enables a book
containing it.

## Considered alternatives

- **No books; keep ADR 0011's direct content-to-campaign attachment.** Already
  decided, and simpler. Rejected because it has no first-class home for a
  reusable named collection, gives monetization no unit to attach to, and leaves
  the content model two-shaped (SRD versus homebrew).
- **Collapse books and campaigns into one entity** (a book that also carries a
  member list). Fewer entities. Rejected because it conflates two genuinely
  different things: a collection of content versus a group of people. The same
  book is reused across campaigns with different member sets, so membership
  belongs on the campaign, not the book.
- **Everything routes through books, with no book-less content.** The cleanest
  invariant: content always has a home. Rejected because it forces ceremony on
  the primary workflow, making a DM create or choose a book before saving a
  single monster. We allow book-less content plus an auto-created default book
  instead.
- **Build individual per-item campaign grants in 1b too** (books and individual
  attachment). Matches the fullest mental model. Rejected for 1b scope: a second
  grant path deepens the read predicate and adds schema for a need that
  whole-book enabling already covers. The model stays compatible so individual
  grants can be added later.
- **Keep SRD special and global, apply books only to homebrew.** Avoids the
  backfill migration. Rejected because it keeps the content model two-shaped and
  denies monetization any symmetry with SRD. The backfill is a one-time, tested,
  reversible cost.

## Consequences

**Easier:**

- The DM's real workflow maps directly: named, reusable collections, and "use
  these books in this campaign" instead of item-by-item attachment.
- The content model is uniform. Everything lives in a book; "this campaign's
  content" is the union of the content in its enabled books.
- There is a clean unit for future monetization (the book is the bundle) without
  a later structural migration.
- "All my homebrew" is still `owner_id = me`. Books are an organizing and
  sharing layer on top of ownership, not a replacement for it.

**Harder:**

- The authorization read predicate gains a hop (owner, or member of a campaign
  that enables a book containing the content). More join surface and a deeper
  N+1 / over-fetch risk than ADR 0011's single join.
- More schema: a books table, a content-to-book join (per resource or
  polymorphic), a campaign-to-book join, the SRD backfill migration, and the
  codegen churn that follows.
- SRD content now lives in a system-owned book. The SRD seed and any future SRD
  refresh must target that book, and already-seeded environments need the
  reversible backfill migration (production holds 334 monsters / 319 spells /
  599 items).

**New constraints:**

- Reads stay funnelled through the single authorization module (ADR 0011). Books
  add no second access path; the books hop is encoded in that one predicate, not
  hand-rolled per endpoint.
- Adding or removing content to or from a book is owner-only in 1b. Books have
  no member list.
- The SRD book is system-owned, public, and read-only. No user can write to it.
- Book visibility is private by default (ADR 0012). Any public author projection
  uses the `username` author seam, never email (the rule from the username work
  that followed ADR 0010).
- Deleting a book deletes the collection, not the owned content. Content keeps
  its own `owner_id` lifecycle.
- The grant path is books-only in 1b. The schema must keep individual per-item
  campaign grants addable later without rework.

## Links

- [#234](https://github.com/iangoodnight/delve-moar/issues/234): book model and
  CRUD (the work this ADR governs)
- [#153](https://github.com/iangoodnight/delve-moar/issues/153): Phase 1b scope
- ADR [0011](0011-campaign-model.md): the campaign model this revises. Direct
  content-to-campaign attachment becomes content-to-book plus campaign-to-book;
  ownership and the single policy module stand.
- ADR [0012](0012-visibility-and-sharing.md): visibility and sharing. Enabling a
  book in a campaign extends campaign-based sharing.
- ADR [0010](0010-authentication.md): identity for owner and member resolution,
  and the `username` author projection that followed it
- [#172](https://github.com/iangoodnight/delve-moar/issues/172): the
  authorization policy module that gains the books hop
- [#176](https://github.com/iangoodnight/delve-moar/issues/176): campaigns
  enable books
- [#177](https://github.com/iangoodnight/delve-moar/issues/177),
  [#178](https://github.com/iangoodnight/delve-moar/issues/178),
  [#179](https://github.com/iangoodnight/delve-moar/issues/179): homebrew CRUD
  lands content into books
