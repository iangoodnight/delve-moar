import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Markdown } from '../markdown';

function renderMarkdown(source: string) {
  return render(
    <Theme>
      <Markdown>{source}</Markdown>
    </Theme>,
  );
}

describe('Markdown', () => {
  it('renders bold and italic emphasis', () => {
    renderMarkdown('Text with **bold** and _italic_ words.');
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('italic').tagName).toBe('EM');
  });

  it('renders inline code', () => {
    renderMarkdown('Press `Enter` to continue.');
    expect(screen.getByText('Enter').tagName).toBe('CODE');
  });

  it('renders ordered and unordered lists', () => {
    const { container } = renderMarkdown('- one\n- two\n\n1. first\n2. second');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('renders links that open safely in a new tab', () => {
    renderMarkdown('See [the SRD](https://example.com/srd).');
    const link = screen.getByRole('link', { name: 'the SRD' });
    expect(link).toHaveAttribute('href', 'https://example.com/srd');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('strips dangerous link protocols', () => {
    renderMarkdown('[click me](javascript:alert(1))');
    const link = screen.getByText('click me').closest('a');
    expect(link?.getAttribute('href') ?? '').not.toContain('javascript:');
  });

  it('degrades a markdown table to text without rendering a table', () => {
    const { container } = renderMarkdown(
      '| Size | HP |\n| --- | --- |\n| Tiny | 20 |',
    );
    expect(container.querySelector('table')).toBeNull();
    expect(container).toHaveTextContent('Size');
  });

  it('does not render raw HTML elements', () => {
    const { container } = renderMarkdown(
      'Hello <script>alert(1)</script> <img alt="x" onerror="alert(1)" src="x"> world',
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('unwraps a disallowed heading to its text', () => {
    const { container } = renderMarkdown('##### A Heading');
    expect(screen.queryByRole('heading')).toBeNull();
    expect(container).toHaveTextContent('A Heading');
  });

  it('renders a blockquote', () => {
    const { container } = renderMarkdown('> A line of flavor text.');
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(container).toHaveTextContent('A line of flavor text.');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderMarkdown(
      'Body with **bold**, a [link](https://example.com), and a list:\n\n- one\n- two',
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
