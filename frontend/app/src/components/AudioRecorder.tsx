import { useState, useRef } from 'react'
import { Button, Space, Typography } from 'antd'
import { AudioOutlined, PauseOutlined, DeleteOutlined } from '@ant-design/icons'

const { Text } = Typography

interface AudioRecorderProps {
  onRecorded: (blob: Blob) => void
  disabled?: boolean
}

export function AudioRecorder({ onRecorded, disabled }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecorded(blob)
        setHasRecording(true)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setRecording(true)
    } catch {
      // getUserMedia not available — fallback to text only
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const clearRecording = () => {
    setHasRecording(false)
    chunksRef.current = []
  }

  return (
    <Space>
      {!recording ? (
        <Button
          icon={<AudioOutlined />}
          onClick={startRecording}
          disabled={disabled}
          type={hasRecording ? 'default' : 'dashed'}
        >
          {hasRecording ? 'Grabar de nuevo' : 'Grabar audio'}
        </Button>
      ) : (
        <Button icon={<PauseOutlined />} onClick={stopRecording} danger>
          Detener
        </Button>
      )}
      {hasRecording && (
        <>
          <Text type="success">Audio grabado</Text>
          <Button
            icon={<DeleteOutlined />}
            onClick={clearRecording}
            type="text"
            size="small"
          />
        </>
      )}
    </Space>
  )
}
