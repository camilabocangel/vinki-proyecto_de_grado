import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Card,
  Typography,
  Button,
  Space,
  App,
  Popconfirm,
  Modal,
  Select,
  Form,
  Input,
  Tag,
  List,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { api } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'

const { Title, Text } = Typography
const { TextArea } = Input

interface KnowledgeDocument {
  id: number
  title: string
  sourceUrl: string | null
  status: string
  languageId: number | null
  frameworkId: number | null
  uploadedById: number
  createdAt: string
  updatedAt: string
  chunkCount: number
  uploadedBy: { name: string }
  language: { name: string } | null
  framework: { name: string } | null
}

interface CatalogItem {
  id: number
  name: string
}

interface SearchResult {
  content: string
  distance: number
  documentTitle: string
}

export default function KnowledgeBasePage() {
  const { t } = useTranslation()
  usePageTitle(t('nav.knowledgeBase'))
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const [ingestModalOpen, setIngestModalOpen] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedLanguageId, setSelectedLanguageId] = useState<number | undefined>()
  const [form] = Form.useForm()

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<KnowledgeDocument[]>({
    queryKey: ['knowledge-documents'],
    queryFn: () => api.get('/knowledge'),
  })

  // Fetch catalogs
  const { data: languages = [] } = useQuery<CatalogItem[]>({
    queryKey: ['catalogs', 'languages'],
    queryFn: () => api.get('/catalogs/languages'),
  })

  const { data: frameworks = [] } = useQuery<CatalogItem[]>({
    queryKey: ['catalogs', 'frameworks', selectedLanguageId],
    queryFn: () =>
      selectedLanguageId
        ? api.get(`/catalogs/languages/${selectedLanguageId}/frameworks`)
        : Promise.resolve([]),
    enabled: !!selectedLanguageId,
  })

  // Ingest mutation
  const ingestMutation = useMutation({
    mutationFn: (data: {
      title: string
      content: string
      sourceUrl?: string
      languageId?: number
      frameworkId?: number
    }) => api.post('/knowledge', data),
    onSuccess: () => {
      message.success('Documento ingresado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] })
      setIngestModalOpen(false)
      form.resetFields()
    },
    onError: () => {
      message.error('Error al ingresar documento')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/knowledge/${id}`),
    onSuccess: () => {
      message.success('Documento eliminado')
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] })
    },
    onError: () => {
      message.error('Error al eliminar documento')
    },
  })

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await api.post<{ results: SearchResult[] }>('/knowledge/search', {
        query: searchQuery,
        limit: 5,
      })
      setSearchResults(res.results)
    } catch {
      message.error('Error en la búsqueda')
    } finally {
      setSearching(false)
    }
  }

  const handleIngestSubmit = () => {
    form.validateFields().then((values) => {
      ingestMutation.mutate({
        title: values.title,
        content: values.content,
        sourceUrl: values.sourceUrl || undefined,
        languageId: values.languageId || undefined,
        frameworkId: values.frameworkId || undefined,
      })
    })
  }

  const statusColors: Record<string, string> = {
    ready: 'green',
    processing: 'blue',
    pending: 'orange',
    failed: 'red',
  }

  const columns = [
    {
      title: 'Título',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Lenguaje',
      key: 'language',
      width: 120,
      render: (_: unknown, record: KnowledgeDocument) => record.language?.name ?? '-',
    },
    {
      title: 'Framework',
      key: 'framework',
      width: 120,
      render: (_: unknown, record: KnowledgeDocument) => record.framework?.name ?? '-',
    },
    {
      title: 'Chunks',
      dataIndex: 'chunkCount',
      key: 'chunkCount',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Subido por',
      key: 'uploadedBy',
      width: 140,
      render: (_: unknown, record: KnowledgeDocument) => record.uploadedBy?.name ?? '-',
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: KnowledgeDocument) => (
        <Popconfirm
          title="¿Eliminar este documento?"
          onConfirm={() => deleteMutation.mutate(record.id)}
          okText="Sí"
          cancelText="No"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          {t('nav.knowledgeBase')}
        </Title>
        <Space>
          <Button icon={<SearchOutlined />} onClick={() => setSearchModalOpen(true)}>
            Buscar
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIngestModalOpen(true)}
          >
            Agregar documento
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          dataSource={documents}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Ingest Modal */}
      <Modal
        title="Agregar documento al Knowledge Base"
        open={ingestModalOpen}
        onCancel={() => {
          setIngestModalOpen(false)
          form.resetFields()
          setSelectedLanguageId(undefined)
        }}
        onOk={handleIngestSubmit}
        confirmLoading={ingestMutation.isPending}
        okText="Ingresar"
        cancelText="Cancelar"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Título"
            rules={[{ required: true, message: 'El título es requerido' }]}
          >
            <Input placeholder="Ej: Guía de Node.js Event Loop" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Contenido"
            rules={[{ required: true, message: 'El contenido es requerido' }]}
          >
            <TextArea
              rows={10}
              placeholder="Pega aquí el contenido técnico (documentación, tutoriales, best practices...)"
            />
          </Form.Item>

          <Form.Item name="sourceUrl" label="URL fuente (opcional)">
            <Input placeholder="https://docs.example.com/..." />
          </Form.Item>

          <Space size="large">
            <Form.Item name="languageId" label="Lenguaje">
              <Select
                placeholder="Seleccionar"
                allowClear
                style={{ width: 200 }}
                onChange={(val) => {
                  setSelectedLanguageId(val)
                  form.setFieldValue('frameworkId', undefined)
                }}
                options={languages.map((l) => ({ label: l.name, value: l.id }))}
              />
            </Form.Item>

            <Form.Item name="frameworkId" label="Framework">
              <Select
                placeholder="Seleccionar"
                allowClear
                style={{ width: 200 }}
                disabled={!selectedLanguageId}
                options={frameworks.map((f) => ({ label: f.name, value: f.id }))}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Search Modal */}
      <Modal
        title="Búsqueda semántica en Knowledge Base"
        open={searchModalOpen}
        onCancel={() => {
          setSearchModalOpen(false)
          setSearchResults([])
          setSearchQuery('')
        }}
        footer={null}
        width={700}
      >
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            placeholder="Escribe tu consulta (ej: 'event loop en Node.js')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={searching}
          >
            Buscar
          </Button>
        </Space.Compact>

        {searchResults.length > 0 && (
          <List
            dataSource={searchResults}
            renderItem={(item, index) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <Text strong>
                      #{index + 1} — {item.documentTitle}
                    </Text>
                    <Tag color="blue">Distancia: {Number(item.distance).toFixed(4)}</Tag>
                  </div>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 13,
                      display: 'block',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 120,
                      overflow: 'auto',
                    }}
                  >
                    {item.content}
                  </Text>
                </div>
              </List.Item>
            )}
          />
        )}

        {searchResults.length === 0 && searchQuery && !searching && (
          <Text type="secondary">No se encontraron resultados</Text>
        )}
      </Modal>
    </div>
  )
}
