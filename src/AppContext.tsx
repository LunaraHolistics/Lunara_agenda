import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Agendamento, Cliente, Terapia, Pacote, Bloqueio, ImportedContact } from './types';
import { mapFromSnakeCase, mapToSnakeCase } from './services/StorageService';

export interface CountryDDI {
  code: string;
  flag: string;
  name: string;
}

export const DDI_LIST: CountryDDI[] = [
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+1', flag: '🇺🇸', name: 'EUA' },
  { code: '+244', flag: '🇦🇴', name: 'Angola' },
  { code: '+258', flag: '🇲🇿', name: 'Moçambique' },
  { code: '+238', flag: '🇨🇻', name: 'Cabo Verde' },
  { code: '+245', flag: '🇬🇼', name: 'Guiné-Bissau' },
  { code: '+239', flag: '🇸🇹', name: 'São Tomé e Príncipe' },
  { code: '+670', flag: '🇹🇱', name: 'Timor-Leste' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguai' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguai' },
];

interface AppContextType {
  handleImportContacts: () => Promise<ImportedContact[] | null>;
  ddiList: CountryDDI[];
  completeAppointment: (agendamentoId: string) => Promise<void>;
  session: any;
  loading: boolean;
  statusMsg: string | null;
  setStatusMsg: (msg: string | null) => void;
  clientes: Cliente[];
  agendamentos: Agendamento[];
  terapias: Terapia[];
  pacotes: Pacote[];
  bloqueios: Bloqueio[];
  fetchData: () => Promise<void>;
  addCliente: (cliente: Omit<Cliente, 'id'>) => Promise<void>;
  updateCliente: (cliente: Cliente) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
  addAgendamento: (agendamento: Omit<Agendamento, 'id'>) => Promise<void>;
  updateAgendamento: (agendamento: Agendamento) => Promise<void>;
  deleteAgendamento: (id: string) => Promise<void>;
  addTerapia: (terapia: Omit<Terapia, 'id'>) => Promise<void>;
  updateTerapia: (terapia: Terapia) => Promise<void>;
  deleteTerapia: (id: string) => Promise<void>;
  addPacote: (pacote: Omit<Pacote, 'id'>) => Promise<void>;
  updatePacote: (pacote: Pacote) => Promise<void>;
  deletePacote: (id: string) => Promise<void>;
  addBloqueio: (bloqueio: Omit<Bloqueio, 'id'>) => Promise<void>;
  deleteBloqueio: (id: string) => Promise<void>;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  confirmAction: (message: string, onConfirm: () => void, options?: { title?: string; confirmText?: string; cancelText?: string; isDanger?: boolean; onCancel?: () => void }) => void;
  promptAction: (message: string, defaultValue: string, onConfirm: (value: string) => void, options?: { title?: string; placeholder?: string }) => void;
  safeDate: (d: any) => Date;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const ddiList = DDI_LIST;
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [notifiedAppointments, setNotifiedAppointments] = useState<Set<string>>(new Set());

  // Data states
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [terapias, setTerapias] = useState<Terapia[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);

  // UI States
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void; title?: string; confirmText?: string; cancelText?: string; isDanger?: boolean; onCancel?: () => void } | null>(null);
  const [prompt, setPrompt] = useState<{ message: string; defaultValue: string; onConfirm: (value: string) => void; title?: string; placeholder?: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const confirmAction = (message: string, onConfirm: () => void, options: { title?: string; confirmText?: string; cancelText?: string; isDanger?: boolean; onCancel?: () => void } = {}) => {
    setConfirmation({ message, onConfirm, ...options });
  };

  const promptAction = (message: string, defaultValue: string, onConfirm: (value: string) => void, options: { title?: string; placeholder?: string } = {}) => {
    setPrompt({ message, defaultValue, onConfirm, ...options });
  };

  const safeDate = (d: any): Date => {
    if (!d) return new Date();
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        fetchData();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData();
      } else {
        // Clear data on logout
        setClientes([]);
        setAgendamentos([]);
        setTerapias([]);
        setPacotes([]);
        setBloqueios([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!session?.user && !(await supabase.auth.getSession()).data.session?.user) return;
    const user = session?.user || (await supabase.auth.getSession()).data.session?.user;
    if (!user) return;

    try {
      const [clis, agends, ters, pacs, blks] = await Promise.all([
        supabase.from('clientes').select('*').eq('user_id', user.id).order('name'),
        supabase.from('agendamentos').select('*').eq('user_id', user.id).order('date', { ascending: true }).order('time', { ascending: true }),
        supabase.from('terapias').select('*').eq('user_id', user.id).order('name'),
        supabase.from('pacotes').select('*').eq('user_id', user.id).order('month', { ascending: false }),
        supabase.from('bloqueios').select('*').eq('user_id', user.id).order('data'),
      ]);

      console.log("Carregando clientes...", clis.data);
      console.log("Carregando agendamentos...", agends.data);
      console.log("Carregando terapias...", ters.data);
      console.log("Carregando pacotes...", pacs.data);
      console.log("Carregando bloqueios...", blks.data);

      if (clis.error) console.error("Erro clientes:", clis.error);
      if (agends.error) console.error("Erro agendamentos:", agends.error);
      if (ters.error) console.error("Erro terapias:", ters.error);
      if (pacs.error) console.error("Erro pacotes:", pacs.error);
      if (blks.error) console.error("Erro bloqueios:", blks.error);

      if (clis.data) setClientes(silentRepair('clientes', clis.data.map(item => mapFromSnakeCase('clientes', item))));
      if (agends.data) setAgendamentos(silentRepair('agendamentos', agends.data.map(item => mapFromSnakeCase('agendamentos', item))));
      if (ters.data) setTerapias(silentRepair('terapias', ters.data.map(item => mapFromSnakeCase('terapias', item))));
      if (pacs.data) setPacotes(silentRepair('pacotes', pacs.data.map(item => mapFromSnakeCase('pacotes', item))));
      if (blks.data) setBloqueios(silentRepair('bloqueios', blks.data.map(item => mapFromSnakeCase('bloqueios', item))));
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  const silentRepair = (key: string, items: any[]): any[] => {
    let correctedCount = 0;
    const repaired = items.filter(item => {
      if (!item || !item.id || String(item.id) === "undefined" || String(item.id) === "null") {
        correctedCount++;
        return false;
      }
      return true;
    }).map(item => {
      const newItem = { ...item };
      let changed = false;

      // Normalize IDs
      if (typeof newItem.id !== 'string') {
        newItem.id = String(newItem.id);
        changed = true;
      }
      if (newItem.clienteId && typeof newItem.clienteId !== 'string') {
        newItem.clienteId = String(newItem.clienteId);
        changed = true;
      }
      if (newItem.client_id && typeof newItem.client_id !== 'string') {
        newItem.client_id = String(newItem.client_id);
        changed = true;
      }

      // Normalize Dates
      if (key === 'agendamentos' && newItem.date && newItem.date.includes('/')) {
        const parts = newItem.date.split('/');
        if (parts.length === 3) {
          const [d, m, y] = parts;
          newItem.date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          changed = true;
        }
      }

      if (changed) correctedCount++;
      return newItem;
    });

    if (correctedCount > 0) {
      console.log(`Sincronização: ${correctedCount} registros de data/nome/ID corrigidos para compatibilidade em ${key}.`);
    }
    return repaired;
  };

  // Real-time subscription
  useEffect(() => {
    if (!session?.user) return;

    const channels = ['clientes', 'agendamentos', 'terapias', 'pacotes', 'bloqueios'].map(table => {
      return supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          fetchData();
        })
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [session]);

  useEffect(() => {
    const checkPendingAppointments = async () => {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const pending = agendamentos.filter(ag => {
          const agDate = new Date(`${ag.date}T${ag.time}`);
          if (isNaN(agDate.getTime())) return false; // Ignore malformed dates

          const agDay = agDate.toISOString().split('T')[0];
          
          if (agDay === today && ag.statusAtendimento === 'Agendado') {
            const overdueTime = new Date(agDate.getTime() + 30 * 60000);
            return now > overdueTime && !notifiedAppointments.has(ag.id);
          }
          return false;
        });

        if (pending.length > 0) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("Atendimento Pendente", {
              body: `O atendimento de um cliente passou do horário e não foi finalizado.`,
              icon: "/favicon.png"
            });
          }

          setNotifiedAppointments(prev => {
            const next = new Set(prev);
            pending.forEach(ag => next.add(ag.id));
            return next;
          });
        }
      } catch (error) {
        console.error('Erro ao verificar agendamentos pendentes:', error);
      }
    };

    checkPendingAppointments();
    const interval = setInterval(checkPendingAppointments, 15 * 60000);
    return () => clearInterval(interval);
  }, [notifiedAppointments, agendamentos]);

  const handleImportContacts = async (): Promise<ImportedContact[] | null> => {
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: true };
        const contacts = await (navigator as any).contacts.select(props, opts);
        
        if (contacts && contacts.length > 0) {
          return contacts.map((c: any) => ({
            nome: c.name?.[0] || 'Sem Nome',
            telefone: c.tel?.[0] || '',
          }));
        }
        return null;
      } catch (err) {
        console.error('Erro ao selecionar contatos:', err);
      }
    }

    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (event: any) => {
          try {
            const text = event.target.result;
            const lines = text.split('\n');
            const imported = lines.slice(1)
              .map((line: string) => {
                const parts = line.split(',');
                if (parts.length < 2) return null;
                return { 
                  nome: parts[0]?.trim(), 
                  telefone: parts[1]?.trim() 
                };
              })
              .filter((c: any): c is ImportedContact => !!(c && c.nome && c.telefone));
            
            if (imported.length > 0) {
              resolve(imported);
            } else {
              showNotification("Nenhum contato válido encontrado no CSV.", "error");
              resolve(null);
            }
          } catch (err) {
            console.error('Erro ao processar CSV:', err);
            resolve(null);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  };

  const completeAppointment = async (agendamentoId: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ appointment_status: 'Realizado' })
        .eq('id', agendamentoId);
      
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao completar agendamento:', error);
    }
  };

  const addCliente = async (cliente: Omit<Cliente, 'id'>) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .insert([{ ...mapToSnakeCase('clientes', cliente), user_id: session.user.id }]);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
    }
  };

  const updateCliente = async (cliente: Cliente) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update(mapToSnakeCase('clientes', cliente))
        .eq('id', cliente.id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
    }
  };

  const deleteCliente = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
    }
  };

  const addAgendamento = async (agendamento: Omit<Agendamento, 'id'>) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .insert([{ ...mapToSnakeCase('agendamentos', agendamento), user_id: session.user.id }]);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar agendamento:', error);
    }
  };

  const updateAgendamento = async (agendamento: Agendamento) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update(mapToSnakeCase('agendamentos', agendamento))
        .eq('id', agendamento.id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
    }
  };

  const deleteAgendamento = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error);
    }
  };

  const addTerapia = async (terapia: Omit<Terapia, 'id'>) => {
    try {
      const { error } = await supabase
        .from('terapias')
        .insert([{ ...mapToSnakeCase('terapias', terapia), user_id: session.user.id }]);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar terapia:', error);
    }
  };

  const updateTerapia = async (terapia: Terapia) => {
    try {
      const { error } = await supabase
        .from('terapias')
        .update(mapToSnakeCase('terapias', terapia))
        .eq('id', terapia.id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar terapia:', error);
    }
  };

  const deleteTerapia = async (id: string) => {
    try {
      const { error } = await supabase
        .from('terapias')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao deletar terapia:', error);
    }
  };

  const addPacote = async (pacote: Omit<Pacote, 'id'>) => {
    try {
      const { error } = await supabase
        .from('pacotes')
        .insert([{ ...mapToSnakeCase('pacotes', pacote), user_id: session.user.id }]);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar pacote:', error);
    }
  };

  const updatePacote = async (pacote: Pacote) => {
    try {
      const { error } = await supabase
        .from('pacotes')
        .update(mapToSnakeCase('pacotes', pacote))
        .eq('id', pacote.id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar pacote:', error);
    }
  };

  const deletePacote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pacotes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao deletar pacote:', error);
    }
  };

  const addBloqueio = async (bloqueio: Omit<Bloqueio, 'id'>) => {
    try {
      const { error } = await supabase
        .from('bloqueios')
        .insert([{ ...mapToSnakeCase('bloqueios', bloqueio), user_id: session.user.id }]);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar bloqueio:', error);
    }
  };

  const deleteBloqueio = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bloqueios')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Erro ao deletar bloqueio:', error);
    }
  };

  return (
    <AppContext.Provider value={{ 
      handleImportContacts, 
      ddiList, 
      completeAppointment, 
      session, 
      loading,
      statusMsg,
      setStatusMsg,
      clientes,
      agendamentos,
      terapias,
      pacotes,
      bloqueios,
      fetchData,
      addCliente,
      updateCliente,
      deleteCliente,
      addAgendamento,
      updateAgendamento,
      deleteAgendamento,
      addTerapia,
      updateTerapia,
      deleteTerapia,
      addPacote,
      updatePacote,
      deletePacote,
      addBloqueio,
      deleteBloqueio,
      showNotification,
      confirmAction,
      promptAction,
      safeDate
    }}>
      {children}

      {/* Global Notifications (Toasts) */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-in slide-in-from-right-full duration-300 pointer-events-auto ${
              n.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              n.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <p className="text-sm font-medium">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Global Confirmation Modal */}
      {confirmation && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {confirmation.title || 'Confirmar Ação'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {confirmation.message}
              </p>
            </div>
            <div className="flex border-t border-gray-100 dark:border-gray-800">
              <button 
                onClick={() => {
                  if (confirmation.onCancel) confirmation.onCancel();
                  setConfirmation(null);
                }}
                className="flex-1 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                {confirmation.cancelText || 'Cancelar'}
              </button>
              <button 
                onClick={() => {
                  confirmation.onConfirm();
                  setConfirmation(null);
                }}
                className={`flex-1 py-4 text-sm font-bold border-l border-gray-100 dark:border-gray-800 hover:opacity-90 transition-colors ${
                  confirmation.isDanger ? 'text-red-600' : 'text-[var(--color-primary)]'
                }`}
              >
                {confirmation.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Prompt Modal */}
      {prompt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {prompt.title || 'Entrada de Dados'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {prompt.message}
              </p>
              <input 
                type="text"
                autoFocus
                defaultValue={prompt.defaultValue}
                placeholder={prompt.placeholder}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    prompt.onConfirm((e.target as HTMLInputElement).value);
                    setPrompt(null);
                  }
                }}
                id="global-prompt-input"
              />
            </div>
            <div className="flex border-t border-gray-100 dark:border-gray-800">
              <button 
                onClick={() => setPrompt(null)}
                className="flex-1 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const val = (document.getElementById('global-prompt-input') as HTMLInputElement)?.value;
                  prompt.onConfirm(val);
                  setPrompt(null);
                }}
                className="flex-1 py-4 text-sm font-bold border-l border-gray-100 dark:border-gray-800 text-[var(--color-primary)] hover:opacity-90 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
