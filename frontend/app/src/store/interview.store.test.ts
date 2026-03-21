import { useInterviewStore, type Interview } from './interview.store'

const makeInterview = (questionCount = 3, useAnswersArray = false): Interview => ({
  id: 1,
  userId: 10,
  roleId: 2,
  languageId: 1,
  frameworkId: null,
  chosenLevelId: 1,
  startedAt: '2026-01-01T00:00:00Z',
  finishedAt: null,
  evaluationStatus: 'pending',
  mode: 'text',
  questions: Array.from({ length: questionCount }, (_, i) => ({
    id: i + 1,
    questionId: 100 + i,
    questionTextSnapshot: `Question ${i + 1}`,
    orderNumber: i + 1,
    ...(useAnswersArray
      ? {
          answers: [
            {
              id: i + 1,
              answerText: `Answer ${i + 1}`,
              audioUrl: null,
              answeredAt: '2026-01-01T00:10:00Z',
            },
          ],
        }
      : {}),
  })),
})

describe('useInterviewStore', () => {
  beforeEach(() => {
    useInterviewStore.setState({
      currentInterview: null,
      currentQuestionIndex: 0,
    })
  })

  it('setInterview normalizes answers array to answer field', () => {
    const interview = makeInterview(2, true)
    useInterviewStore.getState().setInterview(interview)

    const state = useInterviewStore.getState()
    expect(state.currentInterview).not.toBeNull()
    state.currentInterview!.questions.forEach((q) => {
      expect(q.answer).toBeDefined()
      expect(q.answer).not.toBeNull()
      expect(q.answer!.answerText).toMatch(/^Answer \d+$/)
    })
  })

  it('nextQuestion increments index and does not go past length', () => {
    const interview = makeInterview(3)
    const store = useInterviewStore.getState()
    store.setInterview(interview)

    expect(useInterviewStore.getState().currentQuestionIndex).toBe(0)

    useInterviewStore.getState().nextQuestion()
    expect(useInterviewStore.getState().currentQuestionIndex).toBe(1)

    useInterviewStore.getState().nextQuestion()
    expect(useInterviewStore.getState().currentQuestionIndex).toBe(2)

    // Should not go past the last question
    useInterviewStore.getState().nextQuestion()
    expect(useInterviewStore.getState().currentQuestionIndex).toBe(2)
  })

  it('prevQuestion decrements index and does not go below 0', () => {
    const interview = makeInterview(3)
    useInterviewStore.getState().setInterview(interview)

    // Move to index 2 first
    useInterviewStore.getState().nextQuestion()
    useInterviewStore.getState().nextQuestion()
    expect(useInterviewStore.getState().currentQuestionIndex).toBe(2)

    useInterviewStore.getState().prevQuestion()
    expect(useInterviewStore.getState().currentQuestionIndex).toBe(1)

    useInterviewStore.getState().prevQuestion()
    expect(useInterviewStore.getState().currentQuestionIndex).toBe(0)

    // Should not go below 0
    useInterviewStore.getState().prevQuestion()
    expect(useInterviewStore.getState().currentQuestionIndex).toBe(0)
  })

  it('setInterview(null) resets state', () => {
    const interview = makeInterview(3)
    useInterviewStore.getState().setInterview(interview)
    useInterviewStore.getState().nextQuestion()
    expect(useInterviewStore.getState().currentQuestionIndex).toBe(1)

    useInterviewStore.getState().setInterview(null)
    expect(useInterviewStore.getState().currentInterview).toBeNull()
    expect(useInterviewStore.getState().currentQuestionIndex).toBe(0)
  })
})
