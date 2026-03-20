import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography, Avatar, Dropdown, Button } from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  UserOutlined,
  LineChartOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'

const { Header, Content, Sider } = Layout
const { Text } = Typography

const SIDER_WIDTH = 260

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const mainMenuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/interview/new', icon: <ThunderboltOutlined />, label: 'Entrevista' },
    { key: '/history', icon: <LineChartOutlined />, label: 'Historial' },
  ]

  const roleMenuItems: { key: string; icon: React.ReactNode; label: string }[] = []
  if (user?.role === 'recruiter' || user?.role === 'admin') {
    roleMenuItems.push({ key: '/recruiter', icon: <TeamOutlined />, label: 'Talento' })
  }
  if (user?.role === 'admin') {
    roleMenuItems.push({
      key: '/admin/questions',
      icon: <DatabaseOutlined />,
      label: 'Preguntas',
    })
  }

  const generalMenuItems = [
    { key: '/settings', icon: <SettingOutlined />, label: 'Configuración' },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={SIDER_WIDTH}
        breakpoint="lg"
        collapsedWidth={0}
        collapsed={collapsed}
        onCollapse={(val) => setCollapsed(val)}
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

        <div className="vinki-menu-label">Main Menu</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={mainMenuItems}
          onClick={({ key }) => navigate(key)}
        />

        {roleMenuItems.length > 0 && (
          <>
            <div className="vinki-menu-label">Gestión</div>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={roleMenuItems}
              onClick={({ key }) => navigate(key)}
            />
          </>
        )}

        <div className="vinki-menu-label">General</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={generalMenuItems}
          onClick={({ key }) => navigate(key)}
        />

        <div className="vinki-logout">
          <Button icon={<LogoutOutlined />} onClick={() => logout()}>
            Cerrar sesión
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
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'profile',
                    icon: <UserOutlined />,
                    label: 'Mi perfil',
                  },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: 'Cerrar sesión',
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
                      ? 'Estudiante'
                      : user?.role === 'recruiter'
                        ? 'Reclutador'
                        : 'Admin'}
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
          aria-label="Cerrar menú"
        />
      )}
    </Layout>
  )
}
