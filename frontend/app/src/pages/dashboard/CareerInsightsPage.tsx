import { useQuery } from '@tanstack/react-query'
import { useTranslation, Trans } from 'react-i18next'
import {
  Typography,
  Card,
  Tag,
  Progress,
  Row,
  Col,
  Statistic,
  Spin,
  Empty,
  Space,
  Steps,
} from 'antd'
import {
  RocketOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
  ReferenceLine,
} from 'recharts'
import { api } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'

const { Title, Text, Paragraph } = Typography

interface DataPoint {
  date: string
  interviewId: number
  avgScore: number
  monthIndex: number
}

interface TrajectoryData {
  currentLevel: string
  predictedNextLevel: string | null
  monthsToNext: number | null
  growthRate: number
  confidence: number
  currentAvgScore: number
  dataPoints: DataPoint[]
}

interface SkillDetail {
  name: string
  required: number
  userScore: number
}

interface MissingSkill {
  name: string
  required: number
  gap: number
}

interface JobFitProfile {
  id: string
  title: string
  companyType: string
  level: string
  matchPercent: number
  requiredSkills: SkillDetail[]
  missingSkills: MissingSkill[]
}

const LEVEL_COLORS: Record<string, string> = {
  Junior: '#52c41a',
  Mid: '#1890ff',
  Senior: '#faad14',
}

const LEVEL_BG: Record<string, string> = {
  Junior: 'var(--color-level-junior-bg)',
  Mid: 'var(--color-level-mid-bg)',
  Senior: 'var(--color-level-senior-bg)',
}

function buildProjectedData(dataPoints: DataPoint[], growthRate: number) {
  if (dataPoints.length === 0) return []

  const last = dataPoints[dataPoints.length - 1]
  const projected = []

  // Add actual data points
  for (const dp of dataPoints) {
    projected.push({
      date: dp.date,
      actual: dp.avgScore,
      projected: null as number | null,
    })
  }

  // Add projected points (6 months into the future)
  if (growthRate !== 0) {
    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(last.date)
      futureDate.setMonth(futureDate.getMonth() + i)
      const projectedScore = Math.min(5, Math.max(0, last.avgScore + growthRate * i))
      projected.push({
        date: futureDate.toISOString().split('T')[0],
        actual: null as number | null,
        projected: +projectedScore.toFixed(2),
      })
    }
    // Connect last actual to first projected
    const lastIdx = dataPoints.length - 1
    projected[lastIdx].projected = projected[lastIdx].actual
  }

  return projected
}

export default function CareerInsightsPage() {
  const { t } = useTranslation()
  usePageTitle(t('nav.career'))

  const { data: trajectory, isLoading: trajectoryLoading } = useQuery({
    queryKey: ['career', 'trajectory'],
    queryFn: () => api.get<TrajectoryData | null>('/career/trajectory'),
  })

  const { data: jobFit, isLoading: jobFitLoading } = useQuery({
    queryKey: ['career', 'job-fit'],
    queryFn: () => api.get<JobFitProfile[]>('/career/job-fit'),
  })

  const isLoading = trajectoryLoading || jobFitLoading

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!trajectory) {
    return (
      <div style={{ padding: 40 }}>
        <Empty description={t('career.noData')} />
      </div>
    )
  }

  const projectedData = buildProjectedData(trajectory.dataPoints, trajectory.growthRate)
  const bestMatch = jobFit && jobFit.length > 0 ? jobFit[0] : null

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 40px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        <RocketOutlined style={{ marginRight: 8 }} />
        {t('nav.career')}
      </Title>

      {/* Section 1: Trajectory Prediction */}
      <Title level={3} style={{ marginBottom: 16 }}>
        {t('career.trajectory')}
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Current Level Card */}
        <Col xs={24} md={8}>
          <Card
            style={{
              textAlign: 'center',
              borderColor: LEVEL_COLORS[trajectory.currentLevel],
              background: LEVEL_BG[trajectory.currentLevel],
            }}
          >
            <Tag
              color={LEVEL_COLORS[trajectory.currentLevel]}
              style={{ fontSize: 20, padding: '6px 20px', marginBottom: 12 }}
            >
              {trajectory.currentLevel}
            </Tag>
            <Statistic
              title={t('table.score')}
              value={trajectory.currentAvgScore}
              suffix="/ 5.0"
              precision={2}
            />
          </Card>
        </Col>

        {/* Arrow + Next Level */}
        <Col xs={24} md={8}>
          <Card
            style={{
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {trajectory.predictedNextLevel ? (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <Tag
                    color={LEVEL_COLORS[trajectory.currentLevel]}
                    style={{ fontSize: 16, padding: '4px 12px' }}
                  >
                    {trajectory.currentLevel}
                  </Tag>
                  <ArrowRightOutlined
                    style={{ fontSize: 20, margin: '0 12px', color: '#999' }}
                  />
                  <Tag
                    color={LEVEL_COLORS[trajectory.predictedNextLevel]}
                    style={{ fontSize: 16, padding: '4px 12px' }}
                  >
                    {trajectory.predictedNextLevel}
                  </Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  {trajectory.monthsToNext != null
                    ? t('career.monthsToNext', {
                        months: trajectory.monthsToNext,
                        level: trajectory.predictedNextLevel,
                      })
                    : trajectory.growthRate <= 0
                      ? t('career.growthRate', { rate: trajectory.growthRate.toFixed(2) })
                      : `${trajectory.predictedNextLevel}`}
                </Text>
              </div>
            ) : (
              <div>
                <Tag color="gold" style={{ fontSize: 18, padding: '6px 16px' }}>
                  Senior
                </Tag>
                <Paragraph type="secondary" style={{ marginTop: 8 }}>
                  {t('career.trajectory')} - {t('career.maxLevel')}
                </Paragraph>
              </div>
            )}
          </Card>
        </Col>

        {/* Growth Rate + Confidence */}
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title={t('career.growthRateLabel')}
              value={
                trajectory.growthRate > 0
                  ? `+${trajectory.growthRate}`
                  : trajectory.growthRate
              }
              suffix={t('career.perMonth')}
              valueStyle={{
                color:
                  trajectory.growthRate > 0
                    ? '#3f8600'
                    : trajectory.growthRate < 0
                      ? '#cf1322'
                      : undefined,
              }}
            />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">{t('career.confidence')}</Text>
              <Progress
                percent={trajectory.confidence}
                size="small"
                status={
                  trajectory.confidence > 60
                    ? 'success'
                    : trajectory.confidence > 30
                      ? 'normal'
                      : 'exception'
                }
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({t('career.dataPoints', { count: trajectory.dataPoints.length })})
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Score Trajectory Chart */}
      <Card style={{ marginBottom: 32 }}>
        <Title level={4}>{t('career.trajectory')}</Title>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={projectedData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <ReferenceLine y={2.5} stroke="#1890ff" strokeDasharray="3 3" label="Mid" />
            <ReferenceLine
              y={3.8}
              stroke="#faad14"
              strokeDasharray="3 3"
              label="Senior"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#005C53"
              strokeWidth={2}
              dot={{ r: 4 }}
              name={t('career.actual')}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#005C53"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={{ r: 3 }}
              name={t('career.projected')}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Section 2: Job Fit Profiles */}
      {jobFit && jobFit.length > 0 && (
        <>
          <Title level={3} style={{ marginBottom: 16 }}>
            {t('career.jobFit')}
          </Title>

          <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
            {jobFit.map((profile) => (
              <Col xs={24} sm={12} lg={8} key={profile.id}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderTop: `3px solid ${LEVEL_COLORS[profile.level] || '#ccc'}`,
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <Progress
                      type="circle"
                      percent={profile.matchPercent}
                      width={80}
                      strokeColor={
                        profile.matchPercent >= 70
                          ? '#52c41a'
                          : profile.matchPercent >= 40
                            ? '#1890ff'
                            : '#ff4d4f'
                      }
                    />
                  </div>

                  <Title level={5} style={{ marginBottom: 4 }}>
                    {profile.title}
                  </Title>
                  <Space style={{ marginBottom: 12 }}>
                    <Tag>{profile.companyType}</Tag>
                    <Tag color={LEVEL_COLORS[profile.level]}>{profile.level}</Tag>
                  </Space>

                  <div style={{ marginBottom: 8 }}>
                    {profile.requiredSkills.map((skill) => (
                      <Tag
                        key={skill.name}
                        color={skill.userScore >= skill.required ? 'green' : 'red'}
                        icon={
                          skill.userScore >= skill.required ? (
                            <CheckCircleOutlined />
                          ) : (
                            <CloseCircleOutlined />
                          )
                        }
                        style={{ marginBottom: 4 }}
                      >
                        {skill.name}
                      </Tag>
                    ))}
                  </div>

                  {profile.missingSkills.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('career.missingSkills')}:
                      </Text>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 12 }}>
                        {profile.missingSkills.slice(0, 3).map((ms) => (
                          <li key={ms.name}>
                            {ms.name}: <Text type="danger">-{ms.gap}</Text>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      {/* Section 3: Skill Gap Analysis for best match */}
      {bestMatch && bestMatch.requiredSkills.length > 0 && (
        <>
          <Title level={3} style={{ marginBottom: 16 }}>
            {t('career.skillGap')}
          </Title>
          <Card style={{ marginBottom: 32 }}>
            <Paragraph>
              <Text strong>{bestMatch.title}</Text> @ {bestMatch.companyType} (
              {bestMatch.level}) -{' '}
              <Text type="success">
                {t('career.matchLabel', { percent: bestMatch.matchPercent })}
              </Text>
            </Paragraph>

            <ResponsiveContainer
              width="100%"
              height={Math.max(250, bestMatch.requiredSkills.length * 50)}
            >
              <BarChart
                layout="vertical"
                data={bestMatch.requiredSkills.map((s) => ({
                  skill: s.name,
                  required: s.required,
                  yours: s.userScore,
                }))}
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis
                  dataKey="skill"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={90}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="required" fill="#d9d9d9" name={t('career.required')} />
                <Bar dataKey="yours" name={t('career.yourScore')}>
                  {bestMatch.requiredSkills.map((s, i) => (
                    <Cell
                      key={i}
                      fill={s.userScore >= s.required ? '#52c41a' : '#ff4d4f'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {bestMatch.missingSkills.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>{t('career.missingSkills')}</Title>
                <Steps
                  direction="vertical"
                  size="small"
                  current={-1}
                  items={bestMatch.missingSkills.map((ms) => ({
                    title: (
                      <Trans
                        i18nKey="career.improveBy"
                        values={{ skill: ms.name, gap: ms.gap }}
                        components={{
                          1: <Text strong />,
                          2: <Text type="danger" />,
                        }}
                      />
                    ),
                    description: t('career.requiredCurrent', {
                      required: ms.required,
                      current: ms.required - ms.gap,
                    }),
                    status: 'wait' as const,
                  }))}
                />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
