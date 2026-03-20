import { useState } from 'react'
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
      message.success('Pregunta eliminada')
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] })
    },
  })

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Pregunta', dataIndex: 'questionText', ellipsis: true },
    { title: 'Tipo', dataIndex: 'type', width: 100 },
    {
      title: 'Acciones',
      width: 120,
      render: (_: unknown, record: Question) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} size="small" />
          <Popconfirm
            title="¿Eliminar pregunta?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Title level={2}>Catálogo de preguntas</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />}>
            Nueva pregunta
          </Button>
          <Button icon={<UploadOutlined />}>Importar</Button>
        </Space>
      </Space>

      <Input.Search
        placeholder="Buscar por texto..."
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
