import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, CheckCircle, Calendar, DollarSign, CreditCard, Banknote, Landmark, User, X } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Agendamento, Cliente, Terapia, Pacote } from '../types';
import { useAppContext } from '../AppContext';
import { supabase } from '../supabaseClient';

interface ContasAReceberScreenProps {
  onBack: () => void;
}

type Pendencia = {
  id: string;
  tipo: 'agendamento' | 'pacote';
  clienteId: string;
  clienteNome: string;
  descricao: string;
  valor: number;
  dataOriginal: string;
  originalItem: Agendamento | Pacote;
};

export default function ContasAReceberScreen({ onBack }: ContasAReceberScreenProps) {
  const { showNotification, session } = useAppContext();
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal Baixa
  const [selectedPendencia, setSelectedPendencia] = useState<Pendencia | null>(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [banco, setBanco] = useState('');
  const [valorFinal, setValorFinal] = useState(0);

  useEffect(() => {
    loadPendencias();
  }, []);

  const loadPendencias = async () => {
    setLoading(true);
    try {
      const [agends, clis, pacs] = await Promise.all([
        StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS),
        StorageService.getItems<Cliente>(StorageKeys.CLIENTES),
        StorageService.getItems<Pacote>(StorageKeys.PACOTES),
      ]);

      const list: Pendencia[] = [];

      // Pacotes Pendentes
      pacs.forEach(p => {
        let hist: any = p.historicoPagamento;
        if (typeof hist === 'string') {
          try { hist = JSON.parse(hist); } catch (e) { hist = {}; }
        }

        if (hist?.status === 'Pendente') {
          const cliente = clis.find(c => String(c.id) === String(p.clienteId));
          list.push({
            id: p.id,
            tipo: 'pacote',
            clienteId: p.clienteId,
            clienteNome: cliente?.name || 'Desconhecido',
            descricao: `Pacote - ${p.mesReferencia || 'Mensal'}`,
            valor: Number(hist?.valor || p.valorFinal) || 0,
            dataOriginal: new Date().toISOString(),
            originalItem: p
          });
        }
      });

      // Agendamentos Pendentes
      agends.forEach(ag => {
        if (ag.statusPagamento === 'Pendente') {
          const isFromTotalPackage = ag.packageId && pacs.find(p => String(p.id) === String(ag.packageId))?.tipoPacote === 'Mensal Fixo';
          
          if (!isFromTotalPackage) {
            const cliente = clis.find(c => String(c.id) === String(ag.clientId));
            list.push({
              id: ag.id,
              tipo: 'agendamento',
              clienteId: ag.clientId,
              clienteNome: cliente?.name || 'Desconhecido',
              descricao: ag.therapyName || 'Atendimento',
              valor: Number(ag.valorCobrado) || 0,
              dataOriginal: ag.date ? `${ag.date}T${ag.time || '00:00'}:00` : new Date().toISOString(),
              originalItem: ag
            });
          }
        }
      });

      setPendencias(list.sort((a, b) => new Date(b.dataOriginal).getTime() - new Date(a.dataOriginal).getTime()));
    } catch (error) {
      console.error("Erro ao carregar pendências:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmBaixa = async () => {
    if (!selectedPendencia || !session?.user?.id) {
      showNotification('Sessão inválida ou pendência não selecionada.', 'error');
      return;
    }

    try {
      const transacoes = await StorageService.getItems<any>(StorageKeys.TRANSACOES);
      let transacaoExistente = null;

      if (selectedPendencia.tipo === 'pacote') {
        transacaoExistente = transacoes.find(t => t.pacoteId === selectedPendencia.id);
      } else {
        transacaoExistente = transacoes.find(t => t.agendamentoId === selectedPendencia.id);
      }

      const transacaoFinanceira = {
        id: transacaoExistente ? transacaoExistente.id : crypto.randomUUID(),
        userId: session.user.id,
        descricao: `Recebimento: ${selectedPendencia.clienteNome} (${selectedPendencia.descricao})`,
        valor: Number(valorFinal),
        data: dataPagamento,
        dataPagamento: dataPagamento,
        metodo: formaPagamento,
        categoria: selectedPendencia.tipo === 'pacote' ? 'Pacotes' : 'Atendimento',
        status: 'Pago',
        pacoteId: selectedPendencia.tipo === 'pacote' ? selectedPendencia.id : null
      };

      // Background persistence
      const persist = async () => {
        try {
          if (transacaoExistente) {
            await StorageService.updateItem(StorageKeys.TRANSACOES, transacaoFinanceira);
          } else {
            await StorageService.saveItem(StorageKeys.TRANSACOES, transacaoFinanceira);
          }
          
          // Atualizar o item de origem (Pacote ou Agendamento)
          if (selectedPendencia.tipo === 'pacote') {
            const p = selectedPendencia.originalItem as Pacote;
            const updatedPacote: Pacote = {
              ...p,
              historicoPagamento: {
                status: 'Pago',
                valor: valorFinal,
                data: dataPagamento,
                forma: formaPagamento,
                banco: banco || undefined
              }
            };
            await StorageService.updateItem(StorageKeys.PACOTES, updatedPacote);
          } else {
            const ag = selectedPendencia.originalItem as Agendamento;
            const updatedAg: Agendamento = {
              ...ag,
              statusPagamento: 'Pago',
              valorCobrado: valorFinal,
              dataPagamento: dataPagamento,
              formaPagamento: formaPagamento,
              bancoPagamento: banco || undefined
            };
            await StorageService.updateItem(StorageKeys.AGENDAMENTOS, updatedAg);
          }
        } catch (err) {
          console.error("Erro na persistência da baixa:", err);
          showNotification('Erro ao salvar no banco. Verifique sua conexão.', 'error');
        }
      };

      persist();
      
      // Atualiza estado local imediatamente
      setPendencias(prev => prev.filter(p => p.id !== selectedPendencia.id));
      setSelectedPendencia(null);
      showNotification('Baixa realizada e financeiro atualizado!', 'success');
      window.dispatchEvent(new Event('storage-sync'));

    } catch (error: any) {
      console.error('Erro técnico na baixa:', error);
      showNotification('Falha ao processar baixa.', 'error');
    }
  };

  const filteredPendencias = pendencias.filter(p => 
    (p.clienteNome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.descricao?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(isoString));
    } catch (e) {
      return isoString;
    }
  };

  const getPaymentIcon = (forma?: string) => {
    switch (forma) {
      case 'PIX': return <CreditCard size={16} />;
      case 'Crédito': return <CreditCard size={16} />;
      case 'Débito': return <CreditCard size={16} />;
      case 'Transferência': return <Landmark size={16} />;
      case 'Dinheiro': return <Banknote size={16} />;
      default: return <DollarSign size={16} />;
    }
  };

  const handleDarBaixa = async (item: any) => {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('financeiro')
        .update({ 
          status: 'Pago',
          data_pagamento: hoje
        })
        .eq('id', item.id);

      if (error) throw error;

      showNotification('Pagamento confirmado e fluxo atualizado!', 'success');
      
      // IMPORTANTE: Dispare a função que recarrega os dados da tela
      loadPendencias();

    } catch (error) {
      showNotification('Erro ao processar baixa', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      <div className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            Contas a Receber
          </h1>
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar cliente ou serviço..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : filteredPendencias.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">Nenhuma pendência encontrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPendencias.map(p => (
              <div key={`${p.tipo}-${p.id}`} className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-[var(--color-primary)]" />
                      <h4 className="font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">{p.clienteNome}</h4>
                    </div>
                    <p className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">{p.descricao}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-xs text-[var(--color-text-sec-light)]">
                        <Calendar size={12} />
                        <span>{formatDate(p.dataOriginal)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-warning)]">
                        <DollarSign size={12} />
                        <span>{formatCurrency(p.valor)}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedPendencia(p); setValorFinal(p.valor); }}
                    className="flex flex-col items-center gap-1 p-2 bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-xl hover:bg-[var(--color-success)]/20 transition-colors"
                  >
                    <CheckCircle size={20} />
                    <span className="text-[10px] font-bold uppercase">Baixa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPendencia && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                Confirmar Recebimento
              </h2>
              <button onClick={() => setSelectedPendencia(null)} className="text-gray-400 p-1">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-[var(--color-text-sec-light)] uppercase font-bold tracking-wider mb-1">Cliente</p>
                <p className="font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">{selectedPendencia.clienteNome}</p>
                <p className="text-sm text-[var(--color-text-sec-light)] mt-1">{selectedPendencia.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Data Pagamento</label>
                  <input 
                    type="date" 
                    value={dataPagamento}
                    onChange={e => setDataPagamento(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Valor Final (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={valorFinal}
                    onChange={e => setValorFinal(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {['PIX', 'Crédito', 'Débito', 'Transferência', 'Dinheiro'].map(forma => (
                    <button
                      key={forma}
                      onClick={() => setFormaPagamento(forma)}
                      className={`py-2 px-1 rounded-xl text-xs font-medium border transition-all flex flex-col items-center gap-1 ${
                        formaPagamento === forma 
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                          : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-sec-light)] border-gray-100 dark:border-gray-800'
                      }`}
                    >
                      {getPaymentIcon(forma)}
                      {forma}
                    </button>
                  ))}
                </div>
              </div>

              {formaPagamento === 'Transferência' && (
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Nome do Banco</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Nubank, Itaú..."
                    value={banco}
                    onChange={e => setBanco(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                  />
                </div>
              )}

              <button 
                onClick={confirmBaixa}
                className="w-full py-4 bg-[var(--color-success)] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity mt-4 flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}