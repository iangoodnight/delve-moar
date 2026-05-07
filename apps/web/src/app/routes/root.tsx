import { Outlet } from 'react-router-dom';

import { RootLayout } from '@/components/layouts/root-layout';

export function ErrorBoundary() {
  return (
    <RootLayout>
      <h1>Something went wrong.</h1>
    </RootLayout>
  );
}

export default function AppRoot() {
  return (
    <RootLayout>
      <Outlet />
    </RootLayout>
  );
}
