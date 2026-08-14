# 0011. Campaign model: user-owned content, many-to-many to campaigns

- Status: accepted
- Date: 2026-05-21

## Context

Phase 1b gives users their own homebrew content: monsters, spells, and items
that live alongside the read-only SRD catalog. Two questions fall out
immediately:

1. What owns a piece of homebrew, and
2. how does a DM organize it and share it with the right players?

A "campaign" is the natural organizing unit for a tabletop game, but its role in
the data model is not obvious. The Phase 1b planning session framed the choice
as: is a campaign a hard tenancy boundary that content lives _inside_, or a
softer label a user attaches to content they own?

The forces:

- A DM (the primary user) typically runs more than one campaign and reuses the
  same homebrew across them. The same custom monster shows up in two different
  games.
- That DM also wants a single "all my homebrew" view, not a pile of per-campaign
  silos.
- Players invited to a campaign should see the content for _that_ campaign and
  nothing else.
- Whatever we pick sets the shape of the authorization layer, which is security
  surface. Phase 1b is the first time the app has private data at all.

SRD content is out of scope for this decision: it stays global and public
regardless.

## Decision

**We will use a hybrid model: content is owned by a user, and campaigns are a
separate entity that content is associated with many-to-many.**

Concretely:

- **Content is owned by a user.** Every homebrew row carries an `owner_id`.
  Ownership, not campaign membership, is the root of write and delete rights.
- **A campaign is a first-class entity** with its own owner (the DM) and a
  membership list (`campaign_members`, players the DM invites).
- **Content associates to campaigns many-to-many** through a join table. A piece
  of homebrew can belong to zero campaigns (private to its owner), one campaign,
  or several.
- **The read rule:** a user may read a piece of content if they own it, _or_
  they are a member of a campaign the content is attached to.
- **Write and delete are owner-only in Phase 1b.** Players in a campaign can
  read the DM's shared content but cannot edit it. Co-DM and role-based write
  access is explicitly deferred.

This rule lives in one authorization module (see ADR 0010's identity seam),
tested in isolation, and is applied as a predicate on every homebrew read query.

## Considered alternatives

- **Hard tenancy (campaign-as-tenant).** Content lives inside exactly one
  campaign; access is "are you in this campaign?" Simplest possible
  authorization story and a clean mental model. Rejected because it forces a DM
  to duplicate any homebrew reused across campaigns, and it has no home for "my
  personal library before I assign it anywhere."
- **Soft label only (campaign as a tag, no membership).** Content lives at the
  user level; a campaign is just a tag for filtering, with no sharing semantics.
  Simple, but it does nothing for the core need: letting a DM's players see the
  campaign's content. Sharing would have to be bolted on some other way.
- **Account-level only, no campaigns in 1b.** Ship homebrew CRUD with pure
  private ownership and defer campaigns entirely. Tempting for scope, but
  campaigns are the organizing and sharing primitive the whole phase is built
  around; deferring them guts the "share with my players" story that justifies
  accounts in the first place.
- **Copy-on-add (duplicate into each campaign).** Keep a user library, but
  adding content to a campaign copies it, avoiding the join table. Rejected
  because edits then diverge across copies: fix a stat-block typo once and it is
  still wrong in two other campaigns, which is the opposite of what a
  reuse-heavy DM wants.

## Consequences

**Easier:**

- The DM's real workflow maps directly: one library, reused across many
  campaigns, no duplication.
- "All my homebrew" is just `owner_id = me`; "this campaign's content" is a join
  filter. Both views fall out of the same schema.
- Sharing (ADR 0012) has a clean foundation: campaign membership _is_ the share
  boundary, so the sharing ADR adds policy and UX, not new structure.

**Harder:**

- Authorization is no longer "public to everyone." Every homebrew read path must
  apply the owner-or-shared-campaign predicate. Miss it on one endpoint and you
  have a data-exposure bug.
- More schema: `campaigns`, `campaign_members`, and a content-to-campaign join
  per resource (or one polymorphic join), plus the migrations and the codegen
  churn that follows.

## New constraints

- A single authorization module owns the read rule. Endpoints do not hand-roll
  access checks; they call the policy. This is a hard convention, enforced in
  review.
- Every list and detail query over homebrew is scoped by the policy predicate by
  construction, not by remembering to add a filter.
- The many-to-many invites an N+1 / over-fetch trap on "which campaigns is this
  in?" Address it deliberately when the homebrew endpoints are built; flagged
  here so it is not a surprise.

## Links

- [#153](https://github.com/iangoodnight/delve-moar/issues/153): Phase 1b scope
- ADR [0010](0010-authentication.md): establishes the `user_id` and the identity
  seam this model's authorization rule depends on
- ADR [0012](0012-visibility-and-sharing.md): the sharing model that builds
  directly on campaign membership defined here
- ADR [0014](0014-book-model.md): revises the content-to-campaign attachment
  defined here. Content now reaches campaigns through books (content-to-book
  plus campaign-to-book); ownership and the single policy module are unchanged.
- Resolves the "Campaign model" question in the Phase 1b incubator section of
  `planning/roadmap-notes.md`
