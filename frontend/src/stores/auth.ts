import { defineStore } from 'pinia'
import type { LicenseKey } from '../types/auth'
import { APP_CONFIG } from '../config'

// 模拟后端数据库，使用 localStorage 存储卡密池
const STORAGE_KEY = 'rpi_license_pool'
const AUTH_SESSION_KEY = 'rpi_auth_session'
const ADMIN_SESSION_KEY = 'rpi_admin_session'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    licensePool: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as LicenseKey[],
    currentKey: localStorage.getItem(AUTH_SESSION_KEY) || null as string | null,
    deviceId: getOrCreateDeviceId(),
    isAdminAuthenticated: !!sessionStorage.getItem(ADMIN_SESSION_KEY),
    verificationEnabled: true // 默认开启验证
  }),

  actions: {
    /**
     * 从服务器加载配置和卡密
     */
    async init() {
      await this.fetchConfig()
      
      try {
        const response = await fetch('/api/keys')
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            this.licensePool = data
            this.savePool(false) // 仅同步到 localStorage，不回传服务器
          }
        }
      } catch (err) {
        console.error('Failed to load keys from server:', err)
      }
    },

    /**
     * 加载验证配置
     */
    async fetchConfig() {
      try {
        const response = await fetch('/api/config')
        if (response.ok) {
          const config = await response.json()
          if (config && typeof config.enableVerification === 'boolean') {
            this.verificationEnabled = config.enableVerification
          }
        }
      } catch (err) {
        console.error('Failed to load config:', err)
      }
    },

    /**
     * 更新验证配置
     */
    async updateVerificationConfig(enable: boolean) {
      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enableVerification: enable })
        })
        if (response.ok) {
          this.verificationEnabled = enable
          return true
        }
        return false
      } catch (err) {
        console.error('Failed to update config:', err)
        return false
      }
    },

    /**
     * 批量生成新卡密 (后台管理使用)
     * 优化：支持批量生成，12 位字符，去掉前缀
     */
    async generateBatchKeys(count: number, days: number, maxDevices: number, type: LicenseKey['type'] = 'all') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const newKeys: LicenseKey[] = []
      
      for (let j = 0; j < count; j++) {
        let key = ''
        for (let i = 0; i < APP_CONFIG.license.length; i++) {
          key += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        
        // 确保不生成重复卡密
        if (this.licensePool.some(k => k.key === key)) {
          j-- // 重试
          continue
        }

        newKeys.push({
          key,
          validDays: days,
          maxDevices,
          usedDevices: [],
          createdAt: new Date().toISOString(),
          type
        })
      }
      
      this.licensePool.push(...newKeys)
      await this.savePool()
      return newKeys
    },

    /**
     * 后台管理登录
     */
    loginAdmin(username: string, password: string): boolean {
      if (username === APP_CONFIG.admin.username && password === APP_CONFIG.admin.password) {
        this.isAdminAuthenticated = true
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
        return true
      }
      return false
    },

    adminLogout() {
      this.isAdminAuthenticated = false
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    },

    /**
     * 验证卡密
     */
    async verifyKey(inputKey: string): Promise<{ success: boolean; message: string }> {
      const keyData = this.licensePool.find(k => k.key === inputKey)
      
      if (!keyData) {
        return { success: false, message: '无效的卡密' }
      }

      // 1. 首次激活逻辑
      if (!keyData.activatedAt) {
        keyData.activatedAt = new Date().toISOString()
        keyData.expiryDate = new Date(Date.now() + keyData.validDays * 24 * 60 * 60 * 1000).toISOString()
        // 首次激活时，当前设备自动绑定
        keyData.usedDevices.push({
          deviceId: this.deviceId,
          boundAt: new Date().toISOString()
        })
        await this.savePool()
        this.currentKey = inputKey
        localStorage.setItem(AUTH_SESSION_KEY, inputKey)
        return { success: true, message: '卡密激活成功' }
      }

      // 2. 检查有效期 (仅对已激活的卡密)
      if (keyData.expiryDate && new Date(keyData.expiryDate) < new Date()) {
        return { success: false, message: '该卡密已过期' }
      }

      // 3. 检查设备绑定
      const deviceBound = keyData.usedDevices.find(d => d.deviceId === this.deviceId)
      if (!deviceBound) {
        if (keyData.usedDevices.length >= keyData.maxDevices) {
          return { success: false, message: '该卡密绑定的设备数已达上限' }
        }
        
        // 绑定新设备
        keyData.usedDevices.push({
          deviceId: this.deviceId,
          boundAt: new Date().toISOString()
        })
        await this.savePool()
      }

      this.currentKey = inputKey
      localStorage.setItem(AUTH_SESSION_KEY, inputKey)
      return { success: true, message: '验证通过' }
    },

    /**
     * 导出卡密到文件 (同时保存到 frontend/data 目录)
     */
    async exportToCSV(keys: LicenseKey[]) {
      const header = '卡密,创建时间,激活时间,到期时间,有效天数,最大设备数,已用设备数,状态\n'
      const rows = keys.map(k => {
        let status = '未激活'
        if (k.expiryDate) {
          status = new Date(k.expiryDate) < new Date() ? '已过期' : (k.usedDevices.length >= k.maxDevices ? '已满额' : '使用中')
        }
        
        return [
          k.key,
          new Date(k.createdAt).toLocaleString(),
          k.activatedAt ? new Date(k.activatedAt).toLocaleString() : '-',
          k.expiryDate ? new Date(k.expiryDate).toLocaleString() : '-',
          k.validDays,
          k.maxDevices,
          k.usedDevices.length,
          status
        ].join(',')
      }).join('\n')
      
      const content = '\uFEFF' + header + rows
      const filename = `RPI-卡密导出-${new Date().getTime()}.csv`

      // 1. 同步到服务器 data 目录
      try {
        await fetch('/api/export', {
          method: 'POST',
          body: JSON.stringify({ filename, content })
        })
      } catch (err) {
        console.error('Failed to sync export to server:', err)
      }

      // 2. 触发浏览器下载
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },

    /**
     * 删除卡密 (后台管理使用)
     */
    async deleteKey(key: string) {
      this.licensePool = this.licensePool.filter(k => k.key !== key)
      await this.savePool()
    },

    async savePool(syncToServer = true) {
      const data = JSON.stringify(this.licensePool)
      localStorage.setItem(STORAGE_KEY, data)
      
      if (syncToServer) {
        try {
          await fetch('/api/keys', {
            method: 'POST',
            body: data
          })
        } catch (err) {
          console.warn('Server sync failed, using localStorage only')
        }
      }
    },

    logout() {
      this.currentKey = null
      localStorage.removeItem(AUTH_SESSION_KEY)
    }
  }
})

/**
 * 获取或创建简单的设备指纹
 */
function getOrCreateDeviceId() {
  let id = localStorage.getItem('rpi_device_id')
  if (!id) {
    id = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    localStorage.setItem('rpi_device_id', id)
  }
  return id
}
