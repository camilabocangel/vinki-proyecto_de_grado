import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Typography,
  Tag,
  Skeleton,
  Descriptions,
  Collapse,
  Space,
  Button,
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['interview', 'report', id],
    queryFn: () => api.get<ReportData>(`/interviews/${id}/report`),
    enabled: !!id,
  })

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />

  if (!data) return <Paragraph>No se encontró el reporte.</Paragraph>

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

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Title level={2}>Reporte de entrevista</Title>
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
      </Space>

      <Tag
        color={data.interview.evaluationStatus === 'completed' ? 'success' : 'processing'}
      >
        {data.interview.evaluationStatus}
      </Tag>

      {avg && (
        <Card style={{ marginTop: 16, marginBottom: 24 }}>
          <Title level={4}>Resumen de métricas</Title>
          <SkillRadarChart
            data={[
              { metric: 'Corrección técnica', value: avg.technicalCorrectness },
              { metric: 'Claridad', value: avg.clarityOfExplanation },
              { metric: 'Comunicación', value: avg.communication },
              { metric: 'Confianza', value: avg.confidence },
              { metric: 'Resolución', value: avg.problemSolving },
            ]}
          />
        </Card>
      )}

      <Collapse
        items={data.evaluations.map((item) => ({
          key: item.interviewQuestionId,
          label: `Pregunta ${item.orderNumber}: ${item.questionTextSnapshot.slice(0, 80)}...`,
          children: (
            <div>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Tu respuesta">
                  {item.answer?.answerText || <Text type="secondary">Sin respuesta</Text>}
                </Descriptions.Item>
              </Descriptions>
              {item.evaluation && (
                <>
                  <Descriptions
                    column={2}
                    bordered
                    size="small"
                    style={{ marginTop: 12 }}
                  >
                    <Descriptions.Item label="Corrección técnica">
                      {item.evaluation.technicalCorrectness}/5
                    </Descriptions.Item>
                    <Descriptions.Item label="Claridad">
                      {item.evaluation.clarityOfExplanation}/5
                    </Descriptions.Item>
                    <Descriptions.Item label="Comunicación">
                      {item.evaluation.communication}/5
                    </Descriptions.Item>
                    <Descriptions.Item label="Confianza">
                      {item.evaluation.confidence}/5
                    </Descriptions.Item>
                    <Descriptions.Item label="Resolución">
                      {item.evaluation.problemSolving}/5
                    </Descriptions.Item>
                  </Descriptions>
                  <Card size="small" style={{ marginTop: 12 }}>
                    <Title level={5}>Feedback</Title>
                    <Paragraph>{item.evaluation.feedbackText}</Paragraph>
                  </Card>
                </>
              )}
            </div>
          ),
        }))}
      />
    </div>
  )
}
