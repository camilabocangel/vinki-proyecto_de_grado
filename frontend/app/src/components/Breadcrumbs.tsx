import { Breadcrumb } from 'antd'
import { useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HomeOutlined } from '@ant-design/icons'

const routeNames: Record<string, string> = {
  dashboard: 'nav.dashboard',
  interview: 'nav.interview',
  new: 'common.new',
  feedback: 'feedback.reportTitle',
  history: 'nav.history',
  settings: 'nav.settings',
  recruiter: 'nav.talent',
  admin: 'nav.questions',
  questions: 'nav.questions',
  'study-plan': 'nav.studyPlan',
  confirmation: 'interview.sent',
  shared: 'feedback.reportTitle',
  audit: 'nav.auditLogs',
  analytics: 'nav.analytics',
  students: 'nav.talent',
}

// Routes that are actual pages (clickable)
const validRoutes = new Set([
  '/dashboard',
  '/interview/new',
  '/history',
  '/settings',
  '/recruiter',
  '/admin/questions',
  '/admin/analytics',
  '/admin/audit',
  '/study-plan',
])

export function Breadcrumbs() {
  const location = useLocation()
  const { t } = useTranslation()

  const pathSegments = location.pathname.split('/').filter(Boolean)
  if (pathSegments.length <= 1) return null

  const items = [
    {
      title: (
        <Link to="/dashboard">
          <HomeOutlined />
        </Link>
      ),
    },
    ...pathSegments.map((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/')
      const isLast = index === pathSegments.length - 1
      const isId = /^\d+$/.test(segment)
      const label = isId ? `#${segment}` : t(routeNames[segment] || segment)
      const isClickable = !isLast && validRoutes.has(path)

      return {
        title: isClickable ? <Link to={path}>{label}</Link> : label,
      }
    }),
  ]

  return <Breadcrumb items={items} style={{ marginBottom: 16 }} />
}
