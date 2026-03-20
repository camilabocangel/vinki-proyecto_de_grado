import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

interface SkillRadarChartProps {
  data: Array<{
    metric: string
    value: number
  }>
}

export function SkillRadarChart({ data }: SkillRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" />
        <PolarRadiusAxis angle={30} domain={[0, 5]} />
        <Radar
          name="Puntuación"
          dataKey="value"
          stroke="#1677ff"
          fill="#1677ff"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
