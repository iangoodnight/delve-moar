import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';

import {
  Blockquote,
  Code,
  Em,
  Link,
  Paragraph,
  Strong,
} from '@/components/ui/typography';
import { classNames } from '@/utils/style/class-names';

import styles from './markdown.module.css';

const ALLOWED_ELEMENTS = [
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'li',
  'ol',
  'p',
  'strong',
  'ul',
];

const COMPONENTS: Components = {
  a: ({ children, href }) => (
    <Link href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </Link>
  ),
  blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
  code: ({ children }) => <Code>{children}</Code>,
  em: ({ children }) => <Em>{children}</Em>,
  p: ({ children }) => <Paragraph>{children}</Paragraph>,
  strong: ({ children }) => <Strong>{children}</Strong>,
};

export interface MarkdownProps {
  readonly children: string;
  readonly className?: string;
}

export function Markdown({ children, className }: Readonly<MarkdownProps>) {
  return (
    <div className={classNames(styles['markdown'], className)}>
      <ReactMarkdown
        allowedElements={ALLOWED_ELEMENTS}
        components={COMPONENTS}
        unwrapDisallowed
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
