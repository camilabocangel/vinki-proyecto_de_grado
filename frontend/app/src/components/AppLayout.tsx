import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography, Avatar, Dropdown } from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  TeamOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'

const { Header, Content, Sider } = Layout
const { Text } = Typography

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const studentMenuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/interview/new', icon: <ThunderboltOutlined />, label: 'Nueva entrevista' },
    { key: '/history', icon: <HistoryOutlined />, label: 'Historial' },
  ]

  const recruiterMenuItems = [
    { key: '/recruiter', icon: <TeamOutlined />, label: 'Estudiantes' },
  ]

  const adminMenuItems = [
    { key: '/admin/questions', icon: <DatabaseOutlined />, label: 'Preguntas' },
  ]

  let menuItems = studentMenuItems
  if (user?.role === 'recruiter') menuItems = [...studentMenuItems, ...recruiterMenuItems]
  if (user?.role === 'admin') menuItems = [...studentMenuItems, ...adminMenuItems]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth={0}>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Text strong style={{ color: '#fff', fontSize: 20 }}>
            Vinki
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Cerrar sesión',
                  onClick: () => logout(),
                },
              ],
            }}
          >
            <div
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Avatar icon={<UserOutlined />} />
              <Text>{user?.name}</Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
