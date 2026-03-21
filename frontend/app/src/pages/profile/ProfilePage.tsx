import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Typography,
  Form,
  Input,
  Button,
  Avatar,
  Tag,
  Divider,
  Row,
  Col,
  message,
} from 'antd'
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  CalendarOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../api/client'

const { Title, Text } = Typography

const roleLabelKeys: Record<string, string> = {
  student: 'roles.student',
  recruiter: 'roles.recruiter',
  admin: 'roles.admin',
}

const roleColors: Record<string, string> = {
  student: 'purple',
  recruiter: 'blue',
  admin: 'gold',
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()
  const [editingProfile, setEditingProfile] = useState(false)

  const updateProfileMutation = useMutation({
    mutationFn: (values: { name?: string; email?: string }) =>
      api.put<{
        id: number
        name: string
        email: string
        role: string
        createdAt: string
      }>('/auth/profile', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      setEditingProfile(false)
      messageApi.success(t('profile.profileUpdated'))
    },
    onError: (err: Error) => {
      messageApi.error(err.message || t('profile.updateError'))
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', values),
    onSuccess: () => {
      passwordForm.resetFields()
      messageApi.success(t('profile.passwordChanged'))
    },
    onError: (err: Error) => {
      messageApi.error(err.message || t('profile.passwordError'))
    },
  })

  if (!user) return null

  const createdDate = new Date(user.createdAt).toLocaleDateString('es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="vinki-page">
      {contextHolder}
      <div className="vinki-page-header">
        <Title level={3} className="vinki-page-title">
          {t('profile.title')}
        </Title>
      </div>

      <Row gutter={[24, 24]}>
        {/* Profile info card */}
        <Col xs={24} lg={14}>
          <Card className="vinki-card">
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}
            >
              <Avatar
                size={72}
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  flexShrink: 0,
                }}
                icon={<UserOutlined style={{ fontSize: 32 }} />}
              />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {user.name}
                </Title>
                <Text type="secondary" style={{ display: 'block', marginTop: 2 }}>
                  {user.email}
                </Text>
                <Tag color={roleColors[user.role]} style={{ marginTop: 8 }}>
                  {t(roleLabelKeys[user.role]) ?? user.role}
                </Tag>
              </div>
            </div>

            <Divider />

            {!editingProfile ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <UserOutlined style={{ fontSize: 16, color: '#7C3AED' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {t('profile.name')}
                      </Text>
                      <Text strong>{user.name}</Text>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MailOutlined style={{ fontSize: 16, color: '#7C3AED' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {t('profile.email')}
                      </Text>
                      <Text strong>{user.email}</Text>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <SafetyOutlined style={{ fontSize: 16, color: '#7C3AED' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {t('profile.role')}
                      </Text>
                      <Text strong>{t(roleLabelKeys[user.role]) ?? user.role}</Text>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CalendarOutlined style={{ fontSize: 16, color: '#7C3AED' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {t('profile.memberSince')}
                      </Text>
                      <Text strong>{createdDate}</Text>
                    </div>
                  </div>
                </div>
                <Button
                  type="primary"
                  style={{ marginTop: 24 }}
                  onClick={() => {
                    profileForm.setFieldsValue({ name: user.name, email: user.email })
                    setEditingProfile(true)
                  }}
                >
                  {t('profile.editProfile')}
                </Button>
              </div>
            ) : (
              <Form
                form={profileForm}
                layout="vertical"
                onFinish={(values) => updateProfileMutation.mutate(values)}
                initialValues={{ name: user.name, email: user.email }}
              >
                <Form.Item
                  name="name"
                  label={t('profile.name')}
                  rules={[{ required: true, message: t('profile.enterName') }]}
                >
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item
                  name="email"
                  label={t('profile.email')}
                  rules={[
                    { required: true, message: t('profile.enterEmail') },
                    { type: 'email', message: t('profile.invalidEmail') },
                  ]}
                >
                  <Input prefix={<MailOutlined />} />
                </Form.Item>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={updateProfileMutation.isPending}
                  >
                    {t('profile.saveChanges')}
                  </Button>
                  <Button onClick={() => setEditingProfile(false)}>Cancelar</Button>
                </div>
              </Form>
            )}
          </Card>
        </Col>

        {/* Change password card */}
        <Col xs={24} lg={10}>
          <Card className="vinki-card" title={t('profile.changePassword')}>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={(values) => changePasswordMutation.mutate(values)}
            >
              <Form.Item
                name="currentPassword"
                label={t('profile.currentPassword')}
                rules={[{ required: true, message: t('profile.enterCurrentPassword') }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label={t('profile.newPassword')}
                rules={[
                  { required: true, message: t('profile.enterNewPassword') },
                  { min: 6, message: 'Mínimo 6 caracteres' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label={t('profile.confirmNewPassword')}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: t('profile.confirmNewPasswordPlaceholder') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error(t('profile.passwordsNoMatch')))
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={changePasswordMutation.isPending}
                block
              >
                {t('profile.changePassword')}
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
