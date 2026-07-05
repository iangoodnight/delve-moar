import '@radix-ui/themes/styles.css';
import '../src/styles/index.css';
import '../src/styles/fonts.local.css';
import { Flex, Theme, ThemePanel } from '@radix-ui/themes';
import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';

const preview: Preview = {
  parameters: {
    // Fill the canvas so the Theme (and its dark/light appearance) covers the
    // whole surface; the decorator handles centering and padding.
    layout: 'fullscreen',
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
    (Story, context) => {
      // Stories that depend on the URL (e.g. a ?token= param) set
      // `parameters.router.initialEntries`; everything else starts at "/".
      const params = context.parameters as {
        router?: { initialEntries?: string[] };
      };
      const initialEntries = params.router?.initialEntries ?? ['/'];
      // In a story canvas, stretch the Theme to fill the iframe so its
      // appearance (incl. dark mode via the ThemePanel) covers the whole
      // surface rather than just the centered content. Skipped in docs, where
      // each block must stay its natural height.
      const isStory = context.viewMode !== 'docs';
      return (
        <MemoryRouter initialEntries={initialEntries}>
          <Theme
            accentColor="indigo"
            radius="medium"
            style={isStory ? { minHeight: '100vh', width: '100%' } : undefined}
          >
            <ThemePanel defaultOpen={false} />
            {isStory ? (
              <Flex align="center" direction="column" p="5">
                <Story />
              </Flex>
            ) : (
              <Story />
            )}
          </Theme>
        </MemoryRouter>
      );
    },
  ],
};

export default preview;
