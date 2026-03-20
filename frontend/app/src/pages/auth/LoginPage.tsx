import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert, Layout } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'

const { Title, Paragraph } = Typography

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loginError } = useAuth()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      await login(values)
      navigate('/dashboard')
    } catch {
      // error handled by mutation
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card style={{ width: 400, maxWidth: '90vw' }}>
        <Title level={2} style={{ textAlign: 'center' }}>
          Vinki
        </Title>
        <Paragraph style={{ textAlign: 'center' }}>
          Inicia sesión para continuar
        </Paragraph>

        {loginError && (
          <Alert
            message={loginError.message}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            rules={[{ required: true, type: 'email', message: 'Email válido requerido' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Contraseña requerida' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Contraseña"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Iniciar sesión
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Link to="/register">¿No tienes cuenta? Regístrate</Link>
        </div>
      </Card>
    </Layout>
  )
}
