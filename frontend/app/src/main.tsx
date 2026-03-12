import React, { StrictMode } from 'react'
import { ConfigProvider, App as AntdApp } from 'antd'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { brandTokens } from './theme/tokens'

if (import.meta.env.DEV) {
  void import('./lib/axe').then(({ initAxe }) => initAxe(React))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: brandTokens.colors.primary,
          colorBgBase: brandTokens.colors.background,
          colorTextBase: brandTokens.colors.secondary,
          borderRadius: brandTokens.radii.small,
          fontFamily: brandTokens.fonts.body,
        },
        components: {
          Button: {
            borderRadius: brandTokens.radii.medium,
            controlHeight: 46,
            fontWeight: 600,
          },
          Card: {
            borderRadiusLG: brandTokens.radii.large,
            colorBgContainer: brandTokens.colors.surface,
          },
        },
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
