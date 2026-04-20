import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography, Avatar, Dropdown, Button, Select, Badge } from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
  LineChartOutlined,
  BookOutlined,
  SettingOutlined,
  MoonOutlined,
  SunOutlined,
  BellOutlined,
  FileTextOutlined,
  TrophyOutlined,
  SwapOutlined,
  RocketOutlined,
  SolutionOutlined,
  FireOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import { useTheme } from '../hooks/useTheme'
import { api } from '../api/client'
import { Breadcrumbs } from './Breadcrumbs'
import { GlobalSearch } from './GlobalSearch'
import vinkiLogo from '../assets/images/vinkiLogo.png'

interface PendingNotifications {
  count: number
  items: Array<{ interviewId: number; completedAt: string | null }>
}

const { Header, Content, Sider } = Layout
const { Text } = Typography

const SIDER_WIDTH = 260

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const { isDark, toggle: toggleTheme } = useTheme()
  const { showWarning } = useSessionTimeout(!!user)
  const queryClient = useQueryClient()
  const isMobile = () => window.innerWidth < 992
  const [collapsed, setCollapsed] = useState(isMobile)

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'pending'],
    queryFn: () => api.get<PendingNotifications>('/notifications/pending'),
    refetchInterval: 30000,
  })

  const handleMarkAllSeen = async () => {
    await api.post('/notifications/mark-all-seen')
    queryClient.invalidateQueries({ queryKey: ['notifications', 'pending'] })
  }

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 991px)')
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const mainMenuItems =
    user?.role === 'recruiter'
      ? []
      : [
          { key: '/dashboard', icon: <DashboardOutlined />, label: t('nav.dashboard') },
          { key: '/interview/new', icon: <ThunderboltOutlined />, label: t('nav.interview') },
          { key: '/history', icon: <LineChartOutlined />, label: t('nav.history') },
          { key: '/study-plan', icon: <BookOutlined />, label: t('nav.studyPlan') },
          { key: '/achievements', icon: <TrophyOutlined />, label: t('nav.achievements') },
          { key: '/career', icon: <RocketOutlined />, label: t('nav.career') },
          { key: '/challenges', icon: <FireOutlined />, label: t('nav.challenges') },
        ]

  const roleMenuItems: { key: string; icon: React.ReactNode; label: string }[] = []
  if (user?.role === 'recruiter' || user?.role === 'admin') {
    roleMenuItems.push({
      key: '/recruiter',
      icon: <TeamOutlined />,
      label: t('nav.talent'),
    })
    roleMenuItems.push({
      key: '/recruiter/compare',
      icon: <SwapOutlined />,
      label: t('nav.compare'),
    })
    roleMenuItems.push({
      key: '/knowledge',
      icon: <FileTextOutlined />,
      label: t('nav.knowledgeBase'),
    })
    roleMenuItems.push({
      key: '/recruiter/templates',
      icon: <SolutionOutlined />,
      label: t('nav.templates'),
    })
  }
  if (user?.role === 'admin') {
    roleMenuItems.push({
      key: '/admin/questions',
      icon: <DatabaseOutlined />,
      label: t('nav.questions'),
    })
    roleMenuItems.push({
      key: '/admin/audit',
      icon: <FileSearchOutlined />,
      label: t('nav.auditLogs'),
    })
    roleMenuItems.push({
      key: '/admin/analytics',
      icon: <BarChartOutlined />,
      label: t('nav.analytics'),
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
        role="navigation"
        aria-label={t('nav.mainMenu')}
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
          <img
            src={vinkiLogo}
            alt="Vinki"
            className="vinki-logo-icon"
            style={{
              width: 36,
              height: 36,
              objectFit: 'contain',
              background: 'transparent',
            }}
          />
          <span className="vinki-logo-text">Vinki</span>
        </div>

        {mainMenuItems.length > 0 && (
          <>
            <div className="vinki-menu-label">{t('nav.mainMenu')}</div>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={mainMenuItems}
              onClick={({ key }) => navigate(key)}
              aria-label={t('nav.mainMenu')}
            />
          </>
        )}

        {roleMenuItems.length > 0 && (
          <>
            <div className="vinki-menu-label">{t('nav.management')}</div>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={roleMenuItems}
              onClick={({ key }) => navigate(key)}
              aria-label={t('nav.management')}
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
          aria-label={t('nav.general')}
        />

        <div className="vinki-logout">
          <Button
            icon={<LogoutOutlined />}
            onClick={() => {
              navigate('/')
              logout()
            }}
          >
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
              aria-label={collapsed ? t('nav.mainMenu') : t('nav.closeMenu')}
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
                  ...(notifications?.items.length
                    ? notifications.items.map((n) => ({
                        key: String(n.interviewId),
                        label: `${t('nav.notifications')}: #${n.interviewId}`,
                        onClick: () => navigate(`/feedback/${n.interviewId}`),
                      }))
                    : [
                        {
                          key: 'empty',
                          label: t('nav.noNotifications'),
                          disabled: true,
                        },
                      ]),
                  ...(notifications?.count
                    ? [
                        { type: 'divider' as const, key: 'divider' },
                        {
                          key: 'mark-all',
                          label: t('nav.markAllSeen'),
                          onClick: handleMarkAllSeen,
                        },
                      ]
                    : []),
                ],
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Badge count={notifications?.count ?? 0} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: 18 }} />}
                  aria-label={t('nav.notifications')}
                />
              </Badge>
            </Dropdown>
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
                    onClick: () => {
                      navigate('/')
                      logout()
                    },
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
                  <Text style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                    {user?.role === 'student'
                      ? t('roles.student')
                      : user?.role === 'recruiter'
                        ? t('roles.recruiter')
                        : t('roles.admin')}
                  </Text>
                </div>
                <Avatar
                  size={38}
                  style={{ background: 'linear-gradient(135deg, #005C53, #042940)' }}
                  icon={<UserOutlined />}
                />
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="vinki-content">
          <div style={{ padding: '16px 32px 0' }}>
            <Breadcrumbs />
          </div>
          <Outlet />
        </Content>
      </Layout>

      <GlobalSearch />

      {showWarning && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            background: 'var(--color-warning, #faad14)',
            color: '#000',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {t('auth.sessionExpiring')}
        </div>
      )}

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
