import { ConfigProvider, theme as antTheme, App as AntdApp } from 'antd'
import { ThemeContext, useThemeState } from '../hooks/useTheme'
import { brandTokens } from '../theme/tokens'

const lightTokens = {
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
}

const darkTokens = {
  colorPrimary: '#9FC131',
  colorBgBase: '#0f2a3a',
  colorBgLayout: '#0a1a24',
  colorTextBase: '#e8ece0',
  colorBorder: '#1a3a4a',
  borderRadius: brandTokens.radii.small,
  fontFamily: brandTokens.fonts.body,
  colorSuccess: '#9FC131',
  colorError: '#F87171',
  colorWarning: '#FBBF24',
  colorInfo: '#9FC131',
}

const components = {
  Button: {
    borderRadius: brandTokens.radii.medium,
    controlHeight: 40,
    fontWeight: 600,
    primaryShadow: '0 4px 12px rgba(0, 92, 83, 0.3)',
  },
  Card: {
    borderRadiusLG: brandTokens.radii.large,
  },
  Menu: {
    itemBorderRadius: brandTokens.radii.medium,
  },
  Table: {
    borderRadius: brandTokens.radii.medium,
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
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeState = useThemeState()

  return (
    <ThemeContext.Provider value={themeState}>
      <ConfigProvider
        theme={{
          algorithm: themeState.isDark
            ? antTheme.darkAlgorithm
            : antTheme.defaultAlgorithm,
          token: themeState.isDark ? darkTokens : lightTokens,
          components,
        }}
      >
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
