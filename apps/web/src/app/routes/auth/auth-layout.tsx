import { Outlet } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';

// Shared shell for the auth pages: a narrow, centered card. Each page renders
// into the Outlet.
export default function AuthLayout() {
  return (
    <Container size="1" px="4" py="6">
      <Card size="4">
        <Outlet />
      </Card>
    </Container>
  );
}
