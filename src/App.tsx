import React, { useState, useEffect, useRef } from 'react';
import { Home, Users, Activity, Package, Calendar, Wallet, BarChart2, Settings, LogOut, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HomeScreen from './screens/HomeScreen';
import ClientesScreen from './screens/ClientesScreen';
import TerapiasScreen from './screens/TerapiasScreen';
import PacotesScreen from './screens/PacotesScreen';
import AgendaScreen from './screens/AgendaScreen';
import FinanceiroScreen from './screens/FinanceiroScreen';
import ConfiguracoesScreen from './screens/ConfiguracoesScreen';
import FreelancerScreen from './screens/FreelancerScreen';
import Login from './screens/Login';
import { AppProvider, useAppContext } from './AppContext';

type Tab = 'home' | 'clientes' | 'terapias' | 'pacotes' | 'agenda' | 'financeiro' | 'configuracoes' | 'freelancer';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [direction, setDirection] = useState(0);

  const { agendamentos, clientes, terapias } = useAppContext();

  const handleTabChange = (newTab: Tab) => {
    if (newTab === activeTab) return;
    
    // Lógica de direção para o slide
    // Se for para freelancer vindo da home, slide para a direita (direção positiva)
    // Se for voltando da freelancer para home, slide para a esquerda (direção negativa)
    if (activeTab === 'home' && newTab === 'freelancer') {
      setDirection(-1); // Freelancer vem da esquerda
    } else if (activeTab === 'freelancer' && newTab === 'home') {
      setDirection(1); // Home vem da direita
    } else {
      setDirection(0); // Sem animação de slide específica para outros
    }
    
    setActiveTab(newTab);
  };

  const notifiedRef = useRef<Set<string>>(new Set());

  const sendNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icone.png'
      });
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Permissão de notificação:', permission);
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service Worker registrado', reg))
        .catch(err => console.error('Erro ao registrar SW', err));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      (agendamentos || []).forEach(a => {
        if (
          a.statusAtendimento === 'Agendado' &&
          a.data &&
          a.hora
        ) {
          try {
            const [year, month, day] = a.data.split('-').map(Number);
            const [hours, minutes] = a.hora.split(':').map(Number);
            const agendamentoDate = new Date(year, month - 1, day, hours, minutes);
            const diff = (agendamentoDate.getTime() - now.getTime()) / 60000;

            const key = `${a.id}-${a.data}-${a.hora}`;

            // Notificar 30 minutos antes
            if (diff > 0 && diff <= 30 && !notifiedRef.current.has(key)) {
              sendNotification(
                'Atendimento próximo',
                `Você tem um atendimento às ${a.hora}`
              );
              notifiedRef.current.add(key);
            }
          } catch (e) {
            console.error('Erro ao processar data do agendamento', e);
          }
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [agendamentos]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen onNavigate={(tab: any) => handleTabChange(tab)} />;
      case 'clientes': return <ClientesScreen />;
      case 'terapias': return <TerapiasScreen />;
      case 'pacotes': return <PacotesScreen />;
      case 'agenda': return <AgendaScreen />;
      case 'financeiro': return <FinanceiroScreen onBack={() => handleTabChange('home')} />;
      case 'configuracoes': return <ConfiguracoesScreen onBack={() => handleTabChange('home')} />;
      case 'freelancer': return <FreelancerScreen onBack={() => handleTabChange('home')} />;
      default: return <HomeScreen onNavigate={(tab: any) => handleTabChange(tab)} />;
    }
  };

  const tabs = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'terapias', label: 'Terapias', icon: Activity },
    { id: 'pacotes', label: 'Pacotes', icon: Package },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'financeiro', label: 'Finanças', icon: Wallet },
    { id: 'freelancer', label: 'Freelancer', icon: Briefcase },
    { id: 'configuracoes', label: 'Config', icon: Settings },
  ] as const;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-black">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800">
        <div className="p-6 border-b border-gray-200 dark:border-zinc-800 flex items-center">
          <img src="/icone.png" alt="Lunara Agenda Icon" className="w-8 h-8 mr-3 object-contain" referrerPolicy="no-referrer" />
          <h1 className="text-xl font-bold text-[#006699] tracking-tight">
            Lunara Agenda
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                  isActive 
                    ? 'bg-[#006699]/10 text-[#006699] border-r-4 border-[#006699]' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
          <div className="mt-auto p-4 border-t border-gray-200 dark:border-zinc-800">
            <div className="px-2 py-3 text-gray-400 text-xs text-center italic">
              Lunara Agenda v3 - Local First
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-black relative">
        {/* Mobile Header */}
        <div className="md:hidden pt-12 pb-4 px-6 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center">
          <img src="/icone.png" alt="Lunara Agenda Icon" className="w-8 h-8 mr-3 object-contain" referrerPolicy="no-referrer" />
          <h1 className="text-2xl font-bold text-[#006699] tracking-tight">
            Lunara Agenda
          </h1>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-0 relative">
          <div className="max-w-5xl mx-auto w-full h-full">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeTab}
                custom={direction}
                initial={direction !== 0 ? { x: direction > 0 ? '100%' : '-100%', opacity: 0 } : { opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={direction !== 0 ? { x: direction > 0 ? '-100%' : '100%', opacity: 0 } : { opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="h-full w-full"
              >
                {renderScreen()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Navigation Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 flex flex-row items-center justify-around bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 pb-6 pt-2 px-1 h-20 overflow-x-auto no-scrollbar z-50">
          {tabs.filter(t => t.id !== 'freelancer').map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="flex flex-col items-center justify-center min-w-[50px] h-full gap-1 transition-colors shrink-0"
                aria-label={tab.label}
              >
                <Icon 
                  size={20} 
                  color={isActive ? '#006699' : '#9ca3af'} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span 
                  className={`text-[9px] font-medium ${isActive ? 'text-[#006699]' : 'text-gray-400'}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

