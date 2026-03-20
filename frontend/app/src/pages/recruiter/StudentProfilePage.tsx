import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, Typography, Skeleton, Descriptions, Table, Tag } from 'antd'
import { api } from '../../api/client'
import { SkillRadarChart } from '../../components/SkillRadarChart'

const { Title } = Typography

interface StudentProfile {
  user: { id: number; name: string; email: string; role: string; createdAt: string }
  skillScores: Array<{ skillId: number; skillName: string; score: number }>
  recentInterviews: Array<{
    id: number
    startedAt: string
    evaluationStatus: string
    averageScore: number | null
  }>
}

export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter', 'student', studentId],
    queryFn: () => api.get<StudentProfile>(`/recruiter/students/${studentId}`),
    enabled: !!studentId,
  })

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />
  if (!data) return <div>Estudiante no encontrado</div>

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>{data.user.name}</Title>

      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Email">{data.user.email}</Descriptions.Item>
        <Descriptions.Item label="Registrado">
          {new Date(data.user.createdAt).toLocaleDateString('es')}
        </Descriptions.Item>
      </Descriptions>

      {data.skillScores.length > 0 && (
        <Card title="Habilidades" style={{ marginBottom: 24 }}>
          <SkillRadarChart
            data={data.skillScores.map((s) => ({
              metric: s.skillName,
              value: s.score / 20,
            }))}
          />
        </Card>
      )}

      <Card title="Entrevistas recientes">
        <Table
          dataSource={data.recentInterviews}
          rowKey="id"
          columns={[
            {
              title: 'Fecha',
              dataIndex: 'startedAt',
              render: (v: string) => new Date(v).toLocaleDateString('es'),
            },
            {
              title: 'Estado',
              dataIndex: 'evaluationStatus',
              render: (v: string) => <Tag>{v}</Tag>,
            },
            {
              title: 'Puntaje',
              dataIndex: 'averageScore',
              render: (v: number | null) => v?.toFixed(1) ?? '-',
            },
          ]}
          pagination={false}
        />
      </Card>
    </div>
  )
}
