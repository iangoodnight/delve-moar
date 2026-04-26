import { Helmet, HelmetData } from 'react-helmet-async';

interface HeadProps {
  readonly title?: string;
  readonly description?: string;
}

const helmetData = new HelmetData({});

export function Head({ title, description }: Readonly<HeadProps>) {
  return (
    <Helmet
      defaultTitle="DelveMoar"
      helmetData={helmetData}
      htmlAttributes={{ lang: 'en' }}
      titleTemplate="%s | DelveMoar"
    >
      {title && <title>{title}</title>}
      <meta name="description" content={description} />
    </Helmet>
  );
}
