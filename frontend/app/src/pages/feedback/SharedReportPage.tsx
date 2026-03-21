import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Typography,
  Tag,
  Skeleton,
  Collapse,
  Row,
  Col,
  Progress,
  Result,
} from 'antd'
import { api } from '../../api/client'

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
  skillName: string | null
  answer: { answerText: string | null } | null
  evaluation: Evaluation | null
}

interface SharedReportData {
  studentName: string
  interview: { id: number; evaluationStatus: string }
  evaluations: ReportItem[]
}

const metricLabels: Record<string, string> = {
  technicalCorrectness: 'Technical Correctness',
  clarityOfExplanation: 'Clarity',
  communication: 'Communication',
  confidence: 'Confidence',
  problemSolving: 'Problem Solving',
}

const metricColors: Record<string, string> = {
  technicalCorrectness: '#005C53',
  clarityOfExplanation: '#3B82F6',
  communication: '#10B981',
  confidence: '#F97316',
  problemSolving: '#EF4444',
}

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['shared', 'report', token],
    queryFn: () => api.get<SharedReportData>(`/shared/${token}`),
    enabled: !!token,
  })

  if (isLoading) {
    return (
      <div style={{ maxWidth: 960, margin: '40px auto', padding: '0 16px' }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 960, margin: '40px auto', padding: '0 16px' }}>
        <Result
          status="404"
          title="Report not found"
          subTitle="This link may have expired or is invalid."
        />
      </div>
    )
  }

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
    <div style={{ maxWidth: 960, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            display: 'inline-block',
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #005C53, #042940)',
            color: '#fff',
            fontSize: 24,
            fontWeight: 700,
            lineHeight: '48px',
            marginBottom: 12,
          }}
        >
          V
        </div>
        <Title level={3} style={{ marginBottom: 4 }}>
          Interview Report
        </Title>
        <Text type="secondary">
          {data.studentName} &middot; Interview #{data.interview.id}
        </Text>
        <div style={{ marginTop: 8 }}>
          <Tag
            color={data.interview.evaluationStatus === 'completed' ? 'green' : 'purple'}
          >
            {data.interview.evaluationStatus === 'completed' ? 'Completed' : 'In process'}
          </Tag>
          {dominantLevel && (
            <Tag color={levelColor} style={{ fontWeight: 700 }}>
              Detected level: {dominantLevel}
            </Tag>
          )}
        </div>
      </div>

      {avg && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24}>
            <Card title="Metric Breakdown">
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
                      <Text style={{ fontWeight: 500 }}>{metricLabels[key]}</Text>
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

      <Card title="Detail by Question">
        <Collapse
          expandIconPosition="end"
          items={data.evaluations.map((item) => ({
            key: item.interviewQuestionId,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Tag color="purple">Q{item.orderNumber}</Tag>
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
                {item.skillName && (
                  <Tag color="geekblue" style={{ textTransform: 'capitalize' }}>
                    {item.skillName.replace(/-/g, ' ')}
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
                    background: '#f9fafb',
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                  >
                    Answer
                  </Text>
                  <Text>{item.answer?.answerText || 'No written answer'}</Text>
                </div>
                {item.evaluation && (
                  <>
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                      {Object.entries(metricLabels).map(([key, label]) => (
                        <Col xs={12} sm={8} key={key}>
                          <div
                            style={{
                              textAlign: 'center',
                              padding: 12,
                              background: '#f9fafb',
                              borderRadius: 8,
                            }}
                          >
                            <Text
                              type="secondary"
                              style={{ fontSize: 11, display: 'block' }}
                            >
                              {label}
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
                    {item.evaluation.feedbackText && (
                      <Card
                        size="small"
                        style={{
                          background: '#f5f3ff',
                          border: '1px solid #ddd6fe',
                          borderRadius: 8,
                          marginBottom: 16,
                        }}
                      >
                        <Text
                          type="secondary"
                          style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                        >
                          AI Feedback
                        </Text>
                        <Paragraph style={{ marginBottom: 0 }}>
                          {item.evaluation.feedbackText}
                        </Paragraph>
                      </Card>
                    )}
                    {(item.evaluation.juniorAnswer ||
                      item.evaluation.midAnswer ||
                      item.evaluation.seniorAnswer) && (
                      <Card
                        size="small"
                        title="Recommended answers by level"
                        style={{ borderRadius: 8 }}
                      >
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                        >
                          {item.evaluation.juniorAnswer && (
                            <div
                              style={{
                                padding: '10px 14px',
                                background: '#ecfdf5',
                                border: '1px solid #bbf7d0',
                                borderRadius: 8,
                              }}
                            >
                              <Tag color="green" style={{ marginBottom: 4 }}>
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
                                padding: '10px 14px',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: 8,
                              }}
                            >
                              <Tag color="blue" style={{ marginBottom: 4 }}>
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
                                padding: '10px 14px',
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: 8,
                              }}
                            >
                              <Tag color="gold" style={{ marginBottom: 4 }}>
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

      <div style={{ textAlign: 'center', marginTop: 32, color: '#9ca3af', fontSize: 12 }}>
        Shared via Vinki
      </div>
    </div>
  )
}
