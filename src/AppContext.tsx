import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
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
  { code: '+258', flag: '🇲', name: 'Moçambique' },
  { code: '+238', flag: '🇨', name: 'Cabo Verde' },
  { code: '+245', flag: '🇬🇼', name: 'Guiné-Bissau' },
  { code: '+239', flag: '🇸🇹', name: 'São Tomé e Príncipe' },
  { code: '+670', flag: '🇹', name: 'Timor-Leste' },
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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    const saved = StorageService.getData(StorageKeys.CLIENTES);
    return Array.isArray(saved) ? filterBlacklist(saved) : filterBlacklist(INITIAL_CLIENTES);
  });
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(() => {
    const saved = StorageService.getData(StorageKeys.AGENDAMENTOS);
    return Array.isArray(saved) ? filterAgendamentos(saved) : INITIAL_AGENDAMENTOS;
  });
  const [terapias, setTerapias] = useState<Terapia[]>(() => {
    const saved = StorageService.getData(StorageKeys.TERAPIAS);
    return Array.isArray(saved) ? filterBlacklist(saved) : filterBlacklist(INITIAL_TERAPIAS);
  });
  const [pacotes, setPacotes] = useState<Pacote[]>(() => {
    const saved = StorageService.getData(StorageKeys.PACOTES);
    return Array.isArray(saved) ? filterBlacklist(saved) : INITIAL_PACOTES;
  });
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>(() => {
    const saved = StorageService.getData(StorageKeys.BLOQUEIOS);
    return Array.isArray(saved) ? filterBlacklist(saved) : [];
  });
  const [transacoes, setTransacoes] = useState<Transacao[]>(() => {
    const saved = StorageService.getData(StorageKeys.TRANSACOES);
    return Array.isArray(saved) ? filterBlacklist(saved) : INITIAL_TRANSACOES;
  });
  const [despesas, setDespesas] = useState<Despesa[]>(() => {
    const saved = StorageService.getData(StorageKeys.DESPESAS);
    return Array.isArray(saved) ? saved : [];
  });

  const [canceladosRenovacao, setCanceladosRenovacao] = useState<string[]>(() => {
    const saved = localStorage.getItem('lunara_cancelados_renovacao');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const currentMonth = new Date().toISOString().slice(0, 7);
        return parsed.filter((item: string) => item.startsWith(currentMonth)).map((item: string) => item.split(':')[1]);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const cancelarRenovacao = (clientId: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const newItem = `${currentMonth}:${clientId}`;
    const saved = localStorage.getItem('lunara_cancelados_renovacao');
    let list: string[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {}
    }
    if (!list.includes(newItem)) {
      const newList = [...list, newItem];
      localStorage.setItem('lunara_cancelados_renovacao', JSON.stringify(newList));
      setCanceladosRenovacao(prev => [...prev, clientId]);
    }
  };

  const agendamentosSincronizados = React.useMemo(() => {
    console.log('AppContext: recalculating agendamentosSincronizados', agendamentos.length);
    return agendamentos.map(ag => {
      const transacao = transacoes.find(t => t.agendamentoId === ag.id);
      if (transacao && transacao.status === 'Pago') {
        return { ...ag, statusPagamento: 'Pago' as const };
      }
      return ag;
    });
  }, [agendamentos, transacoes]);

  const pacotesSincronizados = React.useMemo(() => {
    return pacotes.map(p => {
      const transacao = transacoes.find(t => t.pacoteId === p.id);
      if (transacao && transacao.status === 'Pago') {
        return { ...p, statusPagamento: 'Pago' as const };
      }
      return p;
    });
  }, [pacotes, transacoes]);

  useEffect(() => {
    const isCorruptedOrEmpty = () => {
      try {
        const c = localStorage.getItem(StorageKeys.CLIENTES);
        const t = localStorage.getItem(StorageKeys.TERAPIAS);
        
        if (!c || !t) return true;
        
        const parsedC = JSON.parse(c);
        const parsedT = JSON.parse(t);
        
        if (!Array.isArray(parsedC) || !Array.isArray(parsedT)) return true;
        if (parsedC.length === 0 && parsedT.length === 0) return true;
        
        return false;
      } catch (e) {
        return true;
      }
    };

    if (isCorruptedOrEmpty()) {
      console.log("Storage vazio ou corrompido detectado. Forçando inicialização limpa.");
      setClientes(INITIAL_CLIENTES);
      setTerapias(INITIAL_TERAPIAS);
      setPacotes(INITIAL_PACOTES);
      setAgendamentos(INITIAL_AGENDAMENTOS);
      setTransacoes(INITIAL_TRANSACOES);
      setBloqueios([]);
      setDespesas([]);
      
      StorageService.saveData(StorageKeys.CLIENTES, INITIAL_CLIENTES);
      StorageService.saveData(StorageKeys.TERAPIAS, INITIAL_TERAPIAS);
      StorageService.saveData(StorageKeys.PACOTES, INITIAL_PACOTES);
      StorageService.saveData(StorageKeys.AGENDAMENTOS, INITIAL_AGENDAMENTOS);
      StorageService.saveData(StorageKeys.TRANSACOES, INITIAL_TRANSACOES);
      StorageService.saveData(StorageKeys.BLOQUEIOS, []);
      StorageService.saveData(StorageKeys.DESPESAS, []);
    }
  }, []);

  const resetSystem = () => {
    Object.values(StorageKeys).forEach(key => localStorage.removeItem(key));
    alert("Sistema resetado! Por favor, recarregue a página (F5).");
  };

  useEffect(() => StorageService.saveData(StorageKeys.CLIENTES, clientes), [clientes]);
  useEffect(() => StorageService.saveData(StorageKeys.AGENDAMENTOS, agendamentos), [agendamentos]);
  useEffect(() => StorageService.saveData(StorageKeys.TERAPIAS, terapias), [terapias]);
  useEffect(() => StorageService.saveData(StorageKeys.PACOTES, pacotes), [pacotes]);
  useEffect(() => StorageService.saveData(StorageKeys.BLOQUEIOS, bloqueios), [bloqueios]);
  useEffect(() => StorageService.saveData(StorageKeys.TRANSACOES, transacoes), [transacoes]);
  useEffect(() => StorageService.saveData(StorageKeys.DESPESAS, despesas), [despesas]);

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

  useEffect(() => {
    if (agendamentos.length > 0 && pacotes.length > 0) {
      setAgendamentos(prev => {
        const toKeep: Agendamento[] = [];
        const uniqueScheduled = new Set<string>();
        const availableCounts = new Map<string, number>();
        
        prev.forEach(ag => {
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
        
        return toKeep;
      });
    }
  }, [pacotes.length]);

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
    setAgendamentos(prev => {
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
        console.warn("Tentativa de criar agendamento duplicado bloqueada.");
        return prev;
      }

      if (data.pacoteId && data.itemPacoteId && data.statusAtendimento === 'Agendado') {
        const disponivelIdx = prev.findIndex(a => 
          a.pacoteId === data.pacoteId && 
          a.itemPacoteId === data.itemPacoteId && 
          a.statusAtendimento === 'Disponivel'
        );

        if (disponivelIdx !== -1) {
          const next = [...prev];
          next[disponivelIdx] = { ...next[disponivelIdx], ...data };
          
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

      const novo = { ...data, id: crypto.randomUUID() } as Agendamento;
      return [...prev, novo].sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
    });
    showNotification("Agendado!", "success");
  };

  const updateAgendamento = (data: Agendamento) => {
    setAgendamentos(prev => {
      const old = prev.find(a => a.id === data.id);
      
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
        showNotification("Já existe um agendamento idêntico neste horário.", "error");
        return prev;
      }

      if (old?.statusAtendimento === 'Disponivel' && data.statusAtendimento === 'Agendado' && data.pacoteId && data.itemPacoteId) {
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
      else if (old?.statusAtendimento === 'Agendado' && data.statusAtendimento === 'Disponivel' && data.pacoteId && data.itemPacoteId) {
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

      const next = prev.map(a => a.id === data.id ? data : a).sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
      return next;
    });

    setTransacoes(prev => prev.map(t => {
      if (t.agendamentoId === data.id) {
        return { ...t, status: data.statusPagamento === 'Pago' ? 'Pago' : 'Pendente' };
      }
      return t;
    }));
    
    showNotification("Agendamento atualizado!", "success");
  };

  const deleteAgendamento = (id: string) => {
    setAgendamentos(prev => {
      const ag = prev.find(a => a.id === id);
      if (ag?.pacoteId && ag.itemPacoteId) {
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
        return prev.map(a => a.id === id ? { ...a, data: '', hora: '', statusAtendimento: 'Disponivel' } : a);
      }
      return prev.filter(a => a.id !== id);
    });
    showNotification("Agendamento removido", "info");
  };

  const completeAppointment = (id: string) => {
    setAgendamentos(prev => {
      const ag = prev.find(a => a.id === id);
      if (!ag) return prev;

      if (ag.statusAtendimento === 'Disponivel' && ag.pacoteId && ag.itemPacoteId) {
        setPacotes(pPrev => pPrev.map(p => {
          if (p.id === ag.pacoteId) {
            return {
              ...p,
              itens: p.itens.map(item =>
                item.id === ag.itemPacoteId
                  ? { ...item, quantidadeRestante: Math.max(0, item.quantidadeRestante - 1) }
                  : item
              )
            };
          }
          return p;
        }));
      }

      return prev.map(a => a.id === id ? { ...a, statusAtendimento: 'Concluido' } : a);
    });
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
    const newPacoteId = crypto.randomUUID();
    const novo = { ...data, id: newPacoteId } as Pacote;
    
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
    
    // ✅ CORREÇÃO: Criar transação automática ao criar pacote
    const cliente = clientes.find(c => c.id === novo.clienteId);
    const transacao: Transacao = {
      id: crypto.randomUUID(),
      descricao: `Pacote - ${cliente?.nome || 'Cliente'}`,
      valor: novo.valorFinal || 0,
      data: new Date().toISOString().split('T')[0],
      status: novo.statusPagamento === 'Pago' ? 'Pago' : 'Pendente',
      tipo: 'Receita',
      categoria: 'Pacotes',
      segmento: 'holistica',
      pacoteId: newPacoteId
    };
    setTransacoes(prev => [transacao, ...prev]);
    
    showNotification("Pacote criado e sessões liberadas!", "success");
  };

  const updatePacote = (data: Pacote) => {
    setPacotes(prev => prev.map(p => p.id === data.id ? data : p));
    
    setTransacoes(prev => prev.map(t => {
      if (t.pacoteId === data.id) {
        return { ...t, status: data.statusPagamento === 'Pago' ? 'Pago' : 'Pendente' };
      }
      return t;
    }));
    
    showNotification("Pacote atualizado!", "success");
  };

  const deletePacote = (id: string) => {
    setAgendamentos(prev => (prev || []).filter(a => a.pacoteId !== id));
    setTransacoes(prev => (prev || []).filter(t => t.pacoteId !== id));
    setPacotes(prev => (prev || []).filter(p => p.id !== id));
    showNotification("Pacote e todos os registros vinculados (agenda e financeiro) foram removidos!", "info");
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
      status: data.status || 'Pago',
      segmento: data.segmento || 'holistica'
    } as Transacao;
    setTransacoes(prev => [novo, ...prev]);
    showNotification("Transação registrada!", "success");
  };

  const updateTransacao = (data: Transacao) => {
    setTransacoes(prev => prev.map(t => t.id === data.id ? data : t));
    
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
  };

  const deleteTransacao = (id: string) => {
    setTransacoes(prev => prev.filter(t => t.id !== id));
  };

  const addDespesa = (data: Omit<Despesa, 'id'>) => {
    const novo = { ...data, id: crypto.randomUUID(), segmento: data.segmento || 'holistica' } as Despesa;
    setDespesas(prev => [novo, ...prev]);
    showNotification("Despesa registrada!", "success");
  };

  const updateDespesa = (data: Despesa) => {
    setDespesas(prev => prev.map(d => d.id === data.id ? data : d));
  };

  const deleteDespesa = (id: string) => {
    setDespesas(prev => prev.filter(d => d.id !== id));
    showNotification("Despesa removida", "info");
  };

  const exportarBackup = () => {
    const data = { clientes, agendamentos, terapias, pacotes, bloqueios, transacoes, despesas };
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
      if (json.clientes) {
        const filtered = filterBlacklist(json.clientes);
        setClientes(filtered);
        StorageService.saveData(StorageKeys.CLIENTES, filtered);
      }
      if (json.agendamentos) {
        const filtered = filterAgendamentos(json.agendamentos);
        setAgendamentos(filtered);
        StorageService.saveData(StorageKeys.AGENDAMENTOS, filtered);
      }
      if (json.terapias) {
        const filtered = filterBlacklist(json.terapias);
        setTerapias(filtered);
        StorageService.saveData(StorageKeys.TERAPIAS, filtered);
      }
      if (json.pacotes) {
        const filtered = filterBlacklist(json.pacotes);
        setPacotes(filtered);
        StorageService.saveData(StorageKeys.PACOTES, filtered);
      }
      if (json.bloqueios) {
        const filtered = filterBlacklist(json.bloqueios);
        setBloqueios(filtered);
        StorageService.saveData(StorageKeys.BLOQUEIOS, filtered);
      }
      if (json.transacoes) {
        const filtered = filterBlacklist(json.transacoes);
        setTransacoes(filtered);
        StorageService.saveData(StorageKeys.TRANSACOES, filtered);
      }
      if (json.despesas) {
        setDespesas(json.despesas);
        StorageService.saveData(StorageKeys.DESPESAS, json.despesas);
      }
      showNotification("Dados restaurados!", "success");
    } catch (e) {
      showNotification("Erro na importação", "error");
    }
  };

  const repairDatabase = () => {
    const validAgendamentos = (agendamentos || []).filter(a => 
      (clientes || []).some(c => c.id === a.clienteId) && 
      (terapias || []).some(t => t.id === a.terapiaId)
    );
    
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
    
    const validPacotes = (pacotes || []).filter(p => (clientes || []).some(c => c.id === p.clienteId));
    setPacotes(validPacotes);
    
    showNotification("Banco de dados reparado e duplicados removidos!", "success");
  };

  const renewPacote = (pacoteId: string) => {
    const originalPacote = pacotes.find(p => p.id === pacoteId);
    if (!originalPacote) return;

    const [year, month] = originalPacote.mesReferencia.split('-').map(Number);
    const nextDate = new Date(year, month, 1); 
    const nextMesReferencia = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    const alreadyRenewed = pacotes.some(p => p.clienteId === originalPacote.clienteId && p.mesReferencia === nextMesReferencia);
    if (alreadyRenewed) {
      showNotification("Este pacote já foi renovado para o próximo mês.", "info");
      return;
    }

    const newPacoteId = crypto.randomUUID();

    const jaExiste = agendamentos.some(a => a.pacoteId === newPacoteId);
    if (jaExiste) {
      console.log('Sessões já existem para este pacote. Não recriar.');
      return;
    }

    const updatedOriginalPacote = { ...originalPacote, status: 'Concluido' as const };
    setPacotes(prev => prev.map(p => p.id === pacoteId ? updatedOriginalPacote : p));

    const newItens = originalPacote.itens.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      quantidadeRestante: item.quantidadeTotal
    }));

    const originalAgendamentos = agendamentos.filter(a => a.pacoteId === pacoteId && a.statusAtendimento !== 'Cancelado');
    const novasSessoes: Agendamento[] = [];
    
    originalAgendamentos.forEach(a => {
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
    
    const cliente = clientes.find(c => c.id === originalPacote.clienteId);
    const transacao: Transacao = {
      id: crypto.randomUUID(),
      descricao: `Pacote Renovado - ${cliente?.nome || 'Cliente'}`,
      valor: newPacote.valorFinal,
      data: new Date().toISOString().split('T')[0],
      status: 'Pendente',
      tipo: 'Receita',
      categoria: 'Pacotes',
      pacoteId: newPacoteId
    };
    setTransacoes(prev => [transacao, ...prev]);

    showNotification("Pacote renovado e sessões liberadas!", "success");
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
      clientes, agendamentos: agendamentosSincronizados, terapias, pacotes: pacotesSincronizados, bloqueios, transacoes, despesas,
      addCliente, updateCliente, deleteCliente,
      addAgendamento, updateAgendamento, deleteAgendamento, completeAppointment,
      addTerapia, updateTerapia, deleteTerapia,
      addPacote, updatePacote, deletePacote,
      addBloqueio, deleteBloqueio,
      addTransacao, updateTransacao, deleteTransacao,
      addDespesa, updateDespesa, deleteDespesa,
      showNotification, confirmAction, promptAction,
      handleImportContacts, exportarBackup, importarBackup, repairDatabase,
      resetSystem,
      safeDate, ddiList: DDI_LIST,
      setAgendamentos, setPacotes,
      renewPacote,
      canceladosRenovacao,
      cancelarRenovacao
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm h-[100dvh]">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl shadow-black/20 p-6 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">{confirmation.title || 'Confirmar'}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">{confirmation.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmation(null)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancelar</button>
              <button onClick={() => { confirmation.onConfirm(); setConfirmation(null); }} className={`flex-1 py-3 text-sm font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${confirmation.isDanger ? 'bg-red-600 text-white shadow-red-600/20' : 'bg-[var(--color-primary)] text-white shadow-[var(--color-primary)]/20'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {prompt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm h-[100dvh]">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl shadow-black/20 p-6 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">{prompt.title || 'Entrada'}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{prompt.message}</p>
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
              <button onClick={() => setPrompt(null)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancelar</button>
              <button onClick={() => { prompt.onConfirm((document.getElementById('global-prompt-input') as HTMLInputElement).value); setPrompt(null); }} className="flex-1 py-3 text-sm font-bold bg-[var(--color-primary)] text-white rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition-transform active:scale-95">Confirmar</button>
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