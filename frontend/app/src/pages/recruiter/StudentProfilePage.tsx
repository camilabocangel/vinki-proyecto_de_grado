import { useState } from 'react'
import { useParams } from 'react-router-dom'
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
} from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { api } from '../../api/client'
import { SkillRadarChart } from '../../components/SkillRadarChart'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface Note {
  id: number
  content: string
  createdAt: string
}

interface StudentProfile {
  user: { id: number; name: string; email: string; role: string; createdAt: string }
  skillScores: Array<{ skillId: number; skillName: string; score: number }>
  recentInterviews: Array<{
    id: number
    startedAt: string
    evaluationStatus: string
    averageScore: number | null
  }>
  notes: Note[]
}

export default function StudentProfilePage() {
  const { t } = useTranslation()
  const { studentId } = useParams<{ studentId: string }>()
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

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />
  if (!data) return <div>{t('recruiter.studentNotFound')}</div>

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>{data.user.name}</Title>

      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label={t('table.email')}>{data.user.email}</Descriptions.Item>
        <Descriptions.Item label={t('recruiter.registered')}>
          {new Date(data.user.createdAt).toLocaleDateString('es')}
        </Descriptions.Item>
      </Descriptions>

      {data.skillScores.length > 0 && (
        <Card title={t('dashboard.skills')} style={{ marginBottom: 24 }}>
          <SkillRadarChart
            data={data.skillScores.map((s) => ({
              metric: s.skillName,
              value: s.score / 20,
            }))}
          />
        </Card>
      )}

      <Card title={t('recruiter.recentInterviews')} style={{ marginBottom: 24 }}>
        <Table
          dataSource={data.recentInterviews}
          rowKey="id"
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
            {
              title: t('table.score'),
              dataIndex: 'averageScore',
              render: (v: number | null) => v?.toFixed(1) ?? '-',
            },
          ]}
          pagination={false}
        />
      </Card>

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
                  <Paragraph style={{ marginBottom: 4 }}>{note.content}</Paragraph>
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
