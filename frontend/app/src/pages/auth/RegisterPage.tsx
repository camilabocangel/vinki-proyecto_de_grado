import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd'
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'
import { usePageTitle } from '../../hooks/usePageTitle'

const { Title, Text } = Typography

export default function RegisterPage() {
  const { t } = useTranslation()
  usePageTitle(t('auth.register'))
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
            {t('auth.register')}
          </Title>
          <Text type="secondary">{t('auth.registerSubtitle')}</Text>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>
              {t('auth.tagline')}
            </Text>
          </div>
        </div>

        {registerError && (
          <Alert
            message={registerError.message}
            type="error"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form
          layout="vertical"
          onFinish={onFinish}
          size="large"
          aria-label={t('auth.register')}
        >
          <Form.Item
            name="name"
            label={t('auth.fullName')}
            rules={[{ required: true, message: t('auth.nameRequired') }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'var(--color-muted)' }} />}
              placeholder="Tu nombre"
            />
          </Form.Item>
          <Form.Item
            name="email"
            label={t('auth.email')}
            rules={[{ required: true, type: 'email', message: t('auth.emailRequired') }]}
          >
            <Input
              prefix={<MailOutlined style={{ color: 'var(--color-muted)' }} />}
              placeholder="tu@email.com"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('auth.password')}
            rules={[
              { required: true, min: 8, message: t('auth.minChars', { count: 8 }) },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--color-muted)' }} />}
              placeholder={t('auth.minChars', { count: 8 })}
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
              {t('auth.register')}
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">{t('auth.hasAccount')} </Text>
          <Link to="/login" style={{ fontWeight: 600 }}>
            {t('auth.signIn')}
          </Link>
        </div>

        <div style={{ marginTop: 24, textAlign: 'left' }}>
          <Space direction="vertical" size="small">
            <Text>
              <CheckCircleOutlined
                style={{ color: 'var(--color-success)', marginRight: 8 }}
              />
              {t('auth.feature1')}
            </Text>
            <Text>
              <CheckCircleOutlined
                style={{ color: 'var(--color-success)', marginRight: 8 }}
              />
              {t('auth.feature2')}
            </Text>
            <Text>
              <CheckCircleOutlined
                style={{ color: 'var(--color-success)', marginRight: 8 }}
              />
              {t('auth.feature3')}
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  )
}
