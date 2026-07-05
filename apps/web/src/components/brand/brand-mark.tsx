import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Box } from '@/components/ui/layout';
import type { TextProps } from '@/components/ui/typography';
import { Text } from '@/components/ui/typography';
import { ConditionallyHidden, VisuallyHidden } from '@/components/ui/utils';
import { paths } from '@/config/paths';

import styles from './brand-mark.module.css';

interface BrandMarkProps {
  readonly asLink?: boolean;
  readonly short?: boolean;
}

// Linked variant lives in its own component so `useLocation` only runs when
// asLink={true}. That lets the unlinked variant render outside a router
// (Storybook, isolated previews) without crashing.
function LinkedBrand({ children }: { readonly children: ReactNode }) {
  const { pathname } = useLocation();
  const isActive = pathname === paths.home.path;

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className={styles['brand-mark']}
      data-active={isActive ? 'true' : undefined}
      data-discover={!isActive ? 'true' : undefined}
      to={paths.home.path}
    >
      {children}
    </Link>
  );
}

function TextSpan({ children, ...props }: Readonly<TextProps>) {
  return (
    <Text as="span" size="9" {...props}>
      {children}
    </Text>
  );
}

export function BrandMark({
  asLink = false,
  short = false,
}: Readonly<BrandMarkProps>) {
  const wordmark = (
    <>
      <TextSpan data-highlight="true">D</TextSpan>
      <ConditionallyHidden isHidden={short}>
        <TextSpan>elve</TextSpan>
      </ConditionallyHidden>
      <TextSpan data-highlight="true">M</TextSpan>
      <ConditionallyHidden isHidden={short}>
        <TextSpan>oar</TextSpan>
      </ConditionallyHidden>
      {asLink ? <VisuallyHidden>Home</VisuallyHidden> : null}
    </>
  );

  return (
    <Box className={styles['brand-mark']}>
      {asLink ? <LinkedBrand>{wordmark}</LinkedBrand> : wordmark}
    </Box>
  );
}
