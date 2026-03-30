import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Row,
  Col,
  Card,
  Select,
  Typography,
  Statistic,
  Tag,
  Empty,
  Spin,
  List,
} from 'antd'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from 'recharts'
import { api } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'

const { Title, Text } = Typography

interface StudentItem {
  id: number
  name: string
  email: string
  interviewCount: number
  avgScore: number | null
  levelName: string | null
  languageName: string | null
  skills: { name: string; score: number }[]
  lastInterviewDate: string | null
}

interface RecruiterDashboardResponse {
  students: StudentItem[]
  total: number
}

interface CompareSkill {
  skillName: string
  score: number
}

interface CompareInterview {
  interviewId: number
  date: string
  score: number | null
}

interface CompareStudent {
  id: number
  name: string
  email: string
  interviewCount: number
  avgScore: number | null
  skillScores: CompareSkill[]
  levelDistribution: { level: string; count: number }[]
  last5Interviews: CompareInterview[]
}

interface CompareResponse {
  students: CompareStudent[]
}

const PIE_COLORS = ['#52c41a', '#1677ff', '#faad14', '#ff4d4f']

export default function CandidateComparatorPage() {
  const { t } = useTranslation()
  usePageTitle(t('recruiter.compareTitle'))

  const [studentAId, setStudentAId] = useState<number | undefined>()
  const [studentBId, setStudentBId] = useState<number | undefined>()

  const { data: dashboardData, isLoading: loadingStudents } = useQuery({
    queryKey: ['recruiter', 'students'],
    queryFn: () => api.get<RecruiterDashboardResponse>('/recruiter/students'),
  })

  const students = dashboardData?.students ?? []

  const bothSelected = studentAId != null && studentBId != null
  const studentIds = bothSelected ? `${studentAId},${studentBId}` : ''

  const { data: compareData, isLoading: loadingCompare } = useQuery({
    queryKey: ['recruiter', 'compare', studentIds],
    queryFn: () => api.get<CompareResponse>('/recruiter/compare', { studentIds }),
    enabled: bothSelected,
  })

  const studentA = compareData?.students?.[0]
  const studentB = compareData?.students?.[1]

  // Build radar data merging both students' skills
  const radarData = (() => {
    if (!studentA && !studentB) return []
    const skillMap = new Map<string, { skillName: string; A: number; B: number }>()

    for (const s of studentA?.skillScores ?? []) {
      skillMap.set(s.skillName, { skillName: s.skillName, A: s.score, B: 0 })
    }
    for (const s of studentB?.skillScores ?? []) {
      const existing = skillMap.get(s.skillName)
      if (existing) {
        existing.B = s.score
      } else {
        skillMap.set(s.skillName, { skillName: s.skillName, A: 0, B: s.score })
      }
    }
    return Array.from(skillMap.values())
  })()

  const renderStudentColumn = (student: CompareStudent | undefined, label: string) => {
    if (!student) {
      return (
        <Card
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Empty description={label} />
        </Card>
      )
    }
    return (
      <Card>
        <Title level={4} style={{ marginTop: 0 }}>
          {student.name}
        </Title>
        <Text type="secondary">{student.email}</Text>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Statistic
              title={t('recruiter.totalInterviews')}
              value={student.interviewCount}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title={t('recruiter.averageScore')}
              value={student.avgScore?.toFixed(2) ?? '-'}
              suffix="/ 5"
            />
          </Col>
        </Row>

        {/* Level distribution pie chart */}
        <div style={{ marginTop: 24 }}>
          <Text strong>{t('recruiter.levelDist')}</Text>
          {student.levelDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={student.levelDistribution}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ level, count }: { level: string; count: number }) =>
                    `${level}: ${count}`
                  }
                >
                  {student.levelDistribution.map((_entry, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty description={t('common.noData')} style={{ margin: '16px 0' }} />
          )}
        </div>

        {/* Last 5 interviews */}
        <div style={{ marginTop: 16 }}>
          <Text strong>{t('recruiter.last5')}</Text>
          <List
            size="small"
            dataSource={student.last5Interviews}
            renderItem={(item) => (
              <List.Item>
                <Text type="secondary" style={{ marginRight: 8 }}>
                  #{item.interviewId}
                </Text>
                <Tag>{new Date(item.date).toLocaleDateString()}</Tag>
                <Text strong>{item.score != null ? item.score.toFixed(2) : '-'}</Text>
              </List.Item>
            )}
            locale={{ emptyText: t('common.noData') }}
          />
        </div>
      </Card>
    )
  }

  return (
    <div className="vinki-page" style={{ padding: '24px 32px' }}>
      <Title level={3} className="vinki-page-title">
        {t('recruiter.compareTitle')}
      </Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Select
            placeholder={t('recruiter.selectStudentA')}
            value={studentAId}
            onChange={setStudentAId}
            loading={loadingStudents}
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            size="large"
            options={students.map((s) => ({
              label: `${s.name} (${s.email})`,
              value: s.id,
            }))}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12}>
          <Select
            placeholder={t('recruiter.selectStudentB')}
            value={studentBId}
            onChange={setStudentBId}
            loading={loadingStudents}
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            size="large"
            options={students
              .filter((s) => s.id !== studentAId)
              .map((s) => ({
                label: `${s.name} (${s.email})`,
                value: s.id,
              }))}
            allowClear
          />
        </Col>
      </Row>

      {loadingCompare && bothSelected && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      )}

      {!bothSelected && (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <Empty description={t('recruiter.selectBothStudents')} />
        </Card>
      )}

      {bothSelected && !loadingCompare && compareData && (
        <>
          {/* Overlay radar chart */}
          {radarData.length > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <Title level={5} style={{ marginTop: 0 }}>
                {t('recruiter.skillRadar')}
              </Title>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skillName" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name={studentA?.name ?? 'A'}
                    dataKey="A"
                    stroke="#1677ff"
                    fill="#1677ff"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name={studentB?.name ?? 'B'}
                    dataKey="B"
                    stroke="#faad14"
                    fill="#faad14"
                    fillOpacity={0.2}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Side-by-side columns */}
          <Row gutter={24}>
            <Col xs={24} md={12}>
              {renderStudentColumn(studentA, t('recruiter.selectStudentA'))}
            </Col>
            <Col xs={24} md={12}>
              {renderStudentColumn(studentB, t('recruiter.selectStudentB'))}
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}
