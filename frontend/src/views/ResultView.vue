<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAssessmentStore } from '../stores/assessment'
import { useAuthStore } from '../stores/auth'
import { RefreshCcw, Share2, CheckCircle2, Loader2, Download, X } from 'lucide-vue-next'
import { toJpeg } from 'html-to-image'

const router = useRouter()
const store = useAssessmentStore()
const authStore = useAuthStore()
const reportRef = ref<HTMLElement | null>(null)
const shareRef = ref<HTMLElement | null>(null)
const isGenerating = ref(false)
const isSharing = ref(false)
const previewImageUrl = ref('')
const isPreviewOpen = ref(false)
const previewTitle = ref('')

const results = computed(() => store.results)
const isChecking = ref(true)

onMounted(async () => {
  // Give it a moment to ensure store state is fully settled
  await new Promise(resolve => setTimeout(resolve, 100))
  
  if (!results.value) {
    console.warn('ResultView: No results found, redirecting to home.')
    router.push('/')
    return
  }

  // 最终安全检查：如果本地没有卡密，或者卡密验证不通过，退回首页（严防死守）
  if (!authStore.currentKey) {
    router.push('/')
    return
  }
  
  try {
    const result = await authStore.verifyKey(authStore.currentKey)
    if (!result.success) {
      console.warn('ResultView: Auth verification failed:', result.message)
      router.push('/')
      return
    }
  } catch (err) {
    console.error('ResultView: Auth error:', err)
    router.push('/')
    return
  }
  
  isChecking.value = false
})

const restart = () => {
  store.reset()
  router.push('/')
}

const generateFullReport = async () => {
  if (!reportRef.value || isGenerating.value) return
  
  try {
    isGenerating.value = true
    // 增加等待时间，确保移动端图标和字体渲染完成
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const width = reportRef.value.offsetWidth || 450
    const height = reportRef.value.offsetHeight

    const dataUrl = await toJpeg(reportRef.value, {
      backgroundColor: '#f8fafc',
      pixelRatio: 2, // 移动端 2 倍率足够清晰且内存友好
      quality: 0.9,
      cacheBust: true, // 强制刷新缓存，避免图标不显示
      width: width,
      height: height,
      style: {
        transform: 'none',
        margin: '0',
        padding: '0',
      }
    })
    
    if (!dataUrl || dataUrl.length < 1000) {
      throw new Error('Generated image is too small or empty')
    }
    
    previewImageUrl.value = dataUrl
    previewTitle.value = '长图报告'
    isPreviewOpen.value = true
  } catch (err) {
    console.error('Failed to generate image:', err)
    alert('生成报告失败，请尝试刷新页面重试')
  } finally {
    isGenerating.value = false
  }
}

const generateShareImage = async () => {
  if (!shareRef.value || isSharing.value) return
  
  try {
    isSharing.value = true
    // 增加等待时间
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const width = shareRef.value.offsetWidth || 450
    const height = shareRef.value.offsetHeight

    const dataUrl = await toJpeg(shareRef.value, {
      backgroundColor: '#f8fafc',
      pixelRatio: 2,
      quality: 0.9,
      cacheBust: true,
      width: width,
      height: height,
      style: {
        transform: 'none',
        margin: '0',
        padding: '0',
      }
    })
    
    if (!dataUrl || dataUrl.length < 1000) {
      throw new Error('Generated image is too small or empty')
    }
    
    previewImageUrl.value = dataUrl
    previewTitle.value = '分享图'
    isPreviewOpen.value = true
  } catch (err) {
    console.error('Failed to generate share image:', err)
    alert('生成分享图片失败，请尝试刷新页面重试')
  } finally {
    isSharing.value = false
  }
}

const getScoreLevel = (score: number) => {
  if (score < 2.5) return { label: '低度', color: 'text-green-500', bg: 'bg-green-50' }
  if (score < 4.5) return { label: '中度', color: 'text-orange-500', bg: 'bg-orange-50' }
  return { label: '强度', color: 'text-red-500', bg: 'bg-red-50' }
}

const dimensionNames: Record<string, string> = {
  Control: '控制欲',
  Jealousy: '嫉妒强度',
  Dependency: '情感依赖',
  Insecurity: '关系不安全感'
}
</script>

<template>
  <div v-if="isChecking" class="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-screen">
    <div class="text-center">
      <Loader2 class="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
      <p class="text-slate-500 font-medium">正在生成报告...</p>
    </div>
  </div>
  <div v-else-if="results" class="flex-1 flex flex-col max-w-2xl mx-auto w-full p-6 bg-slate-50 pb-20">
    <!-- Image Capture Container (Hidden but accessible for rendering tools) -->
    <div class="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden" style="width: 1000px; height: 1px;">
      <div class="bg-slate-50 flex flex-col w-[450px]" ref="reportRef">
        <!-- Summary Header -->
        <div class="text-center mb-8 pt-12 px-8">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 mb-4">
            <CheckCircle2 class="w-10 h-10 text-primary-600" />
          </div>
          <h1 class="text-3xl font-bold text-slate-900">RPI 关系占有欲报告</h1>
          <p class="text-slate-500 text-base mt-2">
            测评模式：{{ store.mode === 'self' ? '自我评测' : '伴侣视角' }}
          </p>
        </div>

        <!-- Overall Score Card -->
        <div class="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 mx-8 mb-8 text-center">
          <div class="text-slate-400 text-sm font-medium mb-2">综合占有欲指数</div>
          <div class="flex items-baseline justify-center mb-3">
            <span class="text-7xl font-black text-primary-600">{{ results.overall }}</span>
            <span class="text-xl font-bold text-slate-300 ml-2">/ 7.0</span>
          </div>
          <div 
            class="inline-block px-6 py-2 rounded-full text-base font-bold"
            :class="[getScoreLevel(results.overall).bg, getScoreLevel(results.overall).color]"
          >
            {{ getScoreLevel(results.overall).label }}占有倾向
          </div>
        </div>

        <!-- Dimensions Grid -->
        <div class="grid grid-cols-2 gap-5 mx-8 mb-10">
          <div 
            v-for="(score, dimId) in results.dimensions" 
            :key="dimId"
            class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div class="text-slate-500 text-sm mb-2">{{ dimensionNames[dimId] }}</div>
            <div class="flex items-baseline space-x-1">
              <span class="text-3xl font-bold text-slate-800">{{ score }}</span>
              <span class="text-xs text-slate-400 font-bold uppercase tracking-tighter">/ 7.0</span>
            </div>
            <div class="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                class="h-full bg-primary-400"
                :style="{ width: `${(score / 7) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Detailed Recommendations in Image (Fully matched with Web View) -->
        <div class="mx-8 space-y-8 mb-12">
          <div class="flex items-center justify-between px-1">
            <h2 class="text-xl font-bold text-slate-800 border-l-4 border-primary-500 pl-3">详细分析与建议</h2>
          </div>
          
          <div v-if="results.recommendations.length === 0" class="p-6 bg-green-50 rounded-2xl text-green-700 text-center mx-1">
            太棒了！你的关系边界非常健康，请继续保持。
          </div>

          <div 
            v-for="recGroup in results.recommendations" 
            :key="recGroup.dimension"
            class="space-y-4"
          >
            <div class="flex items-center space-x-2 px-1">
              <div class="w-1.5 h-4 bg-primary-500 rounded-full"></div>
              <h3 class="font-bold text-slate-700 text-base">{{ recGroup.dimension }}专项改善</h3>
            </div>

            <div 
              v-for="item in recGroup.items" 
              :key="item.id"
              class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
            >
              <h4 class="font-bold text-slate-800 mb-2 flex items-center text-sm">
                <span class="text-primary-500 mr-2">#</span>
                {{ item.title }}
              </h4>
              <p class="text-xs text-slate-600 leading-relaxed mb-4">
                {{ item.detail }}
              </p>
              
              <!-- Action Steps in Image -->
              <div class="bg-slate-50 p-4 rounded-xl">
                <div class="text-[10px] font-bold text-slate-400 uppercase mb-2">行动步骤</div>
                <ul class="space-y-2">
                  <li 
                    v-for="(step, idx) in item.action_steps" 
                    :key="idx"
                    class="text-[11px] text-slate-700 flex items-start"
                  >
                    <span class="text-primary-400 font-bold mr-2">{{ Number(idx) + 1 }}.</span>
                    {{ step }}
                  </li>
                </ul>
              </div>

              <!-- Caution in Image -->
              <div v-if="item.caution" class="mt-4 flex items-start p-3 bg-amber-50 rounded-xl">
                <div class="text-amber-500 mr-2 text-[10px]">⚠️</div>
                <p class="text-[10px] text-amber-700 italic leading-tight">{{ item.caution }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Brand Footer -->
        <div class="mt-4 pt-10 border-t border-slate-200 flex items-center justify-between pb-12 px-10 bg-slate-100/50">
          <div class="flex flex-col">
            <div class="text-2xl font-black text-slate-800">RPI <span class="text-primary-500">占有欲测评</span></div>
            <div class="text-xs text-slate-400 font-medium mt-1">了解关系边界，构建健康亲密关系</div>
          </div>
          <div class="text-[10px] text-slate-300 font-mono text-right leading-tight">
            DATE: {{ new Date().toLocaleDateString() }}<br/>
            VERSION: RPI-SYSTEM-v1.4<br/>
            REPORT-ID: {{ Math.random().toString(36).substr(2, 9).toUpperCase() }}
          </div>
        </div>
      </div>
    </div>

    <!-- Web Display Content (Original look) -->
    <div class="flex flex-col">
      <!-- Summary Header -->
      <div class="text-center mb-8 pt-4">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 mb-4">
          <CheckCircle2 class="w-10 h-10 text-primary-600" />
        </div>
        <h1 class="text-2xl font-bold text-slate-900">测评报告已生成</h1>
        <p class="text-slate-500 text-sm mt-1">
          基于 {{ store.mode === 'self' ? '自我评测' : '伴侣视角' }}
        </p>
      </div>

      <!-- Score Overview Card -->
      <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-6 text-center">
        <div class="text-slate-400 text-sm font-medium mb-1">综合占有欲指数</div>
        <div class="flex items-baseline justify-center mb-2">
          <span class="text-6xl font-black text-primary-600">{{ results.overall }}</span>
          <span class="text-lg font-bold text-slate-300 ml-1">/ 7.0</span>
        </div>
        <div 
          class="inline-block px-4 py-1 rounded-full text-sm font-bold"
          :class="[getScoreLevel(results.overall).bg, getScoreLevel(results.overall).color]"
        >
          {{ getScoreLevel(results.overall).label }}占有倾向
        </div>
      </div>

      <!-- Dimensions Grid -->
      <div class="grid grid-cols-2 gap-4 mb-8">
        <div 
          v-for="(score, dimId) in results.dimensions" 
          :key="dimId"
          class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"
        >
          <div class="text-slate-500 text-xs mb-1">{{ dimensionNames[dimId] }}</div>
          <div class="flex items-baseline space-x-1">
            <span class="text-2xl font-bold text-slate-800">{{ score }}</span>
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">/ 7.0</span>
          </div>
          <div class="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              class="h-full bg-primary-400"
              :style="{ width: `${(score / 7) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Recommendations in Image -->
      <div class="space-y-6 mb-8">
        <h2 class="text-xl font-bold text-slate-800 px-1">专业成长建议</h2>
        <div 
          v-for="recGroup in results.recommendations.slice(0, 1)" 
          :key="recGroup.dimension"
          class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
        >
          <div class="flex items-center space-x-2 mb-4">
            <div class="w-1.5 h-4 bg-primary-500 rounded-full"></div>
            <h3 class="font-bold text-slate-700">{{ recGroup.dimension }}改善重点</h3>
          </div>
          <div v-if="recGroup.items.length > 0">
            <h4 class="font-bold text-slate-800 mb-1 text-sm">{{ recGroup.items[0].title }}</h4>
            <p class="text-xs text-slate-500 leading-relaxed">
              {{ recGroup.items[0].detail }}
            </p>
          </div>
        </div>
      </div>

      <!-- Brand Footer (Web View only) -->
      <div class="mt-4 pt-8 border-t border-slate-200 flex items-center justify-between pb-4 px-2">
        <div class="flex flex-col">
          <div class="text-lg font-black text-slate-800">RPI <span class="text-primary-500">占有欲测评</span></div>
          <div class="text-[10px] text-slate-400 font-medium">了解关系边界，构建健康亲密关系</div>
        </div>
        <div class="text-[10px] text-slate-300 font-mono text-right">
          DATE: {{ new Date().toLocaleDateString() }}<br/>
          RPI-SYSTEM-v1.4
        </div>
      </div>
    </div>
    <!-- Web Display Content End -->

    <!-- Full Recommendations (Web View Only) -->
    <div class="mt-12 space-y-8 mb-12">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-xl font-bold text-slate-800">详细分析与建议</h2>
        <span class="text-xs text-slate-400 font-medium">共 {{ results.recommendations.length }} 项建议</span>
      </div>
      
      <div v-if="results.recommendations.length === 0" class="p-6 bg-green-50 rounded-2xl text-green-700 text-center">
        太棒了！你的关系边界非常健康，请继续保持。
      </div>

      <div 
        v-for="recGroup in results.recommendations" 
        :key="recGroup.dimension"
        class="space-y-4"
      >
        <div class="flex items-center space-x-2 px-1">
          <div class="w-1.5 h-4 bg-primary-500 rounded-full"></div>
          <h3 class="font-bold text-slate-700">{{ recGroup.dimension }}专项改善</h3>
        </div>

        <div 
          v-for="item in recGroup.items" 
          :key="item.id"
          class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
        >
          <h4 class="font-bold text-slate-800 mb-2 flex items-center">
            <span class="text-primary-500 mr-2">#</span>
            {{ item.title }}
          </h4>
          <p class="text-sm text-slate-600 leading-relaxed mb-4">
            {{ item.detail }}
          </p>
          <div class="bg-slate-50 p-4 rounded-xl">
            <div class="text-xs font-bold text-slate-400 uppercase mb-2">行动步骤</div>
            <ul class="space-y-2">
              <li 
                v-for="(step, idx) in item.action_steps" 
                :key="idx"
                class="text-sm text-slate-700 flex items-start"
              >
                <span class="text-primary-400 font-bold mr-2">{{ Number(idx) + 1 }}.</span>
                {{ step }}
              </li>
            </ul>
          </div>
          <div v-if="item.caution" class="mt-4 flex items-start p-3 bg-amber-50 rounded-xl">
            <div class="text-amber-500 mr-2 mt-0.5">⚠️</div>
            <p class="text-xs text-amber-700 italic">{{ item.caution }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Simplified Share Image Container (Hidden but accessible) -->
    <div class="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden" style="width: 1000px; height: 1px;">
      <div ref="shareRef" class="bg-slate-50 w-[450px] flex flex-col items-stretch">
        <!-- Summary Header -->
        <div class="flex flex-col items-center mb-8 pt-12 px-10">
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-primary-50 rounded-full mb-4">
            <CheckCircle2 class="w-4 h-4 text-primary-500" />
            <span class="text-[10px] font-bold text-primary-600 uppercase tracking-widest">测评结果分享</span>
          </div>
          <h1 class="text-3xl font-black text-slate-800 leading-tight text-center">
            综合占有欲指数
          </h1>
          <p class="text-slate-400 text-xs mt-2 font-medium">
            基于：{{ store.mode === 'self' ? '自我测评' : '伴侣视角' }}
          </p>
        </div>

        <!-- Overall Score Card -->
        <div class="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 mx-10 mb-8 flex flex-col items-center relative overflow-hidden">
          <div class="relative z-10 text-center">
            <div class="flex items-baseline justify-center mb-1">
              <span class="text-7xl font-black text-slate-800 tracking-tighter">{{ results.overall.toFixed(1) }}</span>
              <span class="text-xl font-bold text-slate-300 ml-2">/ 7.0</span>
            </div>
            <div class="inline-block px-5 py-1.5 rounded-full text-sm font-bold shadow-sm" :class="getScoreLevel(results.overall).bg + ' ' + getScoreLevel(results.overall).color">
              {{ getScoreLevel(results.overall).label }}占有倾向
            </div>
          </div>
          <!-- Decorative Background -->
          <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-primary-50 rounded-full opacity-40"></div>
          <div class="absolute -left-4 -top-4 w-16 h-16 bg-slate-50 rounded-full opacity-30"></div>
        </div>

        <!-- Dimension Scores Grid -->
        <div class="grid grid-cols-2 gap-5 mx-10 mb-10">
          <div 
            v-for="(score, dimId) in results.dimensions" 
            :key="dimId"
            class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center"
          >
            <div class="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">{{ dimensionNames[dimId] }}</div>
            <div class="flex items-baseline justify-center space-x-0.5 mb-2">
              <span class="text-2xl font-black text-slate-800">{{ score }}</span>
              <span class="text-[8px] text-slate-300 font-bold tracking-tighter">/ 7.0</span>
            </div>
            <div class="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
              <div 
                class="h-full bg-primary-400 rounded-full"
                :style="{ width: `${(score / 7) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Brand Footer -->
        <div class="mt-auto pt-8 border-t border-slate-200 flex items-center justify-between pb-8 mx-10">
          <div class="flex flex-col">
            <div class="text-xl font-black text-slate-800 tracking-tight">RPI <span class="text-primary-500">占有欲测评</span></div>
            <div class="text-[9px] text-slate-400 font-medium tracking-tight mt-0.5">了解关系边界，构建健康亲密关系</div>
          </div>
          <div class="text-[9px] text-slate-300 font-mono text-right leading-tight">
            DATE: {{ new Date().toLocaleDateString() }}<br/>
            ID: {{ Math.random().toString(36).substr(2, 6).toUpperCase() }}
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-slate-100 z-40 max-w-2xl mx-auto flex space-x-2">
      <button 
        @click="restart"
        class="flex-1 flex flex-col items-center justify-center space-y-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold active:scale-95 transition-transform"
      >
        <RefreshCcw class="w-5 h-5" />
        <span class="text-[10px]">重新测评</span>
      </button>
      
      <button 
        @click="generateFullReport"
        :disabled="isGenerating"
        class="flex-2 flex items-center justify-center space-x-2 bg-slate-800 text-white py-3 px-6 rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-70"
      >
        <Loader2 v-if="isGenerating" class="w-4 h-4 animate-spin" />
        <Download v-else class="w-4 h-4" />
        <span class="text-sm">{{ isGenerating ? '生成中...' : '下载报告' }}</span>
      </button>

      <button 
        @click="generateShareImage"
        :disabled="isSharing"
        class="flex-2 flex items-center justify-center space-x-2 bg-primary-500 text-white py-3 px-6 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-primary-200 disabled:opacity-70"
      >
        <Loader2 v-if="isSharing" class="w-4 h-4 animate-spin" />
        <Share2 v-else class="w-4 h-4" />
        <span class="text-sm">{{ isSharing ? '生成中...' : '分享图片' }}</span>
      </button>
    </div>

    <!-- Image Preview Modal -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="isPreviewOpen" class="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md p-4 sm:p-6">
        <div class="flex justify-between items-center mb-4 text-white">
          <div class="flex items-center space-x-2">
            <div class="w-1 h-4 bg-primary-500 rounded-full"></div>
            <h3 class="text-lg font-bold">{{ previewTitle }}预览</h3>
          </div>
          <button 
            @click="isPreviewOpen = false" 
            class="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X class="w-6 h-6" />
          </button>
        </div>
        
        <div class="flex-1 flex flex-col items-center justify-center min-h-0">
          <div class="relative max-w-full max-h-[75vh] overflow-auto bg-white rounded-2xl shadow-2xl border-4 border-white/10">
            <img :src="previewImageUrl" class="max-w-full h-auto block" alt="Preview" />
          </div>
          
          <div class="mt-8 text-center text-white space-y-3 pb-6">
            <div class="inline-flex items-center px-4 py-2 bg-primary-500/20 text-primary-400 rounded-full text-sm font-bold border border-primary-500/30">
              <span class="animate-bounce mr-2">👆</span>
              长按图片保存到相册
            </div>
            <p class="text-xs text-slate-400 leading-relaxed">
              微信内置浏览器不支持直接下载<br/>
              请长按图片后选择 <span class="text-white font-bold">“保存图片”</span> 或 <span class="text-white font-bold">“发送给朋友”</span>
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
