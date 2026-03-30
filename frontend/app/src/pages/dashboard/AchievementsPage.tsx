import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Typography, Tabs, Tag, Skeleton, Empty } from 'antd'
import {
  TrophyOutlined,
  FireOutlined,
  StarOutlined,
  RocketOutlined,
  CrownOutlined,
  ThunderboltOutlined,
  BookOutlined,
  RiseOutlined,
  LockOutlined,
} from '@ant-design/icons'
import { api } from '../../api/client'
import { usePageTitle } from '../../hooks/usePageTitle'

const { Title, Text } = Typography

interface Achievement {
  id: number
  key: string
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  icon: string
  category: string
  threshold: number
  unlocked: boolean
  unlockedAt: string | null
}

const iconMap: Record<string, React.ReactNode> = {
  trophy: <TrophyOutlined />,
  fire: <FireOutlined />,
  star: <StarOutlined />,
  rocket: <RocketOutlined />,
  crown: <CrownOutlined />,
  thunderbolt: <ThunderboltOutlined />,
  book: <BookOutlined />,
  rise: <RiseOutlined />,
}

const categoryColors: Record<string, string> = {
  interview: '#005C53',
  skill: '#9FC131',
  streak: '#F59E0B',
  knowledge: '#3B82F6',
}

function AchievementCard({
  achievement,
  lang,
}: {
  achievement: Achievement
  lang: string
}) {
  const title = lang === 'en' ? achievement.titleEn : achievement.title
  const description = lang === 'en' ? achievement.descriptionEn : achievement.description
  const icon = iconMap[achievement.icon] || <TrophyOutlined />
  const color = categoryColors[achievement.category] || '#888'

  return (
    <Card
      hoverable={achievement.unlocked}
      style={{
        opacity: achievement.unlocked ? 1 : 0.45,
        borderColor: achievement.unlocked ? color : undefined,
        borderWidth: achievement.unlocked ? 2 : 1,
        height: '100%',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div
          style={{
            fontSize: 36,
            color: achievement.unlocked ? color : '#999',
            marginBottom: 8,
          }}
        >
          {achievement.unlocked ? icon : <LockOutlined />}
        </div>
        <Title level={5} style={{ marginBottom: 4 }}>
          {title}
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {description}
        </Text>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Tag color={achievement.unlocked ? 'green' : 'default'}>
          {achievement.category}
        </Tag>
        {achievement.unlocked && achievement.unlockedAt && (
          <div style={{ marginTop: 6 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {new Date(achievement.unlockedAt).toLocaleDateString('es', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function AchievementsPage() {
  const { t, i18n } = useTranslation()
  usePageTitle(t('achievements.title'))
  const lang = i18n.language?.startsWith('en') ? 'en' : 'es'

  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.get<Achievement[]>('/achievements'),
  })

  if (isLoading) {
    return (
      <div className="vinki-page">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )
  }

  const achievements = data ?? []
  const categories = ['all', 'interview', 'skill', 'streak', 'knowledge']
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  const renderGrid = (items: Achievement[]) => {
    if (items.length === 0) return <Empty description={t('common.noData')} />
    return (
      <Row gutter={[16, 16]}>
        {items.map((a) => (
          <Col xs={24} sm={12} md={8} lg={6} key={a.id}>
            <AchievementCard achievement={a} lang={lang} />
          </Col>
        ))}
      </Row>
    )
  }

  return (
    <div className="vinki-page" role="main">
      <div className="vinki-page-header">
        <div>
          <Title level={3} className="vinki-page-title">
            {t('achievements.title')}
          </Title>
          <Text type="secondary">
            {t('achievements.subtitle', {
              unlocked: unlockedCount,
              total: achievements.length,
            })}
          </Text>
        </div>
      </div>

      <Card className="vinki-card">
        <Tabs
          defaultActiveKey="all"
          items={categories.map((cat) => ({
            key: cat,
            label: cat === 'all' ? t('achievements.all') : t(`achievements.cat_${cat}`),
            children: renderGrid(
              cat === 'all'
                ? achievements
                : achievements.filter((a) => a.category === cat),
            ),
          }))}
        />
      </Card>
    </div>
  )
}
