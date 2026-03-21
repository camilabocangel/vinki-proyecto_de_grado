import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Steps, Card, Select, Button, Typography, Space, App, Radio } from 'antd'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../api/client'

const { Title, Text } = Typography

interface CatalogItem {
  id: number
  name: string
}

export default function InterviewWizardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [current, setCurrent] = useState(0)
  const [roleId, setRoleId] = useState<number>()
  const [languageId, setLanguageId] = useState<number>()
  const [frameworkId, setFrameworkId] = useState<number>()
  const [levelId, setLevelId] = useState<number>()
  const [mode, setMode] = useState<string>('evaluation')

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
        mode,
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
      title: t('interview.role'),
      content: (
        <Select
          placeholder={t('interview.selectRole')}
          value={roleId}
          onChange={setRoleId}
          options={roles?.map((r) => ({ label: r.name, value: r.id }))}
          style={{ width: '100%' }}
          size="large"
        />
      ),
    },
    {
      title: t('interview.language'),
      content: (
        <Select
          placeholder={t('interview.selectLanguage')}
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
      title: t('interview.framework'),
      content: (
        <Select
          placeholder={t('interview.selectFramework')}
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
      title: t('interview.level'),
      content: (
        <Select
          placeholder={t('interview.selectLevel')}
          value={levelId}
          onChange={setLevelId}
          options={levels?.map((l) => ({ label: l.name, value: l.id }))}
          style={{ width: '100%' }}
          size="large"
        />
      ),
    },
    {
      title: t('interview.mode'),
      content: (
        <Radio.Group
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio.Button
              value="practice"
              style={{
                display: 'block',
                height: 'auto',
                padding: '12px 16px',
                whiteSpace: 'normal',
              }}
            >
              <Text strong>{t('interview.practiceMode')}</Text>
              <br />
              <Text type="secondary">{t('interview.practiceModeDesc')}</Text>
            </Radio.Button>
            <Radio.Button
              value="evaluation"
              style={{
                display: 'block',
                height: 'auto',
                padding: '12px 16px',
                whiteSpace: 'normal',
              }}
            >
              <Text strong>{t('interview.evaluationMode')}</Text>
              <br />
              <Text type="secondary">{t('interview.evaluationModeDesc')}</Text>
            </Radio.Button>
          </Space>
        </Radio.Group>
      ),
    },
  ]

  return (
    <div className="vinki-page" style={{ maxWidth: 640, margin: '0 auto' }}>
      <Title level={3} className="vinki-page-title">
        {t('interview.configure')}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {t('interview.configureSubtitle')}
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
        {current > 0 && (
          <Button onClick={() => setCurrent(current - 1)}>{t('common.back')}</Button>
        )}
        {current < steps.length - 1 && (
          <Button type="primary" onClick={() => setCurrent(current + 1)}>
            {t('common.next')}
          </Button>
        )}
        {current === steps.length - 1 && (
          <Button
            type="primary"
            onClick={() => createInterview.mutate()}
            loading={createInterview.isPending}
            disabled={!roleId || !levelId}
          >
            {t('interview.startInterview')}
          </Button>
        )}
      </Space>
    </div>
  )
}
