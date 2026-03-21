import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Table, Card, Typography, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { api } from '../../api/client'

const { Title } = Typography

interface AuditLogUser {
  id: number
  name: string
  email: string
  role: string
}

interface AuditLogEntry {
  id: number
  userId: number
  action: string
  entity: string
  entityId: number | null
  details: string | null
  createdAt: string
  user: AuditLogUser
}

interface PaginatedAuditLogs {
  data: AuditLogEntry[]
  total: number
  page: number
  limit: number
}

export default function AdminAuditPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', page],
    queryFn: () =>
      api.get<PaginatedAuditLogs>('/admin/audit-logs', {
        page: String(page),
        limit: String(pageSize),
      }),
  })

  const columns: ColumnsType<AuditLogEntry> = [
    {
      title: t('table.date'),
      dataIndex: 'createdAt',
      width: 180,
      render: (val: string) => new Date(val).toLocaleString(),
    },
    {
      title: t('table.name'),
      width: 160,
      render: (_: unknown, record: AuditLogEntry) => (
        <div>
          <div>{record.user.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
            {record.user.email}
          </div>
        </div>
      ),
    },
    {
      title: t('admin.action'),
      dataIndex: 'action',
      width: 120,
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: t('admin.entity'),
      dataIndex: 'entity',
      width: 120,
      render: (val: string) => <Tag>{val}</Tag>,
    },
    {
      title: t('table.id'),
      dataIndex: 'entityId',
      width: 80,
      render: (val: number | null) => val ?? '-',
    },
    {
      title: t('admin.details'),
      dataIndex: 'details',
      ellipsis: true,
      render: (val: string | null) => val ?? '-',
    },
  ]

  return (
    <div className="vinki-page">
      <Title level={3} className="vinki-page-title" style={{ marginBottom: 16 }}>
        {t('admin.auditTitle')}
      </Title>
      <Card>
        <Table
          dataSource={data?.data}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total: data?.total,
            pageSize,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  )
}
