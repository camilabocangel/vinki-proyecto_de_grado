import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, Typography, Row, Col, Skeleton, Statistic } from 'antd'
import {
  UserOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { api } from '../../api/client'

const { Title } = Typography

interface AdminAnalytics {
  totalUsers: number
  totalStudents: number
  totalInterviews: number
  completedInterviews: number
  totalQuestions: number
  interviewsPerDay: Record<string, number>
  levelDistribution: Array<{ level: string; count: number }>
}

const PIE_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F97316', '#EF4444', '#8B5CF6']

export default function AdminAnalyticsPage() {
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api.get<AdminAnalytics>('/admin/analytics'),
  })

  if (isLoading) {
    return (
      <div className="vinki-page">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="vinki-page">
        <Title level={3}>{t('nav.analytics')}</Title>
        <p>{t('common.noData')}</p>
      </div>
    )
  }

  const barData = Object.entries(data.interviewsPerDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: date.slice(5),
      count,
    }))

  return (
    <div className="vinki-page">
      <Title level={3} className="vinki-page-title">
        {t('nav.analytics')}
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card className="vinki-card">
            <Statistic
              title={t('admin.totalUsers')}
              value={data.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#7C3AED' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="vinki-card">
            <Statistic
              title={t('admin.totalInterviews')}
              value={data.totalInterviews}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#3B82F6' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="vinki-card">
            <Statistic
              title={t('admin.completedInterviews')}
              value={data.completedInterviews}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="vinki-card">
            <Statistic
              title={t('admin.totalQuestions')}
              value={data.totalQuestions}
              prefix={<QuestionCircleOutlined />}
              valueStyle={{ color: '#F97316' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="vinki-card" title={t('admin.interviewsPerDay')}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="vinki-card" title={t('admin.levelDistribution')}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={data.levelDistribution}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ level, count }) => `${level}: ${count}`}
                >
                  {data.levelDistribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
