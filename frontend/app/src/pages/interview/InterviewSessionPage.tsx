import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Input, Typography, Progress, Space, App, Skeleton } from 'antd'
import { useInterviewStore, type Interview } from '../../store/interview.store'
import { api } from '../../api/client'

const { Title, Text } = Typography
const { TextArea } = Input

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
    }: {
      questionId: number
      answerText: string
    }) => api.post(`/interviews/${id}/questions/${questionId}/answer`, { answerText }),
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

  if (isLoading || !currentInterview)
    return (
      <div className="vinki-page">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    )

  const question = currentInterview.questions[currentQuestionIndex]
  const totalQuestions = currentInterview.questions.length

  const handleSubmitAnswer = () => {
    const textarea = document.getElementById('answer-text') as HTMLTextAreaElement
    if (textarea?.value.trim()) {
      submitAnswer.mutate({ questionId: question.id, answerText: textarea.value })
    }
  }

  const handleFinish = () => {
    modal.confirm({
      title: t('interview.finishConfirmTitle'),
      content: t('interview.finishConfirmMessage'),
      okText: t('interview.finish'),
      cancelText: t('common.cancel'),
      onOk: () => finishInterview.mutate(),
    })
  }

  return (
    <div className="vinki-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Progress
        percent={((currentQuestionIndex + 1) / totalQuestions) * 100}
        format={() => `${currentQuestionIndex + 1} / ${totalQuestions}`}
        style={{ marginBottom: 16 }}
      />

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
