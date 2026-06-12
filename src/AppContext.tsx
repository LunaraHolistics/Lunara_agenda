import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Agendamento, Cliente, Terapia, Pacote, Bloqueio, ImportedContact, Transacao, Despesa } from './types';
import { StorageService, StorageKeys } from './services/StorageService';
import { INITIAL_CLIENTES, INITIAL_TERAPIAS, INITIAL_PACOTES, INITIAL_AGENDAMENTOS, INITIAL_TRANSACOES } from './initialData';

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
  { code: '+238', flag: '🇨𝑽', name: 'Cabo Verde' },
  { code: '+245', flag: '🇬🇼', name: 'Guiné-Bissau' },
  { code: '+239', flag: '🇸🇹', name: 'São Tomé e Príncipe' },
  { code: '+670', flag: '🇹👳', name: 'Timor-Leste' },
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
  despesas: Despesa[];

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

  addDespesa: (despesa: Omit<Despesa, 'id'>) => void;
  updateDespesa: (despesa: Despesa) => void;
  deleteDespesa: (id: string) => void;

  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  confirmAction: (message: string, onConfirm: () => void, options?: any) => void;
  promptAction: (message: string, defaultValue: string, onConfirm: (value: string) => void, options?: any) => void;
  handleImportContacts: () => Promise<ImportedContact[] | null>;
  exportarBackup: () => void;
  importarBackup: (data: any) => void;
  repairDatabase: () => void;
  resetSystem: () => void;
  safeDate: (d: any) => Date;
  ddiList: CountryDDI[];
  setAgendamentos: React.Dispatch<React.SetStateAction<Agendamento[]>>;
  setPacotes: React.Dispatch<React.SetStateAction<Pacote[]>>;
  renewPacote: (pacoteId: string) => void;
  canceladosRenovacao: string[];
  cancelarRenovacao: (clientId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const BLACKLISTED_ID = '1773410735962';
const filterBlacklist = <T extends { id: string }>(data: T[]): T[] => data.filter(item => item.id !== BLACKLISTED_ID);
const filterAgendamentos = (data: Agendamento[]) => data.filter(a => a.pacoteId !== BLACKLISTED_ID);

// 🎯 Hook personalizado para debounce de salvamento
const useDebouncedSave = (key: string, data: any, delay: number = 500) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      try {
        StorageService.saveData(key, data);
      } catch (error) {
        console.error(`Erro ao salvar ${key}:`, error);
      }
    }, delay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, data, delay]);
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 🎯 Estados principais com validação robusta na inicialização
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    try {
      const saved = StorageService.getData(StorageKeys.CLIENTES);
      if (Array.isArray(saved) && saved.length > 0) {
        return filterBlacklist(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
    return filterBlacklist(INITIAL_CLIENTES);
  });

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(() => {
    try {
      const saved = StorageService.getData(StorageKeys.AGENDAMENTOS);
      if (Array.isArray(saved)) {
        return filterAgendamentos(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    }
    return INITIAL_AGENDAMENTOS;
  });

  const [terapias, setTerapias] = useState<Terapia[]>(() => {
    try {
      const saved = StorageService.getData(StorageKeys.TERAPIAS);
      if (Array.isArray(saved) && saved.length > 0) {
        return filterBlacklist(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar terapias:', error);
    }
    return filterBlacklist(INITIAL_TERAPIAS);
  });

  const [pacotes, setPacotes] = useState<Pacote[]>(() => {
    try {
      const saved = StorageService.getData(StorageKeys.PACOTES);
      if (Array.isArray(saved)) {
        return filterBlacklist(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar pacotes:', error);
    }
    return INITIAL_PACOTES;
  });

  const [bloqueios, setBloqueios] = useState<Bloqueio[]>(() => {
    try {
      const saved = StorageService.getData(StorageKeys.BLOQUEIOS);
      if (Array.isArray(saved)) {
        return filterBlacklist(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar bloqueios:', error);
    }
    return [];
  });

  const [transacoes, setTransacoes] = useState<Transacao[]>(() => {
    try {
      const saved = StorageService.getData(StorageKeys.TRANSACOES);
      if (Array.isArray(saved)) {
        return filterBlacklist(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    }
    return INITIAL_TRANSACOES;
  });

  const [despesas, setDespesas] = useState<Despesa[]>(() => {
    try {
      const saved = StorageService.getData(StorageKeys.DESPESAS);
      if (Array.isArray(saved)) {
        return saved;
      }
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    }
    return [];
  });

  const [canceladosRenovacao, setCanceladosRenovacao] = useState<string[]>(() => {
    try {
      const saved = StorageService.getData('lunara_cancelados_renovacao');
      if (saved) {
        const parsed = Array.isArray(saved) ? saved : JSON.parse(saved as any);
        const currentMonth = new Date().toISOString().slice(0, 7);
        return parsed
          .filter((item: string) => typeof item === 'string' && item.startsWith(currentMonth))
          .map((item: string) => item.split(':')[1]);
      }
    } catch (error) {
      console.error('Erro ao carregar cancelados de renovação:', error);
    }
    return [];
  });

  // 🎯 Estados de UI
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [prompt, setPrompt] = useState<any>(null);

  // 🎯 Refs para evitar re-renders desnecessários
  const isInitializedRef = useRef(false);
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 🎯 Salvar dados com debounce usando hook personalizado
  useDebouncedSave(StorageKeys.CLIENTES, clientes);
  useDebouncedSave(StorageKeys.AGENDAMENTOS, agendamentos);
  useDebouncedSave(StorageKeys.TERAPIAS, terapias);
  useDebouncedSave(StorageKeys.PACOTES, pacotes);
  useDebouncedSave(StorageKeys.BLOQUEIOS, bloqueios);
  useDebouncedSave(StorageKeys.TRANSACOES, transacoes);
  useDebouncedSave(StorageKeys.DESPESAS, despesas);

  // 🎯 Cancelar renovação com validação robusta
  const cancelarRenovacao = useCallback((clientId: string) => {
    if (!clientId) {
      console.warn('cancelarRenovacao: clientId inválido');
      return;
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const newItem = `${currentMonth}:${clientId}`;
    
    try {
      const saved = StorageService.getData('lunara_cancelados_renovacao');
      let list: string[] = [];
      
      if (saved) {
        list = Array.isArray(saved) ? saved : JSON.parse(saved as any);
      }
      
      if (!list.includes(newItem)) {
        const newList = [...list, newItem];
        StorageService.saveData('lunara_cancelados_renovacao', newList);
        setCanceladosRenovacao(prev => {
          if (prev.includes(clientId)) return prev;
          return [...prev, clientId];
        });
        console.log(`Renovação cancelada para cliente ${clientId} em ${currentMonth}`);
      }
    } catch (error) {
      console.error('Erro ao cancelar renovação:', error);
    }
  }, []);

  // 🎯 Sincronização de agendamentos com transações (otimizado)
  const agendamentosSincronizados = useMemo(() => {
    if (!transacoes || transacoes.length === 0) return agendamentos;
    
    const transacoesPagasMap = new Map(
      transacoes
        .filter(t => t.status === 'Pago' && t.agendamentoId)
        .map(t => [t.agendamentoId, t])
    );

    return agendamentos.map(ag => {
      const transacao = transacoesPagasMap.get(ag.id);
      if (transacao && ag.statusPagamento !== 'Pago') {
        return { ...ag, statusPagamento: 'Pago' as const };
      }
      return ag;
    });
  }, [agendamentos, transacoes]);

  // 🎯 Sincronização de pacotes com transações (otimizado)
  const pacotesSincronizados = useMemo(() => {
    if (!transacoes || transacoes.length === 0) return pacotes;
    
    const transacoesPagasMap = new Map(
      transacoes
        .filter(t => t.status === 'Pago' && t.pacoteId)
        .map(t => [t.pacoteId, t])
    );

    return pacotes.map(p => {
      const transacao = transacoesPagasMap.get(p.id);
      if (transacao && p.statusPagamento !== 'Pago') {
        return { ...p, statusPagamento: 'Pago' as const };
      }
      return p;
    });
  }, [pacotes, transacoes]);

  // 🎯 Verificação de integridade do storage (apenas na primeira carga)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const checkStorageIntegrity = () => {
      try {
        const keys = [
          StorageKeys.CLIENTES,
          StorageKeys.TERAPIAS,
          StorageKeys.PACOTES,
          StorageKeys.AGENDAMENTOS,
          StorageKeys.TRANSACOES
        ];

        const hasAnyData = keys.some(key => {
          const data = StorageService.getData(key);
          return Array.isArray(data) && data.length > 0;
        });

        // Se NÃO há dados salvos E os arrays iniciais estão vazios, inicializar
        if (!hasAnyData && INITIAL_CLIENTES.length === 0 && INITIAL_TERAPIAS.length === 0) {
          console.log('Storage vazio detectado. Inicializando com dados padrão.');
          return true;
        }

        return false;
      } catch (error) {
        console.error('Erro ao verificar integridade do storage:', error);
        return true;
      }
    };

    if (checkStorageIntegrity()) {
      setClientes(INITIAL_CLIENTES);
      setTerapias(INITIAL_TERAPIAS);
      setPacotes(INITIAL_PACOTES);
      setAgendamentos(INITIAL_AGENDAMENTOS);
      setTransacoes(INITIAL_TRANSACOES);
      setBloqueios([]);
      setDespesas([]);
    }
  }, []);

  // 🎯 Limpeza de duplicados (otimizada e mais segura)
  useEffect(() => {
    if (agendamentos.length === 0 || pacotes.length === 0) return;

    const cleanDuplicates = () => {
      const toKeep: Agendamento[] = [];
      const uniqueScheduled = new Set<string>();
      const availableCounts = new Map<string, number>();
      let hasChanges = false;

      // Primeiro passo: processar agendamentos não-disponíveis (prioridade)
      agendamentos.forEach(ag => {
        if (ag.statusAtendimento !== 'Disponivel') {
          const key = `${ag.clienteId}-${ag.terapiaId}-${ag.pacoteId || 'no-pkg'}-${ag.itemPacoteId || 'no-item'}-${ag.statusAtendimento}-${ag.data}-${ag.hora}`;
          
          if (!uniqueScheduled.has(key)) {
            uniqueScheduled.add(key);
            toKeep.push(ag);
          } else {
            hasChanges = true;
            console.warn(`Agendamento duplicado removido:`, ag);
          }
        }
      });

      // Segundo passo: processar agendamentos disponíveis com limite por item
      agendamentos.forEach(ag => {
        if (ag.statusAtendimento === 'Disponivel' && ag.pacoteId && ag.itemPacoteId) {
          const key = `${ag.pacoteId}-${ag.itemPacoteId}`;
          const currentCount = availableCounts.get(key) || 0;
          const pacote = pacotes.find(p => p.id === ag.pacoteId);
          const item = pacote?.itens.find(i => i.id === ag.itemPacoteId);
          
          if (item && currentCount < item.quantidadeTotal) {
            availableCounts.set(key, currentCount + 1);
            toKeep.push(ag);
          } else {
            hasChanges = true;
            console.warn(`Sessão disponível excedente removida:`, ag);
          }
        }
      });

      if (hasChanges && toKeep.length !== agendamentos.length) {
        console.log(`Limpeza de duplicados: ${agendamentos.length} → ${toKeep.length} agendamentos`);
        setAgendamentos(toKeep);
      }
    };

    // Executar limpeza após um pequeno delay para evitar loops
    const timeoutId = setTimeout(cleanDuplicates, 100);
    return () => clearTimeout(timeoutId);
  }, [pacotes.length, agendamentos.length]); // Dependências mais específicas

  // 🎯 Funções de notificação e confirmação (com useCallback)
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const confirmAction = useCallback((message: string, onConfirm: () => void, options: any = {}) => {
    setConfirmation({ message, onConfirm, ...options });
  }, []);

  const promptAction = useCallback((message: string, defaultValue: string, onConfirm: (value: string) => void, options: any = {}) => {
    setPrompt({ message, defaultValue, onConfirm, ...options });
  }, []);

  // 🎯 CRUD de Clientes (otimizado)
  const addCliente = useCallback((data: Omit<Cliente, 'id'>) => {
    if (!data.nome || data.nome.trim() === '') {
      showNotification('Nome do cliente é obrigatório', 'error');
      return;
    }

    const novo: Cliente = { 
      ...data, 
      id: crypto.randomUUID(),
      nome: data.nome.trim()
    } as Cliente;
    
    setClientes(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    showNotification('Cliente salvo!', 'success');
  }, [showNotification]);

  const updateCliente = useCallback((data: Cliente) => {
    if (!data.id || !data.nome || data.nome.trim() === '') {
      showNotification('Dados inválidos', 'error');
      return;
    }

    setClientes(prev => 
      prev.map(c => c.id === data.id ? { ...data, nome: data.nome.trim() } : c)
        .sort((a, b) => a.nome.localeCompare(b.nome))
    );
    showNotification('Cliente atualizado!', 'success');
  }, [showNotification]);

  const deleteCliente = useCallback((id: string) => {
    if (!id) return;

    setClientes(prev => prev.filter(c => c.id !== id));
    showNotification('Cliente removido', 'info');
  }, [showNotification]);

  // 🎯 CRUD de Agendamentos (corrigido e otimizado)
  const addAgendamento = useCallback((data: Omit<Agendamento, 'id'>) => {
    setAgendamentos(prev => {
      // Verificação de duplicatas aprimorada
      const isDuplicate = prev.some(a => 
        a.clienteId === data.clienteId &&
        a.terapiaId === data.terapiaId &&
        a.pacoteId === data.pacoteId &&
        a.itemPacoteId === data.itemPacoteId &&
        a.data === data.data &&
        a.hora === data.hora &&
        a.statusAtendimento === data.statusAtendimento &&
        data.statusAtendimento !== 'Disponivel'
      );

      if (isDuplicate) {
        console.warn('Tentativa de criar agendamento duplicado bloqueada.');
        showNotification('Já existe um agendamento idêntico neste horário.', 'error');
        return prev;
      }

      // Consistência entre pacote e agenda
      if (data.pacoteId && data.itemPacoteId && data.statusAtendimento === 'Agendado') {
        const disponivelIdx = prev.findIndex(a => 
          a.pacoteId === data.pacoteId && 
          a.itemPacoteId === data.itemPacoteId && 
          a.statusAtendimento === 'Disponivel'
        );

        if (disponivelIdx !== -1) {
          const next = [...prev];
          next[disponivelIdx] = { ...next[disponivelIdx], ...data, id: next[disponivelIdx].id };
          
          // Atualizar quantidade restante no pacote
          setPacotes(pPrev => pPrev.map(p => {
            if (p.id === data.pacoteId) {
              return {
                ...p,
                itens: p.itens.map(item => 
                  item.id === data.itemPacoteId 
                    ? { ...item, quantidadeRestante: Math.max(0, item.quantidadeRestante - 1) }
                    : item
                )
              };
            }
            return p;
          }));

          return next.sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
        }
      }

      const novo: Agendamento = { ...data, id: crypto.randomUUID() } as Agendamento;
      return [...prev, novo].sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
    });
    showNotification('Agendado!', 'success');
  }, [showNotification]);

  const updateAgendamento = useCallback((data: Agendamento) => {
    if (!data.id) {
      showNotification('ID do agendamento inválido', 'error');
      return;
    }

    setAgendamentos(prev => {
      const old = prev.find(a => a.id === data.id);
      if (!old) {
        console.warn('Agendamento não encontrado para atualização:', data.id);
        return prev;
      }
      
      // Evitar duplicados ao atualizar
      const isDuplicate = prev.some(a => 
        a.id !== data.id &&
        a.clienteId === data.clienteId &&
        a.terapiaId === data.terapiaId &&
        a.pacoteId === data.pacoteId &&
        a.itemPacoteId === data.itemPacoteId &&
        a.data === data.data &&
        a.hora === data.hora &&
        a.statusAtendimento === data.statusAtendimento &&
        data.statusAtendimento !== 'Disponivel'
      );

      if (isDuplicate) {
        showNotification('Já existe um agendamento idêntico neste horário.', 'error');
        return prev;
      }

      // Se mudou de Disponivel para Agendado, decrementa pacote
      if (old.statusAtendimento === 'Disponivel' && data.statusAtendimento === 'Agendado' && data.pacoteId && data.itemPacoteId) {
        setPacotes(pPrev => pPrev.map(p => {
          if (p.id === data.pacoteId) {
            return {
              ...p,
              itens: p.itens.map(item => 
                item.id === data.itemPacoteId 
                  ? { ...item, quantidadeRestante: Math.max(0, item.quantidadeRestante - 1) }
                  : item
              )
            };
          }
          return p;
        }));
      }
      // Se mudou de Agendado para Disponivel, incrementa pacote
      else if (old.statusAtendimento === 'Agendado' && data.statusAtendimento === 'Disponivel' && data.pacoteId && data.itemPacoteId) {
        setPacotes(pPrev => pPrev.map(p => {
          if (p.id === data.pacoteId) {
            return {
              ...p,
              itens: p.itens.map(item => 
                item.id === data.itemPacoteId 
                  ? { ...item, quantidadeRestante: item.quantidadeRestante + 1 }
                  : item
              )
            };
          }
          return p;
        }));
      }

      return prev.map(a => a.id === data.id ? data : a)
        .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
    });
    showNotification('Agendamento atualizado!', 'success');
  }, [showNotification]);

  const deleteAgendamento = useCallback((id: string) => {
    if (!id) return;

    setAgendamentos(prev => {
      const ag = prev.find(a => a.id === id);
      if (!ag) {
        console.warn('Agendamento não encontrado para exclusão:', id);
        return prev;
      }

      if (ag.pacoteId && ag.itemPacoteId) {
        // Se estava agendado/concluído, incrementa a quantidade restante no pacote
        if (ag.statusAtendimento === 'Agendado' || ag.statusAtendimento === 'Concluido') {
          setPacotes(pPrev => pPrev.map(p => {
            if (p.id === ag.pacoteId) {
              return {
                ...p,
                itens: p.itens.map(item => 
                  item.id === ag.itemPacoteId 
                    ? { ...item, quantidadeRestante: item.quantidadeRestante + 1 }
                    : item
                )
              };
            }
            return p;
          }));
        }
        
        // Verificar se já existe uma sessão "Disponivel" para este item
        const hasDisponivel = prev.some(a => 
          a.pacoteId === ag.pacoteId && 
          a.itemPacoteId === ag.itemPacoteId && 
          a.statusAtendimento === 'Disponivel' &&
          a.id !== id
        );

        // Se já existe, remove completamente; senão, transforma em "Disponivel"
        if (hasDisponivel) {
          return prev.filter(a => a.id !== id);
        } else {
          return prev.map(a => a.id === id ? { 
            ...a, 
            data: '', 
            hora: '', 
            statusAtendimento: 'Disponivel',
            clienteId: '',
            valorCobrado: 0
          } : a);
        }
      }
      
      // Se for avulso, remove de vez
      return prev.filter(a => a.id !== id);
    });
    showNotification('Agendamento removido', 'info');
  }, [showNotification]);

  const completeAppointment = useCallback((id: string) => {
    if (!id) return;

    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, statusAtendimento: 'Concluido' } : a));
    showNotification('Atendimento concluído!', 'success');
  }, [showNotification]);

  // 🎯 CRUD de Terapias
  const addTerapia = useCallback((data: Omit<Terapia, 'id'>) => {
    if (!data.nome || data.nome.trim() === '') {
      showNotification('Nome da terapia é obrigatório', 'error');
      return;
    }

    const novo: Terapia = { ...data, id: crypto.randomUUID(), nome: data.nome.trim() } as Terapia;
    setTerapias(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    showNotification('Terapia adicionada!', 'success');
  }, [showNotification]);

  const updateTerapia = useCallback((data: Terapia) => {
    if (!data.id || !data.nome || data.nome.trim() === '') {
      showNotification('Dados inválidos', 'error');
      return;
    }

    setTerapias(prev => 
      prev.map(t => t.id === data.id ? { ...data, nome: data.nome.trim() } : t)
        .sort((a, b) => a.nome.localeCompare(b.nome))
    );
    showNotification('Terapia atualizada!', 'success');
  }, [showNotification]);

  const deleteTerapia = useCallback((id: string) => {
    if (!id) return;

    setTerapias(prev => prev.filter(t => t.id !== id));
    showNotification('Terapia removida', 'info');
  }, [showNotification]);

  // 🎯 CRUD de Pacotes (corrigido)
  const addPacote = useCallback((data: Omit<Pacote, 'id'>) => {
    if (!data.clienteId || !data.itens || data.itens.length === 0) {
      showNotification('Dados do pacote inválidos', 'error');
      return;
    }

    const newPacoteId = crypto.randomUUID();
    const novo: Pacote = { ...data, id: newPacoteId } as Pacote;
    
    // Proteção contra duplicação
    setAgendamentos(prev => {
      const jaExiste = prev.some(a => a.pacoteId === newPacoteId);
      if (jaExiste) {
        console.log('Sessões já existem para este pacote. Não recriar.');
        return prev;
      }

      const novasSessoes: Agendamento[] = [];
      novo.itens.forEach(item => {
        for (let i = 0; i < item.quantidadeTotal; i++) {
          novasSessoes.push({
            id: crypto.randomUUID(),
            clienteId: novo.clienteId,
            pacoteId: newPacoteId,
            itemPacoteId: item.id,
            terapiaId: item.terapiaId,
            data: '',
            hora: '',
            statusAtendimento: 'Disponivel',
            statusPagamento: 'Pendente',
            valorCobrado: 0
          });
        }
      });
      return [...prev, ...novasSessoes];
    });

    setPacotes(prev => [...prev, novo].sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia)));
    showNotification('Pacote criado e sessões liberadas!', 'success');
  }, [showNotification]);

  const updatePacote = useCallback((data: Pacote) => {
    if (!data.id) {
      showNotification('ID do pacote inválido', 'error');
      return;
    }

    setPacotes(prev => prev.map(p => p.id === data.id ? data : p));
    showNotification('Pacote atualizado!', 'success');
  }, [showNotification]);

  const deletePacote = useCallback((id: string) => {
    if (!id) return;

    // 1. Remover agendamentos vinculados ao pacote
    setAgendamentos(prev => prev.filter(a => a.pacoteId !== id));
    
    // 2. Remover financeiro vinculado ao pacote
    setTransacoes(prev => prev.filter(t => t.pacoteId !== id));
    
    // 3. Remover o pacote
    setPacotes(prev => prev.filter(p => p.id !== id));
    
    showNotification('Pacote e todos os registros vinculados foram removidos!', 'info');
  }, [showNotification]);

  // 🎯 CRUD de Bloqueios
  const addBloqueio = useCallback((data: Omit<Bloqueio, 'id'>) => {
    const novo: Bloqueio = { ...data, id: crypto.randomUUID() } as Bloqueio;
    setBloqueios(prev => [...prev, novo]);
    showNotification('Horário bloqueado', 'success');
  }, [showNotification]);

  const deleteBloqueio = useCallback((id: string) => {
    if (!id) return;
    setBloqueios(prev => prev.filter(b => b.id !== id));
  }, []);

  // 🎯 CRUD de Transações (corrigido)
  const addTransacao = useCallback((data: Partial<Transacao>) => {
    const novo: Transacao = {
      id: crypto.randomUUID(),
      descricao: data.descricao || 'Nova Transação',
      valor: data.valor || 0,
      tipo: data.tipo || 'Receita',
      data: data.data || new Date().toISOString().split('T')[0],
      status: data.status || 'Pago',
      segmento: data.segmento || 'holistica',
      categoria: data.categoria || 'Outros'
    } as Transacao;
    
    setTransacoes(prev => [novo, ...prev]);
    showNotification('Transação registrada!', 'success');
  }, [showNotification]);

  const updateTransacao = useCallback((data: Transacao) => {
    if (!data.id) {
      showNotification('ID da transação inválido', 'error');
      return;
    }

    setTransacoes(prev => prev.map(t => t.id === data.id ? data : t));
    
    // Sincronização reversa: se a transação mudou para Pago, atualizar o item de origem
    if (data.status === 'Pago') {
      if (data.agendamentoId) {
        setAgendamentos(prev => prev.map(ag => 
          ag.id === data.agendamentoId ? { ...ag, statusPagamento: 'Pago' as const } : ag
        ));
      }
      if (data.pacoteId) {
        setPacotes(prev => prev.map(p => 
          p.id === data.pacoteId ? { ...p, statusPagamento: 'Pago' as const } : p
        ));
      }
    }
  }, []);

  const deleteTransacao = useCallback((id: string) => {
    if (!id) return;
    setTransacoes(prev => prev.filter(t => t.id !== id));
  }, []);

  // 🎯 CRUD de Despesas
  const addDespesa = useCallback((data: Omit<Despesa, 'id'>) => {
    const novo: Despesa = { 
      ...data, 
      id: crypto.randomUUID(), 
      segmento: data.segmento || 'holistica' 
    } as Despesa;
    setDespesas(prev => [novo, ...prev]);
    showNotification('Despesa registrada!', 'success');
  }, [showNotification]);

  const updateDespesa = useCallback((data: Despesa) => {
    if (!data.id) {
      showNotification('ID da despesa inválido', 'error');
      return;
    }

    setDespesas(prev => prev.map(d => d.id === data.id ? data : d));
  }, []);

  const deleteDespesa = useCallback((id: string) => {
    if (!id) return;
    setDespesas(prev => prev.filter(d => d.id !== id));
    showNotification('Despesa removida', 'info');
  }, [showNotification]);

  // 🎯 Backup e Restauração (melhorado)
  const exportarBackup = useCallback(() => {
    try {
      const data = { 
        clientes, 
        agendamentos, 
        terapias, 
        pacotes, 
        bloqueios, 
        transacoes, 
        despesas,
        exportDate: new Date().toISOString(),
        version: '3.0'
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lunara_v3_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('Backup exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      showNotification('Erro ao exportar backup', 'error');
    }
  }, [clientes, agendamentos, terapias, pacotes, bloqueios, transacoes, despesas, showNotification]);

  const importarBackup = useCallback((json: any) => {
    try {
      if (!json || typeof json !== 'object') {
        throw new Error('Formato de backup inválido');
      }

      if (json.clientes && Array.isArray(json.clientes)) {
        const filtered = filterBlacklist(json.clientes);
        setClientes(filtered);
      }
      if (json.agendamentos && Array.isArray(json.agendamentos)) {
        const filtered = filterAgendamentos(json.agendamentos);
        setAgendamentos(filtered);
      }
      if (json.terapias && Array.isArray(json.terapias)) {
        const filtered = filterBlacklist(json.terapias);
        setTerapias(filtered);
      }
      if (json.pacotes && Array.isArray(json.pacotes)) {
        const filtered = filterBlacklist(json.pacotes);
        setPacotes(filtered);
      }
      if (json.bloqueios && Array.isArray(json.bloqueios)) {
        const filtered = filterBlacklist(json.bloqueios);
        setBloqueios(filtered);
      }
      if (json.transacoes && Array.isArray(json.transacoes)) {
        const filtered = filterBlacklist(json.transacoes);
        setTransacoes(filtered);
      }
      if (json.despesas && Array.isArray(json.despesas)) {
        setDespesas(json.despesas);
      }
      
      showNotification('Dados restaurados com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      showNotification('Erro na importação: formato inválido', 'error');
    }
  }, [showNotification]);

  // 🎯 Reparo do banco de dados (otimizado)
  const repairDatabase = useCallback(() => {
    try {
      console.log('Iniciando reparo do banco de dados...');
      
      // 1. Validar vínculos de agendamentos
      const validAgendamentos = agendamentos.filter(a => {
        const hasCliente = !a.clienteId || clientes.some(c => c.id === a.clienteId);
        const hasTerapia = !a.terapiaId || terapias.some(t => t.id === a.terapiaId);
        return hasCliente && hasTerapia;
      });
      
      // 2. Limpeza de duplicados
      const toKeep: Agendamento[] = [];
      const uniqueScheduled = new Set<string>();
      const availableCounts = new Map<string, number>();
      
      validAgendamentos.forEach(ag => {
        if (ag.statusAtendimento === 'Disponivel' && ag.pacoteId && ag.itemPacoteId) {
          const key = `${ag.pacoteId}-${ag.itemPacoteId}`;
          const currentCount = availableCounts.get(key) || 0;
          const pacote = pacotes.find(p => p.id === ag.pacoteId);
          const item = pacote?.itens.find(i => i.id === ag.itemPacoteId);
          
          if (item && currentCount < item.quantidadeTotal) {
            availableCounts.set(key, currentCount + 1);
            toKeep.push(ag);
          }
        } else {
          const key = `${ag.clienteId}-${ag.terapiaId}-${ag.pacoteId || 'no-pkg'}-${ag.itemPacoteId || 'no-item'}-${ag.statusAtendimento}-${ag.data}-${ag.hora}`;
          if (!uniqueScheduled.has(key)) {
            uniqueScheduled.add(key);
            toKeep.push(ag);
          }
        }
      });

      setAgendamentos(toKeep);
      
      // 3. Validar pacotes
      const validPacotes = pacotes.filter(p => clientes.some(c => c.id === p.clienteId));
      setPacotes(validPacotes);
      
      const removedAgendamentos = agendamentos.length - toKeep.length;
      const removedPacotes = pacotes.length - validPacotes.length;
      
      showNotification(
        `Banco reparado! ${removedAgendamentos} agendamentos e ${removedPacotes} pacotes removidos.`, 
        'success'
      );
    } catch (error) {
      console.error('Erro ao reparar banco:', error);
      showNotification('Erro ao reparar banco de dados', 'error');
    }
  }, [agendamentos, pacotes, clientes, terapias, showNotification]);

  // 🎯 Renovação de Pacotes (corrigido e robusto)
  const renewPacote = useCallback((pacoteId: string) => {
    if (!pacoteId) {
      showNotification('ID do pacote inválido', 'error');
      return;
    }

    const originalPacote = pacotes.find(p => p.id === pacoteId);
    if (!originalPacote) {
      showNotification('Pacote não encontrado', 'error');
      return;
    }

    // Validar se o pacote pode ser renovado
    if (originalPacote.status === 'Concluido') {
      showNotification('Este pacote já foi concluído e não pode ser renovado novamente.', 'error');
      return;
    }

    // Calcular próximo mês
    const [year, month] = originalPacote.mesReferencia.split('-').map(Number);
    const nextDate = new Date(year, month, 1); 
    const nextMesReferencia = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    // Verificar se já foi renovado
    const alreadyRenewed = pacotes.some(p => 
      p.clienteId === originalPacote.clienteId && 
      p.mesReferencia === nextMesReferencia
    );
    
    if (alreadyRenewed) {
      showNotification('Este pacote já foi renovado para o próximo mês.', 'info');
      return;
    }

    const newPacoteId = crypto.randomUUID();

    // Proteção contra duplicação
    const jaExiste = agendamentos.some(a => a.pacoteId === newPacoteId);
    if (jaExiste) {
      console.log('Sessões já existem para este pacote. Não recriar.');
      return;
    }

    // Atualizar status do pacote original
    const updatedOriginalPacote = { ...originalPacote, status: 'Concluido' as const };
    setPacotes(prev => prev.map(p => p.id === pacoteId ? updatedOriginalPacote : p));

    // Criar novos itens do pacote com cota completa
    const newItens = originalPacote.itens.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      quantidadeRestante: item.quantidadeTotal
    }));

    // Duplicar agendamentos (com shift de data)
    const originalAgendamentos = agendamentos.filter(a => 
      a.pacoteId === pacoteId && 
      a.statusAtendimento !== 'Cancelado' &&
      a.statusAtendimento === 'Agendado' // Apenas agendamentos confirmados
    );
    
    const novasSessoes: Agendamento[] = [];
    
    originalAgendamentos.forEach(a => {
      // Shift de data (28 dias / 4 semanas)
      const d = new Date(a.data + 'T00:00:00');
      d.setDate(d.getDate() + 28);
      
      const item = newItens.find(i => i.terapiaId === a.terapiaId);
      if (item && item.quantidadeRestante > 0) {
        item.quantidadeRestante--;
        
        novasSessoes.push({
          ...a,
          id: crypto.randomUUID(),
          pacoteId: newPacoteId,
          itemPacoteId: item.id,
          data: d.toISOString().split('T')[0],
          statusAtendimento: 'Agendado',
          statusPagamento: 'Pendente',
          valorCobrado: 0
        });
      }
    });

    // Liberar sessões restantes como "Disponivel"
    newItens.forEach(item => {
      const restante = item.quantidadeRestante;
      for (let i = 0; i < restante; i++) {
        novasSessoes.push({
          id: crypto.randomUUID(),
          clienteId: originalPacote.clienteId,
          pacoteId: newPacoteId,
          itemPacoteId: item.id,
          terapiaId: item.terapiaId,
          data: '',
          hora: '',
          statusAtendimento: 'Disponivel',
          statusPagamento: 'Pendente',
          valorCobrado: 0
        });
      }
    });

    const newPacote: Pacote = {
      ...originalPacote,
      id: newPacoteId,
      mesReferencia: nextMesReferencia,
      status: 'Ativo',
      statusPagamento: 'Pendente',
      dataPagamento: undefined,
      formaPagamento: undefined,
      bancoPagamento: undefined,
      itens: newItens
    };

    setPacotes(prev => [...prev, newPacote]);
    setAgendamentos(prev => [...prev, ...novasSessoes]);
    
    // Criar transação para o novo pacote
    const cliente = clientes.find(c => c.id === originalPacote.clienteId);
    const transacao: Transacao = {
      id: crypto.randomUUID(),
      descricao: `Pacote Renovado - ${cliente?.nome || 'Cliente'}`,
      valor: newPacote.valorFinal,
      data: new Date().toISOString().split('T')[0],
      status: 'Pendente',
      tipo: 'Receita',
      categoria: 'Pacotes',
      segmento: 'holistica',
      pacoteId: newPacoteId
    };
    setTransacoes(prev => [transacao, ...prev]);

    showNotification('Pacote renovado e sessões liberadas!', 'success');
  }, [pacotes, agendamentos, clientes, showNotification]);

  // 🎯 Importação de contatos
  const handleImportContacts = useCallback(async (): Promise<ImportedContact[] | null> => {
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
        if (contacts?.length) {
          return contacts.map((c: any) => ({
            nome: c.name?.[0] || 'Sem Nome',
            telefone: c.tel?.[0] || '',
          }));
        }
      } catch (err) { 
        console.error('Erro ao importar contatos:', err);
        showNotification('Erro ao importar contatos', 'error');
      }
    } else {
      showNotification('Seu navegador não suporta importação de contatos', 'error');
    }
    return null;
  }, [showNotification]);

  // 🎯 Utilitário de data seguro (melhorado)
  const safeDate = useCallback((d: any): Date => {
    if (!d) return new Date();
    
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) {
      console.warn('Data inválida detectada:', d);
      return new Date();
    }
    return parsed;
  }, []);

  // 🎯 Reset do sistema
  const resetSystem = useCallback(() => {
    try {
      Object.values(StorageKeys).forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Erro ao remover ${key}:`, e);
        }
      });
      
      // Também remover dados customizados
      localStorage.removeItem('lunara_cancelados_renovacao');
      
      showNotification('Sistema resetado! Por favor, recarregue a página (F5).', 'info');
    } catch (error) {
      console.error('Erro ao resetar sistema:', error);
      showNotification('Erro ao resetar sistema', 'error');
    }
  }, [showNotification]);

  // 🎯 Valor do contexto memoizado
  const contextValue = useMemo(() => ({
    clientes, 
    agendamentos: agendamentosSincronizados, 
    terapias, 
    pacotes: pacotesSincronizados, 
    bloqueios, 
    transacoes, 
    despesas,
    addCliente, 
    updateCliente, 
    deleteCliente,
    addAgendamento, 
    updateAgendamento, 
    deleteAgendamento, 
    completeAppointment,
    addTerapia, 
    updateTerapia, 
    deleteTerapia,
    addPacote, 
    updatePacote, 
    deletePacote,
    addBloqueio, 
    deleteBloqueio,
    addTransacao, 
    updateTransacao, 
    deleteTransacao,
    addDespesa, 
    updateDespesa, 
    deleteDespesa,
    showNotification, 
    confirmAction, 
    promptAction,
    handleImportContacts, 
    exportarBackup, 
    importarBackup, 
    repairDatabase,
    resetSystem,
    safeDate, 
    ddiList: DDI_LIST,
    setAgendamentos, 
    setPacotes,
    renewPacote,
    canceladosRenovacao,
    cancelarRenovacao
  }), [
    clientes, agendamentosSincronizados, terapias, pacotesSincronizados, 
    bloqueios, transacoes, despesas, canceladosRenovacao,
    addCliente, updateCliente, deleteCliente,
    addAgendamento, updateAgendamento, deleteAgendamento, completeAppointment,
    addTerapia, updateTerapia, deleteTerapia,
    addPacote, updatePacote, deletePacote,
    addBloqueio, deleteBloqueio,
    addTransacao, updateTransacao, deleteTransacao,
    addDespesa, updateDespesa, deleteDespesa,
    showNotification, confirmAction, promptAction,
    handleImportContacts, exportarBackup, importarBackup, repairDatabase,
    resetSystem, safeDate, renewPacote, cancelarRenovacao
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      
      {/* 🎯 Notificações melhoradas */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-in slide-in-from-right-full duration-300 pointer-events-auto ${
              n.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              n.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <span className="text-lg">
              {n.type === 'success' ? '✓' : n.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <p className="text-sm font-medium">{n.message}</p>
          </div>
        ))}
      </div>

      {/* 🎯 Modal de confirmação */}
      {confirmation && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm h-[100dvh]">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl shadow-black/20 p-6 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
              {confirmation.title || 'Confirmar'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              {confirmation.message}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmation(null)} 
                className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => { 
                  confirmation.onConfirm(); 
                  setConfirmation(null); 
                }} 
                className={`flex-1 py-3 text-sm font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${
                  confirmation.isDanger 
                    ? 'bg-red-600 text-white shadow-red-600/20' 
                    : 'bg-[var(--color-primary)] text-white shadow-[var(--color-primary)]/20'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 Modal de prompt */}
      {prompt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm h-[100dvh]">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl shadow-black/20 p-6 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
              {prompt.title || 'Entrada'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              {prompt.message}
            </p>
            <input 
              type="text" 
              autoFocus 
              defaultValue={prompt.defaultValue} 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-zinc-800 rounded-xl mb-8 outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-gray-900 dark:text-gray-100"
              id="global-prompt-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  prompt.onConfirm((e.currentTarget as HTMLInputElement).value);
                  setPrompt(null);
                }
              }}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setPrompt(null)} 
                className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => { 
                  prompt.onConfirm((document.getElementById('global-prompt-input') as HTMLInputElement).value); 
                  setPrompt(null); 
                }} 
                className="flex-1 py-3 text-sm font-bold bg-[var(--color-primary)] text-white rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition-transform active:scale-95"
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
  if (!context) throw new Error('useAppContext deve ser usado dentro de AppProvider');
  return context;
};