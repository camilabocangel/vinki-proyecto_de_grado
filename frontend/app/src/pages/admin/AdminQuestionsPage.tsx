import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Card, Typography, Button, Space, Input, App, Popconfirm } from 'antd'
import {
  PlusOutlined,
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { api } from '../../api/client'

const { Title } = Typography

interface Question {
  id: number
  questionText: string
  type: string
  languageId: number
  frameworkId: number | null
  levelId: number
  skillId: number
  createdAt: string
}

interface PaginatedQuestions {
  data: Question[]
  total: number
  page: number
  limit: number
}

export default function AdminQuestionsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'questions', page, search],
    queryFn: () =>
      api.get<PaginatedQuestions>('/admin/questions', {
        page: String(page),
        limit: '20',
        ...(search && { q: search }),
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/questions/${id}`),
    onSuccess: () => {
      message.success(t('admin.questionDeleted'))
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] })
    },
  })

  const columns = [
    { title: t('table.id'), dataIndex: 'id', width: 60 },
    { title: t('table.question'), dataIndex: 'questionText', ellipsis: true },
    { title: t('table.type'), dataIndex: 'type', width: 100 },
    {
      title: t('table.actions'),
      width: 120,
      render: (_: unknown, record: Question) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} size="small" />
          <Popconfirm
            title={t('admin.deleteQuestion')}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="vinki-page">
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Title level={3} className="vinki-page-title">
          {t('admin.questionCatalog')}
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />}>
            {t('admin.newQuestion')}
          </Button>
          <Button icon={<UploadOutlined />}>{t('admin.import')}</Button>
        </Space>
      </Space>

      <Input.Search
        placeholder={t('admin.searchByText')}
        onSearch={setSearch}
        style={{ marginBottom: 16, maxWidth: 400 }}
        allowClear
      />

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
