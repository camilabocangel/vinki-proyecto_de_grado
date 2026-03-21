import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Editor from '@monaco-editor/react'
import { Card, Select, Button } from 'antd'
import { CopyOutlined } from '@ant-design/icons'

interface CodeEditorProps {
  defaultLanguage?: string
  defaultValue?: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
]

export function CodeEditor({
  defaultLanguage = 'javascript',
  defaultValue = '',
  onChange,
  readOnly = false,
}: CodeEditorProps) {
  const { t } = useTranslation()
  const [language, setLanguage] = useState(defaultLanguage)
  const [code, setCode] = useState(defaultValue)

  const handleChange = (value: string | undefined) => {
    const v = value ?? ''
    setCode(v)
    onChange?.(v)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
  }

  return (
    <Card size="small" style={{ borderRadius: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Select
          value={language}
          onChange={setLanguage}
          options={LANGUAGES}
          style={{ width: 150 }}
          disabled={readOnly}
          size="small"
        />
        <Button icon={<CopyOutlined />} size="small" onClick={copyCode}>
          {t('code.copy')}
        </Button>
      </div>
      <Editor
        height="300px"
        language={language}
        value={code}
        onChange={handleChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          readOnly,
          automaticLayout: true,
        }}
      />
    </Card>
  )
}
