import React, { StrictMode } from 'react'
import { ConfigProvider, App as AntdApp } from 'antd'
import { createRoot } from 'react-dom/client'
import App from './App'
import './i18n'
import './styles/global.css'
import './styles/app.css'
import { brandTokens } from './theme/tokens'

if (import.meta.env.DEV) {
  void import('./lib/axe').then(({ initAxe }) => initAxe(React))
}

const savedTheme = localStorage.getItem('vinki-theme')
if (
  savedTheme === 'dark' ||
  (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.setAttribute('data-theme', 'dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: brandTokens.colors.primary,
          colorBgBase: brandTokens.colors.surface,
          colorBgLayout: brandTokens.colors.background,
          colorTextBase: brandTokens.colors.textPrimary,
          colorBorder: brandTokens.colors.border,
          borderRadius: brandTokens.radii.small,
          fontFamily: brandTokens.fonts.body,
          colorSuccess: brandTokens.colors.success,
          colorError: brandTokens.colors.error,
          colorWarning: brandTokens.colors.warning,
          colorInfo: brandTokens.colors.info,
        },
        components: {
          Button: {
            borderRadius: brandTokens.radii.medium,
            controlHeight: 40,
            fontWeight: 600,
            primaryShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
          },
          Card: {
            borderRadiusLG: brandTokens.radii.large,
            colorBgContainer: brandTokens.colors.surface,
          },
          Menu: {
            itemBorderRadius: brandTokens.radii.medium,
          },
          Table: {
            borderRadius: brandTokens.radii.medium,
            headerBg: brandTokens.colors.background,
          },
          Input: {
            borderRadius: brandTokens.radii.small,
            controlHeight: 40,
          },
          Select: {
            borderRadius: brandTokens.radii.small,
            controlHeight: 40,
          },
          Tag: {
            borderRadiusSM: 6,
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
