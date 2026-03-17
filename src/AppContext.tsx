import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Agendamento, Cliente, Terapia, Pacote, Bloqueio, ImportedContact, Transacao } from './types';
import { StorageService, StorageKeys } from './services/StorageService';
import { INITIAL_CLIENTES, INITIAL_TERAPIAS, INITIAL_PACOTES, INITIAL_AGENDAMENTOS, INITIAL_TRANSACOES } from './initialData';

export interface CountryDDI {
  code: string;
  flag: string;
  name: string;
}
// ... (rest of the file)

export const DDI_LIST: CountryDDI[] = [
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+1', flag: '🇺🇸', name: 'EUA' },
  { code: '+244', flag: '🇦🇴', name: 'Angola' },
  { code: '+258', flag: '🇲🇿', name: 'Moçambique' },
  { code: '+238', flag: '🇨𝑽', name: 'Cabo Verde' },
  { code: '+245', flag: '🇬🇼', name: 'Guiné-Bissau' },
  { code: '+239', flag: '🇸🇹', name: 'São Tomé e Príncipe' },
  { code: '+670', flag: '🇹𝑳', name: 'Timor-Leste' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguai' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguai' },
];

interface AppContextType {
  clientes: Cliente[];
  agendamentos: Agendamento[];
  terapias: Terapia[];
  pacotes: Pacote[];
  bloqueios: Bloqueio[];
  transacoes: Transacao[];

  addCliente: (cliente: Omit<Cliente, 'id'>) => void;
  updateCliente: (cliente: Cliente) => void;
  deleteCliente: (id: string) => void;

  addAgendamento: (agendamento: Omit<Agendamento, 'id'>) => void;
  updateAgendamento: (agendamento: Agendamento) => void;
  deleteAgendamento: (id: string) => void;
  completeAppointment: (id: string) => void;

  addTerapia: (terapias: Omit<Terapia, 'id'>) => void;
  updateTerapia: (terapia: Terapia) => void;
  deleteTerapia: (id: string) => void;

  addPacote: (pacote: Omit<Pacote, 'id'>) => void;
  updatePacote: (pacote: Pacote) => void;
  deletePacote: (id: string) => void;

  addBloqueio: (bloqueio: Omit<Bloqueio, 'id'>) => void;
  deleteBloqueio: (id: string) => void;

  addTransacao: (transacao: Partial<Transacao>) => void;
  updateTransacao: (transacao: Transacao) => void;
  deleteTransacao: (id: string) => void;

  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  confirmAction: (message: string, onConfirm: () => void, options?: any) => void;
  promptAction: (message: string, defaultValue: string, onConfirm: (value: string) => void, options?: any) => void;
  handleImportContacts: () => Promise<ImportedContact[] | null>;
  exportarBackup: () => void;
  importarBackup: (data: any) => void;
  repairDatabase: () => void;
  safeDate: (d: any) => Date;
  ddiList: CountryDDI[];
  setAgendamentos: React.Dispatch<React.SetStateAction<Agendamento[]>>;
  setPacotes: React.Dispatch<React.SetStateAction<Pacote[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clientes, setClientes] = useState<Cliente[]>(() => StorageService.getData(StorageKeys.CLIENTES) || INITIAL_CLIENTES);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(() => StorageService.getData(StorageKeys.AGENDAMENTOS) || INITIAL_AGENDAMENTOS);
  const [terapias, setTerapias] = useState<Terapia[]>(() => StorageService.getData(StorageKeys.TERAPIAS) || INITIAL_TERAPIAS);
  const [pacotes, setPacotes] = useState<Pacote[]>(() => StorageService.getData(StorageKeys.PACOTES) || INITIAL_PACOTES);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>(() => StorageService.getData(StorageKeys.BLOQUEIOS) || []);
  const [transacoes, setTransacoes] = useState<Transacao[]>(() => StorageService.getData(StorageKeys.TRANSACOES) || INITIAL_TRANSACOES);

  useEffect(() => StorageService.saveData(StorageKeys.CLIENTES, clientes), [clientes]);
  useEffect(() => StorageService.saveData(StorageKeys.AGENDAMENTOS, agendamentos), [agendamentos]);
  useEffect(() => StorageService.saveData(StorageKeys.TERAPIAS, terapias), [terapias]);
  useEffect(() => StorageService.saveData(StorageKeys.PACOTES, pacotes), [pacotes]);
  useEffect(() => StorageService.saveData(StorageKeys.BLOQUEIOS, bloqueios), [bloqueios]);
  useEffect(() => StorageService.saveData(StorageKeys.TRANSACOES, transacoes), [transacoes]);

  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [prompt, setPrompt] = useState<any>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const confirmAction = (message: string, onConfirm: () => void, options: any = {}) => {
    setConfirmation({ message, onConfirm, ...options });
  };

  const promptAction = (message: string, defaultValue: string, onConfirm: (value: string) => void, options: any = {}) => {
    setPrompt({ message, defaultValue, onConfirm, ...options });
  };

  const addCliente = (data: Omit<Cliente, 'id'>) => {
    const novo = { ...data, id: crypto.randomUUID() } as Cliente;
    setClientes(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    showNotification("Cliente salvo!", "success");
  };

  const updateCliente = (data: Cliente) => {
    setClientes(prev => prev.map(c => c.id === data.id ? data : c).sort((a, b) => a.nome.localeCompare(b.nome)));
    showNotification("Cliente atualizado!", "success");
  };

  const deleteCliente = (id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    showNotification("Cliente removido", "info");
  };

  const addAgendamento = (data: Omit<Agendamento, 'id'>) => {
    const novo = { ...data, id: crypto.randomUUID() } as Agendamento;
    setAgendamentos(prev => [...prev, novo].sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)));
    showNotification("Agendado!", "success");
  };

  const updateAgendamento = (data: Agendamento) => {
    setAgendamentos(prev => prev.map(a => a.id === data.id ? data : a).sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)));
    showNotification("Agendamento atualizado!", "success");
  };

  const deleteAgendamento = (id: string) => {
    setAgendamentos(prev => prev.filter(a => a.id !== id));
    showNotification("Agendamento removido", "info");
  };

  const completeAppointment = (id: string) => {
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, statusAtendimento: 'Realizado' } : a));
    showNotification("Atendimento concluído!", "success");
  };

  const addTerapia = (data: Omit<Terapia, 'id'>) => {
    const novo = { ...data, id: crypto.randomUUID() } as Terapia;
    setTerapias(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    showNotification("Terapia adicionada!", "success");
  };

  const updateTerapia = (data: Terapia) => {
    setTerapias(prev => prev.map(t => t.id === data.id ? data : t).sort((a, b) => a.nome.localeCompare(b.nome)));
    showNotification("Terapia atualizada!", "success");
  };

  const deleteTerapia = (id: string) => {
    setTerapias(prev => prev.filter(t => t.id !== id));
    showNotification("Terapia removida", "info");
  };

  const addPacote = (data: Omit<Pacote, 'id'>) => {
    const novo = { ...data, id: crypto.randomUUID() } as Pacote;
    setPacotes(prev => [...prev, novo].sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia)));
    showNotification("Pacote criado!", "success");
  };

  const updatePacote = (data: Pacote) => {
    setPacotes(prev => prev.map(p => p.id === data.id ? data : p));
    showNotification("Pacote atualizado!", "success");
  };

  const deletePacote = (id: string) => {
    setPacotes(prev => prev.filter(p => p.id !== id));
    setAgendamentos(prev => prev.filter(a => a.pacoteId !== id));
    showNotification("Pacote e agendamentos removidos!", "info");
  };

  const addBloqueio = (data: Omit<Bloqueio, 'id'>) => {
    const novo = { ...data, id: crypto.randomUUID() } as Bloqueio;
    setBloqueios(prev => [...prev, novo]);
    showNotification("Horário bloqueado", "success");
  };

  const deleteBloqueio = (id: string) => {
    setBloqueios(prev => prev.filter(b => b.id !== id));
  };

  const addTransacao = (data: Partial<Transacao>) => {
    const novo = {
      id: crypto.randomUUID(),
      descricao: data.descricao || 'Nova Transação',
      valor: data.valor || 0,
      tipo: data.tipo || 'Receita',
      data: data.data || new Date().toISOString().split('T')[0],
      status: data.status || 'Pago'
    } as Transacao;
    setTransacoes(prev => [novo, ...prev]);
    showNotification("Transação registrada!", "success");
  };

  const updateTransacao = (data: Transacao) => {
    setTransacoes(prev => prev.map(t => t.id === data.id ? data : t));
  };

  const deleteTransacao = (id: string) => {
    setTransacoes(prev => prev.filter(t => t.id !== id));
  };

  const exportarBackup = () => {
    const data = { clientes, agendamentos, terapias, pacotes, bloqueios, transacoes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunara_v3_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Backup exportado!", "success");
  };

  const importarBackup = (json: any) => {
    try {
      if (json.clientes) setClientes(json.clientes);
      if (json.agendamentos) setAgendamentos(json.agendamentos);
      if (json.terapias) setTerapias(json.terapias);
      if (json.pacotes) setPacotes(json.pacotes);
      if (json.bloqueios) setBloqueios(json.bloqueios);
      if (json.transacoes) setTransacoes(json.transacoes);
      showNotification("Dados restaurados!", "success");
    } catch (e) {
      showNotification("Erro na importação", "error");
    }
  };

  const repairDatabase = () => {
    const validAgendamentos = agendamentos.filter(a => 
      clientes.some(c => c.id === a.clienteId) && 
      terapias.some(t => t.id === a.terapiaId)
    );
    setAgendamentos(validAgendamentos);
    
    const validPacotes = pacotes.filter(p => clientes.some(c => c.id === p.clienteId));
    setPacotes(validPacotes);
    
    showNotification("Banco de dados reparado!", "success");
  };

  const handleImportContacts = async (): Promise<ImportedContact[] | null> => {
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
        if (contacts?.length) {
          return contacts.map((c: any) => ({
            nome: c.name?.[0] || 'Sem Nome',
            telefone: c.tel?.[0] || '',
          }));
        }
      } catch (err) { console.error(err); }
    }
    return null;
  };

  const safeDate = (d: any): Date => {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  return (
    <AppContext.Provider value={{
      clientes, agendamentos, terapias, pacotes, bloqueios, transacoes,
      addCliente, updateCliente, deleteCliente,
      addAgendamento, updateAgendamento, deleteAgendamento, completeAppointment,
      addTerapia, updateTerapia, deleteTerapia,
      addPacote, updatePacote, deletePacote,
      addBloqueio, deleteBloqueio,
      addTransacao, updateTransacao, deleteTransacao,
      showNotification, confirmAction, promptAction,
      handleImportContacts, exportarBackup, importarBackup, repairDatabase,
      safeDate, ddiList: DDI_LIST,
      setAgendamentos, setPacotes
    }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-in slide-in-from-right-full duration-300 pointer-events-auto ${
            n.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            n.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <p className="text-sm font-medium">{n.message}</p>
          </div>
        ))}
      </div>
      {confirmation && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-2">{confirmation.title || 'Confirmar'}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{confirmation.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmation(null)} className="flex-1 py-3 text-sm font-medium text-gray-500">Cancelar</button>
              <button onClick={() => { confirmation.onConfirm(); setConfirmation(null); }} className={`flex-1 py-3 text-sm font-bold rounded-xl ${confirmation.isDanger ? 'bg-red-600 text-white' : 'bg-[var(--color-primary)] text-white'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {prompt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-2">{prompt.title || 'Entrada'}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{prompt.message}</p>
            <input 
              type="text" 
              autoFocus 
              defaultValue={prompt.defaultValue} 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border rounded-xl mb-6 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              id="global-prompt-input"
            />
            <div className="flex gap-3">
              <button onClick={() => setPrompt(null)} className="flex-1 py-3 text-sm font-medium text-gray-500">Cancelar</button>
              <button onClick={() => { prompt.onConfirm((document.getElementById('global-prompt-input') as HTMLInputElement).value); setPrompt(null); }} className="flex-1 py-3 text-sm font-bold bg-[var(--color-primary)] text-white rounded-xl">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
