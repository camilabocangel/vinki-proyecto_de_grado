import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert } from 'antd'
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'

const { Title, Text } = Typography

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, registerError } = useAuth()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { name: string; email: string; password: string }) => {
    setLoading(true)
    try {
      await register(values)
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
            Crea tu cuenta
          </Title>
          <Text type="secondary">Comienza a practicar entrevistas técnicas</Text>
        </div>

        {registerError && (
          <Alert
            message={registerError.message}
            type="error"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="name"
            label="Nombre completo"
            rules={[{ required: true, message: 'Nombre requerido' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#9CA3AF' }} />}
              placeholder="Tu nombre"
            />
          </Form.Item>
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
            rules={[{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
              placeholder="Mínimo 8 caracteres"
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
              Crear cuenta
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">¿Ya tienes cuenta? </Text>
          <Link to="/login" style={{ fontWeight: 600 }}>
            Inicia sesión
          </Link>
        </div>
      </Card>
    </div>
  )
}
