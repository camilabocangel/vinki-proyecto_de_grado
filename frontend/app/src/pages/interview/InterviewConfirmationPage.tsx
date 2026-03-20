import { useNavigate, useParams } from 'react-router-dom'
import { Result, Button } from 'antd'
import { CheckCircleFilled } from '@ant-design/icons'

export default function InterviewConfirmationPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="vinki-page" style={{ maxWidth: 600, margin: '0 auto' }}>
      <Result
        icon={<CheckCircleFilled style={{ color: '#7C3AED' }} />}
        title="¡Entrevista enviada!"
        subTitle="Tu evaluación está siendo procesada por nuestra IA. Recibirás una notificación cuando esté lista."
        extra={[
          <Button type="primary" key="dashboard" onClick={() => navigate('/dashboard')}>
            Ir al dashboard
          </Button>,
          <Button key="feedback" onClick={() => navigate(`/feedback/${id}`)}>
            Ver estado
          </Button>,
        ]}
      />
    </div>
  )
}
