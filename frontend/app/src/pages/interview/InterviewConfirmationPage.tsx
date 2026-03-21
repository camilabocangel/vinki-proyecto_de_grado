import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Result, Button } from 'antd'
import { CheckCircleFilled } from '@ant-design/icons'

export default function InterviewConfirmationPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="vinki-page" style={{ maxWidth: 600, margin: '0 auto' }}>
      <Result
        icon={<CheckCircleFilled style={{ color: 'var(--color-primary)' }} />}
        title={t('interview.sent')}
        subTitle={t('interview.sentMessage')}
        extra={[
          <Button type="primary" key="dashboard" onClick={() => navigate('/dashboard')}>
            {t('interview.goToDashboard')}
          </Button>,
          <Button key="feedback" onClick={() => navigate(`/feedback/${id}`)}>
            {t('interview.viewStatus')}
          </Button>,
        ]}
      />
    </div>
  )
}
