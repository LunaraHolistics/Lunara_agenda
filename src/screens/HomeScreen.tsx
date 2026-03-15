import React, { useState, useEffect } from 'react';
import { DollarSign, Clock, Tag, Plus, ChevronRight, PieChart, Settings, Check, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Agendamento, Cliente, Terapia, Pacote } from '../types';
import FinanceiroScreen from './FinanceiroScreen';
import ConfiguracoesScreen from './ConfiguracoesScreen';
import ContasAReceberScreen from './ContasAReceberScreen';
import ConferenciaScreen from './ConferenciaScreen';
import { useAppContext } from '../AppContext';

export default function HomeScreen() {
  const { showNotification, confirmAction } = useAppContext();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [terapias, setTerapias] = useState<Terapia[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [showFinanceiro, setShowFinanceiro] = useState(false);
  const [showConfiguracoes, setShowConfiguracoes] = useState(false);
  const [showContasAReceber, setShowContasAReceber] = useState(false);
  const [showConferencia, setShowConferencia] = useState(false);

  useEffect(() => {
    loadData();
    
    window.addEventListener('storage-sync', loadData);
    return () => window.removeEventListener('storage-sync', loadData);
  }, [showFinanceiro, showConfiguracoes, showContasAReceber, showConferencia]); // Reload when returning from other screens

  const loadData = async () => {
    const [agends, clis, ters, pacs] = await Promise.all([
      StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS),
      StorageService.getItems<Cliente>(StorageKeys.CLIENTES),
      StorageService.getItems<Terapia>(StorageKeys.TERAPIAS),
      StorageService.getItems<Pacote>(StorageKeys.PACOTES),
    ]);
    setAgendamentos(agends);
    setClientes(clis);
    setTerapias(ters);
    setPacotes(pacs);
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Filtra agendamentos do mês atual (não cancelados)
  const agendamentosMes = agendamentos.filter(ag => {
    const date = new Date(ag.dataHora);
    return date.getMonth() === currentMonth && 
           date.getFullYear() === currentYear &&
           ag.statusAtendimento !== 'Cancelado';
  });

  // Cálculos dos Cards
  const pacotesMes = pacotes.filter(p => p.mesReferencia === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
  
  // Receita de Pacotes Fixos
  const receitaPacotesFixosTotal = pacotesMes
    .filter(p => p.tipoPacote === 'Mensal Fixo' && p.tipoCobranca === 'Total' && p.historicoPagamento?.status === 'Pago')
    .reduce((acc, p) => acc + (p.historicoPagamento?.valor || 0), 0);
  
  const receitaPacotesFixosAtendimento = agendamentosMes
    .filter(ag => ag.statusPagamento === 'Pago' && ag.tipoAtendimento === 'Mensal Fixo')
    .reduce((acc, ag) => acc + ag.valorCobrado, 0);
  
  const totalRecebidoFixo = receitaPacotesFixosTotal + receitaPacotesFixosAtendimento;

  // Receita de Atendimentos Avulsos
  const receitaPacotesAvulsosTotal = pacotesMes
    .filter(p => p.tipoPacote === 'Avulso' && p.tipoCobranca === 'Total' && p.historicoPagamento?.status === 'Pago')
    .reduce((acc, p) => acc + (p.historicoPagamento?.valor || 0), 0);
  
  const receitaAtendimentosAvulsos = agendamentosMes
    .filter(ag => ag.statusPagamento === 'Pago' && (ag.tipoAtendimento === 'Avulso' || !ag.tipoAtendimento))
    .reduce((acc, ag) => acc + ag.valorCobrado, 0);
  
  const totalRecebidoAvulso = receitaPacotesAvulsosTotal + receitaAtendimentosAvulsos;

  const totalRecebido = totalRecebidoFixo + totalRecebidoAvulso;

  const totalPendentePacotes = pacotesMes
    .filter(p => p.tipoCobranca === 'Total' && p.historicoPagamento?.status === 'Pendente')
    .reduce((acc, p) => acc + (p.historicoPagamento?.valor || 0), 0);

  const totalPendenteSessoes = agendamentosMes
    .filter(ag => ag.statusPagamento === 'Pendente' && (!ag.pacoteId || pacotes.find(p => p.id === ag.pacoteId)?.tipoCobranca === 'Por Atendimento'))
    .reduce((acc, ag) => acc + ag.valorCobrado, 0);

  const totalPendente = totalPendentePacotes + totalPendenteSessoes;

  const totalDesconto = agendamentosMes
    .reduce((acc, ag) => acc + (ag.desconto || 0), 0) + 
    pacotesMes.reduce((acc, p) => acc + p.valorDescontoTotal, 0);

  // Próximos Atendimentos (Futuros e do dia atual)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const proximosAtendimentos = agendamentos
    .filter(ag => {
      const agDate = new Date(ag.dataHora);
      return agDate.getTime() >= todayStart.getTime() && ag.statusAtendimento === 'Agendado';
    })
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
    .slice(0, 5);

  const handleConcluir = async (agendamento: Agendamento) => {
    const updatedAgendamento = { ...agendamento, statusAtendimento: 'Realizado' as const };
    await StorageService.updateItem(StorageKeys.AGENDAMENTOS, updatedAgendamento);
    loadData();
  };

  const handleExcluir = async (agendamento: Agendamento) => {
    if (agendamento.pacoteId && agendamento.itemPacoteId) {
      confirmAction('Deseja excluir este agendamento e devolver a sessão ao pacote do cliente?', async () => {
        const pacotes = await StorageService.getItems<Pacote>(StorageKeys.PACOTES);
        const pacote = pacotes.find(p => p.id === agendamento.pacoteId);
        if (pacote) {
          const updatedItens = pacote.itens.map(item => {
            if (item.id === agendamento.itemPacoteId) {
              return { ...item, quantidadeRestante: item.quantidadeRestante + 1 };
            }
            return item;
          });
          const updatedPacote = { ...pacote, itens: updatedItens };
          await StorageService.updateItem(StorageKeys.PACOTES, updatedPacote);
        }
        await StorageService.deleteItem(StorageKeys.AGENDAMENTOS, agendamento.id);
        setAgendamentos(prev => prev.filter(a => a.id !== agendamento.id));
        showNotification('Agendamento excluído e sessão devolvida ao pacote.', 'success');
      }, { isDanger: true });
    } else {
      confirmAction('Deseja realmente excluir este agendamento?', async () => {
        await StorageService.deleteItem(StorageKeys.AGENDAMENTOS, agendamento.id);
        setAgendamentos(prev => prev.filter(a => a.id !== agendamento.id));
        showNotification('Agendamento excluído com sucesso.', 'success');
      }, { isDanger: true });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatTime = (isoString: string) => {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(isoString));
  };

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(isoString));
  };

  const getClienteNome = (id: string) => clientes.find(c => c.id === id)?.nome || 'Desconhecido';
  const getTerapiaNome = (id: string) => terapias.find(t => t.id === id)?.nome || 'Desconhecida';

  if (showFinanceiro) {
    return <FinanceiroScreen onBack={() => setShowFinanceiro(false)} />;
  }

  if (showConfiguracoes) {
    return <ConfiguracoesScreen onBack={() => setShowConfiguracoes(false)} />;
  }

  if (showConferencia) {
    return <ConferenciaScreen onBack={() => setShowConferencia(false)} />;
  }

  if (showContasAReceber) {
    return <ContasAReceberScreen onBack={() => setShowContasAReceber(false)} />;
  }

  const pastPendingCount = agendamentos.filter(ag => 
    ag.statusAtendimento === 'Realizado' && 
    ag.statusPagamento === 'Pendente' &&
    new Date(ag.dataHora) < new Date()
  ).length;

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="p-6 pb-2 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tight">
            Olá, Terapeuta
          </h2>
          <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm mt-1">
            Resumo de {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowConferencia(true)}
            className="p-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-full text-orange-500 shadow-sm"
            aria-label="Conferência Semanal"
            title="Conferência Semanal"
          >
            <CheckCircle size={24} />
          </button>
          <button 
            onClick={() => setShowFinanceiro(true)}
            className="p-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-full text-[var(--color-primary)] shadow-sm"
            aria-label="Controle Financeiro"
          >
            <PieChart size={24} />
          </button>
          <button 
            onClick={() => setShowConfiguracoes(true)}
            className="p-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-full text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] shadow-sm"
            aria-label="Configurações"
          >
            <Settings size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {/* Weekly Conference Alert */}
        {pastPendingCount > 0 && (
          <button 
            onClick={() => setShowConferencia(true)}
            className="mt-4 w-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3 rounded-2xl flex items-center gap-3 animate-pulse"
          >
            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider">Conferência Necessária</p>
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Existem <strong>{pastPendingCount}</strong> atendimentos passados aguardando pagamento.
              </p>
            </div>
            <ChevronRight size={20} className="text-orange-400" />
          </button>
        )}
        {/* Financial Cards */}
        <div className="space-y-3 mt-4">
          {/* Recebido */}
          <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-5 rounded-2xl shadow-sm border-l-4 border-[var(--color-success)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm font-medium mb-1">Total Recebido</p>
                <h3 className="text-2xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                  {formatCurrency(totalRecebido)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center text-[var(--color-success)]">
                <DollarSign size={24} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Pacotes Fixos</p>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalRecebidoFixo)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Avulsos</p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalRecebidoAvulso)}</p>
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
                    <span className="text-sm font-bold">{formatDate(ag.dataHora)}</span>
                    <span className="text-xs font-medium">{formatTime(ag.dataHora)}</span>
                    {new Date(ag.dataHora) < new Date() && (
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
                      {getTerapiaNome(ag.terapiaId)}
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
