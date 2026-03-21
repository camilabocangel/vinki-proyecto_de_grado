import { useTranslation } from 'react-i18next'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || ''
}

export interface ProgressDataPoint {
  date: string
  interviewId: number
  technicalCorrectness: number
  clarityOfExplanation: number
  communication: number
  confidence: number
  problemSolving: number
  overall: number
}

interface ProgressChartProps {
  data: ProgressDataPoint[]
}

const METRIC_LINES: Array<{
  key: keyof Omit<ProgressDataPoint, 'date' | 'interviewId'>
  color: string
  i18nKey: string
}> = [
  {
    key: 'technicalCorrectness',
    color: '#005C53',
    i18nKey: 'metrics.technicalCorrectness',
  },
  {
    key: 'clarityOfExplanation',
    color: '#3B82F6',
    i18nKey: 'metrics.clarityOfExplanation',
  },
  { key: 'communication', color: '#10B981', i18nKey: 'metrics.communication' },
  { key: 'confidence', color: '#F97316', i18nKey: 'metrics.confidence' },
  { key: 'problemSolving', color: '#EF4444', i18nKey: 'metrics.problemSolving' },
  { key: 'overall', color: '#6B7280', i18nKey: 'Overall' },
]

export default function ProgressChart({ data }: ProgressChartProps) {
  const { t } = useTranslation()

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={getCssVar('--color-border') || '#E5E7EB'}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(value: string) =>
            new Date(value).toLocaleDateString('es', { day: '2-digit', month: 'short' })
          }
        />
        <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number, name: string) => [value.toFixed(2), name]}
          labelFormatter={(label: string) =>
            new Date(label).toLocaleDateString('es', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          }
        />
        <Legend />
        {METRIC_LINES.map((m) => (
          <Line
            key={m.key}
            type="monotone"
            dataKey={m.key}
            name={m.key === 'overall' ? 'Overall' : t(m.i18nKey)}
            stroke={m.color}
            strokeWidth={m.key === 'overall' ? 3 : 2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
