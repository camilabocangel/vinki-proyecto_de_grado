import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Button, Select } from 'antd'
import {
  LoginOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  CodeOutlined,
  RocketOutlined,
  ControlOutlined,
  EditOutlined,
  RobotOutlined,
  LineChartOutlined,
  EyeOutlined,
  BarChartOutlined,
  HistoryOutlined,
  StarOutlined,
  TeamOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { usePageTitle } from '../../hooks/usePageTitle'
import heroImg from '../../assets/images/hero.png'
import heroShape from '../../assets/svg/semicircles.svg'
import './home.css'

type Mode = 'student' | 'recruiter'

const STUDENT_STEPS = [
  { key: 'step1', icon: <AppstoreOutlined /> },
  { key: 'step2', icon: <CodeOutlined /> },
  { key: 'step3', icon: <RocketOutlined /> },
  { key: 'step4', icon: <ControlOutlined /> },
  { key: 'step5', icon: <EditOutlined /> },
  { key: 'step6', icon: <RobotOutlined /> },
  { key: 'step7', icon: <LineChartOutlined /> },
]

const RECRUITER_FEATURES = [
  { key: 'feature1', icon: <EyeOutlined /> },
  { key: 'feature2', icon: <RobotOutlined /> },
  { key: 'feature3', icon: <BarChartOutlined /> },
  { key: 'feature4', icon: <HistoryOutlined /> },
  { key: 'feature5', icon: <StarOutlined /> },
]

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()
  const [mode, setMode] = useState<Mode>('student')
  const { isDark, toggle: toggleTheme } = useTheme()

  const studentSectionRef = useRef<HTMLDivElement>(null)
  const recruiterSectionRef = useRef<HTMLDivElement>(null)

  usePageTitle('Vinki')

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('home-card-visible')
          }
        })
      },
      { threshold: 0.15 }
    )

    const cards = document.querySelectorAll('.home-step-card-alt')
    cards.forEach((card) => observer.observe(card))

    return () => observer.disconnect()
  }, [mode])

  const handleWhatIsVinki = useCallback(() => {
    const ref = mode === 'recruiter' ? recruiterSectionRef : studentSectionRef
    ref.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mode])

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-logo">
          <div className="home-header-logo-icon">V</div>
          <span className="home-header-logo-text">Vinki</span>
        </div>
        <div className="home-header-actions">
          <button
            className="home-header-link"
            onClick={handleWhatIsVinki}
            type="button"
          >
            {t('home.whatIsVinki')}
          </button>
          <Select
            value={i18n.language?.startsWith('en') ? 'en' : 'es'}
            onChange={(val) => i18n.changeLanguage(val)}
            variant="borderless"
            suffixIcon={<GlobalOutlined />}
            options={[
              { value: 'es', label: 'ES' },
              { value: 'en', label: 'EN' },
            ]}
            style={{ width: 80 }}
          />
          <Button
            type="text"
            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
            className="home-theme-toggle"
          />
          <Button
            type="primary"
            icon={<LoginOutlined />}
            onClick={() => navigate('/login')}
          >
            {t('home.login')}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="home-hero">
        <img src={heroShape} alt="" className="home-hero-bg" aria-hidden="true" />
        <div className="home-hero-inner">
          <div className="home-hero-text">
            <h1 className="home-hero-title">
              {t('home.hero.title')}
            </h1>
            <p className="home-hero-subtitle">{t('home.hero.subtitle')}</p>

            {/* Mode toggle */}
            <div className="home-mode-toggle">
              <Button
                type={mode === 'student' ? 'primary' : 'default'}
                size="large"
                icon={<TeamOutlined />}
                className={`home-mode-btn ${mode === 'student' ? 'active' : ''}`}
                onClick={() => setMode('student')}
              >
                {t('home.cta.student')}
              </Button>
              <Button
                type={mode === 'recruiter' ? 'primary' : 'default'}
                size="large"
                icon={<EyeOutlined />}
                className={`home-mode-btn ${mode === 'recruiter' ? 'active' : ''}`}
                onClick={() => setMode('recruiter')}
              >
                {t('home.cta.recruiter')}
              </Button>
            </div>
          </div>

          <div className="home-hero-visual">
            <img src={heroImg} alt="Vinki hero" className="home-hero-img" />
          </div>
        </div>
      </section>

      {/* Dynamic content */}
      <section className="home-content">
        {mode === 'student' ? (
          <>
            <div
              className="home-section-header"
              id="how-it-works-students"
              ref={studentSectionRef}
            >
              <h2 className="home-section-title">{t('home.student.title')}</h2>
              <p className="home-section-subtitle">{t('home.student.subtitle')}</p>
            </div>

            <div className="home-steps-alternating">
              {STUDENT_STEPS.map((step, idx) => (
                <div
                  className={`home-step-card-alt ${idx % 2 === 0 ? 'home-step-left' : 'home-step-right'}`}
                  key={step.key}
                >
                  <div className="home-step-card-alt-content">
                    <div className="home-step-number">{idx + 1}</div>
                    <div className="home-step-card-title">
                      {t(`home.student.${step.key}.title`)}
                    </div>
                    <div className="home-step-card-desc">
                      {t(`home.student.${step.key}.desc`)}
                    </div>
                  </div>
                  <div className="home-step-card-alt-image" />
                </div>
              ))}
            </div>

            <div className="home-cta-section">
              <Button
                type="primary"
                size="large"
                className="home-cta-btn"
                icon={<RocketOutlined />}
                onClick={() => navigate('/login')}
              >
                {t('home.cta.start')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div
              className="home-section-header"
              id="how-it-works-recruiters"
              ref={recruiterSectionRef}
            >
              <h2 className="home-section-title">{t('home.recruiter.title')}</h2>
              <p className="home-section-subtitle">{t('home.recruiter.subtitle')}</p>
            </div>

            <div className="home-steps-alternating">
              {RECRUITER_FEATURES.map((feat, idx) => (
                <div
                  className={`home-step-card-alt ${idx % 2 === 0 ? 'home-step-left' : 'home-step-right'}`}
                  key={feat.key}
                >
                  <div className="home-step-card-alt-content">
                    <div className="home-feature-icon">{feat.icon}</div>
                    <div className="home-step-card-title">
                      {t(`home.recruiter.${feat.key}.title`)}
                    </div>
                    <div className="home-step-card-desc">
                      {t(`home.recruiter.${feat.key}.desc`)}
                    </div>
                  </div>
                  <div className="home-step-card-alt-image" />
                </div>
              ))}
            </div>

            <div className="home-cta-section">
              <Button
                type="primary"
                size="large"
                className="home-cta-btn"
                icon={<EyeOutlined />}
                onClick={() => navigate('/login')}
              >
                {t('home.cta.viewCandidates')}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
