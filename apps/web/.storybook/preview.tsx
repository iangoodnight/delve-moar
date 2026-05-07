import '@radix-ui/themes/styles.css';
import '../src/styles/index.css';
import '../src/styles/fonts.local.css';
import { Theme, ThemePanel } from '@radix-ui/themes';
import type { Preview } from '@storybook/react-vite';

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
        order: ['Design System', ['Typography', ['Overview']]],
      },
    },
  },
  decorators: [
    (Story) => (
      <Theme accentColor="teal" radius="medium">
        <ThemePanel defaultOpen={false} />
        <Story />
      </Theme>
    ),
  ],
};

export default preview;
