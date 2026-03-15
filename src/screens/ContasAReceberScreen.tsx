import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, CheckCircle, Calendar, DollarSign, CreditCard, Banknote, Landmark, User, X } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Agendamento, Cliente, Terapia, Pacote, PagamentoInfo } from '../types';

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
    const [agends, clis, ters, pacs] = await Promise.all([
      StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS),
      StorageService.getItems<Cliente>(StorageKeys.CLIENTES),
      StorageService.getItems<Terapia>(StorageKeys.TERAPIAS),
      StorageService.getItems<Pacote>(StorageKeys.PACOTES),
    ]);

    const list: Pendencia[] = [];

    // Pacotes Pendentes (Tipo Total)
    pacs.forEach(p => {
      if (p.tipoCobranca === 'Total' && p.historicoPagamento?.status === 'Pendente') {
        const cliente = clis.find(c => c.id === p.clienteId);
        list.push({
          id: p.id,
          tipo: 'pacote',
          clienteId: p.clienteId,
          clienteNome: cliente?.nome || 'Desconhecido',
          descricao: `Pacote - ${p.mesReferencia}`,
          valor: p.historicoPagamento?.valor || p.valorFinal,
          dataOriginal: p.dataCriacao,
          originalItem: p
        });
      }
    });

    // Agendamentos Pendentes
    agends.forEach(ag => {
      if (ag.statusPagamento === 'Pendente') {
        // Só conta se não for de um pacote "Total"
        const isFromTotalPackage = ag.pacoteId && pacs.find(p => p.id === ag.pacoteId)?.tipoCobranca === 'Total';
        if (!isFromTotalPackage) {
          const cliente = clis.find(c => c.id === ag.clienteId);
          const therapyNames = ag.terapiaIds 
            ? ag.terapiaIds.map(tid => ters.find(t => t.id === tid)?.nome).filter(Boolean).join(' + ')
            : (ters.find(t => t.id === ag.terapiaId)?.nome || 'Atendimento');
            
          list.push({
            id: ag.id,
            tipo: 'agendamento',
            clienteId: ag.clienteId,
            clienteNome: cliente?.nome || 'Desconhecido',
            descricao: therapyNames,
            valor: ag.valorCobrado,
            dataOriginal: ag.dataHora,
            originalItem: ag
          });
        }
      }
    });

    setPendencias(list.sort((a, b) => new Date(b.dataOriginal).getTime() - new Date(a.dataOriginal).getTime()));
    setLoading(false);
  };

  const handleDarBaixa = (pendencia: Pendencia) => {
    setSelectedPendencia(pendencia);
    setValorFinal(pendencia.valor);
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setFormaPagamento('PIX');
    setBanco('');
  };

  const confirmBaixa = async () => {
    if (!selectedPendencia) return;

    try {
      if (selectedPendencia.tipo === 'pacote') {
        // Buscar o pacote mais recente do storage para evitar sobrescrever dados
        const allPacotes = await StorageService.getItems<Pacote>(StorageKeys.PACOTES);
        const p = allPacotes.find(item => String(item.id) === String(selectedPendencia.id));
        
        if (!p) {
          alert('Pacote não encontrado para atualização.');
          return;
        }

        const updatedPacote: Pacote = {
          ...p,
          historicoPagamento: {
            status: 'Pago',
            valor: valorFinal,
            data: dataPagamento,
            forma: formaPagamento,
            banco: formaPagamento === 'Transferência' ? banco : undefined
          }
        };
        
        await StorageService.updateItem(StorageKeys.PACOTES, updatedPacote);
        console.log('DEBUG: Pagamento de Pacote Total registrado com sucesso:', updatedPacote.id);
      } else {
        const allAgendamentos = await StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS);
        const ag = allAgendamentos.find(item => String(item.id) === String(selectedPendencia.id));
        
        if (!ag) {
          alert('Agendamento não encontrado para atualização.');
          return;
        }

        const updatedAg: Agendamento = {
          ...ag,
          statusPagamento: 'Pago',
          valorCobrado: valorFinal,
          dataPagamento: dataPagamento,
          formaPagamento: formaPagamento,
          bancoPagamento: formaPagamento === 'Transferência' ? banco : undefined
        };
        await StorageService.updateItem(StorageKeys.AGENDAMENTOS, updatedAg);
        console.log('DEBUG: Pagamento de Agendamento Avulso registrado com sucesso:', updatedAg.id);
      }

      alert('Baixa realizada com sucesso!');
      setSelectedPendencia(null);
      loadPendencias();
    } catch (error: any) {
      console.error('Erro ao confirmar baixa:', error);
      alert('Erro ao confirmar baixa: ' + error.message);
    }
  };

  const filteredPendencias = pendencias.filter(p => 
    p.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(isoString));
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

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
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

      {/* Search Bar */}
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

      {/* List */}
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
                    onClick={() => handleDarBaixa(p)}
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

      {/* Modal Baixa */}
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
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] border border-gray-100 dark:border-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Valor Final (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={valorFinal}
                    onChange={e => setValorFinal(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] border border-gray-100 dark:border-gray-800 font-bold"
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
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] border border-gray-100 dark:border-gray-800"
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
