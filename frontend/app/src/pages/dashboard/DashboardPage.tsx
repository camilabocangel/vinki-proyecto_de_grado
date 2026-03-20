import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Col,
  Row,
  Statistic,
  Typography,
  Button,
  Table,
  Tag,
  Skeleton,
  Badge,
} from 'antd'
import { ThunderboltFilled } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useSSE } from '../../hooks/useSSE'

const { Title } = Typography

interface DashboardData {
  user: { id: number; name: string; email: string; role: string }
  averageScore: number | null
  pendingNotifications: number
  recentInterviews: Array<{
    id: number
    startedAt: string
    finishedAt: string | null
    evaluationStatus: string
    chosenLevelId: number
  }>
  skillScores: Array<{
    skillId: number
    skillName: string
    score: number
    lastUpdated: string
  }>
}

const statusColors: Record<string, string> = {
  pending: 'default',
  processing: 'processing',
  completed: 'success',
  failed: 'error',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  useSSE()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  })

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'startedAt',
      render: (v: string) => new Date(v).toLocaleDateString('es'),
    },
    {
      title: 'Estado',
      dataIndex: 'evaluationStatus',
      render: (status: string) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Acciones',
      render: (_: unknown, record: { id: number; evaluationStatus: string }) => (
        <Button
          type="link"
          onClick={() =>
            record.evaluationStatus === 'completed'
              ? navigate(`/feedback/${record.id}`)
              : navigate(`/interview/${record.id}`)
          }
        >
          {record.evaluationStatus === 'completed' ? 'Ver reporte' : 'Continuar'}
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={2}>Dashboard</Title>
        <Badge count={data?.pendingNotifications} offset={[-5, 5]}>
          <Button
            type="primary"
            icon={<ThunderboltFilled />}
            size="large"
            onClick={() => navigate('/interview/new')}
          >
            Iniciar simulación
          </Button>
        </Badge>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Puntaje promedio"
              value={data?.averageScore ?? '-'}
              suffix="/ 5"
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Entrevistas recientes"
              value={data?.recentInterviews.length ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Evaluaciones pendientes"
              value={data?.pendingNotifications ?? 0}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Últimas entrevistas">
        <Table
          dataSource={data?.recentInterviews}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  )
}
