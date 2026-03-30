import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Typography,
  App,
  List,
  Empty,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'

const { Title, Text } = Typography
const { TextArea } = Input

interface CatalogItem {
  id: number
  name: string
}

interface QuestionItem {
  id: number
  questionText: string
  type: string
  language: { name: string }
  level: { name: string }
  skill: { name: string }
}

interface TemplateItem {
  id: number
  name: string
  description: string
  companyType: string
  isPublic: boolean
  role: { id: number; name: string }
  level: { id: number; name: string }
  language: { id: number; name: string } | null
  framework: { id: number; name: string } | null
  createdBy: { id: number; name: string }
  questions: { id: number }[]
}

export default function TemplatesPage() {
  const { t } = useTranslation()
  usePageTitle(t('templates.title'))
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionItem[]>([])
  const [questionSearch, setQuestionSearch] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState<number>()
  const [selectedLanguageId, setSelectedLanguageId] = useState<number>()

  const { data: templates, isLoading } = useQuery({
    queryKey: ['interview-templates'],
    queryFn: () => api.get<TemplateItem[]>('/interviews/templates'),
  })

  const { data: roles } = useQuery({
    queryKey: ['catalogs', 'roles'],
    queryFn: () => api.get<CatalogItem[]>('/catalogs/roles'),
  })

  const { data: levels } = useQuery({
    queryKey: ['catalogs', 'levels'],
    queryFn: () => api.get<CatalogItem[]>('/catalogs/levels'),
  })

  const { data: allLanguages } = useQuery({
    queryKey: ['catalogs', 'languages', selectedRoleId],
    queryFn: () =>
      selectedRoleId
        ? api.get<CatalogItem[]>(`/catalogs/roles/${selectedRoleId}/languages`)
        : api.get<CatalogItem[]>('/catalogs/roles/1/languages'),
    enabled: createOpen,
  })

  const { data: allFrameworks } = useQuery({
    queryKey: ['catalogs', 'frameworks', selectedLanguageId],
    queryFn: () =>
      api.get<CatalogItem[]>(`/catalogs/languages/${selectedLanguageId}/frameworks`),
    enabled: !!selectedLanguageId && createOpen,
  })

  const { data: questions } = useQuery({
    queryKey: ['template-questions'],
    queryFn: () => api.get<QuestionItem[]>('/interviews/templates/questions'),
    enabled: createOpen,
  })

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      api.post('/interviews/templates', values),
    onSuccess: () => {
      message.success(t('templates.created'))
      queryClient.invalidateQueries({ queryKey: ['interview-templates'] })
      setCreateOpen(false)
      form.resetFields()
      setSelectedQuestions([])
    },
    onError: (err: Error) => message.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/interviews/templates/${id}`),
    onSuccess: () => {
      message.success(t('templates.deleted'))
      queryClient.invalidateQueries({ queryKey: ['interview-templates'] })
    },
    onError: (err: Error) => message.error(err.message),
  })

  const handleDelete = (id: number) => {
    modal.confirm({
      title: t('templates.deleteConfirm'),
      onOk: () => deleteMutation.mutate(id),
    })
  }

  const handleCreate = () => {
    form.validateFields().then((values) => {
      if (selectedQuestions.length === 0) {
        message.error(t('admin.noQuestionsSelected'))
        return
      }
      createMutation.mutate({
        ...values,
        questionIds: selectedQuestions.map((q) => q.id),
      })
    })
  }

  const addQuestion = (q: QuestionItem) => {
    if (!selectedQuestions.find((sq) => sq.id === q.id)) {
      setSelectedQuestions([...selectedQuestions, q])
    }
  }

  const removeQuestion = (qId: number) => {
    setSelectedQuestions(selectedQuestions.filter((q) => q.id !== qId))
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newList = [...selectedQuestions]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newList.length) return
    ;[newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]]
    setSelectedQuestions(newList)
  }

  const filteredQuestions = (questions || []).filter((q) => {
    if (questionSearch) {
      const search = questionSearch.toLowerCase()
      return (
        q.questionText.toLowerCase().includes(search) ||
        q.skill.name.toLowerCase().includes(search) ||
        q.language.name.toLowerCase().includes(search)
      )
    }
    return true
  })

  const columns = [
    {
      title: t('templates.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: t('templates.companyType'),
      dataIndex: 'companyType',
      key: 'companyType',
    },
    {
      title: t('interview.role'),
      key: 'role',
      render: (_: unknown, record: TemplateItem) => record.role.name,
    },
    {
      title: t('interview.level'),
      key: 'level',
      render: (_: unknown, record: TemplateItem) => (
        <Tag
          color={
            record.level.name === 'Junior'
              ? 'green'
              : record.level.name === 'Mid'
                ? 'blue'
                : 'orange'
          }
        >
          {record.level.name}
        </Tag>
      ),
    },
    {
      title: t('templates.questionsCount'),
      key: 'questions',
      render: (_: unknown, record: TemplateItem) => record.questions.length,
      width: 100,
    },
    {
      title: t('templates.visibility'),
      key: 'isPublic',
      render: (_: unknown, record: TemplateItem) => (
        <Tag color={record.isPublic ? 'green' : 'default'}>
          {record.isPublic ? t('templates.public') : t('templates.private')}
        </Tag>
      ),
      width: 100,
    },
    {
      title: t('table.actions'),
      key: 'actions',
      width: 80,
      render: (_: unknown, record: TemplateItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        />
      ),
    },
  ]

  return (
    <div className="vinki-page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {t('templates.title')}
          </Title>
          <Text type="secondary">{t('templates.subtitle')}</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          {t('templates.createTemplate')}
        </Button>
      </div>

      <Card>
        <Table
          dataSource={templates}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: t('templates.noTemplates') }}
        />
      </Card>

      <Modal
        title={t('templates.createTemplate')}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false)
          form.resetFields()
          setSelectedQuestions([])
        }}
        onOk={handleCreate}
        confirmLoading={createMutation.isPending}
        width={800}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label={t('templates.name')} rules={[{ required: true }]}>
            <Input maxLength={200} />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('templates.description')}
            rules={[{ required: true }]}
          >
            <TextArea maxLength={500} rows={2} />
          </Form.Item>

          <Form.Item
            name="companyType"
            label={t('templates.companyType')}
            rules={[{ required: true }]}
          >
            <Input
              maxLength={100}
              placeholder="e.g. Big Tech (FAANG), Startup, Fintech"
            />
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item
              name="roleId"
              label={t('interview.role')}
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select
                options={roles?.map((r) => ({ label: r.name, value: r.id }))}
                placeholder={t('interview.selectRole')}
                onChange={(v) => setSelectedRoleId(v)}
              />
            </Form.Item>

            <Form.Item
              name="levelId"
              label={t('interview.level')}
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select
                options={levels?.map((l) => ({ label: l.name, value: l.id }))}
                placeholder={t('interview.selectLevel')}
              />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item
              name="languageId"
              label={t('interview.language')}
              style={{ flex: 1 }}
            >
              <Select
                options={allLanguages?.map((l) => ({ label: l.name, value: l.id }))}
                placeholder={t('interview.selectLanguage')}
                allowClear
                onChange={(v) => setSelectedLanguageId(v)}
              />
            </Form.Item>

            <Form.Item
              name="frameworkId"
              label={t('interview.framework')}
              style={{ flex: 1 }}
            >
              <Select
                options={allFrameworks?.map((f) => ({ label: f.name, value: f.id }))}
                placeholder={t('interview.selectFramework')}
                allowClear
                disabled={!selectedLanguageId}
              />
            </Form.Item>
          </Space>

          <Form.Item
            name="isPublic"
            label={t('templates.publicToggle')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>

        {/* Question selector */}
        <div style={{ marginTop: 8 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {t('templates.questionSelector')}
          </Text>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t('templates.searchQuestions')}
            value={questionSearch}
            onChange={(e) => setQuestionSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <div
            style={{
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid var(--color-border, #d9d9d9)',
              borderRadius: 6,
              padding: 8,
              marginBottom: 16,
            }}
          >
            {filteredQuestions.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('common.noData')}
              />
            ) : (
              filteredQuestions.slice(0, 50).map((q) => {
                const alreadyAdded = selectedQuestions.some((sq) => sq.id === q.id)
                return (
                  <div
                    key={q.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text ellipsis style={{ display: 'block', fontSize: 13 }}>
                        {q.questionText}
                      </Text>
                      <Space size={4}>
                        <Tag style={{ fontSize: 11 }}>{q.skill.name}</Tag>
                        <Tag style={{ fontSize: 11 }}>{q.level.name}</Tag>
                        <Tag style={{ fontSize: 11 }}>{q.language.name}</Tag>
                      </Space>
                    </div>
                    <Button
                      size="small"
                      type={alreadyAdded ? 'default' : 'primary'}
                      disabled={alreadyAdded}
                      onClick={() => addQuestion(q)}
                      style={{ marginLeft: 8 }}
                    >
                      {alreadyAdded ? '---' : t('templates.addToTemplate')}
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {t('templates.selectedQuestions')} ({selectedQuestions.length})
          </Text>
          {selectedQuestions.length === 0 ? (
            <Text type="secondary">{t('admin.noQuestionsSelected')}</Text>
          ) : (
            <List
              size="small"
              bordered
              dataSource={selectedQuestions}
              renderItem={(q, index) => (
                <List.Item
                  actions={[
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, 'up')}
                    />,
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowDownOutlined />}
                      disabled={index === selectedQuestions.length - 1}
                      onClick={() => moveQuestion(index, 'down')}
                    />,
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeQuestion(q.id)}
                    />,
                  ]}
                >
                  <div style={{ minWidth: 0 }}>
                    <Text style={{ fontSize: 13 }}>
                      {index + 1}. {q.questionText}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      </Modal>
    </div>
  )
}
