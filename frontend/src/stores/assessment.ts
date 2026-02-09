import { defineStore } from 'pinia'
import type { QuestionBank, AssessmentState, QuestionItem } from '../types'
import bankDataRaw from '../assets/data.json'

const bankData = bankDataRaw as QuestionBank

/**
 * 根据得分计算建议
 */
function calculateRecommendations(scores: Record<string, number>): any[] {
  const recs: any[] = []
  
  // Sort dimensions by score descending to prioritize areas needing most improvement
  const sortedDimensions = Object.entries(scores).sort((a, b) => b[1] - a[1])
  
  sortedDimensions.forEach(([dimId, score]) => {
    const dimData = bankData.meta.dimensions.find(d => d.id === dimId)
    if (!dimData) return

    const dimRecs = bankData.recommendations[dimId] || []
    
    if (score >= 4) {
      recs.push({
        dimension: dimData.name,
        score,
        items: dimRecs.slice(0, 2) // Top 2 recommendations
      })
    } else if (recs.length === 0 && sortedDimensions[0] && sortedDimensions[0][0] === dimId) {
      // If all scores are low, at least provide one recommendation for the highest score dimension
      recs.push({
        dimension: dimData.name,
        score,
        items: dimRecs.slice(0, 1)
      })
    }
  })
  
  return recs
}

export const useAssessmentStore = defineStore('assessment', {
  state: (): AssessmentState => ({
    answers: {},
    currentQuestionIndex: 0,
    mode: 'self',
    startTime: null,
    endTime: null,
    shuffledQuestions: []
  }),

  getters: {
    questions(): QuestionItem[] {
      return this.shuffledQuestions.length > 0 ? this.shuffledQuestions : bankData.items
    },
    
    currentQuestion(): QuestionItem {
      return this.questions[this.currentQuestionIndex] || this.questions[0]!
    },

    progress(): number {
      return Math.round(((this.currentQuestionIndex) / this.questions.length) * 100)
    },

    isComplete(): boolean {
      return this.questions.length > 0 && this.questions.every(q => this.answers[q.id] !== undefined)
    },

    results() {
      // Check if assessment is truly complete
      if (!this.isComplete) {
        const missing = this.questions.filter(q => this.answers[q.id] === undefined)
        console.warn('Assessment not complete. Missing answers for questions:', missing.map(q => q.id))
        return null
      }

      try {
        const { min, max } = bankData.meta.scale
        const dimensionScores: Record<string, number> = {}
        const dimensionCounts: Record<string, number> = {}
        const dimensionWeights: Record<string, number> = {}

        // Initialize
        bankData.meta.dimensions.forEach(d => {
          dimensionScores[d.id] = 0
          dimensionCounts[d.id] = 0
          dimensionWeights[d.id] = d.default_weight
        })

        // Calculate raw scores per dimension
        this.questions.forEach(item => {
          if (item.direction === 'check') return

          const answer = this.answers[item.id]
          if (answer === undefined) return // Should not happen due to isComplete check

          let score = answer

          if (item.direction === 'reverse') {
            score = (min + max) - answer
          }

          const currentScore = dimensionScores[item.dimension] || 0
          const currentCount = dimensionCounts[item.dimension] || 0
          dimensionScores[item.dimension] = currentScore + (score * (item.weight || 1))
          dimensionCounts[item.dimension] = currentCount + (item.weight || 1)
        })

        // Normalize scores (1-7 scale)
        const normalizedScores: Record<string, number> = {}
        let totalWeightedScore = 0
        let totalWeight = 0

        Object.keys(dimensionScores).forEach(dimId => {
          const score = dimensionScores[dimId] || 0
          const count = dimensionCounts[dimId] || 0
          const weight = dimensionWeights[dimId] || 0

          if (count > 0) {
            const avg = score / count
            normalizedScores[dimId] = Number(avg.toFixed(2))
            
            totalWeightedScore += normalizedScores[dimId] * weight
            totalWeight += weight
          } else {
            normalizedScores[dimId] = 0
          }
        })

        const overallScore = totalWeight > 0 
          ? Number((totalWeightedScore / totalWeight).toFixed(2))
          : 0

        return {
          dimensions: normalizedScores,
          overall: overallScore,
          meta: bankData.meta,
          recommendations: calculateRecommendations(normalizedScores)
        }
      } catch (error) {
        console.error('Error calculating results:', error)
        return null
      }
    }
  },

  actions: {
    setAnswer(questionId: string, value: number) {
      this.answers[questionId] = value
    },

    nextQuestion() {
      if (this.currentQuestionIndex < this.questions.length - 1) {
        this.currentQuestionIndex++
      }
    },

    prevQuestion() {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--
      }
    },

    startAssessment(mode: 'self' | 'partner') {
      this.mode = mode
      this.answers = {}
      this.currentQuestionIndex = 0
      this.startTime = Date.now()
      this.endTime = null
      
      // Shuffle questions for each new assessment
      this.shuffledQuestions = [...bankData.items].sort(() => Math.random() - 0.5)
    },

    finishAssessment() {
      this.endTime = Date.now()
    }
  }
})
