import '@radix-ui/themes/styles.css';
import '../src/styles/reset.css';
import '../src/styles/tokens.css';
import '../src/styles/fonts.local.css';
import { Theme } from '@radix-ui/themes';
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
      <Theme accentColor="iris" grayColor="slate" radius="medium">
        <Story />
      </Theme>
    ),
  ],
};

export default preview;
