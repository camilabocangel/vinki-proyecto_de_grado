import { ThunderboltFilled, PlayCircleFilled } from '@ant-design/icons'
import { Button, Card, Col, Divider, Layout, Row, Statistic, Tag, Typography } from 'antd'
import type { FC } from 'react'
import './styles/app.css'

const { Title, Paragraph, Text } = Typography

const metrics = [
  { label: 'Prácticas completadas', value: 18, suffix: '/ 30', trend: '+4 esta semana' },
  { label: 'Nivel promedio', value: 'Mid+', trend: '↑ consistente' },
  { label: 'Feedback IA', value: 4.5, suffix: '/5', trend: 'Comunicación destacada' },
]

const roadmap = [
  {
    title: 'Inicio rápido',
    description: 'Explora la simulación guiada y define tu stack preferido.',
    tasks: ['Completar onboarding', 'Configurar stack Frontend', 'Correr primera prueba'],
  },
  {
    title: 'Próximo sprint',
    description: 'Profundiza en algoritmos y comunicación técnica.',
    tasks: [
      'Practicar 3 entrevistas estructuradas',
      'Analizar feedback automático',
      'Registrar notas propias',
    ],
  },
  {
    title: 'Validación Final',
    description: 'Comparte resultados con tutores y reclutadores invitados.',
    tasks: [
      'Generar reporte PDF',
      'Solicitar revisión de tutor',
      'Agendar desafío en vivo',
    ],
  },
]

const App: FC = () => {
  return (
    <Layout className="app-shell">
      <header className="app-header grid-pattern">
        <span className="floating-badge">alpha · AI ready</span>
        <Title level={1} style={{ color: '#fff', marginBottom: '0.75rem' }}>
          Vinki · Simulador de entrevistas técnicas
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.88)', maxWidth: 640 }}>
          Practica entrevistas con inteligencia artificial, recibe retroalimentación
          inmediata y transforma tu preparación en evidencias compartibles con
          reclutadores.
        </Paragraph>
        <div className="cta-stack">
          <Button type="primary" size="large" icon={<ThunderboltFilled />}>
            Iniciar simulación
          </Button>
          <Button size="large" ghost icon={<PlayCircleFilled />}>
            Ver demo guiada
          </Button>
        </div>
        <div className="stats-grid">
          {metrics.map((metric) => (
            <Card
              key={metric.label}
              variant="borderless"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              <Text type="secondary">{metric.label}</Text>
              <Statistic
                value={metric.value}
                suffix={metric.suffix}
                styles={{ content: { color: 'var(--color-secondary)' } }}
              />
              <Text strong>{metric.trend}</Text>
            </Card>
          ))}
        </div>
      </header>

      <Layout.Content className="app-content">
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={10}>
            <Card className="roadmap-card" title={<Title level={3}>Próximo paso</Title>}>
              <Paragraph>
                Define tus objetivos de práctica y mantén el historial sincronizado entre
                feedback IA y notas personales.
              </Paragraph>
              <Divider />
              <div className="cta-stack">
                <Tag color="orange">Frontend · React</Tag>
                <Tag color="blue">Nivel objetivo: Senior</Tag>
                <Tag color="green">Tiempo estimado: 35 min</Tag>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card
              className="roadmap-card"
              title={<Title level={3}>Roadmap inmediato</Title>}
            >
              <Row gutter={[16, 16]}>
                {roadmap.map((phase) => (
                  <Col xs={24} md={12} key={phase.title}>
                    <Card
                      size="small"
                      variant="borderless"
                      style={{ background: 'var(--color-bg)' }}
                    >
                      <Title level={4}>{phase.title}</Title>
                      <Paragraph type="secondary">{phase.description}</Paragraph>
                      <ul>
                        {phase.tasks.map((task) => (
                          <li key={task}>{task}</li>
                        ))}
                      </ul>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      </Layout.Content>
    </Layout>
  )
}

export default App
