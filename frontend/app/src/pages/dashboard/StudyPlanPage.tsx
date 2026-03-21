import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Typography, Card, Tag, Progress, List, Spin, Empty, Space } from 'antd'
import { BookOutlined, PlayCircleOutlined, CodeOutlined } from '@ant-design/icons'
import { api } from '../../api/client'

const { Title, Text, Paragraph } = Typography

interface Recommendation {
  type: 'article' | 'video' | 'exercise'
  title: string
  url: string
}

interface Improvement {
  skill: string
  currentScore: number
  recommendations: Recommendation[]
}

interface StudyPlan {
  summary: string
  strengths: string[]
  improvements: Improvement[]
}

const typeIcons: Record<string, React.ReactNode> = {
  article: <BookOutlined />,
  video: <PlayCircleOutlined />,
  exercise: <CodeOutlined />,
}

export default function StudyPlanPage() {
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['study-plan'],
    queryFn: () => api.get<StudyPlan | null>('/study-plan'),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 40 }}>
        <Empty description={t('studyPlan.noData')} />
      </div>
    )
  }

  const typeLabel = (type: string) => {
    if (type === 'article') return t('studyPlan.article')
    if (type === 'video') return t('studyPlan.video')
    if (type === 'exercise') return t('studyPlan.exercise')
    return type
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Title level={2}>{t('studyPlan.title')}</Title>

      <Card style={{ marginBottom: 24 }}>
        <Paragraph>{data.summary}</Paragraph>
      </Card>

      {data.strengths && data.strengths.length > 0 && (
        <Card title={t('studyPlan.strengths')} style={{ marginBottom: 24 }}>
          <Space wrap>
            {data.strengths.map((skill) => (
              <Tag
                key={skill}
                color="green"
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {skill}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {data.improvements && data.improvements.length > 0 && (
        <>
          <Title level={4} style={{ marginBottom: 16 }}>
            {t('studyPlan.improvements')}
          </Title>
          {data.improvements.map((item) => (
            <Card
              key={item.skill}
              title={item.skill}
              style={{ marginBottom: 16 }}
              extra={<Text type="secondary">{item.currentScore}%</Text>}
            >
              <Progress
                percent={item.currentScore}
                status={item.currentScore < 40 ? 'exception' : 'normal'}
                style={{ marginBottom: 16 }}
              />
              <List
                dataSource={item.recommendations}
                renderItem={(rec) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={typeIcons[rec.type] || <BookOutlined />}
                      title={
                        <a href={rec.url} target="_blank" rel="noopener noreferrer">
                          {rec.title}
                        </a>
                      }
                      description={typeLabel(rec.type)}
                    />
                  </List.Item>
                )}
              />
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
