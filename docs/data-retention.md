# Data-retention policy

DelveMoar stores the least data it can, keeps it only as long as it is useful,
and deletes it in full on request. This document says what is stored, how long
it stays, what deletion actually removes, and where the "get my data" path is.
Self-hosters set their own retention; the values below are this project's
defaults, and they are configurable.

## Sessions and email tokens

Authentication produces a handful of short-lived rows. Each has a time to live
(TTL) after which it no longer works. The TTLs are environment-tunable settings
on the API; the defaults are:

| Data                     | Default TTL | Notes                                                                                                                                                                                                       |
| ------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login session            | 14 days     | Sliding: the window extends on use, so an active session does not expire out from under a signed-in user. Deleting the row revokes the session (logout, or "sign out other sessions" on a password change). |
| Email verification token | 24 hours    | Single-use.                                                                                                                                                                                                 |
| Password reset token     | 1 hour      | Single-use.                                                                                                                                                                                                 |
| Email change token       | 1 hour      | Single-use.                                                                                                                                                                                                 |
| Campaign invite          | 14 days     | Deleted on accept, decline, or revoke.                                                                                                                                                                      |

Expiry is enforced when the row is read or used: an expired session is rejected,
and an expired or already-used token is treated as if it never existed.
Single-use tokens are deleted the moment they are consumed, so a spent token
leaves nothing behind.

Rows that expire without ever being used, a session a user never signs out of, a
reset token nobody clicks, an invite nobody answers, are ignored but not yet
actively pruned from their table. A periodic cleanup job to delete them is
tracked in [#381](https://github.com/iangoodnight/delve-moar/issues/381). This
is a housekeeping gap, not an access one: an expired row grants nothing.

## Analytics

Usage analytics are **off by default**, aggregate, and carry no personal data,
so there is nothing in them to tie back to a person. Retention of the aggregate
figures is a property of the analytics instance, not of this application. The
full picture, what is and is not collected, Do Not Track handling, and
self-hosting, is in the [analytics doc](analytics.md).

## User content and accounts

A user owns their account and the content they create: books and the monsters,
spells, and items curated into them, plus any campaigns they run.

Deleting an account is immediate, irreversible, and requires the user to
re-enter their password. It removes the user row and cascades to every record
that hangs off it:

- Sessions and email tokens.
- Owned books and their curated contents.
- Owned campaigns, and with each campaign its membership list, its enabled-book
  links, and its pending invites.
- The user's own memberships in, and pending invites to, other people's
  campaigns.

Nothing owned by the account survives it. The public SRD system book has no
owner and is never touched by a user deletion.

### Shared content when someone leaves

A campaign shares content by enabling books that the campaign owner owns, so
what happens to shared content depends on who leaves:

- **The campaign owner (DM) deletes their account.** The campaign is deleted,
  and so are the owner's books that it shared, because both belong to that
  account. Members lose access; nothing is copied to them.
- **A member (player) leaves or deletes their account.** Only their membership
  is removed. The campaign, its enabled books, and the owner's content are
  untouched, and other members keep their access.

## Getting your data out

The account export endpoint (`GET /v1/account/export`) returns the account's
profile and its books with their contents, so a user can take their data before
deleting the account. It is the "get my data" path that complements deletion.

## Self-hosting

The TTLs above are API settings a self-hoster can change to match their own
policy. Analytics stay off unless the operator turns them on. This document is
this deployment's policy; adapt it for yours.

## Related

- Account export and deletion (#280), the endpoints this policy describes.
- The [analytics doc](analytics.md), for the analytics detail.
- ADR [0011](decisions/0011-campaign-model.md) (campaign model) and ADR
  [0014](decisions/0014-book-model.md) (book model), for how sharing is
  structured.
