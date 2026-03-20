import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Steps, Card, Select, Button, Typography, Space, App } from 'antd'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../api/client'

const { Title, Text } = Typography

interface CatalogItem {
  id: number
  name: string
}

export default function InterviewWizardPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [current, setCurrent] = useState(0)
  const [roleId, setRoleId] = useState<number>()
  const [languageId, setLanguageId] = useState<number>()
  const [frameworkId, setFrameworkId] = useState<number>()
  const [levelId, setLevelId] = useState<number>()

  const { data: roles } = useQuery({
    queryKey: ['catalogs', 'roles'],
    queryFn: () => api.get<CatalogItem[]>('/catalogs/roles'),
  })

  const { data: languages } = useQuery({
    queryKey: ['catalogs', 'languages'],
    queryFn: () => api.get<CatalogItem[]>('/catalogs/languages'),
  })

  const { data: frameworks } = useQuery({
    queryKey: ['catalogs', 'frameworks', languageId],
    queryFn: () => api.get<CatalogItem[]>(`/catalogs/languages/${languageId}/frameworks`),
    enabled: !!languageId,
  })

  const { data: levels } = useQuery({
    queryKey: ['catalogs', 'levels'],
    queryFn: () => api.get<CatalogItem[]>('/catalogs/levels'),
  })

  const createInterview = useMutation({
    mutationFn: () =>
      api.post<{ id: number }>('/interviews', {
        roleId,
        languageId,
        frameworkId,
        chosenLevelId: levelId,
      }),
    onSuccess: (data) => {
      navigate(`/interview/${data.id}`)
    },
    onError: (err: Error) => {
      message.error(err.message)
    },
  })

  const steps = [
    {
      title: 'Rol',
      content: (
        <Select
          placeholder="Selecciona un rol"
          value={roleId}
          onChange={setRoleId}
          options={roles?.map((r) => ({ label: r.name, value: r.id }))}
          style={{ width: '100%' }}
          size="large"
        />
      ),
    },
    {
      title: 'Lenguaje',
      content: (
        <Select
          placeholder="Selecciona un lenguaje"
          value={languageId}
          onChange={(v) => {
            setLanguageId(v)
            setFrameworkId(undefined)
          }}
          options={languages?.map((l) => ({ label: l.name, value: l.id }))}
          style={{ width: '100%' }}
          size="large"
          allowClear
        />
      ),
    },
    {
      title: 'Framework',
      content: (
        <Select
          placeholder="Selecciona un framework (opcional)"
          value={frameworkId}
          onChange={setFrameworkId}
          options={frameworks?.map((f) => ({ label: f.name, value: f.id }))}
          style={{ width: '100%' }}
          size="large"
          allowClear
          disabled={!languageId}
        />
      ),
    },
    {
      title: 'Nivel',
      content: (
        <Select
          placeholder="Selecciona tu nivel"
          value={levelId}
          onChange={setLevelId}
          options={levels?.map((l) => ({ label: l.name, value: l.id }))}
          style={{ width: '100%' }}
          size="large"
        />
      ),
    },
  ]

  return (
    <div className="vinki-page" style={{ maxWidth: 640, margin: '0 auto' }}>
      <Title level={3} className="vinki-page-title">
        Configurar entrevista
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Selecciona los parámetros de tu sesión de práctica.
      </Text>

      <Steps
        current={current}
        items={steps.map((s) => ({ title: s.title }))}
        style={{ marginBottom: 24 }}
      />

      <Card className="vinki-card" style={{ marginBottom: 24 }}>
        {steps[current].content}
      </Card>

      <Space>
        {current > 0 && <Button onClick={() => setCurrent(current - 1)}>Anterior</Button>}
        {current < steps.length - 1 && (
          <Button type="primary" onClick={() => setCurrent(current + 1)}>
            Siguiente
          </Button>
        )}
        {current === steps.length - 1 && (
          <Button
            type="primary"
            onClick={() => createInterview.mutate()}
            loading={createInterview.isPending}
            disabled={!roleId || !levelId}
          >
            Iniciar entrevista
          </Button>
        )}
      </Space>
    </div>
  )
}
