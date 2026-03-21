import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Table, Card, Typography, Select, Space, Button } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

const { Title } = Typography

interface StudentItem {
  id: number
  name: string
  email: string
  totalInterviews: number
  averageScore: number | null
  lastInterviewAt: string | null
}

interface PaginatedResponse {
  data: StudentItem[]
  total: number
  page: number
  limit: number
}

export default function RecruiterDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [levelId, setLevelId] = useState<number>()

  const { data: levels } = useQuery({
    queryKey: ['catalogs', 'levels'],
    queryFn: () => api.get<{ id: number; name: string }[]>('/catalogs/levels'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter', 'students', page, levelId],
    queryFn: () =>
      api.get<PaginatedResponse>('/recruiter/students', {
        page: String(page),
        limit: '20',
        ...(levelId && { levelId: String(levelId) }),
      }),
  })

  const columns = [
    { title: t('table.name'), dataIndex: 'name' },
    { title: t('table.email'), dataIndex: 'email' },
    { title: t('table.interviews'), dataIndex: 'totalInterviews' },
    {
      title: t('table.avgScore'),
      dataIndex: 'averageScore',
      render: (v: number | null) => (v != null ? v.toFixed(1) : '-'),
    },
    {
      title: t('table.actions'),
      render: (_: unknown, record: StudentItem) => (
        <Button type="link" onClick={() => navigate(`/recruiter/students/${record.id}`)}>
          {t('table.viewProfile')}
        </Button>
      ),
    },
  ]

  return (
    <div className="vinki-page">
      <Title level={3} className="vinki-page-title">
        {t('recruiter.panel')}
      </Title>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder={t('recruiter.filterByLevel')}
          allowClear
          onChange={setLevelId}
          options={levels?.map((l) => ({ label: l.name, value: l.id }))}
          style={{ width: 200 }}
        />
        <Button icon={<DownloadOutlined />}>{t('recruiter.exportCSV')}</Button>
      </Space>

      <Card>
        <Table
          dataSource={data?.data}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total: data?.total,
            pageSize: 20,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  )
}
