import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Table, Card, Typography, Tag, Skeleton, Select, Button, Row, Col } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'

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

interface DashboardData {
  recentInterviews: InterviewRow[]
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

export default function FeedbackHistoryPage() {
  const { t } = useTranslation()
  usePageTitle(t('nav.history'))
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  })

  if (isLoading)
    return (
      <div className="vinki-page">
        <Skeleton.Input active style={{ width: 200, marginBottom: 8 }} />
        <Skeleton.Input active size="small" style={{ width: 300, marginBottom: 24 }} />
        <Card>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Skeleton.Input active style={{ width: '100%' }} />
            </Col>
          </Row>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    )

  const filteredInterviews = statusFilter
    ? data?.recentInterviews.filter((i) => i.evaluationStatus === statusFilter)
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
            {t('nav.history')}
          </Title>
          <Text type="secondary">
            {t('common.total')}: {filteredInterviews?.length ?? 0}{' '}
            {t('common.interviews')}
          </Text>
        </div>
      </div>

      <Card className="vinki-card">
        <div style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder={t('history.filterByStatus')}
            style={{ width: 200 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v ?? null)}
            options={[
              { label: t('status.completed'), value: 'completed' },
              { label: t('status.processing'), value: 'processing' },
              { label: t('status.pending'), value: 'pending' },
              { label: t('status.failed'), value: 'failed' },
            ]}
          />
        </div>
        <Table
          dataSource={filteredInterviews}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
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
