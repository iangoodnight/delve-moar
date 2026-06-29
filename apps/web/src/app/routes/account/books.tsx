import { Head } from '@/components/seo/head';
import { MyBooks } from '@/features/books';

export default function AccountBooks() {
  return (
    <>
      <Head description="Your own book collections." title="My books" />
      <MyBooks />
    </>
  );
}
