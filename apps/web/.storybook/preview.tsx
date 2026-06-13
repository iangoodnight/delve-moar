import '@radix-ui/themes/styles.css';
import '../src/styles/index.css';
import '../src/styles/fonts.local.css';
import { Theme, ThemePanel } from '@radix-ui/themes';
import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          'Design System',
          ['Typography', ['Overview'], 'Forms', ['Overview']],
        ],
      },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Theme accentColor="teal" radius="medium">
          <ThemePanel defaultOpen={false} />
          <Story />
        </Theme>
      </MemoryRouter>
    ),
  ],
};

export default preview;
