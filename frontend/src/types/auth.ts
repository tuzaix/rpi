export interface LicenseKey {
  key: string;          // 卡密文本
  validDays: number;    // 有效时长 (天)
  expiryDate?: string;  // 到期日期 (ISO string, 激活后设置)
  activatedAt?: string; // 激活时间
  maxDevices: number;   // 最大授权设备数
  usedDevices: {        // 记录使用状态
    deviceId: string;
    boundAt: string;
  }[]; 
  createdAt: string;    // 创建时间
  type: 'self' | 'partner' | 'all'; // 适用类型
}

export interface AuthState {
  currentKey: string | null;
  isAuthenticated: boolean;
}
