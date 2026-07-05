import { useLocation, useNavigate } from 'react-router-dom';

// Pure URL adapter: the active tab is derived from the location hash and set by
// navigating (replace, so switching tabs does not spam history). Putting the
// tab in the URL keeps it deep-linkable and preserved when the user follows a
// row to a content detail and comes back. Follows ADR 0013 (stateless
// side-effecting hook), so it is safe to keep in the render path.
export function useHashTab<T extends string>(
  valid: readonly T[],
  fallback: T,
): readonly [T, (value: string) => void] {
  const location = useLocation();
  const navigate = useNavigate();

  const hash = location.hash.replace(/^#/, '');
  const active = (valid as readonly string[]).includes(hash)
    ? (hash as T)
    : fallback;

  const setActive = (value: string) => {
    void navigate(
      { pathname: location.pathname, search: location.search, hash: value },
      { replace: true },
    );
  };

  return [active, setActive];
}
