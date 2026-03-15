import React, { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle, AlertTriangle, DollarSign, Calendar, User, Activity } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Agendamento, Cliente, Terapia } from '../types';

interface ConferenciaScreenProps {
  onBack: () => void;
}

export default function ConferenciaScreen({ onBack }: ConferenciaScreenProps) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [terapias, setTerapias] = useState<Terapia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [agends, clis, ters] = await Promise.all([
      StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS),
      StorageService.getItems<Cliente>(StorageKeys.CLIENTES),
      StorageService.getItems<Terapia>(StorageKeys.TERAPIAS),
    ]);

    // Filtra atendimentos dos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const filtered = agends.filter(ag => {
      const agDate = new Date(ag.dataHora);
      return agDate >= sevenDaysAgo && agDate <= new Date() && ag.statusAtendimento !== 'Cancelado';
    }).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());

    setAgendamentos(filtered);
    setClientes(clis);
    setTerapias(ters);
    setLoading(false);
  };

  const handleConfirmAllPaid = async () => {
    const pendentes = agendamentos.filter(ag => ag.statusPagamento === 'Pendente' && ag.statusAtendimento === 'Realizado');
    
    if (pendentes.length === 0) {
      alert('Não existem atendimentos realizados pendentes de pagamento nos últimos 7 dias.');
      return;
    }

    if (window.confirm(`Deseja confirmar o pagamento de ${pendentes.length} atendimentos em lote? (Será definido como PIX na data de hoje)`)) {
      const today = new Date().toISOString().split('T')[0];
      
      for (const ag of pendentes) {
        const updatedAg: Agendamento = {
          ...ag,
          statusPagamento: 'Pago',
          dataPagamento: today,
          formaPagamento: 'PIX'
        };
        await StorageService.updateItem(StorageKeys.AGENDAMENTOS, updatedAg);
      }
      
      loadData();
      alert('Pagamentos confirmados com sucesso!');
    }
  };

  const handleConfirmPaid = async (ag: Agendamento) => {
    const forma = window.prompt('Forma de Pagamento (PIX, Crédito, Débito, Transferência, Dinheiro):', 'PIX');
    if (forma) {
      const updatedAg: Agendamento = {
        ...ag,
        statusPagamento: 'Pago',
        dataPagamento: new Date().toISOString().split('T')[0],
        formaPagamento: forma
      };
      await StorageService.updateItem(StorageKeys.AGENDAMENTOS, updatedAg);
      loadData();
    }
  };

  const getClienteNome = (id: string) => clientes.find(c => c.id === id)?.nome || 'Desconhecido';
  const getTerapiaNome = (id: string) => terapias.find(t => t.id === id)?.nome || 'Desconhecida';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(isoString));
  };

  const pendentesCount = agendamentos.filter(ag => ag.statusPagamento === 'Pendente' && ag.statusAtendimento === 'Realizado').length;

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <div className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            Conferência Semanal
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
            Exibindo atendimentos dos últimos <strong>7 dias</strong>. Use esta tela para conferir seu extrato e dar baixa em pagamentos realizados.
          </p>
        </div>

        {pendentesCount > 0 && (
          <button 
            onClick={handleConfirmAllPaid}
            className="w-full mb-6 py-4 bg-[var(--color-success)] text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <CheckCircle size={20} />
            Confirmar {pendentesCount} como Pago (Lote)
          </button>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-wider px-1">
            Atendimentos Recentes
          </h3>

          {loading ? (
            <div className="py-10 text-center text-[var(--color-text-sec-light)]">Carregando...</div>
          ) : agendamentos.length === 0 ? (
            <div className="py-10 text-center text-[var(--color-text-sec-light)] bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              Nenhum atendimento nos últimos 7 dias.
            </div>
          ) : (
            agendamentos.map(ag => {
              const isPendenteRealizado = ag.statusPagamento === 'Pendente' && ag.statusAtendimento === 'Realizado';
              
              return (
                <div 
                  key={ag.id} 
                  className={`bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border-l-4 transition-all ${
                    isPendenteRealizado ? 'border-[var(--color-warning)] bg-orange-50/30' : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isPendenteRealizado ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                        <Calendar size={16} />
                      </div>
                      <span className="text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">
                        {formatDate(ag.dataHora)}
                      </span>
                    </div>
                    {isPendenteRealizado && (
                      <div className="flex items-center gap-1 text-[var(--color-warning)] animate-pulse">
                        <AlertTriangle size={14} />
                        <span className="text-[10px] font-bold uppercase">Aguardando Pagamento</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                      <User size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                        {getClienteNome(ag.clienteId)}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">
                        <Activity size={12} />
                        <span>{getTerapiaNome(ag.terapiaId)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                        {formatCurrency(ag.valorCobrado)}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ag.statusPagamento === 'Pago' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                      }`}>
                        {ag.statusPagamento}
                      </span>
                    </div>
                  </div>

                  {isPendenteRealizado && (
                    <button 
                      onClick={() => handleConfirmPaid(ag)}
                      className="w-full py-2 bg-[var(--color-warning)]/10 text-[var(--color-warning)] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-warning)]/20 transition-colors"
                    >
                      <DollarSign size={16} />
                      Confirmar Pagamento Individual
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
