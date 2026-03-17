import React, { useState, useEffect } from 'react';
import { Home, Users, Activity, Package, Calendar, Wallet, BarChart2, Settings, LogOut } from 'lucide-react';
import HomeScreen from './screens/HomeScreen';
import ClientesScreen from './screens/ClientesScreen';
import TerapiasScreen from './screens/TerapiasScreen';
import PacotesScreen from './screens/PacotesScreen';
import AgendaScreen from './screens/AgendaScreen';
import FinanceiroScreen from './screens/FinanceiroScreen';
import RelatoriosScreen from './screens/RelatoriosScreen';
import ConferenciaScreen from './screens/ConferenciaScreen';
import ConfiguracoesScreen from './screens/ConfiguracoesScreen';
import Login from './screens/Login';
import { AppProvider, useAppContext } from './AppContext';

type Tab = 'home' | 'clientes' | 'terapias' | 'pacotes' | 'agenda' | 'financeiro' | 'relatorios' | 'configuracoes';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen />;
      case 'clientes': return <ClientesScreen />;
      case 'terapias': return <TerapiasScreen />;
      case 'pacotes': return <PacotesScreen />;
      case 'agenda': return <AgendaScreen />;
      case 'financeiro': return <FinanceiroScreen onBack={() => setActiveTab('home')} />;
      case 'relatorios': return <RelatoriosScreen onBack={() => setActiveTab('home')} />;
      case 'configuracoes': return <ConfiguracoesScreen onBack={() => setActiveTab('home')} />;
      default: return <HomeScreen />;
    }
  };

  const tabs = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'terapias', label: 'Terapias', icon: Activity },
    { id: 'pacotes', label: 'Pacotes', icon: Package },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'financeiro', label: 'Finanças', icon: Wallet },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart2 },
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
                onClick={() => setActiveTab(tab.id)}
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
        <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="max-w-5xl mx-auto w-full">
            {renderScreen()}
          </div>
        </div>

        {/* Bottom Navigation Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 flex flex-row items-center justify-around bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 pb-6 pt-2 px-1 h-20 overflow-x-auto no-scrollbar z-50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

