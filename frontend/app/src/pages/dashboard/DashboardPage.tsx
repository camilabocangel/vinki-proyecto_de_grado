import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Col,
  Row,
  Typography,
  Button,
  Table,
  Tag,
  Skeleton,
  Badge,
  Progress,
  Select,
} from 'antd'
import { ThunderboltFilled, ArrowRightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useSSE } from '../../hooks/useSSE'
import ProgressChart from '../../components/ProgressChart'
import type { ProgressDataPoint } from '../../components/ProgressChart'

const { Title, Text } = Typography

interface InterviewRow {
  id: number
  startedAt: string
  finishedAt: string | null
  evaluationStatus: string
  roleName: string
  levelName: string
  languageName: string | null
  frameworkName: string | null
  questionCount: number
  avgScore: number | null
  detectedLevel: string | null
}

interface PercentileSkill {
  skillId: number
  skillName: string
  score: number
  percentile: number
  totalCandidates: number
}

interface PercentilesData {
  percentiles: PercentileSkill[]
  overall: {
    score: number
    percentile: number
    totalCandidates: number
  }
}

function percentileColor(p: number): string {
  if (p >= 75) return '#10B981'
  if (p >= 50) return '#3B82F6'
  if (p >= 25) return '#F97316'
  return '#EF4444'
}

interface DashboardData {
  user: { id: number; name: string; email: string; role: string }
  averageScore: number | null
  pendingNotifications: number
  recentInterviews: InterviewRow[]
  skillScores: Array<{
    skillId: number
    skillName: string
    score: number
    lastUpdated: string
  }>
}

const statusConfig: Record<string, { color: string; labelKey: string }> = {
  pending: { color: 'default', labelKey: 'status.pending' },
  processing: { color: 'purple', labelKey: 'status.processing' },
  completed: { color: 'green', labelKey: 'status.completed' },
  failed: { color: 'red', labelKey: 'status.failed' },
}

const levelColors: Record<string, string> = {
  Junior: 'green',
  Mid: 'blue',
  Senior: 'gold',
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  useSSE()

  const [roleFilter, setRoleFilter] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  })

  const { data: percentilesData } = useQuery({
    queryKey: ['percentiles'],
    queryFn: () => api.get<PercentilesData>('/percentiles'),
  })

  const { data: progressData } = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.get<{ progress: ProgressDataPoint[] }>('/progress'),
  })

  if (isLoading)
    return (
      <div className="vinki-page">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )

  const scorePercent = data?.averageScore ? Math.round((data.averageScore / 5) * 100) : 0

  // Unique roles for filter
  const roles = [...new Set(data?.recentInterviews.map((i) => i.roleName) ?? [])]

  const filteredInterviews = roleFilter
    ? data?.recentInterviews.filter((i) => i.roleName === roleFilter)
    : data?.recentInterviews

  const columns = [
    {
      title: t('table.date'),
      dataIndex: 'startedAt',
      width: 120,
      render: (v: string) =>
        new Date(v).toLocaleDateString('es', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
    {
      title: t('table.role'),
      dataIndex: 'roleName',
      width: 140,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: t('table.chosenLevel'),
      dataIndex: 'levelName',
      width: 110,
      render: (v: string) => <Tag color={levelColors[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: t('table.technology'),
      width: 160,
      render: (_: unknown, record: InterviewRow) => {
        const parts = [record.languageName, record.frameworkName].filter(Boolean)
        return parts.length > 0 ? parts.join(' / ') : '-'
      },
    },
    {
      title: t('table.questions'),
      dataIndex: 'questionCount',
      width: 90,
      align: 'center' as const,
    },
    {
      title: t('table.score'),
      dataIndex: 'avgScore',
      width: 90,
      align: 'center' as const,
      render: (v: number | null) =>
        v != null ? (
          <Text
            strong
            style={{ color: v >= 3.5 ? '#10B981' : v >= 2.5 ? '#F97316' : '#EF4444' }}
          >
            {v.toFixed(1)}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: t('table.aiLevel'),
      dataIndex: 'detectedLevel',
      width: 100,
      render: (v: string | null) =>
        v ? (
          <Tag color={levelColors[v] ?? 'default'}>{v}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: t('table.status'),
      dataIndex: 'evaluationStatus',
      width: 110,
      render: (status: string) => {
        const cfg = statusConfig[status] || statusConfig.pending
        return <Tag color={cfg.color}>{t(cfg.labelKey)}</Tag>
      },
    },
    {
      title: t('table.duration'),
      width: 100,
      render: (_: unknown, record: InterviewRow) => {
        if (!record.finishedAt)
          return <Text type="secondary">{t('table.inProgress')}</Text>
        const ms =
          new Date(record.finishedAt).getTime() - new Date(record.startedAt).getTime()
        const mins = Math.round(ms / 60000)
        return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`
      },
    },
    {
      title: '',
      width: 130,
      render: (_: unknown, record: InterviewRow) => (
        <Button
          type="link"
          size="small"
          icon={<ArrowRightOutlined />}
          onClick={() =>
            record.evaluationStatus === 'completed'
              ? navigate(`/feedback/${record.id}`)
              : navigate(`/interview/${record.id}`)
          }
        >
          {record.evaluationStatus === 'completed'
            ? t('table.viewReport')
            : t('table.continue')}
        </Button>
      ),
    },
  ]

  return (
    <div className="vinki-page">
      <div className="vinki-page-header">
        <div>
          <Title level={3} className="vinki-page-title">
            {t('dashboard.greeting', { name: data?.user.name?.split(' ')[0] })}
          </Title>
          <Text type="secondary">{t('dashboard.subtitle')}</Text>
        </div>
        <Badge count={data?.pendingNotifications} offset={[-5, 5]}>
          <Button
            type="primary"
            icon={<ThunderboltFilled />}
            size="large"
            onClick={() => navigate('/interview/new')}
          >
            {t('dashboard.startSimulation')}
          </Button>
        </Badge>
      </div>

      {/* Score Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card className="vinki-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Progress
                type="circle"
                percent={scorePercent}
                size={64}
                strokeColor="#7C3AED"
                format={() => (
                  <Text strong style={{ fontSize: 18 }}>
                    {data?.averageScore?.toFixed(1) ?? '-'}
                  </Text>
                )}
              />
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {t('dashboard.aiScore')}
                </Text>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-success)',
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {t('dashboard.outOf')}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="vinki-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Progress
                type="circle"
                percent={
                  data?.recentInterviews.length
                    ? (data.recentInterviews.length / 10) * 100
                    : 0
                }
                size={64}
                strokeColor="#F97316"
                format={() => (
                  <Text strong style={{ fontSize: 18 }}>
                    {data?.recentInterviews.length ?? 0}
                  </Text>
                )}
              />
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {t('dashboard.interviewsDone')}
                </Text>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {t('dashboard.done')}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="vinki-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Progress
                type="circle"
                percent={100}
                size={64}
                strokeColor={data?.pendingNotifications ? '#F59E0B' : '#10B981'}
                format={() => (
                  <Text strong style={{ fontSize: 18 }}>
                    {data?.pendingNotifications ?? 0}
                  </Text>
                )}
              />
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {t('dashboard.pending')}
                </Text>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-muted)',
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {t('dashboard.evaluations')}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Skills */}
      {data?.skillScores && data.skillScores.length > 0 && (
        <Card
          className="vinki-card"
          title={t('dashboard.skills')}
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[24, 16]}>
            {data.skillScores.map((skill) => (
              <Col xs={24} sm={12} key={skill.skillId}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {skill.skillName.replace(/-/g, ' ')}
                  </Text>
                  <Text strong>{skill.score.toFixed(0)}%</Text>
                </div>
                <Progress
                  percent={skill.score}
                  showInfo={false}
                  strokeColor={
                    skill.score >= 80
                      ? '#10B981'
                      : skill.score >= 50
                        ? '#7C3AED'
                        : '#F97316'
                  }
                  size="small"
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Progress chart */}
      {progressData && progressData.progress.length >= 2 && (
        <Card
          className="vinki-card"
          title={t('dashboard.progress')}
          style={{ marginBottom: 24 }}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {t('dashboard.progressSubtitle')}
          </Text>
          <ProgressChart data={progressData.progress} />
        </Card>
      )}

      {/* Anonymous percentile comparison */}
      {percentilesData && percentilesData.percentiles.length > 0 && (
        <Card
          className="vinki-card"
          title={t('dashboard.comparison')}
          style={{ marginBottom: 24 }}
        >
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={percentilesData.overall.percentile}
              size={80}
              strokeColor={percentileColor(percentilesData.overall.percentile)}
              format={() => (
                <Text strong style={{ fontSize: 18 }}>
                  {percentilesData.overall.percentile}%
                </Text>
              )}
            />
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ fontSize: 15 }}>
                {t('dashboard.topPercent', {
                  percent: 100 - percentilesData.overall.percentile,
                })}
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('dashboard.ofCandidates', {
                total: percentilesData.overall.totalCandidates,
              })}
            </Text>
          </div>
          <Row gutter={[24, 16]}>
            {percentilesData.percentiles.map((skill) => (
              <Col xs={24} sm={12} key={skill.skillId}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {skill.skillName.replace(/-/g, ' ')}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('dashboard.ofCandidates', {
                      total: skill.totalCandidates,
                    })}
                  </Text>
                </div>
                <Progress
                  percent={skill.percentile}
                  strokeColor={percentileColor(skill.percentile)}
                  size="small"
                  format={(p) => `${p}%`}
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Recent interviews */}
      <Card
        className="vinki-card"
        title={t('dashboard.interviewHistory')}
        extra={
          roles.length > 1 && (
            <Select
              allowClear
              placeholder={t('dashboard.filterByRole')}
              style={{ width: 180 }}
              value={roleFilter}
              onChange={(v) => setRoleFilter(v ?? null)}
              options={roles.map((r) => ({ label: r, value: r }))}
            />
          )
        }
      >
        <Table
          dataSource={filteredInterviews}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (total) => `${total} ${t('common.interviews')}`,
          }}
          size="middle"
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  )
}
