import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg)',
      }}
    >
      <Result
        status="404"
        title="404"
        subTitle={t('common.notFound')}
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            {t('common.goHome')}
          </Button>
        }
      />
    </div>
  )
}
