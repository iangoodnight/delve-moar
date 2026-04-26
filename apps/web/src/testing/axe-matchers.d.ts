// vitest-axe@0.1.0 augments the Vi.Assertion namespace which does not exist
// in Vitest 4.x. This file provides the equivalent augmentation via the
// vitest module directly, matching the pattern used by @testing-library/jest-dom.
/* eslint-disable @typescript-eslint/no-unused-vars */
export {};

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
