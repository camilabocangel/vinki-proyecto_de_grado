import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Col,
  Row,
  Typography,
  Progress,
  Button,
  Tag,
  Table,
  Tabs,
  Skeleton,
  Empty,
  message,
  Avatar,
} from 'antd'
import {
  TrophyOutlined,
  FireOutlined,
  StarOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { api } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useAuth } from '../../hooks/useAuth'

const { Title, Text } = Typography

// ---------- Types ----------

interface Challenge {
  id: number
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  type: string
  target: number
  metric: string
  icon: string
  startDate: string
  endDate: string
  participantCount: number
  joined: boolean
  progress: number
  completed: boolean
  completedAt: string | null
}

interface ChallengeLeaderboardEntry {
  rank: number
  userId: number
  name: string
  progress: number
  target: number
  completed: boolean
  completedAt: string | null
}

interface GlobalLeaderboardEntry {
  rank: number
  userId: number
  name: string
  avgScore: number
  interviewCount: number
}

interface GlobalLeaderboard {
  month: string
  daysUntilReset: number
  entries: GlobalLeaderboardEntry[]
}

// ---------- Constants ----------

const iconMap: Record<string, React.ReactNode> = {
  thunderbolt: <ThunderboltOutlined style={{ fontSize: 28 }} />,
  fire: <FireOutlined style={{ fontSize: 28 }} />,
  star: <StarOutlined style={{ fontSize: 28 }} />,
  trophy: <TrophyOutlined style={{ fontSize: 28 }} />,
}

const typeColors: Record<string, string> = {
  volume: '#005C53',
  skill: '#9FC131',
  streak: '#F59E0B',
  speed: '#3B82F6',
}

const GOLD = '#FFD700'
const SILVER = '#C0C0C0'
const BRONZE = '#CD7F32'

function getMedalColor(rank: number): string | undefined {
  if (rank === 1) return GOLD
  if (rank === 2) return SILVER
  if (rank === 3) return BRONZE
  return undefined
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr)
  const now = new Date()
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

// ---------- Challenge Card ----------

function ChallengeCard({
  challenge,
  lang,
  onJoin,
  joining,
}: {
  challenge: Challenge
  lang: string
  onJoin: (id: number) => void
  joining: boolean
}) {
  const { t } = useTranslation()
  const title = lang === 'en' ? challenge.titleEn : challenge.title
  const description = lang === 'en' ? challenge.descriptionEn : challenge.description
  const icon = iconMap[challenge.icon] || <FireOutlined style={{ fontSize: 28 }} />
  const color = typeColors[challenge.type] || '#005C53'
  const remaining = daysUntil(challenge.endDate)
  const percent =
    challenge.target > 0
      ? Math.min(100, Math.round((challenge.progress / challenge.target) * 100))
      : 0

  return (
    <Card
      hoverable
      style={{
        height: '100%',
        borderColor: challenge.completed ? '#52c41a' : color,
        borderWidth: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <Text strong style={{ fontSize: 16, display: 'block' }}>
            {title}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {description}
          </Text>
        </div>
      </div>

      {challenge.joined && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('challenges.progress')}
            </Text>
            <Text strong style={{ fontSize: 12 }}>
              {challenge.progress} / {challenge.target}
            </Text>
          </div>
          <Progress
            percent={percent}
            strokeColor={challenge.completed ? '#52c41a' : color}
            showInfo={false}
            size="small"
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tag icon={<ClockCircleOutlined />} color="default">
            {remaining} {t('challenges.days')}
          </Tag>
          <Tag icon={<TeamOutlined />} color="default">
            {challenge.participantCount} {t('challenges.participants')}
          </Tag>
        </div>
        {challenge.completed ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            {t('challenges.completed')}
          </Tag>
        ) : challenge.joined ? (
          <Tag color="processing">{t('challenges.joined')}</Tag>
        ) : (
          <Button
            type="primary"
            size="small"
            onClick={() => onJoin(challenge.id)}
            loading={joining}
          >
            {t('challenges.join')}
          </Button>
        )}
      </div>
    </Card>
  )
}

// ---------- Challenge Leaderboard Tab ----------

function ChallengeLeaderboardTab({
  challengeId,
  target,
}: {
  challengeId: number
  target: number
}) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['challenges', challengeId, 'leaderboard'],
    queryFn: () =>
      api.get<ChallengeLeaderboardEntry[]>(`/challenges/${challengeId}/leaderboard`),
  })

  const columns = [
    {
      title: t('challenges.rank'),
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      render: (rank: number) => {
        const medal = getMedalColor(rank)
        return medal ? (
          <CrownOutlined style={{ color: medal, fontSize: 20 }} />
        ) : (
          <Text strong>{rank}</Text>
        )
      },
    },
    {
      title: t('challenges.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ChallengeLeaderboardEntry) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar
            size={32}
            style={{ background: getMedalColor(record.rank) || '#005C53' }}
            icon={<UserOutlined />}
          />
          <span>
            {name}
            {record.userId === user?.id && (
              <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                {t('challenges.you')}
              </Text>
            )}
          </span>
        </div>
      ),
    },
    {
      title: t('challenges.progress'),
      dataIndex: 'progress',
      key: 'progress',
      width: 200,
      render: (progress: number, record: ChallengeLeaderboardEntry) => {
        const tgt = record.target ?? target
        const pct = tgt > 0 ? Math.min(100, Math.round((progress / tgt) * 100)) : 0
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={pct}
              size="small"
              showInfo={false}
              strokeColor={record.completed ? '#52c41a' : '#005C53'}
              style={{ flex: 1 }}
            />
            <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {progress}/{tgt}
            </Text>
          </div>
        )
      },
    },
    {
      title: '',
      key: 'status',
      width: 100,
      render: (_: unknown, record: ChallengeLeaderboardEntry) =>
        record.completed ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            {t('challenges.completed')}
          </Tag>
        ) : null,
    },
  ]

  if (isLoading) return <Skeleton active paragraph={{ rows: 4 }} />
  if (!data?.length) return <Empty description={t('challenges.noParticipants')} />

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="userId"
      pagination={false}
      size="middle"
      rowClassName={(record) =>
        record.userId === user?.id ? 'vinki-leaderboard-highlight' : ''
      }
    />
  )
}

// ---------- Main Page ----------

export default function ChallengesPage() {
  const { t, i18n } = useTranslation()
  usePageTitle(t('challenges.title'))
  const lang = i18n.language?.startsWith('en') ? 'en' : 'es'
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [joiningId, setJoiningId] = useState<number | null>(null)

  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => api.get<Challenge[]>('/challenges'),
  })

  const { data: globalLb, isLoading: globalLoading } = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: () => api.get<GlobalLeaderboard>('/leaderboard'),
  })

  const joinMutation = useMutation({
    mutationFn: (challengeId: number) => api.post(`/challenges/${challengeId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
      message.success(t('challenges.joined'))
    },
    onError: (err: Error) => {
      message.error(err.message)
    },
    onSettled: () => setJoiningId(null),
  })

  const handleJoin = (id: number) => {
    setJoiningId(id)
    joinMutation.mutate(id)
  }

  if (challengesLoading) {
    return (
      <div className="vinki-page">
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    )
  }

  const challengeList = challenges ?? []

  const globalColumns = [
    {
      title: t('challenges.rank'),
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      render: (rank: number) => {
        const medal = getMedalColor(rank)
        return medal ? (
          <CrownOutlined style={{ color: medal, fontSize: 20 }} />
        ) : (
          <Text strong>{rank}</Text>
        )
      },
    },
    {
      title: t('challenges.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: GlobalLeaderboardEntry) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar
            size={32}
            style={{ background: getMedalColor(record.rank) || '#005C53' }}
            icon={<UserOutlined />}
          />
          <span>
            {name}
            {record.userId === user?.id && (
              <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                {t('challenges.you')}
              </Text>
            )}
          </span>
        </div>
      ),
    },
    {
      title: t('challenges.score'),
      dataIndex: 'avgScore',
      key: 'avgScore',
      width: 100,
      render: (val: number) => (
        <Text
          strong
          style={{
            color: val >= 4 ? '#52c41a' : val >= 3 ? '#faad14' : '#ff4d4f',
          }}
        >
          {val?.toFixed(2) ?? '-'}
        </Text>
      ),
    },
    {
      title: t('challenges.interviews'),
      dataIndex: 'interviewCount',
      key: 'interviewCount',
      width: 110,
    },
  ]

  return (
    <div className="vinki-page" role="main">
      <div className="vinki-page-header">
        <div>
          <Title level={3} className="vinki-page-title">
            {t('challenges.title')}
          </Title>
          <Text type="secondary">{t('challenges.subtitle')}</Text>
        </div>
      </div>

      {/* Section 1: Active Challenges */}
      <Card
        className="vinki-card"
        title={
          <span>
            <FireOutlined style={{ marginRight: 8 }} />
            {t('challenges.activeChallenges')}
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        {challengeList.length === 0 ? (
          <Empty description={t('challenges.noChallenges')} />
        ) : (
          <Row gutter={[16, 16]}>
            {challengeList.map((c) => (
              <Col xs={24} sm={12} lg={6} key={c.id}>
                <ChallengeCard
                  challenge={c}
                  lang={lang}
                  onJoin={handleJoin}
                  joining={joiningId === c.id}
                />
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Section 2: Global Leaderboard */}
      <Card
        className="vinki-card"
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              <TrophyOutlined style={{ marginRight: 8 }} />
              {t('challenges.globalLeaderboard')}
            </span>
            {globalLb && (
              <Tag color="blue">
                {t('challenges.resetsIn', { days: globalLb.daysUntilReset })}
              </Tag>
            )}
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        {globalLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : !globalLb?.entries?.length ? (
          <Empty description={t('challenges.noParticipants')} />
        ) : (
          <Table
            dataSource={globalLb.entries}
            columns={globalColumns}
            rowKey="userId"
            pagination={false}
            size="middle"
            rowClassName={(record) =>
              record.userId === user?.id ? 'vinki-leaderboard-highlight' : ''
            }
          />
        )}
      </Card>

      {/* Section 3: Challenge Leaderboards */}
      {challengeList.length > 0 && (
        <Card
          className="vinki-card"
          title={
            <span>
              <StarOutlined style={{ marginRight: 8 }} />
              {t('challenges.challengeLeaderboards')}
            </span>
          }
        >
          <Tabs
            items={challengeList.map((c) => ({
              key: String(c.id),
              label: lang === 'en' ? c.titleEn : c.title,
              children: <ChallengeLeaderboardTab challengeId={c.id} target={c.target} />,
            }))}
          />
        </Card>
      )}

      <style>{`
        .vinki-leaderboard-highlight {
          background-color: rgba(0, 92, 83, 0.08) !important;
        }
        .vinki-leaderboard-highlight td {
          background-color: rgba(0, 92, 83, 0.08) !important;
        }
      `}</style>
    </div>
  )
}
