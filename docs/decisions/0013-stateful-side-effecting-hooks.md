# 0013. Stateful, side-effecting hooks are single-consumer; URL filters are pure adapters

- Status: accepted
- Date: 2026-06-17

## Context

The list pages (monsters, spells, items) keep their filter state in the
URL query string, read and written through react-router's
`useSearchParams`. This makes a filtered view shareable and bookmarkable
and survives the back button for free.

An early version of the filter hook owned internal React state (the
search box's debounced value) AND ran the side effect that wrote it to
the URL. That shape is unsafe to call from more than one component.
Each call site instantiates its own copy of the state and its own
effect. react-router churns the identity of `searchParams` and
`setSearchParams` on every navigation, so a setter that closes over a
captured `searchParams` snapshot writes from a stale base. The
independent copies then clobber each other's params through the URL: for
example, typing in the search box wipes the challenge-rating range. The
failure is silent and intermittent, because it depends on navigation and
identity timing rather than on a fixed code path. The full diagnosis is
in the #46 session-log entry.

Three features (monsters, spells, items) need the same filter shape, so
"just call it once" is not a safe guarantee.

## Decision

We split this class of hook into two responsibilities.

1. A **pure adapter** hook (`useMonsterFilters`, `useSpellFilters`,
   `useItemFilters`) owns no internal state and runs no effect. It
   derives the typed `filters` object from `useSearchParams()`, treating
   the URL as the single source of truth, and returns setters. Every
   setter uses the functional update form,
   `setSearchParams((prev) => next, { replace: true })`, so it reads the
   latest URL instead of a captured snapshot. Holding no state and
   touching only the shared URL, the adapter is safe to call from any
   number of components; all callers see the same derived `filters`.

2. The **owning component** holds any transient input state (the search
   box's `useState`) and the debounce effect, plus a during-render
   re-sync of external URL changes (back button, deep link) using the
   store-information-from-previous-renders pattern rather than
   `setState` inside `useEffect`, which the React Compiler flags as a
   cascade (see ADR 0008).

The general rule: state that drives a side effect lives in exactly one
place, the component instance that owns the input. Shared, derivable
state lives in the URL and is read through a pure adapter. A hook that
combines owned state with a side effect must either be single-consumer
by construction and documented as such, or be refactored into this
adapter-plus-component split.

## Considered alternatives

- **Keep the stateful, side-effecting hook and call it once.** Works
  only by convention; nothing stops a second consumer, and the failure
  is silent and intermittent. Rejected as a footgun that re-bites.
- **Lift filter state into a React context or a store (Zustand, etc.).**
  Centralizing the state stops copies from diverging. Rejected as
  overkill: the URL already is the shared store, and it gives us
  shareable and bookmarkable filters for free. A parallel store
  duplicates the source of truth and risks drifting out of sync with the
  URL.
- **Stabilize the setters and the snapshot with `useMemo`/`useCallback`
  around a captured `searchParams`.** Patches the identity churn instead
  of removing it. Rejected as fragile: the functional update form is the
  actual fix and drops the captured snapshot entirely.

## Consequences

- Easier: any component can read filters through the adapter with no
  coordination; filter state stays shareable via the URL; the
  React-Compiler-safe re-sync pattern is written down once.
- Harder: each owning component re-implements its own debounce and local
  input wiring, a mild duplication across the three filter components.
  We accept it, because that transient state genuinely belongs to each
  input.
- New constraint: contributors must not move debounce or local input
  state into the shared hook. The adapter stays pure.

## Links

- Issues #46, #48, #49 (where the rule converged); #157 (this ADR)
- Hooks: `apps/web/src/features/{monsters,spells,items}/hooks/use-*-filters.ts`
- ADR 0002 (web features layout) and ADR 0008 (front-end coverage under
  the React Compiler) for the surrounding web-architecture context
