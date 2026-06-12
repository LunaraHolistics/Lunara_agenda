import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { Home, Users, Activity, Package, Calendar, Wallet, BarChart2, Settings, LogOut, Briefcase, Bell, Menu, X, RefreshCw, CheckCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

// 🎯 Lazy loading para telas menos usadas (otimização de bundle)
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const ClientesScreen = lazy(() => import('./screens/ClientesScreen'));
const TerapiasScreen = lazy(() => import('./screens/TerapiasScreen'));
const PacotesScreen = lazy(() => import('./screens/PacotesScreen'));
const AgendaScreen = lazy(() => import('./screens/AgendaScreen'));
const FinanceiroScreen = lazy(() => import('./screens/FinanceiroScreen'));
const ConfiguracoesScreen = lazy(() => import('./screens/ConfiguracoesScreen'));
const FreelancerScreen = lazy(() => import('./screens/FreelancerScreen'));
const Login = lazy(() => import('./screens/Login'));

import { AppProvider, useAppContext } from './AppContext';
import { StorageService, StorageKeys } from './services/StorageService';
import { Agendamento } from './types';

// ======================
// TYPES E CONFIGURAÇÕES
// ======================

export type Tab = 'home' | 'clientes' | 'terapias' | 'pacotes' | 'agenda' | 'financeiro' | 'configuracoes' | 'freelancer';

export interface TabConfig {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  priority: 'high' | 'medium' | 'low';
  showInMobile?: boolean;
  requiresAuth?: boolean;
}

export const TABS_CONFIG: TabConfig[] = [
  { id: 'home', label: 'Início', icon: Home, priority: 'high', showInMobile: true },
  { id: 'agenda', label: 'Agenda', icon: Calendar, priority: 'high', showInMobile: true },
  { id: 'clientes', label: 'Clientes', icon: Users, priority: 'high', showInMobile: true },
  { id: 'pacotes', label: 'Pacotes', icon: Package, priority: 'medium', showInMobile: false },
  { id: 'terapias', label: 'Terapias', icon: Activity, priority: 'medium', showInMobile: false },
  { id: 'financeiro', label: 'Finanças', icon: Wallet, priority: 'medium', showInMobile: true },
  { id: 'freelancer', label: 'Freelancer', icon: Briefcase, priority: 'low', showInMobile: false },
  { id: 'configuracoes', label: 'Config', icon: Settings, priority: 'low', showInMobile: false },
] as const;

// 🎯 Tipos para comunicação com Service Worker
export interface SWMessage {
  type: string;
  payload?: any;
  error?: {
    message: string;
    stack?: string;
    timestamp: number;
  };
}

export interface CacheStats {
  [cacheName: string]: {
    count: number;
    size: number;
  };
}

// ======================
// HOOK: useServiceWorkerIntegration
// ======================

export const useServiceWorkerIntegration = () => {
  const [swReady, setSwReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // 🎯 Registrar e configurar Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠ Service Worker não suportado neste navegador');
      return;
    }

    let updateInterval: NodeJS.Timeout;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
          updateViaCache: 'none'
        });
        
        registrationRef.current = registration;
        setSwReady(true);
        console.log('✅ Service Worker registrado:', registration.scope);

        // 🎯 Listener: Nova versão disponível
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
                console.log('🎉 Nova versão disponível!');
                
                // Disparar evento global para outros componentes
                window.dispatchEvent(new CustomEvent('lunara:update-available', {
                  detail: { version: 'nova', message: 'Atualização disponível' }
                }));
              }
            });
          }
        });

        // 🎯 Verificar updates periodicamente (a cada 30 min em produção)
        const checkInterval = process.env.NODE_ENV === 'development' ? 5 * 60 * 1000 : 30 * 60 * 1000;
        updateInterval = setInterval(async () => {
          await registration.update();
          console.log('🔄 Verificando atualizações do SW...');
        }, checkInterval);

        // 🎯 Listener para mensagens DO service worker
        navigator.serviceWorker.addEventListener('message', (event: MessageEvent<SWMessage>) => {
          handleSWMessage(event.data);
        });

        // 🎯 Listener para cliques em notificações
        navigator.serviceWorker.addEventListener('message', (event: MessageEvent<SWMessage>) => {
          if (event.data?.type === 'NOTIFICATION_CLICKED') {
            handleNotificationClick(event.data.payload);
          }
        });

        // 🎯 Buscar stats iniciais do cache (apenas em dev)
        if (process.env.NODE_ENV === 'development') {
          requestCacheStats();
        }

      } catch (error) {
        console.error('❌ Erro ao registrar Service Worker:', error);
      }
    };

    registerSW();

    return () => {
      if (updateInterval) clearInterval(updateInterval);
    };
  }, []);

  // 🎯 Processar mensagens recebidas do SW
  const handleSWMessage = useCallback((message: SWMessage) => {
    console.log('💬 Mensagem do SW:', message);

    switch (message.type) {
      case 'SW_ACTIVATED':
        console.log('✅ SW ativado:', message.payload);
        setUpdateAvailable(true);
        break;
        
      case 'CACHE_UPDATED':
        console.log('📦 Cache atualizado:', message.payload?.url);
        // Pode atualizar UI se necessário
        break;
        
      case 'SYNC_COMPLETE':
        console.log('🔄 Sync concluído:', message.payload?.tag);
        setLastSync(new Date().toISOString());
        window.dispatchEvent(new CustomEvent('lunara:sync-complete', {
          detail: { tag: message.payload?.tag }
        }));
        break;
        
      case 'CACHE_STATS':
        setCacheStats(message.payload);
        console.log('📊 Stats do cache:', message.payload);
        break;
        
      case 'SW_ERROR':
        console.error('💥 Erro no SW:', message.error);
        // Pode mostrar toast de erro aqui
        break;
        
      case 'NOTIFICATION_CLICKED':
        handleNotificationClick(message.payload);
        break;
        
      default:
        console.log(`⚠ Mensagem não tratada: ${message.type}`);
    }
  }, []);

  // 🎯 Handler para clique em notificação
  const handleNotificationClick = useCallback((payload?: any) => {
    console.log('🖱 Notificação clicada:', payload);
    
    if (payload?.agendamentoId) {
      // Navegar para a agenda com o agendamento específico
      window.dispatchEvent(new CustomEvent('lunara:navigate-to-agendamento', {
        detail: { agendamentoId: payload.agendamentoId }
      }));
      
      // Se estiver em outra tab, mudar para agenda
      window.dispatchEvent(new CustomEvent('lunara:change-tab', {
        detail: { tab: 'agenda' }
      }));
    } else if (payload?.url) {
      window.location.href = payload.url;
    }
  }, []);

  // 🎯 Aplicar atualização (ativa novo SW e recarrega)
  const applyUpdate = useCallback(async () => {
    if (!registrationRef.current) return;
    
    setIsUpdating(true);
    try {
      // Enviar mensagem para pular waiting
      registrationRef.current.waiting?.postMessage({ type: 'SKIP_WAITING' });
      
      // Aguardar um pouco e recarregar
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (error) {
      console.error('❌ Erro ao aplicar atualização:', error);
      setIsUpdating(false);
    }
  }, []);

  // 🎯 Solicitar stats do cache
  const requestCacheStats = useCallback(() => {
    if (registrationRef.current?.active) {
      registrationRef.current.active.postMessage({ type: 'GET_CACHE_STATS' });
    }
  }, []);

  // 🎯 Limpar cache específico
  const clearCache = useCallback(async (cacheName?: string, reprecache = false) => {
    if (!registrationRef.current?.active) return;
    
    registrationRef.current.active.postMessage({
      type: 'CLEAR_CACHE',
      payload: { cacheName, reprecache }
    });
    
    // Atualizar stats após limpar
    setTimeout(requestCacheStats, 1000);
  }, [requestCacheStats]);

  // 🎯 Registrar background sync para operações pendentes
  const registerSync = useCallback(async (tag: string) => {
    if (!('sync' in ServiceWorkerRegistration.prototype)) {
      console.warn('⚠ Background Sync não suportado');
      return false;
    }
    
    try {
      if (registrationRef.current) {
        await registrationRef.current.sync.register(tag);
        console.log(`🔄 Sync registrado: ${tag}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Erro ao registrar sync ${tag}:`, error);
      return false;
    }
    return false;
  }, []);

  // 🎯 Enviar URLs para precache dinâmico
  const precacheUrls = useCallback(async (urls: string[]) => {
    if (!registrationRef.current?.active) return;
    
    registrationRef.current.active.postMessage({
      type: 'CACHE_URLS',
      payload: { urls }
    });
    console.log(`📦 Precache solicitado para ${urls.length} URLs`);
  }, []);

  return {
    swReady,
    updateAvailable,
    isUpdating,
    cacheStats,
    lastSync,
    applyUpdate,
    requestCacheStats,
    clearCache,
    registerSync,
    precacheUrls,
    registration: registrationRef.current
  };
};

// ======================
// HOOK: useAppointmentNotifications
// ======================

interface UseNotificationOptions {
  checkInterval?: number;
  advanceNoticeMinutes?: number[];
  enabled?: boolean;
}

export const useAppointmentNotifications = (
  agendamentos: Agendamento[],
  options: UseNotificationOptions = {}
) => {
  const {
    checkInterval = 60000,
    advanceNoticeMinutes = [30, 5],
    enabled = true
  } = options;

  const notifiedRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<number>(Date.now());
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if (!enabled || !('Notification' in window)) return;

    const requestPermission = async () => {
      if (Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          permissionRef.current = permission;
          console.log('🔔 Permissão de notificação:', permission);
        } catch (error) {
          console.error('❌ Erro ao solicitar permissão:', error);
        }
      } else {
        permissionRef.current = Notification.permission;
      }
    };

    requestPermission();
  }, [enabled]);

  const sendNotification = useCallback((title: string, body: string, icon?: string, data?: any) => {
    if (!enabled) return;

    if ('Notification' in window && permissionRef.current === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: icon || '/icone.png',
          tag: `lunara-${Date.now()}`,
          requireInteraction: true,
          data // Dados para manipular no click
        });
        console.log('🔔 Notificação enviada:', title);
        return;
      } catch (error) {
        console.warn('⚠ Falha na notificação nativa:', error);
      }
    }

    // Fallback via CustomEvent
    window.dispatchEvent(new CustomEvent('lunara:notification', {
      detail: { title, body, type: 'appointment', data }
    }));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !agendamentos?.length || permissionRef.current !== 'granted') return;

    const checkAppointments = () => {
      const now = Date.now();
      lastCheckRef.current = now;

      const relevantAppointments = agendamentos.filter(a => 
        a.statusAtendimento === 'Agendado' && 
        a.data && a.hora &&
        !a.archived
      );

      relevantAppointments.forEach(agendamento => {
        try {
          const [year, month, day] = agendamento.data.split('-').map(Number);
          const [hours, minutes] = agendamento.hora.split(':').map(Number);
          
          if (!year || !month || !day || hours === undefined || minutes === undefined) return;

          const agendamentoDate = new Date(year, month - 1, day, hours, minutes);
          const diffMinutes = (agendamentoDate.getTime() - now) / 60000;

          if (diffMinutes < -5 || diffMinutes > 120) return;

          const key = `${agendamento.id}_${agendamento.data}_${agendamento.hora}`;

          const shouldNotify = advanceNoticeMinutes.some(min => 
            diffMinutes > 0 && diffMinutes <= min && !notifiedRef.current.has(key)
          );

          if (shouldNotify) {
            sendNotification(
              '⏰ Atendimento em breve',
              `Atendimento às ${agendamento.hora}`,
              '/icone.png',
              { agendamentoId: agendamento.id, type: 'appointment' }
            );
            notifiedRef.current.add(key);
          }

          if (diffMinutes < -10) {
            notifiedRef.current.delete(key);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar agendamento ${agendamento.id}:`, error);
        }
      });
    };

    checkAppointments();
    const intervalId = setInterval(checkAppointments, checkInterval);
    
    return () => clearInterval(intervalId);
  }, [agendamentos, enabled, checkInterval, advanceNoticeMinutes, sendNotification]);

  const resetNotifications = useCallback(() => {
    notifiedRef.current.clear();
  }, []);

  return {
    permission: permissionRef.current,
    requestPermission: async () => {
      if ('Notification' in window) {
        permissionRef.current = await Notification.requestPermission();
      }
    },
    resetNotifications,
    sendNotification
  };
};

// ======================
// HOOK: useOnlineStatus
// ======================

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const updateConnection = () => {
      setIsOnline(navigator.onLine);
      
      // Detectar tipo de conexão se disponível
      const conn = (navigator as any).connection;
      if (conn) {
        setConnectionType(`${conn.effectiveType || 'unknown'} (${conn.downlink}Mbps)`);
      }
    };

    updateConnection();
    
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🟢 App online');
      window.dispatchEvent(new CustomEvent('lunara:online'));
      updateConnection();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('🔴 App offline');
      window.dispatchEvent(new CustomEvent('lunara:offline'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Monitorar mudanças de conexão
    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', updateConnection);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', updateConnection);
      }
    };
  }, []);

  return { isOnline, connectionType };
};

// ======================
// HOOK: useTabNavigation
// ======================

export const useTabNavigation = (
  activeTab: Tab,
  setActiveTab: (tab: Tab) => void,
  availableTabs: Tab[]
) => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as Tab;
    
    if (tabParam && availableTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [availableTabs, activeTab, setActiveTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeTab !== 'home') {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    if (window.location.search !== params.toString()) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentIndex = availableTabs.indexOf(activeTab);
      
      if (e.key === 'ArrowRight' && currentIndex < availableTabs.length - 1) {
        e.preventDefault();
        setActiveTab(availableTabs[currentIndex + 1]);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        setActiveTab(availableTabs[currentIndex - 1]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveTab('home');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, availableTabs, setActiveTab]);

  // 🎯 Listener para navegação via notificação
  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail?.tab && availableTabs.includes(e.detail.tab)) {
        setActiveTab(e.detail.tab);
      }
    };
    
    window.addEventListener('lunara:change-tab', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('lunara:change-tab', handleNavigate as EventListener);
    };
  }, [availableTabs, setActiveTab]);

  const handleTabChange = useCallback((newTab: Tab) => {
    if (newTab === activeTab) return;
    if (!availableTabs.includes(newTab)) {
      console.warn(`⚠ Tab inválida: ${newTab}`);
      return;
    }
    setActiveTab(newTab);
  }, [activeTab, availableTabs, setActiveTab]);

  return { handleTabChange };
};

// ======================
// COMPONENT: UpdatePrompt (Modal de Atualização)
// ======================

interface UpdatePromptProps {
  visible: boolean;
  onApply: () => void;
  onDismiss: () => void;
  isUpdating: boolean;
}

const UpdatePrompt: React.FC<UpdatePromptProps> = ({ visible, onApply, onDismiss, isUpdating }) => {
  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] shadow-2xl p-6 border border-gray-100 dark:border-zinc-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#006699]/10 rounded-xl">
              <RefreshCw size={24} className="text-[#006699] animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Nova Versão Disponível! 🎉
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Uma atualização do Lunara Agenda está pronta.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6">
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Melhorias de performance
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Correções de bugs
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                Novas funcionalidades
              </li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              disabled={isUpdating}
            >
              Depois
            </button>
            <button
              onClick={onApply}
              disabled={isUpdating}
              className="flex-1 py-3 text-sm font-bold bg-[#006699] text-white rounded-xl shadow-lg shadow-[#006699]/20 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Atualizar Agora'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ======================
// COMPONENT: Toast System (Fallback de Notificações)
// ======================

interface Toast {
  id: string;
  title: string;
  body: string;
  type: 'success' | 'error' | 'info' | 'warning';
  data?: any;
}

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[1999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border flex items-start gap-3 min-w-[280px] max-w-sm ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-bold">{toast.title}</p>
              <p className="text-xs opacity-80 mt-0.5">{toast.body}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ======================
// COMPONENT: ErrorBoundary
// ======================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('💥 Erro capturado pelo ErrorBoundary:', error, errorInfo);
    
    StorageService.saveData('@lunara_last_error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold mb-2">Algo deu errado</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Tente recarregar a página. Se o problema persistir, entre em contato com o suporte.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#006699] text-white rounded-lg hover:bg-[#005280] transition-colors"
          >
            Recarregar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ======================
// COMPONENT: AppContent
// ======================

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🎯 Estado para toasts de notificação fallback
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const { agendamentos } = useAppContext();
  const { isOnline, connectionType } = useOnlineStatus();
  const shouldReduceMotion = useReducedMotion();
  
  // 🎯 Integração com Service Worker
  const {
    swReady,
    updateAvailable,
    isUpdating,
    cacheStats,
    lastSync,
    applyUpdate,
    requestCacheStats,
    clearCache,
    registerSync,
    precacheUrls
  } = useServiceWorkerIntegration();
  
  // 🎯 Configurar tabs disponíveis
  const availableTabs = useMemo(() => TABS_CONFIG.map(tab => tab.id), []);
  const { handleTabChange } = useTabNavigation(activeTab, setActiveTab, availableTabs);
  
  // 🎯 Hook de notificações com integração de toasts
  const { sendNotification: sendAppointmentNotification } = useAppointmentNotifications(agendamentos, {
    enabled: true,
    advanceNoticeMinutes: [30, 5, 1]
  });

  // 🎯 Loading inicial
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // 🎯 Listener para notificações fallback (CustomEvent)
  useEffect(() => {
    const handleFallbackNotification = (e: CustomEvent) => {
      const { title, body, type = 'info', data } = e.detail || {};
      
      if (title && body) {
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        setToasts(prev => [...prev, {
          id: toastId,
          title,
          body,
          type: type as Toast['type'],
          data
        }]);
        
        // Auto-dismiss após 5 segundos
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toastId));
        }, 5000);
      }
    };
    
    window.addEventListener('lunara:notification', handleFallbackNotification as EventListener);
    return () => {
      window.removeEventListener('lunara:notification', handleFallbackNotification as EventListener);
    };
  }, []);

  // 🎯 Listener para navegação via agendamento (notificação click)
  useEffect(() => {
    const handleNavigateToAgendamento = (e: CustomEvent) => {
      const { agendamentoId } = e.detail || {};
      if (agendamentoId && activeTab !== 'agenda') {
        setActiveTab('agenda');
        // Pode destacar o agendamento na UI aqui
        console.log('🎯 Navegando para agendamento:', agendamentoId);
      }
    };
    
    window.addEventListener('lunara:navigate-to-agendamento', handleNavigateToAgendamento as EventListener);
    return () => {
      window.removeEventListener('lunara:navigate-to-agendamento', handleNavigateToAgendamento as EventListener);
    };
  }, [activeTab]);

  // 🎯 Registrar sync para operações pendentes quando voltar online
  useEffect(() => {
    if (isOnline && swReady) {
      // Verificar se há operações pendentes no storage
      const pendingOps = StorageService.getData('@lunara_pending_operations');
      if (pendingOps?.length > 0) {
        console.log(`🔄 ${pendingOps.length} operações pendentes para sincronizar`);
        registerSync('sync-agendamentos');
      }
    }
  }, [isOnline, swReady, registerSync]);

  // 🎯 Calcular direção da animação
  const calculateDirection = useCallback((from: Tab, to: Tab): number => {
    const fromIndex = availableTabs.indexOf(from);
    const toIndex = availableTabs.indexOf(to);
    if (fromIndex === -1 || toIndex === -1) return 0;
    return toIndex > fromIndex ? 1 : -1;
  }, [availableTabs]);

  const [animationDirection, setAnimationDirection] = useState(0);

  const handleTabChangeWithAnimation = useCallback((newTab: Tab) => {
    if (newTab === activeTab) return;
    setAnimationDirection(calculateDirection(activeTab, newTab));
    handleTabChange(newTab);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [activeTab, handleTabChange, calculateDirection, isMobileMenuOpen]);

  // 🎯 Renderizar tela com Suspense
  const renderScreen = useCallback(() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#006699] border-t-transparent"></div>
        </div>
      );
    }

    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando...</div>
        </div>
      }>
        {(() => {
          switch (activeTab) {
            case 'home': return <HomeScreen onNavigate={handleTabChangeWithAnimation} />;
            case 'clientes': return <ClientesScreen />;
            case 'terapias': return <TerapiasScreen />;
            case 'pacotes': return <PacotesScreen />;
            case 'agenda': return <AgendaScreen />;
            case 'financeiro': return <FinanceiroScreen onBack={() => handleTabChangeWithAnimation('home')} />;
            case 'configuracoes': return <ConfiguracoesScreen onBack={() => handleTabChangeWithAnimation('home')} />;
            case 'freelancer': return <FreelancerScreen onBack={() => handleTabChangeWithAnimation('home')} />;
            default: return <HomeScreen onNavigate={handleTabChangeWithAnimation} />;
          }
        })()}
      </Suspense>
    );
  }, [activeTab, isLoading, handleTabChangeWithAnimation]);

  // 🎯 Tabs para mobile
  const mobileTabs = useMemo(() => TABS_CONFIG.filter(tab => tab.showInMobile !== false), []);
  const desktopTabs = useMemo(() => TABS_CONFIG, []);

  // 🎯 Handler para dismiss de toast
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-black">
      
      {/* 🎯 Banner de Status de Conexão */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[1000] bg-amber-500 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff size={16} />
          <span>Você está offline</span>
          {process.env.NODE_ENV === 'development' && connectionType !== 'unknown' && (
            <span className="text-xs opacity-75 ml-2">({connectionType})</span>
          )}
        </div>
      )}
      
      {/* 🎯 Indicador de Sync em background (apenas dev) */}
      {process.env.NODE_ENV === 'development' && lastSync && (
        <div className="fixed top-0 left-0 z-[999] bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-br-lg">
          ✓ Sync: {new Date(lastSync).toLocaleTimeString()}
        </div>
      )}

      {/* 🎯 Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800">
        <div className="p-6 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="/icone.png" 
              alt="Lunara Agenda" 
              className="w-8 h-8 mr-3 object-contain" 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23006699"><circle cx="12" cy="12" r="10"/></svg>';
              }}
            />
            <h1 className="text-xl font-bold text-[#006699] tracking-tight">
              Lunara Agenda
            </h1>
          </div>
          
          {/* 🎯 Indicador de atualização disponível (desktop) */}
          {updateAvailable && (
            <button
              onClick={applyUpdate}
              disabled={isUpdating}
              className="p-2 bg-[#006699] text-white rounded-full hover:bg-[#005280] transition-colors disabled:opacity-50 animate-pulse"
              title="Nova versão disponível - clique para atualizar"
            >
              <RefreshCw size={16} className={isUpdating ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          {desktopTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChangeWithAnimation(tab.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#006699]/10 text-[#006699] border-r-4 border-[#006699] font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800">
          <div className="text-xs text-gray-400 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="mt-1 text-[10px]">
              v3.0 {swReady ? '✓ SW' : '⏳ SW'}
            </div>
            {/* 🎯 Stats do cache (apenas dev) */}
            {process.env.NODE_ENV === 'development' && cacheStats && (
              <details className="mt-2 text-[9px] text-left">
                <summary className="cursor-pointer hover:text-gray-600">Cache: {Object.values(cacheStats).reduce((acc, s) => acc + s.count, 0)} itens</summary>
                <div className="mt-1 space-y-0.5">
                  {Object.entries(cacheStats).map(([name, stats]) => (
                    <div key={name} className="flex justify-between">
                      <span>{name.split('-').pop()}:</span>
                      <span>{stats.count} • {(stats.size / 1024).toFixed(1)}KB</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </aside>

      {/* 🎯 Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-black relative">
        
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 pt-12 pb-4 px-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/icone.png" alt="Lunara Agenda" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
              <h1 className="text-xl font-bold text-[#006699] tracking-tight">Lunara Agenda</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* 🎯 Indicador de atualização (mobile) */}
              {updateAvailable && (
                <button
                  onClick={applyUpdate}
                  disabled={isUpdating}
                  className="p-2 bg-[#006699] text-white rounded-full hover:bg-[#005280] transition-colors disabled:opacity-50 animate-pulse"
                  title="Atualizar app"
                >
                  <RefreshCw size={18} className={isUpdating ? 'animate-spin' : ''} />
                </button>
              )}
              
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 pb-4 border-t border-gray-100 dark:border-zinc-800 overflow-hidden"
              >
                <nav className="flex flex-col gap-1">
                  {desktopTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChangeWithAnimation(tab.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          isActive 
                            ? 'bg-[#006699]/10 text-[#006699] font-medium' 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-0 relative">
          <div className="max-w-5xl mx-auto w-full h-full p-4 md:p-6">
            <ErrorBoundary fallback={
              <div className="text-center py-12">
                <p className="text-red-500">Erro ao carregar esta tela.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-[#006699] text-white rounded-lg"
                >
                  Tentar novamente
                </button>
              </div>
            }>
              <AnimatePresence mode="wait" custom={animationDirection}>
                <motion.div
                  key={activeTab}
                  custom={animationDirection}
                  initial={
                    shouldReduceMotion 
                      ? { opacity: 0 }
                      : { 
                          x: animationDirection > 0 ? '100%' : animationDirection < 0 ? '-100%' : 0,
                          opacity: 0,
                          scale: 0.98
                        }
                  }
                  animate={{ 
                    x: 0, 
                    opacity: 1,
                    scale: 1,
                    transition: shouldReduceMotion 
                      ? { duration: 0 }
                      : { type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }
                  }}
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : {
                          x: animationDirection > 0 ? '-50%' : animationDirection < 0 ? '50%' : 0,
                          opacity: 0,
                          scale: 0.98,
                          transition: { duration: 0.15 }
                        }
                  }
                  className="h-full w-full"
                >
                  {renderScreen()}
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </div>
        </div>

        {/* 🎯 Bottom Navigation Mobile */}
        <nav 
          className="md:hidden fixed bottom-0 left-0 right-0 flex flex-row items-center justify-around 
                     bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-zinc-800 
                     pb-safe pt-2 px-2 h-20 overflow-x-auto no-scrollbar z-50"
          role="navigation"
          aria-label="Navegação principal"
        >
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChangeWithAnimation(tab.id)}
                className={`flex flex-col items-center justify-center min-w-[60px] h-full gap-1 
                           transition-all duration-200 py-1 px-2 rounded-xl ${
                  isActive 
                    ? 'text-[#006699] bg-[#006699]/5' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                  
                  {/* 🎯 Indicador de notificação na Agenda */}
                  {tab.id === 'agenda' && agendamentos?.some(a => 
                    a.statusAtendimento === 'Agendado' && 
                    new Date(`${a.data}T${a.hora}`).getTime() - Date.now() < 30 * 60 * 1000
                  ) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
                  )}
                  
                  {/* 🎯 Indicador de atualização disponível */}
                  {updateAvailable && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#006699] rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#006699]' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </main>

      {/* 🎯 Toast System para notificações fallback */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {/* 🎯 Modal de Atualização */}
      <UpdatePrompt 
        visible={updateAvailable} 
        onApply={applyUpdate} 
        onDismiss={() => {}} 
        isUpdating={isUpdating} 
      />

      {/* 🎯 Global Event Listeners */}
      <GlobalEventListeners />
    </div>
  );
}

// ======================
// COMPONENT: GlobalEventListeners
// ======================

const GlobalEventListeners: React.FC = () => {
  useEffect(() => {
    const handleUpdateAvailable = (e: CustomEvent) => {
      console.log('🔄 Update disponível:', e.detail);
    };

    const handleNotification = (e: CustomEvent) => {
      const { title, body } = e.detail || {};
      if (title && body) {
        console.log('🔔 Notificação global:', title, body);
      }
    };

    window.addEventListener('lunara:update-available', handleUpdateAvailable as EventListener);
    window.addEventListener('lunara:notification', handleNotification as EventListener);

    return () => {
      window.removeEventListener('lunara:update-available', handleUpdateAvailable as EventListener);
      window.removeEventListener('lunara:notification', handleNotification as EventListener);
    };
  }, []);

  return null;
};

// ======================
// COMPONENT: App (Root)
// ======================

export default function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AppProvider>
  );
}