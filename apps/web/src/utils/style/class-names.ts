/*
 * A utility function to conditionally join class names together.
 *
 * Supports strings, arrays, and objects. For objects, the keys are class names
 * and the values are booleans indicating whether to include the class name.
 *
 * @example
 * // This would return 'btn btn-primary active disabled' if isDisabled is true,
 * classNames('btn', ['btn-primary', 'active'], { disabled: isDisabled })
 * // and 'btn btn-primary active' if isDisabled is false.
 * */
export function classNames(...args: unknown[]): string {
  return args
    .flatMap((arg) => {
      if (!arg) return [];
      if (typeof arg === 'string') return [arg];
      if (Array.isArray(arg)) return classNames(...(arg as unknown[]));
      if (typeof arg === 'object') {
        return Object.entries(arg)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key);
      }
      return [];
    })
    .join(' ');
}
