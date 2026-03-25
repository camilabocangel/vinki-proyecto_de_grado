import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Steps, Card, Select, Button, Typography, App, Row, Col, Tag } from 'antd'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'
import {
  LaptopOutlined,
  CloudServerOutlined,
  AppstoreOutlined,
  ToolOutlined,
  DatabaseOutlined,
  UserOutlined,
  CodeOutlined,
  BulbOutlined,
  TrophyOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  CrownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

interface CatalogItem {
  id: number
  name: string
}

const roleIcons: Record<string, React.ReactNode> = {
  'Backend Engineer': <CloudServerOutlined style={{ fontSize: 28 }} />,
  'Frontend Engineer': <LaptopOutlined style={{ fontSize: 28 }} />,
  'Full Stack Engineer': <AppstoreOutlined style={{ fontSize: 28 }} />,
  'Fullstack Engineer': <AppstoreOutlined style={{ fontSize: 28 }} />,
  'DevOps Engineer': <ToolOutlined style={{ fontSize: 28 }} />,
  'Data Engineer': <DatabaseOutlined style={{ fontSize: 28 }} />,
}

const roleDescriptions: Record<string, string> = {
  'Backend Engineer': 'APIs, databases, server logic',
  'Frontend Engineer': 'UI, UX, client-side frameworks',
  'Full Stack Engineer': 'End-to-end web development',
  'Fullstack Engineer': 'End-to-end web development',
  'DevOps Engineer': 'CI/CD, infrastructure, cloud',
  'Data Engineer': 'ETL, data pipelines, analytics',
}

const levelMeta: Record<
  string,
  { color: string; icon: React.ReactNode; years: string; tagline: string }
> = {
  Junior: {
    color: '#52c41a',
    icon: <RocketOutlined style={{ fontSize: 32 }} />,
    years: '0-2 years',
    tagline: 'Fundamentals',
  },
  Mid: {
    color: '#1677ff',
    icon: <SafetyCertificateOutlined style={{ fontSize: 32 }} />,
    years: '2-5 years',
    tagline: 'Practical experience',
  },
  Senior: {
    color: '#faad14',
    icon: <CrownOutlined style={{ fontSize: 32 }} />,
    years: '5+ years',
    tagline: 'Architecture & leadership',
  },
}

const stepIcons = [
  <UserOutlined />,
  <CodeOutlined />,
  <AppstoreOutlined />,
  <SafetyCertificateOutlined />,
  <PlayCircleOutlined />,
]

export default function InterviewWizardPage() {
  const { t } = useTranslation()
  usePageTitle(t('interview.configure'))
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
    queryKey: ['catalogs', 'languages', roleId],
    queryFn: () => api.get<CatalogItem[]>(`/catalogs/roles/${roleId}/languages`),
    enabled: !!roleId,
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

  const roleStep = (
    <Row gutter={[12, 12]}>
      {roles?.map((role) => (
        <Col xs={12} sm={8} key={role.id}>
          <Card
            hoverable
            onClick={() => {
              setRoleId(role.id)
              setLanguageId(undefined)
              setFrameworkId(undefined)
            }}
            style={{
              border:
                roleId === role.id
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
              textAlign: 'center',
              cursor: 'pointer',
              background: roleId === role.id ? 'var(--color-primary-bg)' : undefined,
              transition: 'all 0.25s ease',
              height: '100%',
            }}
            styles={{
              body: {
                padding: 16,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              },
            }}
          >
            <div
              style={{
                color: roleId === role.id ? 'var(--color-primary)' : 'var(--color-muted)',
                marginBottom: 8,
              }}
            >
              {roleIcons[role.name] || <UserOutlined style={{ fontSize: 28 }} />}
            </div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              {role.name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, minHeight: 18 }}>
              {roleDescriptions[role.name] || ''}
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  )

  const languageStep = (
    <Row gutter={[12, 12]}>
      {languages?.map((lang) => (
        <Col xs={12} sm={8} key={lang.id}>
          <Card
            hoverable
            onClick={() => {
              setLanguageId(lang.id)
              setFrameworkId(undefined)
            }}
            style={{
              border:
                languageId === lang.id
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
              textAlign: 'center',
              cursor: 'pointer',
              background: languageId === lang.id ? 'var(--color-primary-bg)' : undefined,
              transition: 'all 0.25s ease',
              height: '100%',
            }}
            styles={{
              body: {
                padding: 12,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              },
            }}
          >
            <div
              style={{
                color:
                  languageId === lang.id ? 'var(--color-primary)' : 'var(--color-muted)',
                marginBottom: 4,
              }}
            >
              <CodeOutlined style={{ fontSize: 22 }} />
            </div>
            <Text
              strong
              style={{
                display: 'block',
                fontFamily: "'Fira Code', 'Courier New', monospace",
                fontSize: 13,
              }}
            >
              {lang.name}
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  )

  const frameworkStep = (
    <div>
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
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        {t('interview.frameworkOptional', 'This step is optional — you can skip it.')}
      </Text>
    </div>
  )

  const levelStep = (
    <Row gutter={[16, 16]}>
      {levels?.map((level) => {
        const meta = levelMeta[level.name] || {
          color: '#999',
          icon: <SafetyCertificateOutlined style={{ fontSize: 32 }} />,
          years: '',
          tagline: '',
        }
        const isSelected = levelId === level.id
        return (
          <Col xs={24} sm={8} key={level.id}>
            <Card
              hoverable
              onClick={() => setLevelId(level.id)}
              style={{
                border: isSelected
                  ? `2px solid ${meta.color}`
                  : '1px solid var(--color-border)',
                textAlign: 'center',
                cursor: 'pointer',
                background: isSelected ? `${meta.color}08` : undefined,
                transition: 'all 0.25s ease',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ color: meta.color, marginBottom: 8 }}>{meta.icon}</div>
              <Tag color={meta.color} style={{ marginBottom: 8, fontWeight: 600 }}>
                {level.name}
              </Tag>
              <Text
                style={{ display: 'block', fontSize: 13, color: 'var(--color-muted)' }}
              >
                {meta.years}
              </Text>
              <Text
                type="secondary"
                style={{ display: 'block', fontSize: 12, marginTop: 4 }}
              >
                {meta.tagline}
              </Text>
            </Card>
          </Col>
        )
      })}
    </Row>
  )

  const modeStep = (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12}>
        <Card
          hoverable
          onClick={() => setMode('practice')}
          style={{
            border:
              mode === 'practice'
                ? '2px solid var(--color-primary)'
                : '1px solid var(--color-border)',
            textAlign: 'center',
            cursor: 'pointer',
            background: mode === 'practice' ? 'var(--color-primary-bg)' : undefined,
            transition: 'all 0.25s ease',
          }}
          styles={{ body: { padding: 24 } }}
        >
          <div
            style={{
              color: mode === 'practice' ? 'var(--color-primary)' : 'var(--color-muted)',
              marginBottom: 12,
            }}
          >
            <BulbOutlined style={{ fontSize: 36 }} />
          </div>
          <Text strong style={{ display: 'block', fontSize: 16, marginBottom: 4 }}>
            {t('interview.practiceMode')}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('interview.practiceModeDesc')}
          </Text>
        </Card>
      </Col>
      <Col xs={24} sm={12}>
        <Card
          hoverable
          onClick={() => setMode('evaluation')}
          style={{
            border:
              mode === 'evaluation'
                ? '2px solid var(--color-primary)'
                : '1px solid var(--color-border)',
            textAlign: 'center',
            cursor: 'pointer',
            background: mode === 'evaluation' ? 'var(--color-primary-bg)' : undefined,
            transition: 'all 0.25s ease',
          }}
          styles={{ body: { padding: 24 } }}
        >
          <div
            style={{
              color:
                mode === 'evaluation' ? 'var(--color-primary)' : 'var(--color-muted)',
              marginBottom: 12,
            }}
          >
            <TrophyOutlined style={{ fontSize: 36 }} />
          </div>
          <Text strong style={{ display: 'block', fontSize: 16, marginBottom: 4 }}>
            {t('interview.evaluationMode')}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('interview.evaluationModeDesc')}
          </Text>
        </Card>
      </Col>
    </Row>
  )

  // Validation: which steps require a selection before proceeding
  const canProceed = [
    !!roleId, // Step 0: Role required
    true, // Step 1: Language optional
    true, // Step 2: Framework optional
    !!levelId, // Step 3: Level required
    true, // Step 4: Mode has default
  ]

  const steps = [
    { title: t('interview.role'), content: roleStep },
    { title: t('interview.language'), content: languageStep },
    { title: t('interview.framework'), content: frameworkStep },
    { title: t('interview.level'), content: levelStep },
    { title: t('interview.mode'), content: modeStep },
  ]

  return (
    <div className="vinki-page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={3} className="vinki-page-title" style={{ marginBottom: 4 }}>
          {t('interview.configure')}
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          {t('interview.configureSubtitle')}
        </Text>
        <Text strong style={{ color: 'var(--color-primary)', fontSize: 14 }}>
          {t('interview.stepOf', {
            current: current + 1,
            total: steps.length,
            defaultValue: `Step ${current + 1} of ${steps.length}`,
          })}
        </Text>
      </div>

      <Steps
        current={current}
        items={steps.map((s, i) => ({ title: s.title, icon: stepIcons[i] }))}
        responsive={false}
        style={{ marginBottom: 32, overflowX: 'auto' }}
      />

      <div
        key={current}
        style={{
          animation: 'wizardFadeIn 0.3s ease',
        }}
      >
        <Card className="vinki-card" style={{ marginBottom: 24 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
            {steps[current].title}
          </Title>
          {steps[current].content}
        </Card>
      </div>

      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          {current > 0 && (
            <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrent(current - 1)}>
              {t('common.back')}
            </Button>
          )}
        </div>
        <div>
          {current < steps.length - 1 && (
            <Button
              type="primary"
              onClick={() => setCurrent(current + 1)}
              disabled={!canProceed[current]}
              style={{ minWidth: 120 }}
            >
              {t('common.next')} <ArrowRightOutlined />
            </Button>
          )}
          {current === steps.length - 1 && (
            <Button
              type="primary"
              onClick={() => createInterview.mutate()}
              loading={createInterview.isPending}
              disabled={!roleId || !levelId}
              style={{ minWidth: 160 }}
              size="large"
            >
              {t('interview.startInterview')}
            </Button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes wizardFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
