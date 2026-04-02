import React, { useState, useMemo } from 'react';
import { DollarSign, Clock, Tag, Plus, ChevronRight, ChevronLeft, PieChart, Settings, Check, Trash2, AlertTriangle, CheckCircle, Calendar, Package, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Agendamento } from '../types';
import FinanceiroScreen from './FinanceiroScreen';
import ConfiguracoesScreen from './ConfiguracoesScreen';
import ContasAReceberScreen from './ContasAReceberScreen';
import { useAppContext } from '../AppContext';

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

  const [showFinanceiro, setShowFinanceiro] = useState(false);
  const [showConfiguracoes, setShowConfiguracoes] = useState(false);
  const [showContasAReceber, setShowContasAReceber] = useState(false);
  const [showValues, setShowValues] = useState(() => localStorage.getItem('lunara_show_values') !== 'false');

  // Gestão de Swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const minSwipeDistance = 100; // deltaX > 100

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (touchStartX === null || touchEndX === null || touchStartY === null || touchEndY === null) {
      resetTouch();
      return;
    }

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Swipe Right (Esquerda para Direita)
    const isRightSwipe = deltaX > minSwipeDistance;
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 2;
    const startedNearEdge = touchStartX < 60; // Margem de segurança na borda esquerda

    if (isRightSwipe && isHorizontal && startedNearEdge && onNavigate) {
      if (window.navigator.vibrate) {
        window.navigator.vibrate(10); // Pequeno feedback tátil
      }
      onNavigate('freelancer');
    }
    
    resetTouch();
  };

  const resetTouch = () => {
    setTouchStartX(null);
    setTouchStartY(null);
    setTouchEndX(null);
    setTouchEndY(null);
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Filtra agendamentos do mês atual (não cancelados)
  const currentMonthStr = String(currentMonth + 1).padStart(2, '0');
  const agendamentosMes = useMemo(() => {
    return (agendamentos || []).filter(ag => {
      // Orphan filter: se tiver pacoteId, o pacote deve existir
      if (ag.pacoteId && !(pacotes || []).some(p => p.id === ag.pacoteId)) return false;

      if (!ag.data) return false;
      return String(ag.data).slice(0, 7) === `${currentYear}-${currentMonthStr}` &&
             (ag.statusAtendimento === 'Concluido' || ag.statusAtendimento === 'Agendado');
    });
  }, [agendamentos, pacotes, currentYear, currentMonthStr]);

  // Cálculos dos Cards
  const transacoesMes = useMemo(() => {
    const periodTransacoes = (transacoes || []).filter(t => {
      // Filtro de segmento
      if (t.segmento && t.segmento !== 'holistica') return false;
      
      // Orphan filter: se tiver pacoteId, o pacote deve existir
      if (t.pacoteId && !(pacotes || []).some(p => p.id === t.pacoteId)) return false;

      if (!t.data) return false;
      const date = safeDate(`${t.data}T00:00:00`);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const periodDespesas = (despesas || []).filter(d => {
      // Filtro de segmento
      if (d.segmento && d.segmento !== 'holistica') return false;

      const date = safeDate(`${d.data}T00:00:00`);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    return { transacoes: periodTransacoes, despesas: periodDespesas };
  }, [transacoes, despesas, pacotes, currentMonth, currentYear, safeDate]);

  const totalRecebido = useMemo(() => {
    return (transacoesMes.transacoes || [])
      .filter(t => t.status === 'Pago' && t.tipo === 'Receita' && t.valor != null)
      .reduce((acc, t) => acc + Number(t.valor), 0);
  }, [transacoesMes]);

  const totalPendente = useMemo(() => {
    return (transacoesMes.transacoes || [])
      .filter(t => t.status === 'Pendente' && t.tipo === 'Receita' && t.valor != null)
      .reduce((acc, t) => acc + Number(t.valor), 0);
  }, [transacoesMes]);

  const totalDespesas = useMemo(() => {
    const despesasTransacoes = (transacoesMes.transacoes || [])
      .filter(t => t.status === 'Pago' && t.tipo === 'Despesa' && t.valor != null)
      .reduce((acc, t) => acc + Number(t.valor), 0);
    
    const despesasState = (transacoesMes.despesas || [])
      .reduce((acc, d) => acc + Number(d.valor), 0);
      
    return despesasTransacoes + despesasState;
  }, [transacoesMes]);

  const saldoLiquido = useMemo(() => totalRecebido - totalDespesas, [totalRecebido, totalDespesas]);

  const pacotesMes = useMemo(() => {
    return (pacotes || []).filter(p => {
      const pDate = safeDate(`${p.mesReferencia}-01T00:00:00`);
      return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
    });
  }, [pacotes, currentMonth, currentYear, safeDate]);

  const totalDesconto = useMemo(() => {
    // Cálculo simplificado de descontos (pode ser expandido se houver campo específico)
    return 0; 
  }, []);

  const totalRecebidoFixo = useMemo(() => {
    return (transacoesMes.transacoes || [])
      .filter(t => t.status === 'Pago' && t.tipo === 'Receita' && t.descricao.toLowerCase().includes('pacote'))
      .reduce((acc, t) => acc + Number(t.valor), 0);
  }, [transacoesMes]);

  const totalRecebidoAvulso = useMemo(() => {
    return (transacoesMes.transacoes || [])
      .filter(t => t.status === 'Pago' && t.tipo === 'Receita' && !t.descricao.toLowerCase().includes('pacote'))
      .reduce((acc, t) => acc + Number(t.valor), 0);
  }, [transacoesMes]);

  // Renovações Pendentes
  const renovacoesPendentes = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const list: any[] = [];

    (clientes || []).forEach(cliente => {
      if (canceladosRenovacao.includes(cliente.id)) return;

      const hasApptCurrent = (agendamentos || []).some(ag => 
        ag.clienteId === cliente.id && 
        String(ag.data).slice(0, 7) === currentMonthStr &&
        ag.statusAtendimento !== 'Cancelado'
      );

      const hasApptPrev = (agendamentos || []).some(ag => 
        ag.clienteId === cliente.id && 
        String(ag.data).slice(0, 7) === prevMonthStr &&
        ag.statusAtendimento !== 'Cancelado'
      );

      const lastAppt = (agendamentos || [])
        .filter(ag => ag.clienteId === cliente.id && ag.statusAtendimento !== 'Cancelado')
        .sort((a, b) => String(b.data).localeCompare(String(a.data)))[0];

      // 1. Fixo Mensal
      const fixoPackage = (pacotes || []).find(p => p.clienteId === cliente.id && p.tipoPacote === 'Mensal Fixo');
      if (fixoPackage) {
        if (hasApptPrev && !hasApptCurrent) {
          list.push({
            cliente,
            tipo: 'Fixo Mensal',
            lastAppt: lastAppt?.data,
            packageId: fixoPackage.id
          });
          return; // Don't add as avulso if already added as fixo
        }
      }

      // 2. Avulso
      const hasActivePackageCurrent = (pacotes || []).some(p => 
        p.clienteId === cliente.id && 
        (p.mesReferencia === currentMonthStr || (p.itens || []).some(i => (Number(i.quantidadeRestante) || 0) > 0))
      );

      if ((hasApptCurrent || hasApptPrev) && !hasActivePackageCurrent) {
        list.push({
          cliente,
          tipo: 'Avulso',
          lastAppt: lastAppt?.data
        });
      }
    });

    return list;
  }, [clientes, agendamentos, pacotes, canceladosRenovacao]);

  // Resumo do Dia
  const hojeStr = new Date().toISOString().split('T')[0];
  const atendimentosHoje = useMemo(() => {
    return (agendamentos || []).filter(ag => ag.data === hojeStr && ag.statusAtendimento !== 'Cancelado');
  }, [agendamentos, hojeStr]);

  const tempoTotalOcupacao = useMemo(() => {
    const tempoEfetivo = atendimentosHoje.reduce((acc, ag) => {
      const terapia = (terapias || []).find(t => t.id === ag.terapiaId);
      return acc + (terapia?.duracao || 0);
    }, 0);
    
    const intervalosFixos = atendimentosHoje.length * 10;
    const descansoProlongado = Math.floor(tempoEfetivo / 60) * 15;
    
    return tempoEfetivo + intervalosFixos + descansoProlongado;
  }, [atendimentosHoje, terapias]);

  const isCargaAlta = tempoTotalOcupacao > 240; // 4 horas

  const formatarTempo = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h > 0) {
      return `${h}h${m > 0 ? ` ${m}min` : ''}`;
    }
    return `${m}min`;
  };

  // Alerta de Pacotes (1 sessão restante)
  const pacotesTerminando = useMemo(() => {
    return (pacotes || []).filter(p => {
      const totalRestante = (p.itens || []).reduce((acc, item) => acc + Number(item.quantidadeRestante || 0), 0);
      return totalRestante === 1;
    });
  }, [pacotes]);

  // Métricas de Atendimentos do Mês
  const totalConcluidos = useMemo(() => {
    return agendamentosMes.filter(ag => ag.statusAtendimento === 'Concluido').length;
  }, [agendamentosMes]);

  const totalPendentes = useMemo(() => {
    return agendamentosMes.filter(ag => ag.statusAtendimento === 'Agendado').length;
  }, [agendamentosMes]);

  const totalMes = totalConcluidos + totalPendentes;
  
  // Pacotes Mensais Fixos para Renovar
  const pacotesParaRenovar = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Calculate next month string
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    return (pacotes || []).filter(p => {
      if (p.tipoPacote !== 'Mensal Fixo') return false;
      if (p.mesReferencia !== currentMonthStr) return false;
      
      // Check if already has a package for next month
      const alreadyRenewed = (pacotes || []).some(nextP => 
        nextP.clienteId === p.clienteId && nextP.mesReferencia === nextMonthStr
      );
      
      return !alreadyRenewed;
    });
  }, [pacotes]);

  // Próximos Atendimentos (Futuros e do dia atual)
  const proximosAtendimentos = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const parseDateStr = (d: string, h: string) => {
      if (!d) return 0;
      let dateStr = d.replace(/\//g, '-');
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 2) {
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const dt = new Date(`${dateStr}T${h || '00:00'}`);
      return isNaN(dt.getTime()) ? 0 : dt.getTime();
    };

    return (agendamentos || [])
      .filter(ag => {
        if (!ag.data) return false;
        const time = parseDateStr(ag.data, ag.hora);
        return time >= todayStart.getTime() && ag.statusAtendimento === 'Agendado';
      })
      .sort((a, b) => {
        return parseDateStr(a.data, a.hora) - parseDateStr(b.data, b.hora);
      })
      .slice(0, 5);
  }, [agendamentos]);

  const handleConcluir = (agendamento: Agendamento) => {
    completeAppointment(agendamento.id);
  };

  const handleExcluir = (agendamento: Agendamento) => {
    if (agendamento.pacoteId) {
      confirmAction('Deseja excluir este agendamento e devolver a sessão ao pacote do cliente?', () => {
        const pacote = (pacotes || []).find(p => p.id === agendamento.pacoteId);
        if (pacote) {
          const updatedItens = (pacote.itens || []).map(item => {
            if (item.terapiaId === agendamento.terapiaId) {
              return { ...item, quantidadeRestante: (Number(item.quantidadeRestante) || 0) + 1 };
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
  };

  const formatCurrency = (value: number) => {
    if (!showValues) return 'R$ ****';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatTime = (date: string, time: string) => {
    return time;
  };

  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}`;
  };

  const getClienteNome = (id: string) => {
    const cli = (clientes || []).find(c => c.id === id);
    return cli?.nome || 'Desconhecido';
  };

  const getTerapiaNome = (ag: Agendamento) => {
    const terapia = (terapias || []).find(t => t.id === ag.terapiaId);
    return terapia?.nome || 'Sem nome';
  };

  if (showFinanceiro) {
    return <FinanceiroScreen onBack={() => setShowFinanceiro(false)} />;
  }

  if (showConfiguracoes) {
    return <ConfiguracoesScreen onBack={() => setShowConfiguracoes(false)} />;
  }

  if (showContasAReceber) {
    return <ContasAReceberScreen onBack={() => setShowContasAReceber(false)} />;
  }

  return (
    <div 
      className="flex flex-col h-full relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Indicador de Swipe (Dica Visual) */}
      {touchStartX !== null && touchEndX !== null && (touchEndX - touchStartX > 20) && touchStartX < 60 && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-pulse">
          <div className="bg-[var(--color-primary)]/20 backdrop-blur-sm p-4 rounded-r-full border-r border-y border-[var(--color-primary)]/30 shadow-[4px_0_15px_rgba(0,0,0,0.1)]">
            <ChevronLeft size={32} className="text-[var(--color-primary)]" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 pb-2 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tight">
            Olá, Celso
          </h2>
          <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm mt-1">
            Resumo de {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}
          </p>
        </div>
        <button onClick={() => { const newValue = !showValues; setShowValues(newValue); localStorage.setItem('lunara_show_values', String(newValue)); }} className="p-2 text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">
          {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32">
        {/* Ações Rápidas */}
        <div className="mt-2 mb-2 flex gap-3 overflow-x-auto no-scrollbar pb-2">
          <button 
            onClick={() => setShowFinanceiro(true)}
            className="flex items-center gap-2 px-4 py-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl font-bold text-xs shrink-0 transition-transform active:scale-95 border border-[var(--color-primary)]/20 shadow-sm"
          >
            <PieChart size={18} />
            Financeiro
          </button>
          <button 
            onClick={() => setShowContasAReceber(true)}
            className="flex items-center gap-2 px-4 py-3 bg-[var(--color-warning)]/10 text-[var(--color-warning)] rounded-2xl font-bold text-xs shrink-0 transition-transform active:scale-95 border border-[var(--color-warning)]/20 shadow-sm"
          >
            <DollarSign size={18} />
            A Receber
          </button>
          <button 
            onClick={() => setShowConfiguracoes(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs shrink-0 transition-transform active:scale-95 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <Settings size={18} />
            Ajustes
          </button>
        </div>

        {/* Resumo do Dia */}
        <div className="mt-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">Resumo do Dia</p>
                <div className="group relative">
                  <AlertTriangle size={14} className="text-gray-400 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                    Inclui 10min entre sessões e 15min de pausa a cada hora de trabalho efetivo.
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                  Hoje tem {atendimentosHoje.length} atendimento{atendimentosHoje.length !== 1 ? 's' : ''}
                </p>
                <div className={`flex items-center gap-1.5 text-xs font-bold ${isCargaAlta ? 'text-orange-500 dark:text-orange-400' : 'text-[var(--color-primary)]'}`}>
                  <Clock size={14} />
                  <span>Tempo Total (Terapias + Intervalos): {formatarTempo(tempoTotalOcupacao)}</span>
                  {isCargaAlta && <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-md uppercase">Carga Alta</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas do Mês */}
        <div className="mt-4">
          <h3 className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-3 px-1">
            Atendimentos do Mês
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[var(--color-success)]">{totalConcluidos}</span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Realizados</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[var(--color-warning)]">{totalPendentes}</span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Pendentes</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[var(--color-primary)]">{totalMes}</span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Total</span>
            </div>
          </div>
        </div>

        {/* Weekly Conference Alert */}
        {/* Removed Conference Alert */}

        {/* Renovações Pendentes */}
        {renovacoesPendentes.length > 0 && (
          <div className="mt-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-[2rem] shadow-sm">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-[var(--color-primary)]" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Renovações Pendentes</h3>
              </div>
              <span className="text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-1 rounded-full">
                {renovacoesPendentes.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {renovacoesPendentes.map(item => (
                <div key={item.cliente.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.cliente.nome}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          item.tipo === 'Fixo Mensal' 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {item.tipo}
                        </span>
                        {item.lastAppt && (
                          <span className="text-[10px] text-zinc-500">Último: {formatDate(item.lastAppt)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {item.tipo === 'Fixo Mensal' ? (
                      <>
                        <button 
                          onClick={() => confirmAction(`Deseja renovar o pacote de ${item.cliente.nome}?`, () => renewPacote(item.packageId))}
                          className="flex-1 bg-[var(--color-primary)] text-white text-[10px] font-black py-2.5 rounded-xl shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-transform"
                        >
                          RENOVAR
                        </button>
                        <button 
                          onClick={() => confirmAction(`Deseja cancelar a renovação de ${item.cliente.nome} para este mês?`, () => cancelarRenovacao(item.cliente.id))}
                          className="px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-black py-2.5 rounded-xl active:scale-95 transition-transform"
                        >
                          CANCELAR
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => showNotification(`Fluxo de renovação para ${item.cliente.nome} iniciado.`, 'info')}
                        className="flex-1 bg-emerald-500 text-white text-[10px] font-black py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                      >
                        OFERECER RENOVAÇÃO
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Cards */}
        <div className="space-y-3 mt-4">
          {/* Saldo Líquido */}
          <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-5 rounded-2xl shadow-sm border-l-4 border-[var(--color-primary)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm font-medium mb-1">Saldo Líquido</p>
                <h3 className="text-2xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                  {formatCurrency(saldoLiquido)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                <PieChart size={24} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Recebido</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalRecebido)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1">Despesas</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-300">{formatCurrency(totalDespesas)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Pendente */}
            <button 
              onClick={() => setShowContasAReceber(true)}
              className="flex-1 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border-l-4 border-[var(--color-warning)] text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-xs font-medium mb-1">Pendente</p>
              <h3 className="text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                {formatCurrency(totalPendente)}
              </h3>
              <Clock size={16} className="text-[var(--color-warning)] mt-2 opacity-50" />
            </button>

            {/* Descontos */}
            <div className="flex-1 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border-l-4 border-blue-500">
              <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-xs font-medium mb-1">Descontos</p>
              <h3 className="text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                {formatCurrency(totalDesconto)}
              </h3>
              <Tag size={16} className="text-blue-500 mt-2 opacity-50" />
            </div>
          </div>
        </div>

        {/* Próximos Atendimentos */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-lg font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              Próximos Atendimentos
            </h3>
            <button className="text-sm font-medium text-[var(--color-primary)] flex items-center">
              Ver agenda <ChevronRight size={16} />
            </button>
          </div>

          {proximosAtendimentos.length === 0 ? (
            <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-6 rounded-2xl shadow-sm text-center border border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm">
                Nenhum atendimento futuro agendado.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {proximosAtendimentos.map(ag => (
                <div key={ag.id} className={`bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm flex items-center gap-4 border-l-4 ${ag.statusPagamento === 'Pago' ? 'border-[var(--color-success)]' : 'border-[var(--color-warning)]'}`}>
                  <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl relative ${ag.statusPagamento === 'Pago' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'}`}>
                    <span className="text-sm font-bold">{formatDate(ag.data)}</span>
                    <span className="text-xs font-medium">{formatTime(ag.data, ag.hora)}</span>
                    {safeDate(`${ag.data}T${ag.hora}`) < new Date() && (
                      <div className="absolute -top-1 -right-1 bg-gray-400 text-white rounded-full p-0.5 shadow-sm">
                        <Clock size={10} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                      {getClienteNome(ag.clienteId)}
                    </h4>
                    <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-0.5">
                      {getTerapiaNome(ag)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleConcluir(ag)}
                      className="p-2 bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-full hover:bg-[var(--color-success)]/20 transition-colors"
                      title="Marcar como realizado"
                    >
                      <Check size={18} />
                    </button>
                    <button 
                      onClick={() => handleExcluir(ag)}
                      className="p-2 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-full hover:bg-[var(--color-error)]/20 transition-colors"
                      title="Excluir agendamento"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB - Removido conforme solicitação */}
    </div>
  );
}
