import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Typography,
  Skeleton,
  Descriptions,
  Table,
  Tag,
  Input,
  Button,
  List,
  App,
  Empty,
  Row,
  Col,
  Progress,
  Space,
} from 'antd'
import {
  SendOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { api } from '../../api/client'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface Note {
  id: number
  content: string
  createdAt: string
}

interface InterviewRow {
  id: number
  startedAt: string
  finishedAt: string | null
  evaluationStatus: string
  roleName: string
  levelName: string
  languageName: string | null
  questionCount: number
  avgScore: number | null
  detectedLevel: string | null
}

interface StudentProfile {
  user: { id: number; name: string; email: string; role: string; createdAt: string }
  averageScore: number | null
  skillScores: Array<{ skillId: number; skillName: string; score: number }>
  recentInterviews: InterviewRow[]
  notes: Note[]
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

export default function StudentProfilePage() {
  const { t } = useTranslation()
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [noteText, setNoteText] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter', 'student', studentId],
    queryFn: () => api.get<StudentProfile>(`/recruiter/students/${studentId}`),
    enabled: !!studentId,
  })

  const addNoteMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/recruiter/students/${studentId}/notes`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter', 'student', studentId] })
      setNoteText('')
      message.success(t('common.success'))
    },
    onError: (err: Error) => message.error(err.message),
  })

  const handleAddNote = () => {
    const trimmed = noteText.trim()
    if (!trimmed) return
    addNoteMutation.mutate(trimmed)
  }

  if (isLoading)
    return (
      <div className="vinki-page">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )
  if (!data) return <div className="vinki-page">{t('recruiter.studentNotFound')}</div>

  const scorePercent = data.averageScore
    ? Math.round((data.averageScore / 5) * 100)
    : 0

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
      width: 140,
      render: (_: unknown, record: InterviewRow) => record.languageName ?? '-',
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
            style={{
              color: v >= 3.5 ? '#10B981' : v >= 2.5 ? '#F97316' : '#EF4444',
            }}
          >
            {v.toFixed(1)}
          </Text>
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
          new Date(record.finishedAt).getTime() -
          new Date(record.startedAt).getTime()
        const mins = Math.round(ms / 60000)
        return mins >= 60
          ? `${Math.floor(mins / 60)}h ${mins % 60}m`
          : `${mins} min`
      },
    },
    {
      title: '',
      width: 130,
      render: (_: unknown, record: InterviewRow) =>
        record.evaluationStatus === 'completed' ? (
          <Button
            type="link"
            size="small"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate(`/feedback/${record.id}`)}
          >
            {t('table.viewReport')}
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="vinki-page">
      {/* Header */}
      <div className="vinki-page-header">
        <div>
          <Title level={3} className="vinki-page-title">
            {data.user.name}
          </Title>
          <Text type="secondary">{data.user.email}</Text>
        </div>
      </div>

      <Descriptions
        bordered
        column={{ xs: 1, sm: 2 }}
        size="small"
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label={t('table.email')}>
          {data.user.email}
        </Descriptions.Item>
        <Descriptions.Item label={t('recruiter.registered')}>
          {new Date(data.user.createdAt).toLocaleDateString('es')}
        </Descriptions.Item>
      </Descriptions>

      {/* Stat cards — same as student dashboard */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card className="vinki-stat-card" aria-label={t('dashboard.aiScore')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Progress
                type="circle"
                percent={scorePercent}
                size={64}
                strokeColor="#005C53"
                format={() => (
                  <Text strong style={{ fontSize: 18 }}>
                    {data.averageScore?.toFixed(1) ?? '-'}
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
          <Card
            className="vinki-stat-card"
            aria-label={t('dashboard.interviewsDone')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Progress
                type="circle"
                percent={
                  data.recentInterviews.length
                    ? (data.recentInterviews.length / 10) * 100
                    : 0
                }
                size={64}
                strokeColor="#9FC131"
                format={() => (
                  <Text strong style={{ fontSize: 18 }}>
                    {data.recentInterviews.length}
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
      </Row>

      {/* Skills — progress bars (same as student dashboard) */}
      {data.skillScores.length > 0 && (
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
                  <Space size={4}>
                    <Text strong>{skill.score.toFixed(0)}%</Text>
                    {skill.score < 40 && (
                      <Tag color="red" style={{ fontSize: 10 }}>
                        {t('dashboard.needsWork')}
                      </Tag>
                    )}
                    {skill.score >= 80 && (
                      <Tag color="green" style={{ fontSize: 10 }}>
                        {t('dashboard.excellent')}
                      </Tag>
                    )}
                  </Space>
                </div>
                <Progress
                  percent={skill.score}
                  showInfo={false}
                  strokeColor={
                    skill.score >= 80
                      ? '#10B981'
                      : skill.score >= 50
                        ? '#005C53'
                        : '#F97316'
                  }
                  size="small"
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Interview history table — same as student dashboard */}
      <Card
        className="vinki-card"
        title={t('dashboard.interviewHistory')}
        style={{ marginBottom: 24 }}
      >
        <Table
          dataSource={data.recentInterviews}
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

      {/* Recruiter notes */}
      <Card title={t('recruiter.notes')}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <TextArea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t('recruiter.notePlaceholder')}
            rows={2}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleAddNote}
            loading={addNoteMutation.isPending}
            disabled={!noteText.trim()}
          >
            {t('recruiter.addNote')}
          </Button>
        </div>

        {data.notes && data.notes.length > 0 ? (
          <List
            dataSource={data.notes}
            renderItem={(note) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Paragraph style={{ marginBottom: 4 }}>
                    {note.content}
                  </Paragraph>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(note.createdAt).toLocaleString('es')}
                  </Text>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty description={t('recruiter.noNotes')} />
        )}
      </Card>
    </div>
  )
}
