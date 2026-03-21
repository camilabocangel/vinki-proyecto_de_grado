import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Button,
  Input,
  Typography,
  Progress,
  Space,
  App,
  Skeleton,
  Spin,
} from 'antd'
import {
  AudioOutlined,
  PauseOutlined,
  RobotOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import { useInterviewStore, type Interview } from '../../store/interview.store'
import { api } from '../../api/client'
import { CodeEditor } from '../../components/CodeEditor'

const { Title, Text } = Typography
const { TextArea } = Input

const QUESTION_TIME_LIMIT = 300

interface PracticeEvaluation {
  technicalCorrectness: number | null
  clarityOfExplanation: number | null
  communication: number | null
  confidence: number | null
  problemSolving: number | null
  feedbackText: string | null
  juniorAnswer: string | null
  midAnswer: string | null
  seniorAnswer: string | null
}

export default function InterviewSessionPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const {
    currentInterview,
    currentQuestionIndex,
    setInterview,
    nextQuestion,
    prevQuestion,
  } = useInterviewStore()

  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [useCode, setUseCode] = useState(false)
  const codeRef = useRef('')

  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Practice mode state
  const [practiceEvaluation, setPracticeEvaluation] = useState<PracticeEvaluation | null>(
    null,
  )

  const { data, isLoading } = useQuery({
    queryKey: ['interview', id],
    queryFn: () => api.get<Interview>(`/interviews/${id}`),
    enabled: !!id,
  })

  useEffect(() => {
    if (data) setInterview(data)
  }, [data, setInterview])

  const isPracticeMode = currentInterview?.mode === 'practice'

  const submitAnswer = useMutation({
    mutationFn: ({
      questionId,
      answerText,
      answeredInSeconds,
    }: {
      questionId: number
      answerText: string
      answeredInSeconds: number
    }) =>
      api.post(`/interviews/${id}/questions/${questionId}/answer`, {
        answerText,
        answeredInSeconds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] })
      message.success(t('interview.answerSaved'))
    },
  })

  const evaluateNow = useMutation({
    mutationFn: (questionId: number) =>
      api.post<PracticeEvaluation>(
        `/interviews/${id}/questions/${questionId}/evaluate-now`,
      ),
    onSuccess: (data) => {
      setPracticeEvaluation(data)
    },
    onError: (err: Error) => {
      message.error(err.message)
    },
  })

  const finishInterview = useMutation({
    mutationFn: () => api.post(`/interviews/${id}/finish`),
    onSuccess: () => {
      navigate(`/interview/${id}/confirmation`)
    },
  })

  const requestFollowUp = useMutation({
    mutationFn: ({
      questionId,
      answerText,
    }: {
      questionId: number
      answerText: string
    }) =>
      api.post<{ followUpQuestion: string }>(
        `/interviews/${id}/questions/${questionId}/followup`,
        { answerText },
      ),
    onSuccess: (data) => {
      if (data.followUpQuestion) {
        setFollowUpQuestion(data.followUpQuestion)
        setShowFollowUp(true)
      }
    },
  })

  const handleSubmitAnswer = useCallback(() => {
    if (!currentInterview) return
    const question = currentInterview.questions[currentQuestionIndex]
    let answerText: string
    if (useCode) {
      answerText = codeRef.current
    } else {
      const textarea = document.getElementById('answer-text') as HTMLTextAreaElement
      answerText = textarea?.value ?? ''
    }
    if (answerText.trim()) {
      const answeredInSeconds = QUESTION_TIME_LIMIT - timeLeft
      submitAnswer.mutate(
        {
          questionId: question.id,
          answerText,
          answeredInSeconds,
        },
        {
          onSuccess: () => {
            // In practice mode, auto-trigger evaluation after saving
            if (isPracticeMode) {
              evaluateNow.mutate(question.id)
            }
          },
        },
      )
    }
  }, [
    currentInterview,
    currentQuestionIndex,
    timeLeft,
    submitAnswer,
    useCode,
    isPracticeMode,
    evaluateNow,
  ])

  const handleGetFollowUp = useCallback(() => {
    if (!currentInterview) return
    const question = currentInterview.questions[currentQuestionIndex]
    let answerText: string
    if (useCode) {
      answerText = codeRef.current.trim()
    } else {
      const textarea = document.getElementById('answer-text') as HTMLTextAreaElement
      answerText = textarea?.value.trim() ?? ''
    }
    if (answerText) {
      requestFollowUp.mutate({ questionId: question.id, answerText })
    }
  }, [currentInterview, currentQuestionIndex, requestFollowUp, useCode])

  const handleSubmitFollowUpAnswer = useCallback(() => {
    if (!currentInterview) return
    const question = currentInterview.questions[currentQuestionIndex]
    const textarea = document.getElementById(
      'followup-answer-text',
    ) as HTMLTextAreaElement
    if (textarea?.value.trim()) {
      const answeredInSeconds = QUESTION_TIME_LIMIT - timeLeft
      submitAnswer.mutate({
        questionId: question.id,
        answerText: textarea.value,
        answeredInSeconds,
      })
    }
  }, [currentInterview, currentQuestionIndex, timeLeft, submitAnswer])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())

        if (!currentInterview) return
        const question = currentInterview.questions[currentQuestionIndex]
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')

          const result = await api.postForm<{ transcription: string }>(
            `/interviews/${id}/questions/${question.id}/audio`,
            formData,
          )

          const textarea = document.getElementById('answer-text') as HTMLTextAreaElement
          if (textarea) {
            textarea.value = result.transcription
          }

          queryClient.invalidateQueries({ queryKey: ['interview', id] })
          message.success(t('interview.answerSaved'))
        } catch {
          message.error(t('common.error'))
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      message.error(t('common.error'))
    }
  }, [currentInterview, currentQuestionIndex, id, message, queryClient, t])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }, [])

  // Reset follow-up and practice evaluation state on question change
  useEffect(() => {
    setFollowUpQuestion(null)
    setShowFollowUp(false)
    setPracticeEvaluation(null)
  }, [currentQuestionIndex])

  // Countdown timer: reset on each question change, auto-advance on expiry
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remaining = Math.max(0, QUESTION_TIME_LIMIT - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current)
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentQuestionIndex])

  // Auto-advance when timer reaches 0
  useEffect(() => {
    if (timeLeft !== 0 || !currentInterview) return

    handleSubmitAnswer()

    const totalQuestions = currentInterview.questions.length
    if (currentQuestionIndex < totalQuestions - 1) {
      nextQuestion()
    } else {
      finishInterview.mutate()
    }
  }, [timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !currentInterview)
    return (
      <div className="vinki-page">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    )

  const question = currentInterview.questions[currentQuestionIndex]
  const totalQuestions = currentInterview.questions.length

  const handleFinish = () => {
    modal.confirm({
      title: t('interview.finishConfirmTitle'),
      content: t('interview.finishConfirmMessage'),
      okText: t('interview.finish'),
      cancelText: t('common.cancel'),
      onOk: () => finishInterview.mutate(),
    })
  }

  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (timeLeft % 60).toString().padStart(2, '0')

  const renderMetricBar = (label: string, value: number | null) => {
    if (value === null || value === undefined) return null
    const percent = (value / 5) * 100
    return (
      <div style={{ marginBottom: 8 }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            {label}
          </Text>
          <Text strong style={{ fontSize: 13 }}>
            {value.toFixed(1)} / 5
          </Text>
        </div>
        <Progress percent={percent} showInfo={false} size="small" />
      </div>
    )
  }

  return (
    <div className="vinki-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Progress
          percent={((currentQuestionIndex + 1) / totalQuestions) * 100}
          format={() => `${currentQuestionIndex + 1} / ${totalQuestions}`}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <Text
          strong
          style={{ color: timeLeft < 60 ? '#ff4d4f' : undefined, whiteSpace: 'nowrap' }}
        >
          {t('interview.timeRemaining')}: {minutes}:{seconds}
        </Text>
        {isPracticeMode && (
          <Text
            type="secondary"
            style={{
              background: '#e6f4ff',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {t('interview.practiceMode')}
          </Text>
        )}
      </div>

      <Card>
        <Text type="secondary">Pregunta {question.orderNumber}</Text>
        <Title level={3}>{question.questionTextSnapshot}</Title>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button
            icon={<CodeOutlined />}
            size="small"
            type={useCode ? 'primary' : 'default'}
            onClick={() => setUseCode((prev) => !prev)}
          >
            {useCode ? t('interview.useTextEditor') : t('interview.useCodeEditor')}
          </Button>
        </div>

        {useCode ? (
          <div style={{ marginBottom: 16 }}>
            <CodeEditor
              defaultValue={question.answer?.answerText || ''}
              onChange={(value) => {
                codeRef.current = value
              }}
            />
          </div>
        ) : (
          <TextArea
            id="answer-text"
            rows={8}
            placeholder={t('interview.answerPlaceholder')}
            defaultValue={question.answer?.answerText || ''}
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {!isRecording ? (
            <Button
              icon={<AudioOutlined />}
              onClick={startRecording}
              disabled={isTranscribing}
              type="dashed"
            >
              {t('interview.recordAnswer')}
            </Button>
          ) : (
            <Button icon={<PauseOutlined />} onClick={stopRecording} danger>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#ff4d4f',
                  marginRight: 6,
                  animation: 'pulse 1s infinite',
                }}
              />
              {t('interview.recording')}
            </Button>
          )}
          {isTranscribing && (
            <Text type="secondary" italic>
              {t('interview.transcribing')}
            </Text>
          )}
        </div>

        <Space wrap>
          <Button disabled={currentQuestionIndex === 0} onClick={prevQuestion}>
            {t('common.back')}
          </Button>
          <Button
            type="primary"
            onClick={handleSubmitAnswer}
            loading={submitAnswer.isPending}
          >
            {t('interview.saveAnswer')}
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={handleGetFollowUp}
            loading={requestFollowUp.isPending}
          >
            {t('interview.getFollowUp')}
          </Button>
          {currentQuestionIndex < totalQuestions - 1 ? (
            <Button onClick={nextQuestion}>{t('common.next')}</Button>
          ) : (
            <Button danger onClick={handleFinish} loading={finishInterview.isPending}>
              {t('interview.finishInterview')}
            </Button>
          )}
        </Space>
      </Card>

      {/* Practice mode: inline evaluation feedback */}
      {isPracticeMode && evaluateNow.isPending && (
        <Card style={{ marginTop: 16, textAlign: 'center' }}>
          <Spin />
          <Text type="secondary" style={{ marginLeft: 8 }}>
            {t('interview.evaluatingAnswer')}
          </Text>
        </Card>
      )}

      {isPracticeMode && practiceEvaluation && (
        <Card
          title={t('interview.instantFeedback')}
          style={{
            marginTop: 16,
            borderLeft: '4px solid #52c41a',
          }}
        >
          {renderMetricBar(
            t('metrics.technicalCorrectness'),
            practiceEvaluation.technicalCorrectness,
          )}
          {renderMetricBar(
            t('metrics.clarityOfExplanation'),
            practiceEvaluation.clarityOfExplanation,
          )}
          {renderMetricBar(t('metrics.communication'), practiceEvaluation.communication)}
          {renderMetricBar(t('metrics.confidence'), practiceEvaluation.confidence)}
          {renderMetricBar(
            t('metrics.problemSolving'),
            practiceEvaluation.problemSolving,
          )}

          {practiceEvaluation.feedbackText && (
            <div style={{ marginTop: 16 }}>
              <Text strong>{t('feedback.aiFeedback')}</Text>
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#f6ffed',
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                <Text>{practiceEvaluation.feedbackText}</Text>
              </div>
            </div>
          )}

          {(practiceEvaluation.juniorAnswer ||
            practiceEvaluation.midAnswer ||
            practiceEvaluation.seniorAnswer) && (
            <div style={{ marginTop: 16 }}>
              <Text strong>{t('feedback.recommendedAnswers')}</Text>
              {practiceEvaluation.juniorAnswer && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: '#fff7e6',
                    borderRadius: 6,
                  }}
                >
                  <Text type="secondary">Junior</Text>
                  <br />
                  <Text style={{ whiteSpace: 'pre-wrap' }}>
                    {practiceEvaluation.juniorAnswer}
                  </Text>
                </div>
              )}
              {practiceEvaluation.midAnswer && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: '#e6f4ff',
                    borderRadius: 6,
                  }}
                >
                  <Text type="secondary">Mid</Text>
                  <br />
                  <Text style={{ whiteSpace: 'pre-wrap' }}>
                    {practiceEvaluation.midAnswer}
                  </Text>
                </div>
              )}
              {practiceEvaluation.seniorAnswer && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: '#f6ffed',
                    borderRadius: 6,
                  }}
                >
                  <Text type="secondary">Senior</Text>
                  <br />
                  <Text style={{ whiteSpace: 'pre-wrap' }}>
                    {practiceEvaluation.seniorAnswer}
                  </Text>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {showFollowUp && followUpQuestion && (
        <Card
          style={{
            marginTop: 16,
            borderLeft: '4px solid #1677ff',
            background: '#f0f5ff',
          }}
        >
          <Text type="secondary">{t('interview.followUp')}</Text>
          <Title level={4}>{followUpQuestion}</Title>
          <TextArea
            id="followup-answer-text"
            rows={5}
            placeholder={t('interview.followUpAnswer')}
            style={{ marginBottom: 16 }}
          />
          <Button
            type="primary"
            onClick={handleSubmitFollowUpAnswer}
            loading={submitAnswer.isPending}
          >
            {t('interview.saveAnswer')}
          </Button>
        </Card>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
