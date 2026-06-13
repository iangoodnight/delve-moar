import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Row } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { paths } from '@/config/paths';
import { useAuth, useLogout } from '@/lib/auth';

// Auth cluster in the site header. Reflects session state: sign-in links when
// anonymous, the username (linking to /account) plus a log out action when
// signed in. Renders nothing while the session is still resolving.
export function AuthNav() {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const logout = useLogout();

  if (status === 'loading') {
    return null;
  }

  if (status === 'authenticated' && user !== null) {
    return (
      <Row align="center" gap="3">
        <RouterLink to={paths.account.getHref()} size="2" weight="medium">
          {user.username}
        </RouterLink>
        <Button
          size="2"
          variant="soft"
          color="gray"
          loading={logout.isPending}
          onClick={() => {
            logout.mutate(undefined, {
              onSuccess: () => {
                void navigate(paths.home.getHref());
              },
            });
          }}
        >
          Log out
        </Button>
      </Row>
    );
  }

  return (
    <Row align="center" gap="3">
      <RouterLink to={paths.login.getHref()} size="2" weight="medium">
        Log in
      </RouterLink>
      <RouterLink to={paths.signup.getHref()} size="2" weight="medium">
        Sign up
      </RouterLink>
    </Row>
  );
}
