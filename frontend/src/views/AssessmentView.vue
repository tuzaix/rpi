<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment'
import { useAuthStore } from '../stores/auth'
import { ChevronLeft, Info, Loader2 } from 'lucide-vue-next'
import AccessControlModal from '../components/AccessControlModal.vue'

const router = useRouter()
const store = useAssessmentStore()
const authStore = useAuthStore()

const currentQuestion = computed(() => store.currentQuestion)
const progress = computed(() => store.progress)
const selectedValue = computed({
  get: () => store.answers[currentQuestion.value.id],
  set: (val) => {
    if (val !== undefined) {
      store.setAnswer(currentQuestion.value.id, val)
    }
  }
})

const options = [
  { label: '完全不符合', value: 1 },
  { label: '比较不符合', value: 2 },
  { label: '稍微不符合', value: 3 },
  { label: '一般/说不清', value: 4 },
  { label: '稍微符合', value: 5 },
  { label: '比较符合', value: 6 },
  { label: '完全符合', value: 7 },
]

const isTransitioning = ref(false)
const showAuthModal = ref(false)
const isSubmitting = ref(false)

const handleNext = async () => {
  if (store.currentQuestionIndex === store.questions.length - 1) {
    // Check if everything is actually answered
    if (store.isComplete) {
      // 在提交前检查卡密
      if (authStore.currentKey) {
        const result = await authStore.verifyKey(authStore.currentKey)
        if (result.success) {
          submitAssessment()
          return
        }
      }
      
      // 未验证或验证失效，显示验证弹窗
      showAuthModal.value = true
      isTransitioning.value = false // 确保弹窗关闭后可以再次交互
    } else {
      // Find the first unanswered question
      const missingIndex = store.questions.findIndex(q => store.answers[q.id] === undefined)
      if (missingIndex !== -1) {
        store.currentQuestionIndex = missingIndex
        alert('请完成所有题目后再提交')
      }
      isTransitioning.value = false
    }
  } else {
    store.nextQuestion()
    // 延迟重置状态，等待过度动画完成
    setTimeout(() => {
      isTransitioning.value = false
    }, 300)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const submitAssessment = () => {
  isSubmitting.value = true
  store.finishAssessment()
  router.push('/result')
}

const onAuthSuccess = () => {
  showAuthModal.value = false
  submitAssessment()
}

const handlePrev = () => {
  if (isTransitioning.value) return
  store.prevQuestion()
}

const selectOption = (val: number) => {
  if (isTransitioning.value) return
  
  selectedValue.value = val
  isTransitioning.value = true
  
  // Auto next with a small delay
  setTimeout(handleNext, 400)
}
</script>

<template>
  <div class="flex-1 flex flex-col max-w-2xl mx-auto w-full">
    <!-- Header with Progress -->
    <div class="sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 px-6 py-4">
      <div class="flex items-center justify-between mb-2">
        <button 
          @click="handlePrev" 
          :disabled="store.currentQuestionIndex === 0"
          class="p-2 -ml-2 text-slate-400 disabled:opacity-0 transition-opacity"
        >
          <ChevronLeft />
        </button>
        <span class="text-sm font-medium text-slate-500">
          {{ store.currentQuestionIndex + 1 }} / {{ store.questions.length }}
        </span>
        <div class="w-6"></div> <!-- Spacer -->
      </div>
      <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
        <div 
          class="h-full bg-primary-500 transition-all duration-300 ease-out"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
    </div>

    <!-- Question Area -->
    <div class="flex-1 px-6 py-8">
      <transition name="slide" mode="out-in">
        <div v-if="isSubmitting" class="flex flex-col items-center justify-center py-20">
          <Loader2 class="w-12 h-12 text-primary-500 animate-spin mb-4" />
          <h2 class="text-xl font-bold text-slate-800">正在生成测评报告...</h2>
          <p class="text-slate-500 mt-2">基于您的回答进行深度分析</p>
        </div>
        <div v-else :key="currentQuestion.id" class="flex flex-col">
          <div class="flex items-center space-x-2 text-primary-600 mb-4">
            <Info class="w-4 h-4" />
            <span class="text-xs font-semibold tracking-wider uppercase">
              {{ currentQuestion.dimension }}
            </span>
          </div>

          <h2 class="text-2xl font-bold text-slate-800 leading-snug mb-12">
            {{ store.mode === 'self' ? currentQuestion.text.self : currentQuestion.text.partner }}
          </h2>

          <div class="space-y-3">
            <button 
              v-for="opt in options" 
              :key="opt.value"
              @click="selectOption(opt.value)"
              class="w-full p-4 text-left rounded-2xl border-2 transition-all flex justify-between items-center group"
              :class="[
                selectedValue === opt.value 
                  ? 'border-primary-500 bg-primary-50 text-primary-700 font-bold' 
                  : 'border-white bg-white text-slate-600 hover:border-slate-200 shadow-sm'
              ]"
            >
              <span>{{ opt.label }}</span>
              <div 
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="[
                  selectedValue === opt.value 
                    ? 'border-primary-500 bg-primary-500' 
                    : 'border-slate-200'
                ]"
              >
                <div v-if="selectedValue === opt.value" class="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </button>
          </div>
        </div>
      </transition>
    </div>

    <!-- Auth Modal -->
    <AccessControlModal 
      :show="showAuthModal" 
      @close="showAuthModal = false"
      @success="onAuthSuccess"
    />

    <!-- Footer Spacer -->
    <div class="h-12 safe-area-bottom"></div>
  </div>
</template>
