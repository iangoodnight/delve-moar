import { Helmet, HelmetData } from 'react-helmet-async';

import { env } from '@/config/env';

interface HeadProps {
  readonly title?: string;
  readonly description?: string;
}

const helmetData = new HelmetData({});

export function Head({ title, description }: Readonly<HeadProps>) {
  const siteTitle = env.TITLE;

  return (
    <Helmet
      defaultTitle={siteTitle}
      helmetData={helmetData}
      htmlAttributes={{ lang: 'en' }}
      titleTemplate={`%s | ${siteTitle}`}
    >
      {title && <title>{title}</title>}
      <meta content={description} name="description" />
    </Helmet>
  );
}
