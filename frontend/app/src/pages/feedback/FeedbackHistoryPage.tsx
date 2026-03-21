import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Table, Card, Typography, Tag, Skeleton } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

const { Title } = Typography

interface DashboardData {
  recentInterviews: Array<{
    id: number
    startedAt: string
    finishedAt: string | null
    evaluationStatus: string
  }>
}

export default function FeedbackHistoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  })

  if (isLoading) return <Skeleton active />

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>{t('nav.history')}</Title>
      <Card>
        <Table
          dataSource={data?.recentInterviews}
          rowKey="id"
          onRow={(record) => ({
            onClick: () => navigate(`/feedback/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
            {
              title: t('table.date'),
              dataIndex: 'startedAt',
              render: (v: string) => new Date(v).toLocaleDateString('es'),
            },
            {
              title: t('table.status'),
              dataIndex: 'evaluationStatus',
              render: (v: string) => <Tag>{v}</Tag>,
            },
          ]}
          pagination={false}
        />
      </Card>
    </div>
  )
}
