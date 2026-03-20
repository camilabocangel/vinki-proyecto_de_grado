import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Col,
  Row,
  Typography,
  Button,
  Table,
  Tag,
  Skeleton,
  Badge,
  Progress,
} from 'antd'
import { ThunderboltFilled, ArrowRightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useSSE } from '../../hooks/useSSE'

const { Title, Text } = Typography

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

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: 'Pendiente' },
  processing: { color: 'purple', label: 'Procesando' },
  completed: { color: 'green', label: 'Completada' },
  failed: { color: 'red', label: 'Error' },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  useSSE()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  })

  if (isLoading)
    return (
      <div className="vinki-page">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )

  const scorePercent = data?.averageScore ? Math.round((data.averageScore / 5) * 100) : 0

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'startedAt',
      render: (v: string) =>
        new Date(v).toLocaleDateString('es', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
    {
      title: 'Estado',
      dataIndex: 'evaluationStatus',
      render: (status: string) => {
        const cfg = statusConfig[status] || statusConfig.pending
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: '',
      width: 120,
      render: (_: unknown, record: { id: number; evaluationStatus: string }) => (
        <Button
          type="link"
          size="small"
          icon={<ArrowRightOutlined />}
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
    <div className="vinki-page">
      <div className="vinki-page-header">
        <div>
          <Title level={3} className="vinki-page-title">
            Hola, {data?.user.name?.split(' ')[0]}
          </Title>
          <Text type="secondary">Aquí tienes un resumen de tu progreso</Text>
        </div>
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
      </div>

      {/* Score Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card className="vinki-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Progress
                type="circle"
                percent={scorePercent}
                size={64}
                strokeColor="#7C3AED"
                format={() => (
                  <Text strong style={{ fontSize: 18 }}>
                    {data?.averageScore?.toFixed(1) ?? '-'}
                  </Text>
                )}
              />
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Puntaje IA
                </Text>
                <div
                  style={{
                    fontSize: 12,
                    color: '#10B981',
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  de 5.0
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="vinki-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Progress
                type="circle"
                percent={
                  data?.recentInterviews.length
                    ? (data.recentInterviews.length / 10) * 100
                    : 0
                }
                size={64}
                strokeColor="#F97316"
                format={() => (
                  <Text strong style={{ fontSize: 18 }}>
                    {data?.recentInterviews.length ?? 0}
                  </Text>
                )}
              />
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Entrevistas
                </Text>
                <div
                  style={{
                    fontSize: 12,
                    color: '#F97316',
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  realizadas
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="vinki-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Progress
                type="circle"
                percent={100}
                size={64}
                strokeColor={data?.pendingNotifications ? '#F59E0B' : '#10B981'}
                format={() => (
                  <Text strong style={{ fontSize: 18 }}>
                    {data?.pendingNotifications ?? 0}
                  </Text>
                )}
              />
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Pendientes
                </Text>
                <div
                  style={{
                    fontSize: 12,
                    color: '#6B7280',
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  evaluaciones
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Skills */}
      {data?.skillScores && data.skillScores.length > 0 && (
        <Card className="vinki-card" title="Habilidades" style={{ marginBottom: 24 }}>
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
                  <Text strong>{skill.score.toFixed(0)}%</Text>
                </div>
                <Progress
                  percent={skill.score}
                  showInfo={false}
                  strokeColor={
                    skill.score >= 80
                      ? '#10B981'
                      : skill.score >= 50
                        ? '#7C3AED'
                        : '#F97316'
                  }
                  size="small"
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Recent interviews */}
      <Card className="vinki-card" title="Últimas entrevistas">
        <Table
          dataSource={data?.recentInterviews}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  )
}
