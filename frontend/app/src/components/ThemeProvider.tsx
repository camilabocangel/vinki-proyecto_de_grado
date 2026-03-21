import { ConfigProvider, theme as antTheme, App as AntdApp } from 'antd'
import { useTheme } from '../hooks/useTheme'
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
  colorPrimary: '#A78BFA',
  colorBgBase: '#1F2937',
  colorBgLayout: '#111827',
  colorTextBase: '#F9FAFB',
  colorBorder: '#374151',
  borderRadius: brandTokens.radii.small,
  fontFamily: brandTokens.fonts.body,
  colorSuccess: '#34D399',
  colorError: '#F87171',
  colorWarning: '#FBBF24',
  colorInfo: '#60A5FA',
}

const components = {
  Button: {
    borderRadius: brandTokens.radii.medium,
    controlHeight: 40,
    fontWeight: 600,
    primaryShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
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
  const { isDark } = useTheme()

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: isDark ? darkTokens : lightTokens,
        components,
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  )
}
