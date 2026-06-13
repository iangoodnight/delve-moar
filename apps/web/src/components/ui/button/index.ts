// Re-exported from Radix behind our own module so consumers depend on
// @/components/ui/button, not the library directly. Swapping the underlying
// component library later is then a one-file change.
export type { ButtonProps } from '@radix-ui/themes';
export { Button } from '@radix-ui/themes';
