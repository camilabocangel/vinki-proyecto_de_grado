import { useState } from 'react'
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

const roleLabels: Record<string, string> = {
  student: 'Estudiante',
  recruiter: 'Reclutador',
  admin: 'Administrador',
}

const roleColors: Record<string, string> = {
  student: 'purple',
  recruiter: 'blue',
  admin: 'gold',
}

export default function ProfilePage() {
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
      messageApi.success('Perfil actualizado correctamente')
    },
    onError: (err: Error) => {
      messageApi.error(err.message || 'Error al actualizar perfil')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', values),
    onSuccess: () => {
      passwordForm.resetFields()
      messageApi.success('Contraseña cambiada correctamente')
    },
    onError: (err: Error) => {
      messageApi.error(err.message || 'Error al cambiar contraseña')
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
          Mi perfil
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
                  {roleLabels[user.role] ?? user.role}
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
                        Nombre
                      </Text>
                      <Text strong>{user.name}</Text>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MailOutlined style={{ fontSize: 16, color: '#7C3AED' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        Correo electrónico
                      </Text>
                      <Text strong>{user.email}</Text>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <SafetyOutlined style={{ fontSize: 16, color: '#7C3AED' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        Rol
                      </Text>
                      <Text strong>{roleLabels[user.role] ?? user.role}</Text>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CalendarOutlined style={{ fontSize: 16, color: '#7C3AED' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        Miembro desde
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
                  Editar perfil
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
                  label="Nombre"
                  rules={[{ required: true, message: 'Ingresa tu nombre' }]}
                >
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="Correo electrónico"
                  rules={[
                    { required: true, message: 'Ingresa tu correo' },
                    { type: 'email', message: 'Correo no válido' },
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
                    Guardar cambios
                  </Button>
                  <Button onClick={() => setEditingProfile(false)}>Cancelar</Button>
                </div>
              </Form>
            )}
          </Card>
        </Col>

        {/* Change password card */}
        <Col xs={24} lg={10}>
          <Card className="vinki-card" title="Cambiar contraseña">
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={(values) => changePasswordMutation.mutate(values)}
            >
              <Form.Item
                name="currentPassword"
                label="Contraseña actual"
                rules={[{ required: true, message: 'Ingresa tu contraseña actual' }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label="Nueva contraseña"
                rules={[
                  { required: true, message: 'Ingresa la nueva contraseña' },
                  { min: 6, message: 'Mínimo 6 caracteres' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Confirmar nueva contraseña"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Confirma la nueva contraseña' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('Las contraseñas no coinciden'))
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
                Cambiar contraseña
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
