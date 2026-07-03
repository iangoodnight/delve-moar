import { XIcon } from '@phosphor-icons/react';
import type { ComponentProps } from 'react';

import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Box, Row } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';

import styles from './book-content-row.module.css';

type BadgeColor = NonNullable<ComponentProps<typeof Badge>['color']>;

export interface BookContentBadge {
  readonly label: string;
  readonly color?: BadgeColor;
}

export interface BookContentRowData {
  readonly key: string;
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly badges: readonly BookContentBadge[];
}

type BookContentRowProps = Omit<BookContentRowData, 'key' | 'id'> & {
  readonly onRemove?: () => void;
};

export function BookContentRow({
  name,
  href,
  badges,
  onRemove,
}: Readonly<BookContentRowProps>) {
  return (
    <Card>
      <Row align="center" gap="3" justify="between">
        <Box flexGrow="1" minWidth="0">
          <RouterLink className={styles['name']} to={href} weight="medium">
            {name}
          </RouterLink>
        </Box>
        <Row align="center" flexShrink="0" gap="2">
          {badges.map((badge) => (
            <Badge
              key={badge.label}
              variant="soft"
              {...(badge.color !== undefined && { color: badge.color })}
            >
              {badge.label}
            </Badge>
          ))}
          {onRemove && (
            <IconButton
              aria-label={`Remove ${name} from this book`}
              color="red"
              onClick={onRemove}
              radius="large"
              variant="ghost"
            >
              <XIcon aria-hidden="true" />
            </IconButton>
          )}
        </Row>
      </Row>
    </Card>
  );
}
