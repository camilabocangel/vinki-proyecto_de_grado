import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Typography,
  Tag,
  Skeleton,
  Collapse,
  Space,
  Button,
  Row,
  Col,
  Progress,
} from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { api } from '../../api/client'
import { SkillRadarChart } from '../../components/SkillRadarChart'

const { Title, Paragraph, Text } = Typography

interface Evaluation {
  technicalCorrectness: number | null
  clarityOfExplanation: number | null
  communication: number | null
  confidence: number | null
  problemSolving: number | null
  feedbackText: string | null
  detectedLevel: { id: number; name: string } | null
  juniorAnswer: string | null
  midAnswer: string | null
  seniorAnswer: string | null
}

interface ReportItem {
  interviewQuestionId: number
  orderNumber: number
  questionTextSnapshot: string
  answer: { answerText: string | null } | null
  evaluation: Evaluation | null
}

interface ReportData {
  interview: { id: number; evaluationStatus: string }
  evaluations: ReportItem[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const metricLabelKeys: Record<string, string> = {
  technicalCorrectness: 'metrics.technicalCorrectness',
  clarityOfExplanation: 'metrics.clarityOfExplanation',
  communication: 'metrics.communication',
  confidence: 'metrics.confidence',
  problemSolving: 'metrics.problemSolving',
}

const metricColors: Record<string, string> = {
  technicalCorrectness: '#7C3AED',
  clarityOfExplanation: '#3B82F6',
  communication: '#10B981',
  confidence: '#F97316',
  problemSolving: '#EF4444',
}

export default function FeedbackPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['interview', 'report', id],
    queryFn: () => api.get<ReportData>(`/interviews/${id}/report`),
    enabled: !!id,
  })

  if (isLoading)
    return (
      <div className="vinki-page">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    )
  if (!data)
    return (
      <div className="vinki-page">
        <Paragraph>{t('feedback.notFound')}</Paragraph>
      </div>
    )

  const avgMetrics = (evals: ReportItem[]) => {
    const evaluated = evals.filter((e) => e.evaluation)
    if (evaluated.length === 0) return null
    const sum = (key: keyof Evaluation) =>
      evaluated.reduce((acc, e) => acc + ((e.evaluation?.[key] as number) ?? 0), 0) /
      evaluated.length
    return {
      technicalCorrectness: sum('technicalCorrectness'),
      clarityOfExplanation: sum('clarityOfExplanation'),
      communication: sum('communication'),
      confidence: sum('confidence'),
      problemSolving: sum('problemSolving'),
    }
  }

  const avg = avgMetrics(data.evaluations)

  const detectedLevels = data.evaluations
    .map((e) => e.evaluation?.detectedLevel?.name)
    .filter(Boolean) as string[]

  const levelCounts = detectedLevels.reduce<Record<string, number>>((acc, l) => {
    acc[l] = (acc[l] ?? 0) + 1
    return acc
  }, {})

  const dominantLevel =
    detectedLevels.length > 0
      ? Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null

  const levelColor =
    dominantLevel === 'Senior' ? 'gold' : dominantLevel === 'Mid' ? 'blue' : 'green'

  return (
    <div className="vinki-page">
      <div className="vinki-page-header">
        <div>
          <Title level={3} className="vinki-page-title">
            {t('feedback.reportTitle')}
          </Title>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <Tag
              color={data.interview.evaluationStatus === 'completed' ? 'green' : 'purple'}
            >
              {data.interview.evaluationStatus === 'completed'
                ? t('feedback.evaluationCompleted')
                : t('feedback.inProcess')}
            </Tag>
            {dominantLevel && (
              <Tag color={levelColor} style={{ fontWeight: 700, fontSize: 13 }}>
                {t('feedback.detectedLevel', { level: dominantLevel })}
              </Tag>
            )}
          </div>
        </div>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            href={`${API_URL}/interviews/${id}/report/export?format=pdf`}
          >
            PDF
          </Button>
          <Button
            icon={<DownloadOutlined />}
            href={`${API_URL}/interviews/${id}/report/export?format=csv`}
          >
            CSV
          </Button>
        </Space>
      </div>

      {avg && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} md={12}>
            <Card className="vinki-card" title={t('feedback.avgMetrics')}>
              <SkillRadarChart
                data={[
                  {
                    metric: t('metrics.technicalCorrectness'),
                    value: avg.technicalCorrectness,
                  },
                  {
                    metric: t('metrics.clarityOfExplanation'),
                    value: avg.clarityOfExplanation,
                  },
                  { metric: t('metrics.communication'), value: avg.communication },
                  { metric: t('metrics.confidence'), value: avg.confidence },
                  { metric: t('metrics.problemSolving'), value: avg.problemSolving },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card className="vinki-card" title={t('feedback.metricBreakdown')}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  padding: '8px 0',
                }}
              >
                {Object.entries(avg).map(([key, value]) => (
                  <div key={key}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ fontWeight: 500 }}>{t(metricLabelKeys[key])}</Text>
                      <Text strong>{((value / 5) * 100).toFixed(0)}%</Text>
                    </div>
                    <Progress
                      percent={(value / 5) * 100}
                      showInfo={false}
                      strokeColor={metricColors[key]}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Card className="vinki-card" title={t('feedback.questionDetail')}>
        <Collapse
          expandIconPosition="end"
          items={data.evaluations.map((item) => ({
            key: item.interviewQuestionId,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Tag color="purple">P{item.orderNumber}</Tag>
                {item.evaluation?.detectedLevel && (
                  <Tag
                    color={
                      item.evaluation.detectedLevel.name === 'Senior'
                        ? 'gold'
                        : item.evaluation.detectedLevel.name === 'Mid'
                          ? 'blue'
                          : 'green'
                    }
                  >
                    {item.evaluation.detectedLevel.name}
                  </Tag>
                )}
                <Text>
                  {item.questionTextSnapshot.slice(0, 100)}
                  {item.questionTextSnapshot.length > 100 ? '...' : ''}
                </Text>
              </div>
            ),
            children: (
              <div>
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#F9FAFB',
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                  >
                    {t('feedback.yourAnswer')}
                  </Text>
                  <Text>{item.answer?.answerText || t('feedback.noAnswer')}</Text>
                </div>
                {item.evaluation && (
                  <>
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                      {Object.entries(metricLabelKeys).map(([key, labelKey]) => (
                        <Col xs={12} sm={8} key={key}>
                          <div
                            style={{
                              textAlign: 'center',
                              padding: 12,
                              background: '#F9FAFB',
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              type="secondary"
                              style={{ fontSize: 11, display: 'block' }}
                            >
                              {t(labelKey)}
                            </Text>
                            <Text
                              strong
                              style={{ fontSize: 20, color: metricColors[key] }}
                            >
                              {(
                                item.evaluation?.[key as keyof Evaluation] as number
                              )?.toFixed(1)}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              /5
                            </Text>
                          </div>
                        </Col>
                      ))}
                    </Row>
                    <Card
                      size="small"
                      style={{
                        background: '#F5F3FF',
                        border: '1px solid #E9D5FF',
                        borderRadius: 8,
                        marginBottom: 16,
                      }}
                    >
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                      >
                        {t('feedback.aiFeedback')}
                      </Text>
                      <Paragraph style={{ marginBottom: 0 }}>
                        {item.evaluation.feedbackText}
                      </Paragraph>
                    </Card>

                    {(item.evaluation.juniorAnswer ||
                      item.evaluation.midAnswer ||
                      item.evaluation.seniorAnswer) && (
                      <Card
                        size="small"
                        title={t('feedback.recommendedAnswers')}
                        style={{ borderRadius: 8 }}
                      >
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                        >
                          {item.evaluation.juniorAnswer && (
                            <div
                              style={{
                                padding: '12px 16px',
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                borderRadius: 8,
                              }}
                            >
                              <Tag color="green" style={{ marginBottom: 6 }}>
                                Junior
                              </Tag>
                              <Paragraph style={{ marginBottom: 0, fontSize: 13 }}>
                                {item.evaluation.juniorAnswer}
                              </Paragraph>
                            </div>
                          )}
                          {item.evaluation.midAnswer && (
                            <div
                              style={{
                                padding: '12px 16px',
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: 8,
                              }}
                            >
                              <Tag color="blue" style={{ marginBottom: 6 }}>
                                Mid
                              </Tag>
                              <Paragraph style={{ marginBottom: 0, fontSize: 13 }}>
                                {item.evaluation.midAnswer}
                              </Paragraph>
                            </div>
                          )}
                          {item.evaluation.seniorAnswer && (
                            <div
                              style={{
                                padding: '12px 16px',
                                background: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                borderRadius: 8,
                              }}
                            >
                              <Tag color="gold" style={{ marginBottom: 6 }}>
                                Senior
                              </Tag>
                              <Paragraph style={{ marginBottom: 0, fontSize: 13 }}>
                                {item.evaluation.seniorAnswer}
                              </Paragraph>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}
                  </>
                )}
              </div>
            ),
          }))}
        />
      </Card>
    </div>
  )
}
