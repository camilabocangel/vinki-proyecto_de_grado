import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography, Avatar, Dropdown, Button, Select } from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  UserOutlined,
  LineChartOutlined,
  SettingOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

const { Header, Content, Sider } = Layout
const { Text } = Typography

const SIDER_WIDTH = 260

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const { isDark, toggle: toggleTheme } = useTheme()
  const isMobile = () => window.innerWidth < 992
  const [collapsed, setCollapsed] = useState(isMobile)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 991px)')
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const mainMenuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('nav.dashboard') },
    { key: '/interview/new', icon: <ThunderboltOutlined />, label: t('nav.interview') },
    { key: '/history', icon: <LineChartOutlined />, label: t('nav.history') },
  ]

  const roleMenuItems: { key: string; icon: React.ReactNode; label: string }[] = []
  if (user?.role === 'recruiter' || user?.role === 'admin') {
    roleMenuItems.push({
      key: '/recruiter',
      icon: <TeamOutlined />,
      label: t('nav.talent'),
    })
  }
  if (user?.role === 'admin') {
    roleMenuItems.push({
      key: '/admin/questions',
      icon: <DatabaseOutlined />,
      label: t('nav.questions'),
    })
  }

  const generalMenuItems = [
    { key: '/settings', icon: <SettingOutlined />, label: t('nav.settings') },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={SIDER_WIDTH}
        collapsedWidth={0}
        collapsed={collapsed}
        trigger={null}
        className="vinki-sidebar"
        style={{
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          zIndex: 100,
          overflow: 'auto',
        }}
      >
        <div className="vinki-logo">
          <div className="vinki-logo-icon">V</div>
          <span className="vinki-logo-text">Vinki</span>
        </div>

        <div className="vinki-menu-label">{t('nav.mainMenu')}</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={mainMenuItems}
          onClick={({ key }) => navigate(key)}
        />

        {roleMenuItems.length > 0 && (
          <>
            <div className="vinki-menu-label">{t('nav.management')}</div>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={roleMenuItems}
              onClick={({ key }) => navigate(key)}
            />
          </>
        )}

        <div className="vinki-menu-label">{t('nav.general')}</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={generalMenuItems}
          onClick={({ key }) => navigate(key)}
        />

        <div className="vinki-logout">
          <Button icon={<LogoutOutlined />} onClick={() => logout()}>
            {t('auth.logout')}
          </Button>
        </div>
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 0 : SIDER_WIDTH,
          transition: 'margin-left 0.2s',
        }}
      >
        <Header className="vinki-header">
          <div className="vinki-header-left">
            <Button
              type="text"
              icon={
                collapsed ? (
                  <span style={{ fontSize: 18 }}>☰</span>
                ) : (
                  <span style={{ fontSize: 18 }}>✕</span>
                )
              }
              onClick={() => setCollapsed(!collapsed)}
              className="vinki-menu-toggle"
            />
          </div>
          <div className="vinki-header-right">
            <Select
              defaultValue={i18n.language?.startsWith('en') ? 'en' : 'es'}
              style={{ width: 70 }}
              onChange={(value) => i18n.changeLanguage(value)}
              options={[
                { value: 'es', label: 'ES' },
                { value: 'en', label: 'EN' },
              ]}
            />
            <Button
              type="text"
              icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              style={{ fontSize: 18 }}
            />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'profile',
                    icon: <UserOutlined />,
                    label: t('nav.myProfile'),
                    onClick: () => navigate('/settings'),
                  },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: t('auth.logout'),
                    danger: true,
                    onClick: () => logout(),
                  },
                ],
              }}
              placement="bottomRight"
            >
              <div className="vinki-user-info">
                <div style={{ textAlign: 'right' }}>
                  <Text
                    strong
                    style={{ fontSize: 14, display: 'block', lineHeight: 1.3 }}
                  >
                    {user?.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {user?.role === 'student'
                      ? t('roles.student')
                      : user?.role === 'recruiter'
                        ? t('roles.recruiter')
                        : t('roles.admin')}
                  </Text>
                </div>
                <Avatar
                  size={38}
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
                  icon={<UserOutlined />}
                />
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="vinki-content">
          <Outlet />
        </Content>
      </Layout>

      {/* Overlay when sidebar open on mobile */}
      {!collapsed && (
        <div
          className="vinki-sidebar-overlay"
          onClick={() => setCollapsed(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setCollapsed(true)
          }}
          role="button"
          tabIndex={0}
          aria-label={t('nav.closeMenu')}
        />
      )}
    </Layout>
  )
}
