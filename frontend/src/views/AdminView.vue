<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { Plus, Trash2, Key, Users, Copy, CheckCircle, LogOut, Lock, Download, FileText, CheckSquare, Square, ChevronUp, ChevronDown, Search } from 'lucide-vue-next'

const authStore = useAuthStore()

// 登录相关
const username = ref('')
const password = ref('')
const loginError = ref('')

const handleLogin = () => {
  if (authStore.loginAdmin(username.value, password.value)) {
    loginError.value = ''
  } else {
    loginError.value = '账号或密码错误'
  }
}

// 卡密管理相关
const batchCount = ref(1)
const days = ref(7)
const maxDevices = ref(2)
const lastGeneratedCount = ref(0)
const selectedKeys = ref<string[]>([])
const copiedKey = ref('')
const showToast = ref(false)
const toastMsg = ref('')

// 排序相关
const sortBy = ref<'createdAt' | 'expiryDate' | 'deviceStatus'>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 筛选相关
const filterStatus = ref<'all' | 'unused' | 'used' | 'full'>('all')
const filterExpiry = ref<'all' | 'valid' | 'expired'>('all')
const searchQuery = ref('')

const triggerToast = (msg: string) => {
  toastMsg.value = msg
  showToast.value = true
  setTimeout(() => showToast.value = false, 2000)
}

const toggleSort = (field: 'createdAt' | 'expiryDate' | 'deviceStatus') => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
}

const generateKeys = async () => {
  const newKeys = await authStore.generateBatchKeys(batchCount.value, days.value, maxDevices.value)
  lastGeneratedCount.value = newKeys.length
  triggerToast(`成功生成 ${newKeys.length} 个卡密`)
}

const toggleSelectAll = () => {
  if (selectedKeys.value.length === authStore.licensePool.length) {
    selectedKeys.value = []
  } else {
    selectedKeys.value = authStore.licensePool.map(k => k.key)
  }
}

const toggleSelect = (key: string) => {
  const index = selectedKeys.value.indexOf(key)
  if (index > -1) {
    selectedKeys.value.splice(index, 1)
  } else {
    selectedKeys.value.push(key)
  }
}

const deleteKey = async (key: string) => {
  if (confirm('确定要删除这个卡密吗？')) {
    await authStore.deleteKey(key)
    triggerToast('卡密已删除')
  }
}

const deleteSelected = async () => {
  if (confirm(`确定要删除选中的 ${selectedKeys.value.length} 个卡密吗？`)) {
    const count = selectedKeys.value.length
    for (const key of selectedKeys.value) {
      await authStore.deleteKey(key)
    }
    selectedKeys.value = []
    triggerToast(`已成功删除 ${count} 个卡密`)
  }
}

const exportSelected = async () => {
  const keysToExport = authStore.licensePool.filter(k => selectedKeys.value.includes(k.key))
  await authStore.exportToCSV(keysToExport)
}

const exportAll = async () => {
  await authStore.exportToCSV(authStore.licensePool)
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  copiedKey.value = text
  triggerToast('已复制到剪贴板')
  setTimeout(() => copiedKey.value = '', 2000)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const sortedKeys = computed(() => {
  let filtered = [...authStore.licensePool]

  // 1. 关键词搜索
  if (searchQuery.value) {
    const q = searchQuery.value.toUpperCase()
    filtered = filtered.filter(k => k.key.includes(q))
  }

  // 2. 状态筛选
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(k => {
      if (filterStatus.value === 'unused') return k.usedDevices.length === 0
      if (filterStatus.value === 'used') return k.usedDevices.length > 0 && k.usedDevices.length < k.maxDevices
      if (filterStatus.value === 'full') return k.usedDevices.length >= k.maxDevices
      return true
    })
  }

  // 3. 有效期筛选
  if (filterExpiry.value !== 'all') {
    const now = new Date()
    filtered = filtered.filter(k => {
      if (!k.expiryDate) return filterExpiry.value === 'valid' // 未激活视为有效
      const isExp = new Date(k.expiryDate) < now
      return filterExpiry.value === 'expired' ? isExp : !isExp
    })
  }

  // 4. 排序
  return filtered.sort((a, b) => {
    let comparison = 0
    if (sortBy.value === 'createdAt') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    } else if (sortBy.value === 'expiryDate') {
      const timeA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0
      const timeB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0
      comparison = timeA - timeB
    } else if (sortBy.value === 'deviceStatus') {
      const aUsage = a.usedDevices.length / a.maxDevices
      const bUsage = b.usedDevices.length / b.maxDevices
      comparison = aUsage - bUsage
    }
    return sortOrder.value === 'asc' ? comparison : -comparison
  })
})

const isExpired = (dateStr?: string) => {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}
</script>

<template>
  <!-- Login Overlay -->
  <div v-if="!authStore.isAdminAuthenticated" class="min-h-screen bg-slate-100 flex items-center justify-center p-6">
    <div class="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <Lock class="w-8 h-8 text-primary-600" />
        </div>
        <h1 class="text-2xl font-black text-slate-800">后台管理登录</h1>
        <p class="text-slate-500 text-sm">请输入管理员凭据以继续</p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">用户名</label>
          <input 
            v-model="username"
            type="text" 
            class="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl outline-none transition-all"
            placeholder="Admin Username"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">密码</label>
          <input 
            v-model="password"
            type="password" 
            class="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl outline-none transition-all"
            placeholder="••••••••"
            @keyup.enter="handleLogin"
          />
        </div>
        <p v-if="loginError" class="text-red-500 text-xs font-bold text-center">{{ loginError }}</p>
        
        <button 
          @click="handleLogin"
          class="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold transition-all shadow-lg"
        >
          立即登录
        </button>
      </div>
    </div>
  </div>

  <div v-else class="min-h-screen bg-slate-50 p-4 pb-12">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-black text-slate-800">RPI 后台管理</h1>
          <p class="text-slate-500 text-sm">卡密生成与设备授权管理</p>
        </div>
        <div class="flex gap-2">
          <router-link to="/" class="text-sm font-bold text-slate-600 hover:text-slate-800 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center">
            返回首页
          </router-link>
          <button 
            @click="authStore.adminLogout()"
            class="text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 px-4 py-2 rounded-xl shadow-sm border border-red-100 flex items-center"
          >
            <LogOut class="w-4 h-4 mr-1" /> 退出
          </button>
        </div>
      </div>

      <!-- Generator Card -->
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
        <h2 class="text-lg font-bold text-slate-800 mb-6 flex items-center">
          <Plus class="w-5 h-5 mr-2 text-primary-500" /> 批量生成卡密
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-400 uppercase ml-1">生成数量</label>
            <input 
              v-model.number="batchCount" 
              type="number" 
              min="1"
              max="100"
              class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-400 uppercase ml-1">有效期 (天)</label>
            <input 
              v-model.number="days" 
              type="number" 
              class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-400 uppercase ml-1">最大设备数</label>
            <input 
              v-model.number="maxDevices" 
              type="number" 
              class="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all"
            />
          </div>
          <div class="flex items-end">
            <button 
              @click="generateKeys"
              class="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-100 flex items-center justify-center"
            >
              立即生成
            </button>
          </div>
        </div>
      </div>

      <!-- Keys List -->
      <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="p-6 border-b border-slate-50 space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 class="text-lg font-bold text-slate-800 flex items-center">
              <Key class="w-5 h-5 mr-2 text-primary-500" /> 卡密管理 ({{ authStore.licensePool.length }})
            </h2>
            
            <div class="flex items-center gap-2">
              <button 
                v-if="selectedKeys.length > 0"
                @click="deleteSelected"
                class="flex items-center px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-all"
              >
                <Trash2 class="w-4 h-4 mr-1.5" /> 删除选中 ({{ selectedKeys.length }})
              </button>
              <button 
                v-if="selectedKeys.length > 0"
                @click="exportSelected"
                class="flex items-center px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-sm font-bold transition-all"
              >
                <FileText class="w-4 h-4 mr-1.5" /> 导出选中
              </button>
              <button 
                @click="exportAll"
                class="flex items-center px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-sm font-bold transition-all"
              >
                <Download class="w-4 h-4 mr-1.5" /> 导出全部
              </button>
            </div>
          </div>

          <!-- Filter Bar -->
          <div class="flex flex-wrap items-center gap-3 pt-2">
            <div class="relative flex-1 min-w-[200px]">
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="搜索卡密..." 
                class="w-full pl-10 pr-4 py-2 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all text-sm"
              />
              <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            
            <select 
              v-model="filterStatus"
              class="px-4 py-2 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all text-sm font-medium text-slate-600"
            >
              <option value="all">所有状态</option>
              <option value="unused">未使用</option>
              <option value="used">已使用(部分)</option>
              <option value="full">已用满</option>
            </select>

            <select 
              v-model="filterExpiry"
              class="px-4 py-2 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all text-sm font-medium text-slate-600"
            >
              <option value="all">所有效期</option>
              <option value="valid">有效期内</option>
              <option value="expired">已过期</option>
            </select>

            <button 
              v-if="searchQuery || filterStatus !== 'all' || filterExpiry !== 'all'"
              @click="searchQuery = ''; filterStatus = 'all'; filterExpiry = 'all'"
              class="text-xs font-bold text-primary-600 hover:text-primary-700 underline underline-offset-4"
            >
              重置筛选
            </button>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50">
                <th class="px-6 py-4 w-12">
                  <button @click="toggleSelectAll" class="text-slate-400 hover:text-primary-500 transition-colors">
                    <CheckSquare v-if="selectedKeys.length === authStore.licensePool.length && authStore.licensePool.length > 0" class="w-5 h-5 text-primary-500" />
                    <Square v-else class="w-5 h-5" />
                  </button>
                </th>
                <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <button @click="toggleSort('createdAt')" class="flex items-center hover:text-primary-500 transition-colors">
                    卡密
                    <span class="ml-1 flex flex-col scale-75">
                      <ChevronUp class="w-2.5 h-2.5" :class="sortBy === 'createdAt' && sortOrder === 'asc' ? 'text-primary-500' : 'text-slate-300'" />
                      <ChevronDown class="w-2.5 h-2.5 -mt-1" :class="sortBy === 'createdAt' && sortOrder === 'desc' ? 'text-primary-500' : 'text-slate-300'" />
                    </span>
                  </button>
                </th>
                <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <button @click="toggleSort('expiryDate')" class="flex items-center hover:text-primary-500 transition-colors">
                    有效期至
                    <span class="ml-1 flex flex-col scale-75">
                      <ChevronUp class="w-2.5 h-2.5" :class="sortBy === 'expiryDate' && sortOrder === 'asc' ? 'text-primary-500' : 'text-slate-300'" />
                      <ChevronDown class="w-2.5 h-2.5 -mt-1" :class="sortBy === 'expiryDate' && sortOrder === 'desc' ? 'text-primary-500' : 'text-slate-300'" />
                    </span>
                  </button>
                </th>
                <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <button @click="toggleSort('deviceStatus')" class="flex items-center hover:text-primary-500 transition-colors">
                    设备状态
                    <span class="ml-1 flex flex-col scale-75">
                      <ChevronUp class="w-2.5 h-2.5" :class="sortBy === 'deviceStatus' && sortOrder === 'asc' ? 'text-primary-500' : 'text-slate-300'" />
                      <ChevronDown class="w-2.5 h-2.5 -mt-1" :class="sortBy === 'deviceStatus' && sortOrder === 'desc' ? 'text-primary-500' : 'text-slate-300'" />
                    </span>
                  </button>
                </th>
                <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr 
                v-for="item in sortedKeys" 
                :key="item.key" 
                class="hover:bg-slate-50/50 transition-colors" 
                :class="{
                  'bg-primary-50/30': selectedKeys.includes(item.key),
                  'opacity-60 bg-slate-50/30': item.usedDevices.length > 0
                }"
              >
                <td class="px-6 py-4">
                  <button @click="toggleSelect(item.key)" class="text-slate-300 hover:text-primary-500 transition-colors">
                    <CheckSquare v-if="selectedKeys.includes(item.key)" class="w-5 h-5 text-primary-500" />
                    <Square v-else class="w-5 h-5" />
                  </button>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center group">
                    <span class="font-mono font-bold text-slate-700 mr-2" :class="{'line-through text-slate-400': item.usedDevices.length > 0}">{{ item.key }}</span>
                    <span v-if="item.usedDevices.length > 0" class="mr-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">已使用</span>
                    <button 
                      @click="copyToClipboard(item.key)"
                      class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
                    >
                      <Copy v-if="copiedKey !== item.key" class="w-3.5 h-3.5 text-slate-400" />
                      <CheckCircle v-else class="w-3.5 h-3.5 text-green-500" />
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-col">
                    <template v-if="item.expiryDate">
                      <span class="text-sm font-medium" :class="isExpired(item.expiryDate) ? 'text-red-500' : 'text-slate-600'">
                        {{ formatDate(item.expiryDate) }}
                      </span>
                      <span v-if="isExpired(item.expiryDate)" class="text-[10px] font-bold text-red-400 uppercase">已过期</span>
                    </template>
                    <template v-else>
                      <span class="text-sm font-medium text-amber-500">待激活</span>
                      <span class="text-[10px] font-bold text-slate-400 uppercase">时长: {{ item.validDays }}天</span>
                    </template>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div class="flex -space-x-2 mr-3">
                      <div 
                        v-for="i in Math.min(item.usedDevices.length, 3)" :key="i"
                        class="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center"
                        :title="item.usedDevices[i-1] ? `设备ID: ${item.usedDevices[i-1]?.deviceId}\n绑定时间: ${formatDate(item.usedDevices[i-1]?.boundAt ?? '')}` : ''"
                      >
                        <Users class="w-3 h-3 text-slate-500" />
                      </div>
                    </div>
                    <span class="text-xs font-bold text-slate-500">
                      {{ item.usedDevices.length }} / {{ item.maxDevices }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <button 
                    @click="deleteKey(item.key)"
                    class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 class="w-5 h-5" />
                  </button>
                </td>
              </tr>
              <tr v-if="authStore.licensePool.length === 0">
                <td colspan="4" class="px-6 py-12 text-center text-slate-400">
                  暂无卡密数据，请在上方生成
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Toast Notification -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showToast" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div class="bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-700 backdrop-blur-md bg-opacity-90">
          <CheckCircle class="w-5 h-5 text-emerald-400" />
          <span class="text-sm font-bold tracking-wide">{{ toastMsg }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>
