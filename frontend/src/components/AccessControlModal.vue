<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const authStore = useAuthStore()
const inputKey = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const handleVerify = async () => {
  if (!inputKey.value) {
    errorMsg.value = '请输入卡密'
    return
  }

  isLoading.value = true
  errorMsg.value = ''
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 600))
  
  const result = await authStore.verifyKey(inputKey.value.trim().toUpperCase())
  
  if (result.success) {
    emit('success')
  } else {
    errorMsg.value = result.message
  }
  isLoading.value = false
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="emit('close')"></div>
    
    <!-- Modal -->
    <div class="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <div class="p-8">
        <div class="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        
        <h3 class="text-xl font-bold text-slate-800 text-center mb-2">需要身份验证</h3>
        <p class="text-slate-500 text-center text-sm mb-8">本测评为高级内容，请输入有效卡密以继续</p>
        
        <div class="space-y-4">
          <div>
            <input 
              v-model="inputKey"
              type="text" 
              placeholder="请输入 12 位卡密"
              class="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl outline-none transition-all text-center font-mono text-base tracking-widest uppercase"
              maxlength="12"
              @keyup.enter="handleVerify"
            />
            <p v-if="errorMsg" class="mt-2 text-red-500 text-xs text-center font-medium">{{ errorMsg }}</p>
          </div>
          
          <button 
            @click="handleVerify"
            :disabled="isLoading"
            class="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary-200 flex items-center justify-center"
          >
            <span v-if="isLoading" class="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
            {{ isLoading ? '验证中...' : '立即开启测试' }}
          </button>
          
          <button 
            @click="emit('close')"
            class="w-full py-3 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
          >
            稍后再说
          </button>
        </div>
      </div>
      
      <!-- Footer Tip -->
      <div class="bg-slate-50 p-4 text-center">
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Secure Access Control System</p>
      </div>
    </div>
  </div>
</template>
