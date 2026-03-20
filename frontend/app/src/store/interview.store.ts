import { create } from 'zustand'

export interface InterviewQuestion {
  id: number
  questionId: number
  questionTextSnapshot: string
  orderNumber: number
  answer?: {
    id: number
    answerText: string | null
    audioUrl: string | null
    answeredAt: string
  } | null
}

export interface Interview {
  id: number
  userId: number
  roleId: number
  languageId: number | null
  frameworkId: number | null
  chosenLevelId: number
  startedAt: string
  finishedAt: string | null
  evaluationStatus: string
  questions: InterviewQuestion[]
}

interface InterviewState {
  currentInterview: Interview | null
  currentQuestionIndex: number
  setInterview: (interview: Interview | null) => void
  setQuestionIndex: (index: number) => void
  nextQuestion: () => void
  prevQuestion: () => void
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  currentInterview: null,
  currentQuestionIndex: 0,
  setInterview: (interview) =>
    set({ currentInterview: interview, currentQuestionIndex: 0 }),
  setQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  nextQuestion: () => {
    const { currentQuestionIndex, currentInterview } = get()
    if (
      currentInterview &&
      currentQuestionIndex < currentInterview.questions.length - 1
    ) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 })
    }
  },
  prevQuestion: () => {
    const { currentQuestionIndex } = get()
    if (currentQuestionIndex > 0) {
      set({ currentQuestionIndex: currentQuestionIndex - 1 })
    }
  },
}))
