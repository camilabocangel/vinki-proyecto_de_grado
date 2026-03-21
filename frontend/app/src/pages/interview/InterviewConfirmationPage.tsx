import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, Button, Typography, Space, Tag, Progress, Row, Col } from 'antd'
import {
  CheckCircleFilled,
  DashboardOutlined,
  EyeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { api } from '../../api/client'

const { Title, Text, Paragraph } = Typography

interface InterviewSummary {
  id: number
  evaluationStatus: string
  mode: string
  questions: Array<{ id: number; answers: Array<{ answerText: string | null }> }>
  startedAt: string
  finishedAt: string | null
}

export default function InterviewConfirmationPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['interview', id],
    queryFn: () => api.get<InterviewSummary>(`/interviews/${id}`),
    enabled: !!id,
  })

  const answeredCount =
    data?.questions.filter((q) => q.answers.some((a) => a.answerText)).length ?? 0
  const totalQuestions = data?.questions.length ?? 0

  // Calculate duration
  let duration = ''
  if (data?.startedAt && data?.finishedAt) {
    const ms = new Date(data.finishedAt).getTime() - new Date(data.startedAt).getTime()
    const mins = Math.round(ms / 60000)
    duration = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`
  }

  return (
    <div
      className="vinki-page"
      style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}
    >
      <div style={{ marginBottom: 32 }}>
        <CheckCircleFilled
          style={{ fontSize: 64, color: 'var(--color-success)', marginBottom: 16 }}
        />
        <Title level={2}>{t('interview.sent')}</Title>
        <Paragraph type="secondary" style={{ fontSize: 16 }}>
          {data?.mode === 'practice'
            ? t('confirmation.practiceComplete')
            : t('interview.sentMessage')}
        </Paragraph>
      </div>

      {data && (
        <Card style={{ marginBottom: 24, textAlign: 'left' }}>
          <Row gutter={[16, 16]}>
            <Col xs={8} style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={Math.round((answeredCount / totalQuestions) * 100)}
                size={64}
                strokeColor="var(--color-primary)"
                format={() => `${answeredCount}/${totalQuestions}`}
              />
              <Text
                type="secondary"
                style={{ display: 'block', marginTop: 4, fontSize: 12 }}
              >
                {t('confirmation.answered')}
              </Text>
            </Col>
            <Col xs={8} style={{ textAlign: 'center' }}>
              <div
                style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary)' }}
              >
                {duration || '-'}
              </div>
              <Text
                type="secondary"
                style={{ display: 'block', marginTop: 4, fontSize: 12 }}
              >
                {t('confirmation.duration')}
              </Text>
            </Col>
            <Col xs={8} style={{ textAlign: 'center' }}>
              <Tag
                color={data.evaluationStatus === 'completed' ? 'green' : 'purple'}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {data.evaluationStatus === 'completed'
                  ? t('status.completed')
                  : t('status.processing')}
              </Tag>
              <Text
                type="secondary"
                style={{ display: 'block', marginTop: 4, fontSize: 12 }}
              >
                {t('table.status')}
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Button
          type="primary"
          size="large"
          icon={<DashboardOutlined />}
          onClick={() => navigate('/dashboard')}
          block
        >
          {t('interview.goToDashboard')}
        </Button>
        {data?.evaluationStatus === 'completed' && (
          <Button
            size="large"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/feedback/${id}`)}
            block
          >
            {t('table.viewReport')}
          </Button>
        )}
        <Button
          size="large"
          icon={<ThunderboltOutlined />}
          onClick={() => navigate('/interview/new')}
          block
        >
          {t('confirmation.tryAnother')}
        </Button>
      </Space>
    </div>
  )
}
