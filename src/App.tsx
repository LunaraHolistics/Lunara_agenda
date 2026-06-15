import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { Home, Users, Activity, Package, Calendar, Wallet, Settings, Briefcase, Menu, X, RefreshCw, CheckCircle, WifiOff } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

// Lazy loading
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const ClientesScreen = lazy(() => import('./screens/ClientesScreen'));
const TerapiasScreen = lazy(() => import('./screens/TerapiasScreen'));
const PacotesScreen = lazy(() => import('./screens/PacotesScreen'));
const AgendaScreen = lazy(() => import('./screens/AgendaScreen'));
const FinanceiroScreen = lazy(() => import('./screens/FinanceiroScreen'));
const ConfiguracoesScreen = lazy(() => import('./screens/ConfiguracoesScreen'));
const FreelancerScreen = lazy(() => import('./screens/FreelancerScreen'));

import { AppProvider, useAppContext } from './AppContext';
import { Agendamento } from './types';

export type Tab = 'home' | 'clientes' | 'terapias' | 'pacotes' | 'agenda' | 'financeiro' | 'configuracoes' | 'freelancer';

export const TABS_CONFIG = [
  { id: 'home' as Tab, label: 'Início', icon: Home, showInMobile: true },
  { id: 'agenda' as Tab, label: 'Agenda', icon: Calendar, showInMobile: true },
  { id: 'clientes' as Tab, label: 'Clientes', icon: Users, showInMobile: true },
  { id: 'pacotes' as Tab, label: 'Pacotes', icon: Package, showInMobile: false },
  { id: 'terapias' as Tab, label: 'Terapias', icon: Activity, showInMobile: false },
  { id: 'financeiro' as Tab, label: 'Finanças', icon: Wallet, showInMobile: true },
  { id: 'freelancer' as Tab, label: 'Freelancer', icon: Briefcase, showInMobile: false },
  { id: 'configuracoes' as Tab, label: 'Config', icon: Settings, showInMobile: false },
];

// ======================
// HOOK: useServiceWorker
// ======================

export const useServiceWorker = () => {
  const [swReady, setSwReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
          updateViaCache: 'none'
        });
        
        registrationRef.current = registration;
        setSwReady(true);

        if (registration.waiting) {
          setUpdateAvailable(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });

        const updateInterval = setInterval(async () => {
          await registration.update();
        }, 30 * 60 * 1000);

        return () => clearInterval(updateInterval);
      } catch (error) {
        console.error('Erro ao registrar Service Worker:', error);
      }
    };

    registerSW();
  }, []);

  const applyUpdate = useCallback(() => {
    if (!registrationRef.current?.waiting) {
      window.location.reload();
      return;
    }
    
    setIsUpdating(true);
    registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

  return { swReady, updateAvailable, isUpdating, applyUpdate };
};

// ======================
// HOOK: useOnlineStatus
// ======================

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// ======================
// HOOK: useAppointmentNotifications
// ======================

export const useAppointmentNotifications = (
  agendamentos: Agendamento[],
  options: { enabled?: boolean; advanceNoticeMinutes?: number[] } = {}
) => {
  const { enabled = true, advanceNoticeMinutes = [30, 5, 1] } = options;
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !agendamentos?.length) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const checkAppointments = () => {
      const now = Date.now();

      agendamentos
        .filter(a => a.statusAtendimento === 'Agendado' && a.data && a.hora)
        .forEach(agendamento => {
          try {
            const [year, month, day] = agendamento.data.split('-').map(Number);
            const [hours, minutes] = agendamento.hora.split(':').map(Number);
            
            if (!year || !month || !day) return;

            const agendamentoDate = new Date(year, month - 1, day, hours, minutes);
            const diffMinutes = (agendamentoDate.getTime() - now) / 60000;

            if (diffMinutes < -5 || diffMinutes > 120) return;

            const key = `${agendamento.id}_${agendamento.data}_${agendamento.hora}`;

            const shouldNotify = advanceNoticeMinutes.some(min => 
              diffMinutes > 0 && diffMinutes <= min && !notifiedRef.current.has(key)
            );

            if (shouldNotify) {
              new Notification('⏰ Atendimento em breve', {
                body: `Atendimento às ${agendamento.hora}`,
                icon: '/icone.png',
                tag: `lunara-${agendamento.id}`
              });
              notifiedRef.current.add(key);
            }

            if (diffMinutes < -10) {
              notifiedRef.current.delete(key);
            }
          } catch (error) {
            console.error('Erro ao processar agendamento:', error);
          }
        });
    };

    checkAppointments();
    const intervalId = setInterval(checkAppointments, 60000);
    
    return () => clearInterval(intervalId);
  }, [agendamentos, enabled, advanceNoticeMinutes]);

  return {};
};

// ======================
// COMPONENT: UpdatePrompt
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
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] shadow-2xl p-6 border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <RefreshCw size={24} className="text-blue-600 dark:text-blue-400" />
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
            disabled={isUpdating}
            className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Depois
          </button>
          <button
            onClick={onApply}
            disabled={isUpdating}
            className="flex-1 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
};

// ======================
// COMPONENT: Toast System
// ======================

interface Toast {
  id: string;
  title: string;
  body: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
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
              className="p-1 hover:bg-black/5 rounded-lg"
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
    console.error('Erro capturado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold mb-2">Algo deu errado</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [userDismissedUpdate, setUserDismissedUpdate] = useState(false);
  
  const { agendamentos } = useAppContext();
  const isOnline = useOnlineStatus();
  const shouldReduceMotion = useReducedMotion();
  const { swReady, updateAvailable, isUpdating, applyUpdate } = useServiceWorker();
  
  useEffect(() => {
    if (updateAvailable && !userDismissedUpdate) {
      setShowUpdatePrompt(true);
    }
  }, [updateAvailable, userDismissedUpdate]);
  
  useAppointmentNotifications(agendamentos, {
    enabled: true,
    advanceNoticeMinutes: [30, 5, 1]
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleNotification = (e: CustomEvent) => {
      const { title, body, type = 'info' } = e.detail || {};
      if (title && body) {
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts(prev => [...prev, { id: toastId, title, body, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 5000);
      }
    };
    
    window.addEventListener('lunara:notification', handleNotification as EventListener);
    return () => window.removeEventListener('lunara:notification', handleNotification as EventListener);
  }, []);

  const availableTabs = useMemo(() => TABS_CONFIG.map(tab => tab.id), []);
  const mobileTabs = useMemo(() => TABS_CONFIG.filter(tab => tab.showInMobile), []);
  const desktopTabs = useMemo(() => TABS_CONFIG, []);

  const handleTabChange = useCallback((newTab: Tab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [activeTab, isMobileMenuOpen]);

  const [animationDirection, setAnimationDirection] = useState(0);
  const calculateDirection = useCallback((from: Tab, to: Tab): number => {
    const fromIndex = availableTabs.indexOf(from);
    const toIndex = availableTabs.indexOf(to);
    if (fromIndex === -1 || toIndex === -1) return 0;
    return toIndex > fromIndex ? 1 : -1;
  }, [availableTabs]);

  const handleTabChangeWithAnimation = useCallback((newTab: Tab) => {
    if (newTab === activeTab) return;
    setAnimationDirection(calculateDirection(activeTab, newTab));
    handleTabChange(newTab);
  }, [activeTab, handleTabChange, calculateDirection]);

  const renderScreen = useCallback(() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
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

  const handleDismissUpdate = useCallback(() => {
    setShowUpdatePrompt(false);
    setUserDismissedUpdate(true);
  }, []);

  const handleApplyUpdate = useCallback(() => {
    applyUpdate();
  }, [applyUpdate]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const hasUpcomingAppointment = useMemo(() => {
    return agendamentos?.some(a => 
      a.statusAtendimento === 'Agendado' && 
      a.data && a.hora &&
      new Date(`${a.data}T${a.hora}`).getTime() - Date.now() < 30 * 60 * 1000
    );
  }, [agendamentos]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-black">
      
      {/* Banner de Offline */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[1000] bg-amber-500 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff size={16} />
          <span>Você está offline</span>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800">
        <div className="p-6 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="/icone.png" 
              alt="Lunara Agenda" 
              className="w-8 h-8 mr-3 object-contain" 
              referrerPolicy="no-referrer" 
            />
            <h1 className="text-xl font-bold text-blue-600 tracking-tight">
              Lunara Agenda
            </h1>
          </div>
          
          {updateAvailable && !userDismissedUpdate && (
            <button
              onClick={() => setShowUpdatePrompt(true)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors animate-pulse"
              title="Nova versão disponível"
              aria-label="Nova versão disponível"
            >
              <RefreshCw size={16} />
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
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-4 border-blue-600 font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
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
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-black relative">
        
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 pt-12 pb-4 px-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/icone.png" alt="Lunara Agenda" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
              <h1 className="text-xl font-bold text-blue-600 tracking-tight">Lunara Agenda</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {updateAvailable && !userDismissedUpdate && (
                <button
                  onClick={() => setShowUpdatePrompt(true)}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors animate-pulse"
                  title="Atualizar app"
                  aria-label="Nova versão disponível"
                >
                  <RefreshCw size={18} />
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
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-0 relative">
          <div className="max-w-5xl mx-auto w-full h-full p-4 md:p-6">
            <ErrorBoundary fallback={
              <div className="text-center py-12">
                <p className="text-red-500">Erro ao carregar esta tela.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
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

        {/* Bottom Navigation Mobile */}
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
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                  
                  {tab.id === 'agenda' && hasUpcomingAppointment && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      <UpdatePrompt 
        visible={showUpdatePrompt} 
        onApply={handleApplyUpdate} 
        onDismiss={handleDismissUpdate}
        isUpdating={isUpdating} 
      />
    </div>
  );
}

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