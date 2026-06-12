import React, { useState, useMemo, useCallback, memo } from 'react';
import { DollarSign, Clock, Tag, Plus, ChevronRight, ChevronLeft, PieChart, Settings, Check, Trash2, AlertTriangle, CheckCircle, Calendar, Package, Eye, EyeOff, RefreshCw, Info } from 'lucide-react';
import { Agendamento, Cliente, Pacote, Terapia, Transacao, Despesa } from '../types';
import FinanceiroScreen from './FinanceiroScreen';
import ConfiguracoesScreen from './ConfiguracoesScreen';
import ContasAReceberScreen from './ContasAReceberScreen';
import { useAppContext } from '../AppContext';

// ======================
// CONFIGURAÇÕES E CONSTANTES
// ======================

const CONFIG = {
  swipe: {
    minDistance: 100, // px para detectar swipe
    edgeMargin: 60,   // px da borda para ativar swipe
    hapticDuration: 10 // ms de vibração
  },
  agenda: {
    intervaloEntreSessoes: 10, // minutos
    pausaPorHoraTrabalhada: 15 // minutos
  },
  carga: {
    limiteMinutosAlta: 240, // 4 horas = carga alta
    corAlerta: 'orange'
  },
  ui: {
    proximosAtendimentosLimite: 5,
    animacaoDuration: 150
  }
} as const;

// ======================
// UTILITÁRIOS PURE (para teste e memoização)
// ======================

const parseDateTime = (date: string, time: string): number => {
  if (!date) return 0;
  let normalized = date.replace(/\//g, '-');
  const parts = normalized.split('-');
  if (parts.length === 3 && parts[0].length === 2) {
    normalized = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const dt = new Date(`${normalized}T${time || '00:00'}`);
  return isNaN(dt.getTime()) ? 0 : dt.getTime();
};

const formatCurrency = (value: number, showValues: boolean): string => {
  if (!showValues) return 'R$ ****';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDateShort = (date: string): string => {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}/${month}`;
};

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  return `${m}min`;
};

const isSameMonth = (date: Date, month: number, year: number): boolean => {
  return date.getMonth() === month && date.getFullYear() === year;
};

const hasValidPacote = (pacoteId: string | undefined, pacotes: Pacote[]): boolean => {
  if (!pacoteId) return true;
  return pacotes.some(p => p.id === pacoteId);
};

// ======================
// SUB-COMPONENTES MEMOIZED (para performance)
// ======================

interface StatCardProps {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  onClick?: () => void;
  'aria-label'?: string;
}

const StatCard = memo(({ value, label, icon, color = 'var(--color-primary)', onClick, 'aria-label': ariaLabel }: StatCardProps) => (
  <button
    onClick={onClick}
    className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
    aria-label={ariaLabel || label}
  >
    {icon && <div className="mb-2" style={{ color }}>{icon}</div>}
    <span className="text-2xl font-black" style={{ color }}>{value}</span>
    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">{label}</span>
  </button>
));
StatCard.displayName = 'StatCard';

interface AppointmentItemProps {
  agendamento: Agendamento;
  cliente: Cliente | undefined;
  terapia: Terapia | undefined;
  onConcluir: (id: string) => void;
  onExcluir: (id: string) => void;
  showValues: boolean;
}

const AppointmentItem = memo(({ agendamento, cliente, terapia, onConcluir, onExcluir, showValues }: AppointmentItemProps) => {
  const isPaid = agendamento.statusPagamento === 'Pago';
  const isPast = parseDateTime(agendamento.data, agendamento.hora) < Date.now();
  
  return (
    <div 
      className={`bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm flex items-center gap-4 border-l-4 ${
        isPaid ? 'border-[var(--color-success)]' : 'border-[var(--color-warning)]'
      }`}
      role="listitem"
    >
      <div 
        className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl relative ${
          isPaid ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
        }`}
        aria-label={`Data: ${formatDateShort(agendamento.data)}, Horário: ${agendamento.hora}`}
      >
        <span className="text-sm font-bold">{formatDateShort(agendamento.data)}</span>
        <span className="text-xs font-medium">{agendamento.hora}</span>
        {isPast && (
          <div className="absolute -top-1 -right-1 bg-gray-400 text-white rounded-full p-0.5 shadow-sm" aria-hidden="true">
            <Clock size={10} />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] truncate">
          {cliente?.nome || 'Cliente'}
        </h4>
        <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-0.5 truncate">
          {terapia?.nome || 'Terapia'}
        </p>
        {!isPaid && (
          <span className="inline-block mt-1 text-[10px] font-bold text-[var(--color-warning)] bg-[var(--color-warning)]/10 px-2 py-0.5 rounded">
            Pendente
          </span>
        )}
      </div>
      
      <div className="flex gap-2" role="group" aria-label="Ações do agendamento">
        <button 
          onClick={() => onConcluir(agendamento.id)}
          className="p-2 bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-full hover:bg-[var(--color-success)]/20 transition-colors"
          aria-label={`Marcar atendimento de ${cliente?.nome} como concluído`}
          title="Marcar como realizado"
        >
          <Check size={18} aria-hidden="true" />
        </button>
        <button 
          onClick={() => onExcluir(agendamento.id)}
          className="p-2 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-full hover:bg-[var(--color-error)]/20 transition-colors"
          aria-label={`Excluir agendamento de ${cliente?.nome}`}
          title="Excluir agendamento"
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});
AppointmentItem.displayName = 'AppointmentItem';

interface RenewalItemProps {
  item: { cliente: Cliente; tipo: string; lastAppt?: string; packageId?: string };
  onRenew: (packageId: string) => void;
  onCancelRenewal: (clientId: string) => void;
  onOffer: (cliente: Cliente) => void;
}

const RenewalItem = memo(({ item, onRenew, onCancelRenewal, onOffer }: RenewalItemProps) => {
  const isFixo = item.tipo === 'Fixo Mensal';
  
  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.cliente.nome}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span 
              className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                isFixo 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }`}
              aria-label={`Tipo: ${item.tipo}`}
            >
              {item.tipo}
            </span>
            {item.lastAppt && (
              <span className="text-[10px] text-zinc-500">Último: {formatDateShort(item.lastAppt)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {isFixo ? (
          <>
            <button 
              onClick={() => item.packageId && onRenew(item.packageId)}
              className="flex-1 bg-[var(--color-primary)] text-white text-[10px] font-black py-2.5 rounded-xl shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-transform"
              aria-label={`Renovar pacote de ${item.cliente.nome}`}
            >
              RENOVAR
            </button>
            <button 
              onClick={() => onCancelRenewal(item.cliente.id)}
              className="px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-black py-2.5 rounded-xl active:scale-95 transition-transform"
              aria-label={`Cancelar renovação de ${item.cliente.nome}`}
            >
              CANCELAR
            </button>
          </>
        ) : (
          <button 
            onClick={() => onOffer(item.cliente)}
            className="flex-1 bg-emerald-500 text-white text-[10px] font-black py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
            aria-label={`Oferecer renovação para ${item.cliente.nome}`}
          >
            OFERECER
          </button>
        )}
      </div>
    </div>
  );
});
RenewalItem.displayName = 'RenewalItem';

// ======================
// HOOK: useSwipeGesture (extraído para reuso)
// ======================

interface UseSwipeGestureOptions {
  onSwipeRight?: () => void;
  minDistance?: number;
  edgeMargin?: number;
  enabled?: boolean;
}

const useSwipeGesture = ({ 
  onSwipeRight, 
  minDistance = CONFIG.swipe.minDistance, 
  edgeMargin = CONFIG.swipe.edgeMargin,
  enabled = true 
}: UseSwipeGestureOptions = {}) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    setTouchEnd(null);
    const touch = e.targetTouches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    
    // Mostrar dica se começou perto da borda
    if (touch.clientX < edgeMargin) {
      setShowSwipeHint(true);
    }
  }, [enabled, edgeMargin]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStart) return;
    const touch = e.targetTouches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  }, [enabled, touchStart]);

  const onTouchEnd = useCallback(() => {
    if (!enabled || !touchStart || !touchEnd) {
      reset();
      return;
    }

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 2;
    const isRightSwipe = deltaX > minDistance;
    const startedNearEdge = touchStart.x < edgeMargin;

    if (isRightSwipe && isHorizontal && startedNearEdge && onSwipeRight) {
      // Feedback háptico se disponível
      if (window.navigator.vibrate) {
        window.navigator.vibrate(CONFIG.swipe.hapticDuration);
      }
      onSwipeRight();
    }
    
    reset();
  }, [enabled, touchStart, touchEnd, minDistance, edgeMargin, onSwipeRight]);

  const reset = useCallback(() => {
    setTouchStart(null);
    setTouchEnd(null);
    setShowSwipeHint(false);
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    showSwipeHint,
    isDragging: touchStart !== null && touchEnd !== null
  };
};

// ======================
// COMPONENTE PRINCIPAL
// ======================

interface HomeScreenProps {
  onNavigate?: (tab: string) => void;
}

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { 
    showNotification, 
    confirmAction, 
    safeDate, 
    completeAppointment, 
    updatePacote, 
    deleteAgendamento,
    agendamentos,
    clientes,
    terapias,
    pacotes,
    transacoes,
    despesas,
    renewPacote,
    canceladosRenovacao,
    cancelarRenovacao
  } = useAppContext();

  // UI State
  const [showFinanceiro, setShowFinanceiro] = useState(false);
  const [showConfiguracoes, setShowConfiguracoes] = useState(false);
  const [showContasAReceber, setShowContasAReceber] = useState(false);
  const [showValues, setShowValues] = useState(() => {
    const saved = localStorage.getItem('lunara_show_values');
    return saved !== null ? saved === 'true' : true;
  });

  // 🎯 Hook de swipe extraído
  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    showSwipeHint
  } = useSwipeGesture({
    onSwipeRight: () => onNavigate?.('freelancer'),
    enabled: !!onNavigate
  });

  // 🎯 Memoização de lookups (evita busca repetida em arrays)
  const clienteMap = useMemo(() => {
    const map = new Map<string, Cliente>();
    clientes?.forEach(c => map.set(c.id, c));
    return map;
  }, [clientes]);

  const terapiaMap = useMemo(() => {
    const map = new Map<string, Terapia>();
    terapias?.forEach(t => map.set(t.id, t));
    return map;
  }, [terapias]);

  const pacoteSet = useMemo(() => {
    return new Set(pacotes?.map(p => p.id) || []);
  }, [pacotes]);

  // 🎯 Cálculos de data (executados uma vez)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const hojeStr = now.toISOString().split('T')[0];

  // 🎯 Filtro de agendamentos do mês (otimizado com Map/Set)
  const agendamentosMes = useMemo(() => {
    return agendamentos?.filter(ag => {
      if (!ag.data || !hasValidPacote(ag.pacoteId, pacotes || [])) return false;
      return ag.data.startsWith(currentMonthStr) && 
             (ag.statusAtendimento === 'Concluido' || ag.statusAtendimento === 'Agendado');
    }) || [];
  }, [agendamentos, pacotes, currentMonthStr]);

  // 🎯 Transações e despesas do mês (separado para clareza)
  const { periodTransacoes, periodDespesas } = useMemo(() => {
    const filterByMonth = (items: Array<{ data?: string; segmento?: string }>, tipo: 'transacao' | 'despesa') => {
      return (items || []).filter(item => {
        if (item.segmento && item.segmento !== 'holistica') return false;
        if (tipo === 'transacao' && (item as Transacao).pacoteId && !hasValidPacote((item as Transacao).pacoteId, pacotes || [])) return false;
        if (!item.data) return false;
        const date = safeDate(`${item.data}T00:00:00`);
        return isSameMonth(date, currentMonth, currentYear);
      });
    };

    return {
      periodTransacoes: filterByMonth(transacoes || [], 'transacao'),
      periodDespesas: filterByMonth(despesas || [], 'despesa')
    };
  }, [transacoes, despesas, pacotes, currentMonth, currentYear, safeDate]);

  // 🎯 Cálculos financeiros (dependem apenas dos dados filtrados)
  const totalRecebido = useMemo(() => 
    periodTransacoes
      .filter((t: Transacao) => t.status === 'Pago' && t.tipo === 'Receita' && t.valor != null)
      .reduce((acc: number, t: Transacao) => acc + Number(t.valor), 0),
    [periodTransacoes]
  );

  const totalPendente = useMemo(() => 
    periodTransacoes
      .filter((t: Transacao) => t.status === 'Pendente' && t.tipo === 'Receita' && t.valor != null)
      .reduce((acc: number, t: Transacao) => acc + Number(t.valor), 0),
    [periodTransacoes]
  );

  const totalDespesas = useMemo(() => {
    const despTrans = periodTransacoes
      .filter((t: Transacao) => t.status === 'Pago' && t.tipo === 'Despesa' && t.valor != null)
      .reduce((acc: number, t: Transacao) => acc + Number(t.valor), 0);
    const despState = periodDespesas
      .reduce((acc: number, d: Despesa) => acc + Number(d.valor), 0);
    return despTrans + despState;
  }, [periodTransacoes, periodDespesas]);

  const saldoLiquido = useMemo(() => totalRecebido - totalDespesas, [totalRecebido, totalDespesas]);

  // 🎯 Renovações pendentes (otimizado: evita loops aninhados)
  const renovacoesPendentes = useMemo(() => {
    const result: Array<{ cliente: Cliente; tipo: string; lastAppt?: string; packageId?: string }> = [];
    const processedClients = new Set<string>();

    // Pré-computar mapas para O(1) lookup
    const agendamentosByCliente = new Map<string, Agendamento[]>();
    agendamentos?.forEach(ag => {
      if (ag.statusAtendimento === 'Cancelado') return;
      const list = agendamentosByCliente.get(ag.clienteId) || [];
      list.push(ag);
      agendamentosByCliente.set(ag.clienteId, list);
    });

    const pacotesByCliente = new Map<string, Pacote[]>();
    pacotes?.forEach(p => {
      const list = pacotesByCliente.get(p.clienteId) || [];
      list.push(p);
      pacotesByCliente.set(p.clienteId, list);
    });

    for (const cliente of clientes || []) {
      if (processedClients.has(cliente.id) || canceladosRenovacao.includes(cliente.id)) continue;
      processedClients.add(cliente.id);

      const clienteAgendamentos = agendamentosByCliente.get(cliente.id) || [];
      const clientePacotes = pacotesByCliente.get(cliente.id) || [];

      const hasApptCurrent = clienteAgendamentos.some(ag => ag.data?.startsWith(currentMonthStr));
      const hasApptPrev = clienteAgendamentos.some(ag => ag.data?.startsWith(prevMonthStr));
      
      const lastAppt = [...clienteAgendamentos]
        .sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0];

      // 1. Fixo Mensal
      const fixoPackage = clientePacotes.find(p => p.tipoPacote === 'Mensal Fixo');
      if (fixoPackage && hasApptPrev && !hasApptCurrent) {
        result.push({
          cliente,
          tipo: 'Fixo Mensal',
          lastAppt: lastAppt?.data,
          packageId: fixoPackage.id
        });
        continue;
      }

      // 2. Avulso - verificar se tem pacote ativo
      const hasActivePackage = clientePacotes.some(p => 
        p.mesReferencia === currentMonthStr || 
        p.itens?.some(i => (i.quantidadeRestante || 0) > 0)
      );

      if ((hasApptCurrent || hasApptPrev) && !hasActivePackage) {
        result.push({
          cliente,
          tipo: 'Avulso',
          lastAppt: lastAppt?.data
        });
      }
    }

    return result;
  }, [clientes, agendamentos, pacotes, canceladosRenovacao, currentMonthStr, prevMonthStr]);

  // 🎯 Resumo do dia (calculado uma vez)
  const atendimentosHoje = useMemo(() => 
    agendamentos?.filter(ag => ag.data === hojeStr && ag.statusAtendimento !== 'Cancelado') || [],
    [agendamentos, hojeStr]
  );

  const tempoTotalOcupacao = useMemo(() => {
    const tempoEfetivo = atendimentosHoje.reduce((acc, ag) => {
      const terapia = terapiaMap.get(ag.terapiaId);
      return acc + (terapia?.duracao || 0);
    }, 0);
    
    const intervalos = atendimentosHoje.length * CONFIG.agenda.intervaloEntreSessoes;
    const pausas = Math.floor(tempoEfetivo / 60) * CONFIG.agenda.pausaPorHoraTrabalhada;
    
    return tempoEfetivo + intervalos + pausas;
  }, [atendimentosHoje, terapiaMap]);

  const isCargaAlta = tempoTotalOcupacao > CONFIG.carga.limiteMinutosAlta;

  // 🎯 Próximos atendimentos (otimizado: parse de data feito uma vez)
  const proximosAtendimentos = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const withTimestamp = (agendamentos || [])
      .filter(ag => ag.data && ag.statusAtendimento === 'Agendado')
      .map(ag => ({ ...ag, __timestamp: parseDateTime(ag.data, ag.hora) }))
      .filter(ag => ag.__timestamp >= todayStart.getTime());
    
    return withTimestamp
      .sort((a, b) => a.__timestamp! - b.__timestamp!)
      .slice(0, CONFIG.ui.proximosAtendimentosLimite);
  }, [agendamentos]);

  // 🎯 Handlers memoizados
  const handleConcluir = useCallback((id: string) => {
    completeAppointment(id);
  }, [completeAppointment]);

  const handleExcluir = useCallback((agendamento: Agendamento) => {
    if (agendamento.pacoteId) {
      confirmAction('Deseja excluir este agendamento e devolver a sessão ao pacote do cliente?', () => {
        const pacote = pacotes?.find(p => p.id === agendamento.pacoteId);
        if (pacote) {
          const updatedItens = (pacote.itens || []).map(item => {
            if (item.terapiaId === agendamento.terapiaId) {
              return { ...item, quantidadeRestante: (item.quantidadeRestante || 0) + 1 };
            }
            return item;
          });
          updatePacote({ ...pacote, itens: updatedItens });
        }
        deleteAgendamento(agendamento.id);
        showNotification('Agendamento excluído e sessão devolvida ao pacote.', 'success');
      }, { isDanger: true });
    } else {
      confirmAction('Deseja realmente excluir este agendamento?', () => {
        deleteAgendamento(agendamento.id);
        showNotification('Agendamento excluído com sucesso.', 'success');
      }, { isDanger: true });
    }
  }, [pacotes, updatePacote, deleteAgendamento, confirmAction, showNotification]);

  const toggleShowValues = useCallback(() => {
    const newValue = !showValues;
    setShowValues(newValue);
    localStorage.setItem('lunara_show_values', String(newValue));
  }, [showValues]);

  // 🎯 Renderização condicional de telas filhas
  if (showFinanceiro) return <FinanceiroScreen onBack={() => setShowFinanceiro(false)} />;
  if (showConfiguracoes) return <ConfiguracoesScreen onBack={() => setShowConfiguracoes(false)} />;
  if (showContasAReceber) return <ContasAReceberScreen onBack={() => setShowContasAReceber(false)} />;

  return (
    <div 
      className="flex flex-col h-full relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="main"
      aria-label="Dashboard principal"
    >
      {/* 🎯 Indicador de Swipe (dica visual acessível) */}
      {showSwipeHint && (
        <div 
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-pulse"
          role="status"
          aria-live="polite"
          aria-label="Dica: deslize da borda esquerda para acessar o modo Freelancer"
        >
          <div className="bg-[var(--color-primary)]/20 backdrop-blur-sm p-4 rounded-r-full border-r border-y border-[var(--color-primary)]/30 shadow-[4px_0_15px_rgba(0,0,0,0.1)]">
            <ChevronLeft size={32} className="text-[var(--color-primary)]" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="p-6 pb-2 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tight">
            Olá, Celso
          </h1>
          <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm mt-1">
            Resumo de {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(now)}
          </p>
        </div>
        <button 
          onClick={toggleShowValues} 
          className="p-2 text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label={showValues ? 'Ocultar valores financeiros' : 'Mostrar valores financeiros'}
          aria-pressed={showValues}
        >
          {showValues ? <Eye size={20} aria-hidden="true" /> : <EyeOff size={20} aria-hidden="true" />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-32">
        {/* Ações Rápidas */}
        <nav className="mt-2 mb-2 flex gap-3 overflow-x-auto no-scrollbar pb-2" aria-label="Ações rápidas">
          <button 
            onClick={() => setShowFinanceiro(true)}
            className="flex items-center gap-2 px-4 py-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl font-bold text-xs shrink-0 transition-transform active:scale-95 border border-[var(--color-primary)]/20 shadow-sm"
            aria-label="Abrir tela financeira"
          >
            <PieChart size={18} aria-hidden="true" />
            Financeiro
          </button>
          <button 
            onClick={() => setShowContasAReceber(true)}
            className="flex items-center gap-2 px-4 py-3 bg-[var(--color-warning)]/10 text-[var(--color-warning)] rounded-2xl font-bold text-xs shrink-0 transition-transform active:scale-95 border border-[var(--color-warning)]/20 shadow-sm"
            aria-label="Ver contas a receber"
          >
            <DollarSign size={18} aria-hidden="true" />
            A Receber
          </button>
          <button 
            onClick={() => setShowConfiguracoes(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs shrink-0 transition-transform active:scale-95 border border-gray-200 dark:border-gray-700 shadow-sm"
            aria-label="Abrir configurações"
          >
            <Settings size={18} aria-hidden="true" />
            Ajustes
          </button>
        </nav>

        {/* Resumo do Dia */}
        <section className="mt-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 p-4 rounded-2xl flex items-center justify-between" aria-labelledby="resumo-dia-title">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0" aria-hidden="true">
              <Calendar size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <p id="resumo-dia-title" className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">Resumo do Dia</p>
                <div className="group relative">
                  <button 
                    className="p-1 hover:bg-black/5 rounded"
                    aria-label="Saiba como é calculado o tempo total"
                  >
                    <Info size={14} className="text-gray-400" aria-hidden="true" />
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl" role="tooltip">
                    Inclui {CONFIG.agenda.intervaloEntreSessoes}min entre sessões e {CONFIG.agenda.pausaPorHoraTrabalhada}min de pausa a cada hora de trabalho efetivo.
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                  Hoje tem {atendimentosHoje.length} atendimento{atendimentosHoje.length !== 1 ? 's' : ''}
                </p>
                <div className={`flex items-center gap-1.5 text-xs font-bold ${
                  isCargaAlta ? `text-${CONFIG.carga.corAlerta}-500 dark:text-${CONFIG.carga.corAlerta}-400` : 'text-[var(--color-primary)]'
                }`}>
                  <Clock size={14} aria-hidden="true" />
                  <span>Tempo Total: {formatDuration(tempoTotalOcupacao)}</span>
                  {isCargaAlta && (
                    <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-md uppercase" aria-label="Carga de trabalho alta hoje">
                      Carga Alta
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Métricas do Mês */}
        <section className="mt-4" aria-labelledby="metricas-mes-title">
          <h2 id="metricas-mes-title" className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-3 px-1">
            Atendimentos do Mês
          </h2>
          <div className="grid grid-cols-3 gap-3" role="list">
            <StatCard 
              value={String(agendamentosMes.filter(ag => ag.statusAtendimento === 'Concluido').length)}
              label="Realizados"
              color="var(--color-success)"
              aria-label={`${agendamentosMes.filter(ag => ag.statusAtendimento === 'Concluido').length} atendimentos realizados este mês`}
            />
            <StatCard 
              value={String(agendamentosMes.filter(ag => ag.statusAtendimento === 'Agendado').length)}
              label="Pendentes"
              color="var(--color-warning)"
              aria-label={`${agendamentosMes.filter(ag => ag.statusAtendimento === 'Agendado').length} atendimentos pendentes este mês`}
            />
            <StatCard 
              value={String(agendamentosMes.length)}
              label="Total"
              color="var(--color-primary)"
              aria-label={`${agendamentosMes.length} atendimentos totais este mês`}
            />
          </div>
        </section>

        {/* Renovações Pendentes */}
        {renovacoesPendentes.length > 0 && (
          <section className="mt-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-[2rem] shadow-sm" aria-labelledby="renovacoes-title">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-[var(--color-primary)]" aria-hidden="true" />
                <h2 id="renovacoes-title" className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Renovações Pendentes
                </h2>
              </div>
              <span className="text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-1 rounded-full" aria-label={`${renovacoesPendentes.length} renovações pendentes`}>
                {renovacoesPendentes.length}
              </span>
            </div>
            
            <div className="space-y-3" role="list" aria-label="Lista de clientes com renovação pendente">
              {renovacoesPendentes.map(item => (
                <RenewalItem
                  key={item.cliente.id}
                  item={item}
                  onRenew={renewPacote}
                  onCancelRenewal={cancelarRenovacao}
                  onOffer={(cliente) => showNotification(`Fluxo de renovação para ${cliente.nome} iniciado.`, 'info')}
                />
              ))}
            </div>
          </section>
        )}

        {/* Financial Cards */}
        <section className="space-y-3 mt-4" aria-labelledby="financeiro-title">
          <h2 id="financeiro-title" className="sr-only">Resumo Financeiro</h2>
          
          {/* Saldo Líquido */}
          <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-5 rounded-2xl shadow-sm border-l-4 border-[var(--color-primary)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm font-medium mb-1">Saldo Líquido</p>
                <h3 className="text-2xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                  {formatCurrency(saldoLiquido, showValues)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]" aria-hidden="true">
                <PieChart size={24} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Recebido</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalRecebido, showValues)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1">Despesas</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-300">{formatCurrency(totalDespesas, showValues)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Pendente */}
            <button 
              onClick={() => setShowContasAReceber(true)}
              className="flex-1 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border-l-4 border-[var(--color-warning)] text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              aria-label={`Ver ${formatCurrency(totalPendente, showValues)} em valores pendentes`}
            >
              <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-xs font-medium mb-1">Pendente</p>
              <h3 className="text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                {formatCurrency(totalPendente, showValues)}
              </h3>
              <Clock size={16} className="text-[var(--color-warning)] mt-2 opacity-50" aria-hidden="true" />
            </button>

            {/* Descontos */}
            <div className="flex-1 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border-l-4 border-blue-500">
              <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-xs font-medium mb-1">Descontos</p>
              <h3 className="text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                {formatCurrency(0, showValues)}
              </h3>
              <Tag size={16} className="text-blue-500 mt-2 opacity-50" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* Próximos Atendimentos */}
        <section className="mt-8" aria-labelledby="proximos-title">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 id="proximos-title" className="text-lg font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              Próximos Atendimentos
            </h2>
            <button 
              className="text-sm font-medium text-[var(--color-primary)] flex items-center hover:underline"
              onClick={() => onNavigate?.('agenda')}
              aria-label="Ver agenda completa"
            >
              Ver agenda <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          {proximosAtendimentos.length === 0 ? (
            <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-6 rounded-2xl shadow-sm text-center border border-dashed border-gray-300 dark:border-gray-700" role="status">
              <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm">
                Nenhum atendimento futuro agendado.
              </p>
            </div>
          ) : (
            <div className="space-y-3" role="list" aria-label="Lista de próximos atendimentos">
              {proximosAtendimentos.map(ag => (
                <AppointmentItem
                  key={ag.id}
                  agendamento={ag}
                  cliente={clienteMap.get(ag.clienteId)}
                  terapia={terapiaMap.get(ag.terapiaId)}
                  onConcluir={handleConcluir}
                  onExcluir={handleExcluir}
                  showValues={showValues}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}