import { Link as RouterLink } from 'react-router-dom';

import { Column, Row, Section } from '@/components/ui/layout';
import { Blockquote, H1, Link } from '@/components/ui/typography';
import { paths } from '@/config/paths';

import styles from './hero.module.css';

interface HeroLink {
  readonly to: string;
  readonly children: string;
}

function HeroLink({ to, children }: Readonly<HeroLink>) {
  return (
    <li>
      <Link asChild size="6" weight="bold">
        <RouterLink to={to}>{children}</RouterLink>
      </Link>
    </li>
  );
}

export function Hero() {
  return (
    <Section
      className={styles['hero']}
      p={{ initial: '1', sm: '4', lg: '8' }}
      size="4"
    >
      <Column gap="4">
        <H1>Welcome traveler.</H1>
        <Blockquote size="6">
          The dungeon does not test you. It indexes you. Every door you do not
          open is a paragraph the place writes about who you were when you stood
          before it.
          <cite>— A Wizzard Apocryphal</cite>
        </Blockquote>
        <Row asChild gap="6" justify="center" wrap="wrap">
          <ul>
            <HeroLink to={paths.monsters.path}>
              {paths.monsters.displayName}
            </HeroLink>
            <HeroLink to={paths.items.path}>{paths.items.displayName}</HeroLink>
            <HeroLink to={paths.spells.path}>
              {paths.spells.displayName}
            </HeroLink>
          </ul>
        </Row>
      </Column>
    </Section>
  );
}
