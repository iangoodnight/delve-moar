import { useParams } from 'react-router-dom';

import { Head } from '@/components/seo/head';
import { Box, Column } from '@/components/ui/layout';
import { RouterLink } from '@/components/ui/navigation';
import { Paragraph } from '@/components/ui/typography';
import { paths } from '@/config/paths';
import { useMonster } from '@/features/monsters/api';
import {
  MonsterAttribution,
  MonsterStatBlock,
} from '@/features/monsters/components';

export default function MonsterDetail() {
  const { slug } = useParams<{ slug: string }>();
  const safeSlug = slug ?? '';

  const { data: monster, isLoading, isError } = useMonster({ slug: safeSlug });

  return (
    <Column mb="8">
      <Head
        title={monster?.name ?? `Monster ${safeSlug}`}
        description={
          monster?.name
            ? `Stat block for ${monster.name}.`
            : `Detail page for monster ${safeSlug}.`
        }
      />
      {isLoading && <Paragraph>Loading...</Paragraph>}
      {isError && <Paragraph>Could not load monster.</Paragraph>}
      {monster && (
        <>
          <MonsterStatBlock monster={monster} />
          <MonsterAttribution contentSource={monster.contentSource} />
        </>
      )}
      <Box py="4">
        <RouterLink to={paths.monsters.path}>Back to Monsters</RouterLink>
      </Box>
    </Column>
  );
}
