export interface LicenseKey {
  key: string;          // 卡密文本
  expiryDate: string;   // 到期日期 (ISO string)
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
