import { Head } from '@/components/seo/head';
import { Column } from '@/components/ui/layout';
import { Hero } from '@/features/landing/components';

export default function HomePage() {
  return (
    <Column gap="4">
      <Head description="Homebrew-first TTRPG utilities." title="Home" />
      <Hero />
    </Column>
  );
}
