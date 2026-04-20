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
import vinkiLogo from '../../assets/images/vinkiLogo.png'
import vinkiLogoNegro from '../../assets/images/vinkiLogoNegro.png'
import heroShape from '../../assets/svg/semicircles.svg'
import './home.css'

type Mode = 'student' | 'recruiter'


export default function HomePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [mode, setMode] = useState<Mode>('student')
  const { isDark, toggle: toggleTheme } = useTheme()

  const studentSectionRef = useRef<HTMLDivElement>(null)
  const recruiterSectionRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  usePageTitle('Vinki')

  // Reset active carousel index when mode changes
  useEffect(() => {
    setActiveIdx(0)
    if (carouselRef.current) carouselRef.current.scrollLeft = 0
  }, [mode])

  // Scroll-based detection of the centered carousel card
  useEffect(() => {
    const container = carouselRef.current
    if (!container) return

    const updateActive = () => {
      const cards = container.querySelectorAll<HTMLElement>('[data-idx]')
      if (cards.length === 0) return

      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2
      let minDist = Infinity
      let closestIdx = 0

      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect()
        const cardCenter = cardRect.left + cardRect.width / 2
        const dist = Math.abs(cardCenter - containerCenter)
        if (dist < minDist) {
          minDist = dist
          closestIdx = Number(card.dataset.idx) || 0
        }
      })

      setActiveIdx(closestIdx)
    }

    container.addEventListener('scroll', updateActive, { passive: true })

    // Run once on mount after layout
    const rafId = requestAnimationFrame(updateActive)

    return () => {
      container.removeEventListener('scroll', updateActive)
      cancelAnimationFrame(rafId)
    }
  }, [mode])

  // Drag-to-scroll for carousel
  useEffect(() => {
    const container = carouselRef.current
    if (!container) return

    let isDown = false
    let startX = 0
    let scrollLeft = 0

    const onDown = (e: MouseEvent) => {
      isDown = true
      container.classList.add('carousel-dragging')
      startX = e.pageX - container.offsetLeft
      scrollLeft = container.scrollLeft
    }
    const onUp = () => {
      isDown = false
      container.classList.remove('carousel-dragging')
    }
    const onMove = (e: MouseEvent) => {
      if (!isDown) return
      e.preventDefault()
      const x = e.pageX - container.offsetLeft
      container.scrollLeft = scrollLeft - (x - startX)
    }

    container.addEventListener('mousedown', onDown)
    container.addEventListener('mouseleave', onUp)
    container.addEventListener('mouseup', onUp)
    container.addEventListener('mousemove', onMove)

    return () => {
      container.removeEventListener('mousedown', onDown)
      container.removeEventListener('mouseleave', onUp)
      container.removeEventListener('mouseup', onUp)
      container.removeEventListener('mousemove', onMove)
    }
  }, [mode])

  const scrollToCard = useCallback((idx: number) => {
    const container = carouselRef.current
    if (!container) return
    const card = container.children[idx] as HTMLElement
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [])

  const renderCarousel = () => {
    const items =
      mode === 'student'
        ? [
            { icon: <AppstoreOutlined />, title: t('home.student.step1.title'), desc: t('home.student.step1.desc'), tags: ['Frontend', 'Backend', 'Base de Datos', 'IA'] },
            { icon: <CodeOutlined />, title: t('home.student.step2.title'), desc: t('home.student.step2.desc'), tags: ['React', 'Python', 'Node.js', 'PostgreSQL'] },
            { icon: <RocketOutlined />, title: t('home.student.step3.title'), desc: t('home.student.step3.desc'), tags: ['Junior', 'Mid', 'Senior'] },
            { icon: <ControlOutlined />, title: t('home.student.step4.title'), desc: t('home.student.step4.desc'), tags: ['Práctica', 'Evaluación'] },
            { icon: <EditOutlined />, title: t('home.student.step5.title'), desc: t('home.student.step5.desc'), tags: ['Texto', 'Código', 'Voz'] },
            { icon: <RobotOutlined />, title: t('home.student.step6.title'), desc: t('home.student.step6.desc'), tags: ['5 métricas', 'Feedback', 'Nivel detectado'] },
            { icon: <LineChartOutlined />, title: t('home.student.step7.title'), desc: t('home.student.step7.desc'), tags: ['Historial', 'Métricas', 'Plan de mejora'] },
          ]
        : [
            { icon: <EyeOutlined />, title: t('home.recruiter.feature1.title'), desc: t('home.recruiter.feature1.desc'), tags: ['Perfiles', 'Técnico'] },
            { icon: <RobotOutlined />, title: t('home.recruiter.feature2.title'), desc: t('home.recruiter.feature2.desc'), tags: ['5 métricas', 'Objetivos'] },
            { icon: <BarChartOutlined />, title: t('home.recruiter.feature3.title'), desc: t('home.recruiter.feature3.desc'), tags: ['Puntaje', 'Nivel', 'Tecnología'] },
            { icon: <HistoryOutlined />, title: t('home.recruiter.feature4.title'), desc: t('home.recruiter.feature4.desc'), tags: ['Historial', 'Evolución'] },
            { icon: <StarOutlined />, title: t('home.recruiter.feature5.title'), desc: t('home.recruiter.feature5.desc'), tags: ['Filtros', 'Exportar'] },
          ]
    return (
      <>
        <div className="carousel-track" ref={carouselRef}>
          {items.map((step, idx) => (
            <div
              className={`carousel-sphere-item${idx === activeIdx ? ' carousel-active' : ''}`}
              key={idx}
              data-idx={idx}
            >
              <div className="carousel-sphere">
                <span className="carousel-sphere-badge">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="carousel-sphere-icon">{step.icon}</span>
              </div>
              <div className="carousel-info-card">
                <h3 className="carousel-info-title">{step.title}</h3>
                {step.desc && <p className="carousel-info-desc">{step.desc}</p>}
                <div className="carousel-info-tags">
                  {step.tags.map((tag) => (
                    <span className="carousel-tag" key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="carousel-dots">
          {items.map((_, idx) => (
            <button
              key={idx}
              className={`carousel-dot${idx === activeIdx ? ' carousel-dot-active' : ''}`}
              onClick={() => scrollToCard(idx)}
              aria-label={`Step ${idx + 1}`}
            />
          ))}
        </div>
      </>
    )
  }

  const handleWhatIsVinki = useCallback(() => {
    const ref = mode === 'recruiter' ? recruiterSectionRef : studentSectionRef
    ref.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mode])

  if (!isLoading && isAuthenticated) {
    return <Navigate to={user?.role === 'recruiter' ? '/recruiter' : '/dashboard'} replace />
  }

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-logo">
          <img
            src={isDark ? vinkiLogo : vinkiLogoNegro}
            alt="Vinki"
            className="home-header-logo-icon"
            style={{
              width: 40,
              height: 40,
              objectFit: 'contain',
              background: 'transparent',
            }}
          />
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

            {renderCarousel()}

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

            {renderCarousel()}

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
