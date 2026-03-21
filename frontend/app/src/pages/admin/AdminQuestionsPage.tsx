import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Card,
  Typography,
  Button,
  Space,
  Input,
  App,
  Popconfirm,
  Modal,
  Select,
  InputNumber,
  Checkbox,
  List,
  Spin,
} from 'antd'
import {
  PlusOutlined,
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
  RobotOutlined,
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

interface CatalogItem {
  id: number
  name: string
}

export default function AdminQuestionsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  // AI Generation modal state
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<string | undefined>(undefined)
  const [language, setLanguage] = useState<string | undefined>(undefined)
  const [count, setCount] = useState(5)
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'questions', page, search],
    queryFn: () =>
      api.get<PaginatedQuestions>('/admin/questions', {
        page: String(page),
        limit: '20',
        ...(search && { q: search }),
      }),
  })

  const { data: levels } = useQuery({
    queryKey: ['catalogs', 'levels'],
    queryFn: () => api.get<CatalogItem[]>('/catalogs/levels'),
  })

  const { data: languages } = useQuery({
    queryKey: ['catalogs', 'languages'],
    queryFn: () => api.get<CatalogItem[]>('/catalogs/languages'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/questions/${id}`),
    onSuccess: () => {
      message.success(t('admin.questionDeleted'))
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] })
    },
  })

  const generateMutation = useMutation({
    mutationFn: (params: {
      topic: string
      level: string
      language: string
      count: number
    }) => api.post<{ questions: string[] }>('/catalogs/questions/generate', params),
    onSuccess: (data) => {
      setGeneratedQuestions(data.questions)
      setSelectedQuestions(new Set(data.questions.map((_, i) => i)))
      message.success(t('admin.questionsGenerated'))
    },
  })

  const addQuestionsMutation = useMutation({
    mutationFn: (questions: string[]) =>
      Promise.all(
        questions.map((q) =>
          api.post('/admin/questions', {
            questionText: q,
            type: 'open',
            levelId: levels?.find((l) => l.name === level)?.id,
            languageId: languages?.find((l) => l.name === language)?.id,
          }),
        ),
      ),
    onSuccess: () => {
      message.success(t('common.success'))
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] })
      handleCloseModal()
    },
  })

  const handleGenerate = () => {
    if (!topic || !level || !language) return
    generateMutation.mutate({ topic, level, language, count })
  }

  const handleAddSelected = () => {
    const selected = generatedQuestions.filter((_, i) => selectedQuestions.has(i))
    if (selected.length === 0) {
      message.warning(t('admin.noQuestionsSelected'))
      return
    }
    addQuestionsMutation.mutate(selected)
  }

  const handleCloseModal = () => {
    setAiModalOpen(false)
    setTopic('')
    setLevel(undefined)
    setLanguage(undefined)
    setCount(5)
    setGeneratedQuestions([])
    setSelectedQuestions(new Set())
  }

  const toggleQuestion = (index: number) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

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
          <Button icon={<RobotOutlined />} onClick={() => setAiModalOpen(true)}>
            {t('admin.generateWithAI')}
          </Button>
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

      <Modal
        title={t('admin.generateWithAI')}
        open={aiModalOpen}
        onCancel={handleCloseModal}
        width={640}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>
              {t('admin.topic')}
            </label>
            <Input
              placeholder="React hooks, SQL optimization..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>
              {t('interview.level')}
            </label>
            <Select
              placeholder={t('admin.selectLevel')}
              style={{ width: '100%' }}
              value={level}
              onChange={setLevel}
              options={levels?.map((l) => ({ label: l.name, value: l.name }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>
              {t('interview.language')}
            </label>
            <Select
              placeholder={t('admin.selectLanguage')}
              style={{ width: '100%' }}
              value={language}
              onChange={setLanguage}
              options={languages?.map((l) => ({ label: l.name, value: l.name }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>
              {t('admin.count')}
            </label>
            <InputNumber
              min={1}
              max={10}
              value={count}
              onChange={(v) => setCount(v ?? 5)}
              style={{ width: '100%' }}
            />
          </div>

          <Button
            type="primary"
            onClick={handleGenerate}
            loading={generateMutation.isPending}
            disabled={!topic || !level || !language}
            block
          >
            {generateMutation.isPending
              ? t('admin.generating')
              : t('admin.generateWithAI')}
          </Button>

          {generateMutation.isPending && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <Spin />
            </div>
          )}

          {generatedQuestions.length > 0 && (
            <>
              <Title level={5}>{t('admin.questionsGenerated')}</Title>
              <List
                bordered
                dataSource={generatedQuestions}
                renderItem={(q, index) => (
                  <List.Item>
                    <Checkbox
                      checked={selectedQuestions.has(index)}
                      onChange={() => toggleQuestion(index)}
                      style={{ marginRight: 8 }}
                    />
                    <span style={{ flex: 1 }}>{q}</span>
                  </List.Item>
                )}
              />
              <Button
                type="primary"
                onClick={handleAddSelected}
                loading={addQuestionsMutation.isPending}
                disabled={selectedQuestions.size === 0}
                block
              >
                {t('admin.addSelected')} ({selectedQuestions.size})
              </Button>
            </>
          )}
        </Space>
      </Modal>
    </div>
  )
}
