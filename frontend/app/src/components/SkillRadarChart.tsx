import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || ''
}

interface SkillRadarChartProps {
  data: Array<{
    metric: string
    value: number
  }>
}

export function SkillRadarChart({ data }: SkillRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke={getCssVar('--color-border') || '#E5E7EB'} />
        <PolarAngleAxis
          dataKey="metric"
          tick={{
            fill: getCssVar('--color-text-secondary') || '#6B7280',
            fontSize: 12,
            fontWeight: 500,
          }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 5]}
          tick={{ fill: getCssVar('--color-muted') || '#9CA3AF', fontSize: 10 }}
          axisLine={false}
        />
        <Radar
          name="Puntuación"
          dataKey="value"
          stroke="#7C3AED"
          strokeWidth={2}
          fill="#7C3AED"
          fillOpacity={0.15}
          dot={{
            r: 4,
            fill: '#7C3AED',
            stroke: getCssVar('--color-surface') || '#fff',
            strokeWidth: 2,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
