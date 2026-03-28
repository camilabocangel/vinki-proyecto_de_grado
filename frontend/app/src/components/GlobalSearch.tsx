import { useState, useEffect, useCallback } from 'react'
import { Modal, Input, List, Typography, Tag } from 'antd'
import {
  SearchOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

const { Text } = Typography

interface SearchResult {
  type: 'interview' | 'question' | 'student'
  id: number
  title: string
  subtitle?: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Search results
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () =>
      api.get<{
        recentInterviews: Array<{
          id: number
          roleName?: string
          levelName?: string
          languageName?: string
        }>
      }>('/dashboard'),
    enabled: open && !!user,
  })

  const getResults = useCallback((): SearchResult[] => {
    if (!query.trim() || !dashboardData) return []
    const q = query.toLowerCase()
    const results: SearchResult[] = []

    // Search interviews
    if (dashboardData.recentInterviews) {
      for (const iv of dashboardData.recentInterviews) {
        const text =
          `${iv.roleName || ''} ${iv.levelName || ''} ${iv.languageName || ''}`.toLowerCase()
        if (text.includes(q) || String(iv.id).includes(q)) {
          results.push({
            type: 'interview',
            id: iv.id,
            title: `${t('nav.interview')} #${iv.id}`,
            subtitle: [iv.roleName, iv.levelName, iv.languageName]
              .filter(Boolean)
              .join(' · '),
          })
        }
      }
    }

    return results.slice(0, 10)
  }, [query, dashboardData, t])

  const results = getResults()

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    if (result.type === 'interview') {
      navigate(`/feedback/${result.id}`)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => {
        setOpen(false)
        setQuery('')
      }}
      footer={null}
      closable={false}
      width={520}
      styles={{ body: { padding: 0 } }}
    >
      <Input
        prefix={<SearchOutlined />}
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        size="large"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        style={{
          borderRadius: 0,
          border: 'none',
          borderBottom: '1px solid var(--color-border)',
        }}
        suffix={
          <Text type="secondary" style={{ fontSize: 12 }}>
            ESC
          </Text>
        }
      />
      {results.length > 0 ? (
        <List
          dataSource={results}
          renderItem={(item) => (
            <List.Item
              onClick={() => handleSelect(item)}
              style={{ cursor: 'pointer', padding: '10px 16px' }}
            >
              <List.Item.Meta
                avatar={
                  item.type === 'interview' ? (
                    <FileTextOutlined />
                  ) : (
                    <QuestionCircleOutlined />
                  )
                }
                title={item.title}
                description={item.subtitle}
              />
              <Tag>{item.type === 'interview' ? t('nav.interview') : item.type}</Tag>
            </List.Item>
          )}
          style={{ maxHeight: 300, overflow: 'auto' }}
        />
      ) : query.trim() ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Text type="secondary">{t('search.noResults')}</Text>
        </div>
      ) : (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Text type="secondary">{t('search.hint')}</Text>
        </div>
      )}
    </Modal>
  )
}
