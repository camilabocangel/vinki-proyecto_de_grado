import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd'
import { MailOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'
import { usePageTitle } from '../../hooks/usePageTitle'
import { getRoleHome } from '../../lib/roleHome'
import sunSvg from '../../assets/svg/sun.svg'
import wavesSvg from '../../assets/svg/waves.svg'
import arcosSvg from '../../assets/svg/arcos.svg'
import circlesSvg from '../../assets/svg/circles.svg'
import trianglesSvg from '../../assets/svg/traingles.svg'
import './authPage.css'

const { Title, Text } = Typography

export default function LoginPage() {
  const { t } = useTranslation()
  usePageTitle(t('auth.login'))
  const navigate = useNavigate()
  const { login, loginError } = useAuth()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const result = await login(values)
      navigate(getRoleHome(result.user?.role))
    } catch {
      // error handled by mutation
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="vinki-auth-page">
      <img src={sunSvg} alt="" className="vinki-auth-deco vinki-auth-deco-sun" aria-hidden="true" />
      <img src={wavesSvg} alt="" className="vinki-auth-deco vinki-auth-deco-waves" aria-hidden="true" />
      <img src={arcosSvg} alt="" className="vinki-auth-deco vinki-auth-deco-arcos" aria-hidden="true" />
      <img src={circlesSvg} alt="" className="vinki-auth-deco vinki-auth-deco-circles" aria-hidden="true" />
      <img src={trianglesSvg} alt="" className="vinki-auth-deco vinki-auth-deco-triangles" aria-hidden="true" />
      <Card className="vinki-auth-card" styles={{ body: { padding: '40px 36px' } }}>
        <div className="vinki-auth-logo">
          <h3 style={{ marginBottom: 4, color: '#dbf227', fontWeight: 600, fontSize: '2rem' }}>
            {t('auth.hello')}
          </h3>
          <Text style={{ color: '#f3f4f1', display: 'block' }}>{t('auth.welcomeTo')}</Text>
          <Text style={{ color: '#f3f4f1', display: 'block' }}>{t('auth.tagline')}</Text>
        </div>

        {loginError && (
          <Alert
            message={loginError.message}
            type="error"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form
          layout="vertical"
          onFinish={onFinish}
          size="large"
          aria-label={t('auth.login')}
        >
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
            rules={[{ required: true, message: t('auth.passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--color-muted)' }} />}
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
              {t('auth.login')}
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">{t('auth.noAccount')} </Text>
          <Link to="/register" style={{ fontWeight: 600 }}>
            {t('auth.signUp')}
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
