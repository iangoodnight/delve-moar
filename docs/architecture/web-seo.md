# Web SEO application

Web SEO is injected at the page level, where we have the most context about the content and intent of each page. The `Head` component in `src/components/seo/head.tsx` is a thin wrapper around `react-helmet-async` that sets the page title, description, and other metadata. No page should have duplicate or missing titles, and all pages should have a description.

## Defaults and overrides

Every title provided is appended with " | DelveMoar" for branding and recognition in search results. The `Head` component also sets a default description that applies to any page that doesn't provide its own. With no title or description, the defaults are:
  - title: "DelveMoar"
  - description: "Browse and organize monsters, spells, and items from the 5e SRD with DelveMoar."

## Example usage:

```tsx
import { Head } from '../components/seo/head';

export default function HomePage() {
  return (
    <>
      <Head
        title="Home"
        description="Browse and organize monsters, spells, and items from the 5e SRD with DelveMoar."
      />
      <h1>Welcome to DelveMoar</h1>
      {/* page content */}
    </>
  );
}
```
