import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'

const { Title, Text } = Typography

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
    <div className="vinki-auth-page">
      <Card className="vinki-auth-card" styles={{ body: { padding: '40px 36px' } }}>
        <div className="vinki-auth-logo">
          <div className="vinki-auth-logo-icon">V</div>
          <Title level={3} style={{ marginBottom: 4 }}>
            Bienvenido a Vinki
          </Title>
          <Text type="secondary">Inicia sesión para continuar</Text>
        </div>

        {loginError && (
          <Alert
            message={loginError.message}
            type="error"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Email válido requerido' }]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#9CA3AF' }} />}
              placeholder="tu@email.com"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[{ required: true, message: 'Contraseña requerida' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
              placeholder="Tu contraseña"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ height: 46 }}
            >
              Iniciar sesión
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">¿No tienes cuenta? </Text>
          <Link to="/register" style={{ fontWeight: 600 }}>
            Regístrate
          </Link>
        </div>
      </Card>
    </div>
  )
}
