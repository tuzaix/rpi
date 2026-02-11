<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment'
import { Heart, Shield, Users } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import AccessControlModal from '../components/AccessControlModal.vue'

const router = useRouter()
const assessmentStore = useAssessmentStore()
const authStore = useAuthStore()

const showAuthModal = ref(false)
const pendingRole = ref<'self' | 'partner' | null>(null)

const startAssessment = (role: 'self' | 'partner') => {
  pendingRole.value = role
  
  // 检查是否已经有验证过的卡密
  if (authStore.currentKey) {
    proceedToAssessment(role)
  } else {
    showAuthModal.value = true
  }
}

const proceedToAssessment = (role: 'self' | 'partner') => {
  assessmentStore.startAssessment(role)
  router.push('/assessment')
}

const onAuthSuccess = () => {
  showAuthModal.value = false
  if (pendingRole.value) {
    proceedToAssessment(pendingRole.value)
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 pb-12">
    <!-- Auth Modal -->
    <AccessControlModal 
      :show="showAuthModal" 
      @close="showAuthModal = false"
      @success="onAuthSuccess"
    />
    <div class="mb-8 animate-bounce">
      <Heart class="w-20 h-20 text-primary-500 fill-primary-500" />
    </div>
    
    <h1 class="text-3xl font-bold text-slate-900 mb-4">
      RPI 占有欲指数测评
    </h1>
    
    <p class="text-slate-600 mb-10 max-w-md">
      本测评旨在帮助你了解亲密关系中的边界感与依赖度。请根据过去 30 天内的真实感受与行为作答。
    </p>

    <div class="grid grid-cols-1 gap-4 w-full max-w-sm">
      <button 
        @click="startAssessment('self')"
        class="flex items-center justify-between p-5 bg-white border-2 border-primary-100 rounded-2xl shadow-sm hover:border-primary-500 transition-all active:scale-95 group"
      >
        <div class="flex items-center">
          <div class="p-3 bg-primary-50 rounded-xl mr-4 group-hover:bg-primary-100 transition-colors">
            <Users class="w-6 h-6 text-primary-600" />
          </div>
          <div class="text-left">
            <div class="font-bold text-slate-800 text-lg">自我评测</div>
            <div class="text-sm text-slate-500">评估自己的占有欲倾向</div>
          </div>
        </div>
      </button>

      <button 
        @click="startAssessment('partner')"
        class="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-2xl shadow-sm hover:border-primary-500 transition-all active:scale-95 group"
      >
        <div class="flex items-center">
          <div class="p-3 bg-slate-50 rounded-xl mr-4 group-hover:bg-primary-50 transition-colors">
            <Shield class="w-6 h-6 text-slate-600 group-hover:text-primary-600" />
          </div>
          <div class="text-left">
            <div class="font-bold text-slate-800 text-lg">伴侣视角</div>
            <div class="text-sm text-slate-500">评估伴侣对你的占有欲</div>
          </div>
        </div>
      </button>
    </div>

    <div class="mt-12 text-xs text-slate-400">
      测评共 42 题，预计用时 5-8 分钟
    </div>
  </div>
</template>
