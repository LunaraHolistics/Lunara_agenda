import React, { useState, useMemo } from 'react';
import { DollarSign, Clock, Tag, Plus, ChevronRight, PieChart, Settings, Check, Trash2, AlertTriangle, CheckCircle, Calendar, Package, Eye, EyeOff } from 'lucide-react';
import { Agendamento } from '../types';
import FinanceiroScreen from './FinanceiroScreen';
import ConfiguracoesScreen from './ConfiguracoesScreen';
import ContasAReceberScreen from './ContasAReceberScreen';
import { useAppContext } from '../AppContext';

export default function HomeScreen() {
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
    despesas
  } = useAppContext();

  const [showFinanceiro, setShowFinanceiro] = useState(false);
  const [showConfiguracoes, setShowConfiguracoes] = useState(false);
  const [showContasAReceber, setShowContasAReceber] = useState(false);
  const [showValues, setShowValues] = useState(() => localStorage.getItem('lunara_show_values') !== 'false');

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
      // Orphan filter: se tiver pacoteId, o pacote deve existir
      if (t.pacoteId && !(pacotes || []).some(p => p.id === t.pacoteId)) return false;

      if (!t.data) return false;
      const date = safeDate(`${t.data}T00:00:00`);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const periodDespesas = (despesas || []).filter(d => {
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
    <div className="flex flex-col h-full relative">
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

      <div className="flex-1 overflow-y-auto px-4 pb-24">
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

        {/* Alerta de Pacotes a Terminar */}
        {pacotesTerminando.length > 0 && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-blue-500" />
              <h3 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Pacotes a Terminar (1 sessão)</h3>
            </div>
            <div className="space-y-2">
              {pacotesTerminando.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2.5 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900/50">
                  <span className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] truncate">
                    {getClienteNome(p.clienteId)}
                  </span>
                  <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md">
                    RENOVAR
                  </span>
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

      {/* FAB - Novo Atendimento Rápido */}
      <button 
        onClick={() => showNotification('Para agendar, acesse a aba Agenda e arraste um cliente para o calendário.', 'info')}
        className="absolute bottom-6 right-6 h-14 px-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity z-20 gap-2 font-medium"
      >
        <Plus size={24} />
        <span>Atendimento</span>
      </button>
    </div>
  );
}
