import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  Card,
  Typography,
  Select,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Tag,
} from 'antd'
import {
  DownloadOutlined,
  ClearOutlined,
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'

const { Title } = Typography

interface SkillItem {
  name: string
  score: number
}

interface StudentItem {
  id: number
  name: string
  email: string
  interviewCount: number
  avgScore: number | null
  levelName: string | null
  languageName: string | null
  skills: SkillItem[]
  lastInterviewDate: string | null
}

interface RecruiterDashboardResponse {
  students: StudentItem[]
  total: number
}

const PAGE_SIZE = 10

const LEVEL_OPTIONS = [
  { label: 'Junior', value: 'Junior' },
  { label: 'Mid', value: 'Mid' },
  { label: 'Senior', value: 'Senior' },
]

export default function RecruiterDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [levelFilter, setLevelFilter] = useState<string | undefined>()
  const [languageFilter, setLanguageFilter] = useState<string | undefined>()

  const { data: languages } = useQuery({
    queryKey: ['catalogs', 'languages'],
    queryFn: () => api.get<{ id: number; name: string }[]>('/catalogs/languages'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter', 'students', levelFilter, languageFilter],
    queryFn: () =>
      api.get<RecruiterDashboardResponse>('/recruiter/students', {
        ...(levelFilter && { level: levelFilter }),
        ...(languageFilter && { language: languageFilter }),
      }),
  })

  const students = data?.students ?? []

  // Stats
  const totalStudents = data?.total ?? 0

  const globalAvgScore = useMemo(() => {
    const scored = students.filter((s) => s.avgScore != null)
    if (scored.length === 0) return null
    return scored.reduce((sum, s) => sum + (s.avgScore ?? 0), 0) / scored.length
  }, [students])

  const activeLastMonth = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return students.filter(
      (s) => s.lastInterviewDate && new Date(s.lastInterviewDate) >= thirtyDaysAgo,
    ).length
  }, [students])

  // Paginated slice
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return students.slice(start, start + PAGE_SIZE)
  }, [students, page])

  const clearFilters = () => {
    setLevelFilter(undefined)
    setLanguageFilter(undefined)
    setPage(1)
  }

  const exportCSV = () => {
    if (!students.length) return
    const headers = [
      'Rank',
      'Name',
      'Email',
      'Level',
      'Language',
      'Avg Score',
      'Skills',
      'Last Interview',
    ]
    const rows = students.map((s, i) => [
      i + 1,
      `"${s.name}"`,
      s.email,
      s.levelName ?? '',
      s.languageName ?? '',
      s.avgScore != null ? s.avgScore.toFixed(2) : '',
      `"${s.skills.map((sk) => `${sk.name}(${sk.score.toFixed(1)})`).join(', ')}"`,
      s.lastInterviewDate ? new Date(s.lastInterviewDate).toLocaleDateString() : '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'recruiter-shortlist.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    {
      title: '#',
      key: 'rank',
      width: 60,
      render: (_: unknown, __: StudentItem, index: number) =>
        (page - 1) * PAGE_SIZE + index + 1,
    },
    { title: t('table.name'), dataIndex: 'name', key: 'name' },
    { title: t('table.email'), dataIndex: 'email', key: 'email' },
    {
      title: t('interview.level'),
      dataIndex: 'levelName',
      key: 'levelName',
      render: (v: string | null) => v ?? '-',
    },
    {
      title: t('interview.language'),
      dataIndex: 'languageName',
      key: 'languageName',
      render: (v: string | null) => v ?? '-',
    },
    {
      title: t('table.avgScore'),
      dataIndex: 'avgScore',
      key: 'avgScore',
      render: (v: number | null) =>
        v != null ? (
          <Tag color={v >= 3.5 ? 'green' : v >= 2 ? 'orange' : 'red'}>{v.toFixed(2)}</Tag>
        ) : (
          <Tag>{t('recruiter.noScore')}</Tag>
        ),
    },
    {
      title: t('recruiter.skills'),
      dataIndex: 'skills',
      key: 'skills',
      render: (skills: SkillItem[]) =>
        skills.length > 0
          ? skills.map((sk) => (
              <Tag key={sk.name} style={{ marginBottom: 2 }}>
                {sk.name}: {sk.score.toFixed(1)}
              </Tag>
            ))
          : '-',
    },
    {
      title: t('recruiter.lastInterview'),
      dataIndex: 'lastInterviewDate',
      key: 'lastInterviewDate',
      render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : '-'),
    },
    {
      title: t('table.actions'),
      key: 'actions',
      render: (_: unknown, record: StudentItem) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/recruiter/students/${record.id}`)}
        >
          {t('table.viewProfile')}
        </Button>
      ),
    },
  ]

  return (
    <div className="vinki-page">
      <Title level={3} className="vinki-page-title">
        {t('recruiter.panel')}
      </Title>

      {/* Filters row */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder={t('recruiter.filterByLevel')}
          allowClear
          value={levelFilter}
          onChange={(v) => {
            setLevelFilter(v)
            setPage(1)
          }}
          options={LEVEL_OPTIONS}
          style={{ width: 180 }}
        />
        <Select
          placeholder={t('recruiter.filterByLanguage')}
          allowClear
          value={languageFilter}
          onChange={(v) => {
            setLanguageFilter(v)
            setPage(1)
          }}
          options={languages?.map((l) => ({ label: l.name, value: l.name }))}
          style={{ width: 200 }}
        />
        <Button icon={<ClearOutlined />} onClick={clearFilters}>
          {t('recruiter.clearFilters')}
        </Button>
        <Button type="primary" icon={<DownloadOutlined />} onClick={exportCSV}>
          {t('recruiter.exportShortlist')}
        </Button>
      </Space>

      {/* Stats cards row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t('recruiter.totalStudents')}
              value={totalStudents}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t('recruiter.averageScore')}
              value={globalAvgScore != null ? globalAvgScore.toFixed(2) : '-'}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={t('recruiter.activeLastMonth')}
              value={activeLastMonth}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Ranking table */}
      <Card title={t('recruiter.ranking')}>
        <Table
          dataSource={paginatedStudents}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total: totalStudents,
            pageSize: PAGE_SIZE,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  )
}
