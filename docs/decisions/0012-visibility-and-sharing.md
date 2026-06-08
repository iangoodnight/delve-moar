# 0012. Visibility and sharing: private by default, campaign-based sharing, link sharing as a stretch

- Status: proposed
- Date: 2026-05-21

## Context

ADR 0011 establishes user-owned content and campaign membership as the
access *structure*. This ADR decides the *policy*: what visibility
states content can be in, and how a user shares content with others.

Private-by-default is already settled. The unsettled axis is which
sharing mechanisms ship in Phase 1b versus later.

The forces:

- The DM needs her players to see a campaign's homebrew when they join.
  That is the core sharing need and the reason campaigns exist.
- "Send my players a link to next session's boss" is a lightweight,
  account-free convenience on top of that.
- A public, discoverable gallery is attractive for organic discovery and
  community growth, but it carries a content-moderation and safety
  burden the project is not ready to take on.
- Every sharing surface is also an exposure surface. Any share link must
  be unguessable, revocable, and expiring; a public gallery without
  moderation is a liability, not a feature.

## Decision

**We will ship a layered visibility model, private by default.**

- **Private (default).** Content with no campaign attachment and no
  active share link is visible only to its owner.
- **Campaign-based sharing (1b core).** Attaching content to a campaign
  grants every member of that campaign read access, per ADR 0011's read
  rule. This is the primary sharing mechanism.
- **Link sharing (1b stretch).** An owner can mint an unguessable,
  revocable, view-only share link for a single piece of content. Anyone
  with the link can read that one item without an account. We ship this
  if it is cheap once campaign sharing exists, and defer it if it adds
  material complexity.

Deferred to Phase 2 and beyond:

- Account-to-account invites outside a campaign.
- A public, discoverable gallery, gated on a moderation and safety story.
- Content forking or copying between users.
- A follower / social graph.

Sharing always grants read, never write. Write and delete stay
owner-only per ADR 0011.

## Considered alternatives

- **Private-only in 1b (no sharing).** Smallest surface, but it strands
  the players-see-homebrew need that justifies campaigns in the first
  place. Rejected.
- **Public-by-default with opt-in privacy.** Maximizes discovery, but it
  inverts the safe default and drops unmoderated content into a public
  space from day one. Rejected on the exposure argument.
- **Public gallery in 1b.** Wanted for discovery and community, but it
  needs moderation, reporting, and a safety policy we do not have.
  Pulling it into 1b would balloon the phase. Deferred, not rejected.
- **Granular per-field ACLs.** Share individual sections or fields of a
  stat block. Over-engineered for a need nobody has expressed. Rejected.

## Consequences

**Easier:**

- The common case (share with my table) needs no new structure beyond
  ADR 0011's campaign membership. This ADR is mostly policy.
- Safe default: nothing leaves the owner's control unless they take an
  explicit action (attach content to a campaign, or mint a link).

**Harder:**

- Link sharing, if built, adds a token surface: generation, hashed
  storage, revocation, optional expiry, and an *unauthenticated* read
  path that bypasses normal session identity. That path must be scoped
  to a single content id and be strictly read-only.
- Two distinct read paths now exist (campaign member and link token).
  Both must funnel through the same authorization module so neither
  drifts from the other.

## New constraints

- Share-link tokens are high-entropy, stored hashed, revocable, and at
  minimum optionally expiring. A token grants read to exactly one content
  id, never a collection.
- The unauthenticated link-read path is the one place a request with no
  session can read non-public content. It gets explicit tests and a
  security review.
- Lifting `noindex` and any public-gallery work are out of scope here and
  tracked separately. This ADR does not open a public surface.

## Links

- [#153](https://github.com/iangoodnight/delve-moar/issues/153) — Phase
  1b scope
- ADR [0011](0011-campaign-model.md) — the campaign membership structure
  this policy rides on
- ADR [0010](0010-authentication.md) — identity for owner and member
  resolution
- Resolves the "Visibility model" question in the Phase 1b incubator
  section of `planning/roadmap-notes.md`
