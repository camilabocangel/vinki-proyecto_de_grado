import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert, Layout } from 'antd'
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'

const { Title, Paragraph } = Typography

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
        <Paragraph style={{ textAlign: 'center' }}>Crea tu cuenta</Paragraph>

        {registerError && (
          <Alert
            message={registerError.message}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            rules={[{ required: true, message: 'Nombre requerido' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nombre completo" size="large" />
          </Form.Item>
          <Form.Item
            name="email"
            rules={[{ required: true, type: 'email', message: 'Email válido requerido' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Contraseña"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Registrarse
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Link to="/login">¿Ya tienes cuenta? Inicia sesión</Link>
        </div>
      </Card>
    </Layout>
  )
}
