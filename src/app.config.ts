// src/app.config.ts
// Configurações centralizadas do aplicativo

export const APP_CONFIG = {
  // Identificação
  name: 'Lunara Agenda',
  version: '3.0.0',
  description: 'Sistema de agendamento e gestão para terapeutas holísticos',
  
  // URLs e APIs
  api: {
    baseUrl: import.meta.env.VITE_API_URL || '',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  },
  
  // Features
  features: {
    enableOfflineMode: true,
    enablePushNotifications: true,
    enableAnalytics: import.meta.env.PROD,
    enableCloudSync: false // Local-first por padrão
  },
  
  // Limites e validações
  limits: {
    maxUploadSize: 5 * 1024 * 1024, // 5MB
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
    debounceDelay: 300
  },
  
  // UI
  ui: {
    theme: {
      primary: '#006699',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    animations: {
      duration: 200,
      easing: 'ease-out'
    }
  },
  
  // PWA
  pwa: {
    shortName: 'Lunara',
    display: 'standalone',
    orientation: 'portrait-primary',
    backgroundColor: '#000000',
    themeColor: '#006699'
  }
} as const;

// Helper para acessar variáveis de ambiente com fallback
export const getEnv = <T>(key: string, fallback: T): T => {
  const value = import.meta.env[key];
  return value !== undefined ? (value as T) : fallback;
};

// Helper para verificar se feature está habilitada
export const isFeatureEnabled = (feature: keyof typeof APP_CONFIG.features): boolean => {
  return APP_CONFIG.features[feature] && getEnv(`VITE_ENABLE_${feature.toUpperCase()}`, true);
};