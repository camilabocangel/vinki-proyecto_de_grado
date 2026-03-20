import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Input, Typography, Progress, Space, App, Skeleton } from 'antd'
import { useInterviewStore, type Interview } from '../../store/interview.store'
import { api } from '../../api/client'

const { Title, Text } = Typography
const { TextArea } = Input

export default function InterviewSessionPage() {
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
      message.success('Respuesta guardada')
    },
  })

  const finishInterview = useMutation({
    mutationFn: () => api.post(`/interviews/${id}/finish`),
    onSuccess: () => {
      navigate(`/interview/${id}/confirmation`)
    },
  })

  if (isLoading || !currentInterview) return <Skeleton active paragraph={{ rows: 6 }} />

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
      title: '¿Finalizar entrevista?',
      content:
        'Se enviará tu entrevista para evaluación. Esta acción no se puede deshacer.',
      okText: 'Finalizar',
      cancelText: 'Cancelar',
      onOk: () => finishInterview.mutate(),
    })
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
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
          placeholder="Escribe tu respuesta aquí..."
          defaultValue={question.answer?.answerText || ''}
          style={{ marginBottom: 16 }}
        />

        <Space wrap>
          <Button disabled={currentQuestionIndex === 0} onClick={prevQuestion}>
            Anterior
          </Button>
          <Button
            type="primary"
            onClick={handleSubmitAnswer}
            loading={submitAnswer.isPending}
          >
            Guardar respuesta
          </Button>
          {currentQuestionIndex < totalQuestions - 1 ? (
            <Button onClick={nextQuestion}>Siguiente</Button>
          ) : (
            <Button danger onClick={handleFinish} loading={finishInterview.isPending}>
              Finalizar entrevista
            </Button>
          )}
        </Space>
      </Card>
    </div>
  )
}
