import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Input, Typography, Progress, Space, App, Skeleton } from 'antd'
import { useInterviewStore, type Interview } from '../../store/interview.store'
import { api } from '../../api/client'

const { Title, Text } = Typography
const { TextArea } = Input

const QUESTION_TIME_LIMIT = 300

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

  const { data, isLoading } = useQuery({
    queryKey: ['interview', id],
    queryFn: () => api.get<Interview>(`/interviews/${id}`),
    enabled: !!id,
  })

  useEffect(() => {
    if (data) setInterview(data)
  }, [data, setInterview])

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

  const finishInterview = useMutation({
    mutationFn: () => api.post(`/interviews/${id}/finish`),
    onSuccess: () => {
      navigate(`/interview/${id}/confirmation`)
    },
  })

  const handleSubmitAnswer = useCallback(() => {
    if (!currentInterview) return
    const question = currentInterview.questions[currentQuestionIndex]
    const textarea = document.getElementById('answer-text') as HTMLTextAreaElement
    if (textarea?.value.trim()) {
      const answeredInSeconds = QUESTION_TIME_LIMIT - timeLeft
      submitAnswer.mutate({
        questionId: question.id,
        answerText: textarea.value,
        answeredInSeconds,
      })
    }
  }, [currentInterview, currentQuestionIndex, timeLeft, submitAnswer])

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
      </div>

      <Card>
        <Text type="secondary">Pregunta {question.orderNumber}</Text>
        <Title level={3}>{question.questionTextSnapshot}</Title>

        <TextArea
          id="answer-text"
          rows={8}
          placeholder={t('interview.answerPlaceholder')}
          defaultValue={question.answer?.answerText || ''}
          style={{ marginBottom: 16 }}
        />

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
          {currentQuestionIndex < totalQuestions - 1 ? (
            <Button onClick={nextQuestion}>{t('common.next')}</Button>
          ) : (
            <Button danger onClick={handleFinish} loading={finishInterview.isPending}>
              {t('interview.finishInterview')}
            </Button>
          )}
        </Space>
      </Card>
    </div>
  )
}
