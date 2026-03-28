import { App as AntdApp, ConfigProvider } from 'antd'
import type { Preview } from '@storybook/react'
import { brandTokens } from '../src/theme/tokens'
import '../src/styles/global.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      disable: false,
    },
    backgrounds: {
      default: 'canvas',
      values: [
        { name: 'canvas', value: brandTokens.colors.background },
        { name: 'surface', value: '#ffffff' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: brandTokens.colors.primary,
            colorBgBase: brandTokens.colors.background,
            colorTextBase: brandTokens.colors.secondary,
          },
        }}
      >
        <AntdApp>
          <Story />
        </AntdApp>
      </ConfigProvider>
    ),
  ],
}

export default preview
