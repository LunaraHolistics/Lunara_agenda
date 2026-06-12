import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { ChevronLeft, Search, CheckCircle, Calendar, DollarSign, CreditCard, Banknote, Landmark, User, X, Settings as SettingsIcon, AlertCircle, Loader2, Filter } from 'lucide-react';
import { Agendamento, Cliente, Terapia, Pacote, Transacao } from '../types';
import { useAppContext } from '../AppContext';

// ======================
// TYPES E CONSTANTES
// ======================

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

type FormaPagamento = 'PIX' | 'Crédito' | 'Débito' | 'Transferência' | 'Dinheiro';

interface BaixaFormState {
  dataPagamento: string;
  formaPagamento: FormaPagamento;
  banco: string;
  valorFinal: number;
}

const CONFIG = {
  formasPagamento: ['PIX', 'Crédito', 'Débito', 'Transferência', 'Dinheiro'] as const,
  defaultFormaPagamento: 'PIX' as FormaPagamento,
  animationDuration: 200
} as const;

// ======================
// UTILITÁRIOS PURE
// ======================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatDate = (isoString: string): string => {
  try {
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).format(new Date(isoString));
  } catch (e) {
    return isoString;
  }
};

const getPaymentIcon = (forma?: string): React.ReactNode => {
  switch (forma) {
    case 'PIX': return <CreditCard size={16} aria-hidden="true" />;
    case 'Crédito': return <CreditCard size={16} aria-hidden="true" />;
    case 'Débito': return <CreditCard size={16} aria-hidden="true" />;
    case 'Transferência': return <Landmark size={16} aria-hidden="true" />;
    case 'Dinheiro': return <Banknote size={16} aria-hidden="true" />;
    default: return <DollarSign size={16} aria-hidden="true" />;
  }
};

// ======================
// SUB-COMPONENTES MEMOIZED
// ======================

interface PendenciaCardProps {
  pendencia: Pendencia;
  onBaixa: (p: Pendencia) => void;
  onEditar: (p: Pendencia) => void;
  onExcluir: (p: Pendencia) => void;
}

const PendenciaCard = memo(({ pendencia, onBaixa, onEditar, onExcluir }: PendenciaCardProps) => {
  return (
    <article 
      className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
      role="listitem"
      aria-label={`Pendência de ${pendencia.clienteNome}: ${pendencia.descricao}, valor ${formatCurrency(pendencia.valor)}`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-[var(--color-primary)] shrink-0" aria-hidden="true" />
            <h4 className="font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] truncate">
              {pendencia.clienteNome}
            </h4>
            <span 
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                pendencia.tipo === 'pacote' 
                  ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' 
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
              }`}
              aria-label={`Tipo: ${pendencia.tipo}`}
            >
              {pendencia.tipo === 'pacote' ? 'Pacote' : 'Sessão'}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] truncate">
            {pendencia.descricao}
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">
              <Calendar size={12} aria-hidden="true" />
              <span>{formatDate(pendencia.dataOriginal)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-warning)]">
              <DollarSign size={12} aria-hidden="true" />
              <span>{formatCurrency(pendencia.valor)}</span>
            </div>
          </div>
        </div>
        
        <nav className="flex gap-2 shrink-0" role="group" aria-label={`Ações para pendência de ${pendencia.clienteNome}`}>
          <button 
            onClick={() => onEditar(pendencia)}
            className="flex flex-col items-center gap-1 p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`Editar pendência de ${pendencia.clienteNome}`}
            title="Editar pendência"
          >
            <SettingsIcon size={20} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase">Editar</span>
          </button>
          <button 
            onClick={() => onBaixa(pendencia)}
            className="flex flex-col items-center gap-1 p-2 bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-xl hover:bg-[var(--color-success)]/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-success)]"
            aria-label={`Dar baixa na pendência de ${pendencia.clienteNome}`}
            title="Confirmar recebimento"
          >
            <CheckCircle size={20} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase">Baixa</span>
          </button>
          <button 
            onClick={() => onExcluir(pendencia)}
            className="flex flex-col items-center gap-1 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label={`Excluir pendência de ${pendencia.clienteNome}`}
            title="Excluir pendência"
          >
            <X size={20} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase">Excluir</span>
          </button>
        </nav>
      </div>
    </article>
  );
});
PendenciaCard.displayName = 'PendenciaCard';

interface BaixaModalProps {
  isOpen: boolean;
  pendencia: Pendencia | null;
  onClose: () => void;
  onConfirm: (data: BaixaFormState) => void;
}

const BaixaModal: React.FC<BaixaModalProps> = ({ isOpen, pendencia, onClose, onConfirm }) => {
  const [form, setForm] = useState<BaixaFormState>({
    dataPagamento: new Date().toISOString().split('T')[0],
    formaPagamento: CONFIG.defaultFormaPagamento,
    banco: '',
    valorFinal: 0
  });

  // Reset form when modal opens or pendencia changes
  React.useEffect(() => {
    if (isOpen && pendencia) {
      setForm({
        dataPagamento: new Date().toISOString().split('T')[0],
        formaPagamento: CONFIG.defaultFormaPagamento,
        banco: '',
        valorFinal: pendencia.valor
      });
    }
  }, [isOpen, pendencia]);

  // Keyboard shortcut: ESC to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !pendencia) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(form);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="baixa-modal-title"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="baixa-modal-title" className="text-xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            Confirmar Recebimento
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 p-1 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Fechar modal"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resumo da Pendência */}
          <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase font-bold tracking-wider mb-1">
              Cliente
            </p>
            <p className="font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              {pendencia.clienteNome}
            </p>
            <p className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-1">
              {pendencia.descricao}
            </p>
            <p className="text-lg font-bold text-[var(--color-warning)] mt-2">
              {formatCurrency(pendencia.valor)}
            </p>
          </div>

          {/* Data e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="data-pagamento" className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-1">
                Data Pagamento
              </label>
              <input 
                id="data-pagamento"
                type="date" 
                value={form.dataPagamento}
                onChange={e => setForm(prev => ({ ...prev, dataPagamento: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-[var(--color-primary)]"
                aria-label="Data do pagamento"
                required
              />
            </div>
            <div>
              <label htmlFor="valor-final" className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-1">
                Valor Final (R$)
              </label>
              <input 
                id="valor-final"
                type="number" 
                step="0.01"
                min="0"
                value={form.valorFinal}
                onChange={e => setForm(prev => ({ ...prev, valorFinal: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800 font-bold focus:ring-2 focus:ring-[var(--color-primary)]"
                aria-label="Valor final recebido"
                required
              />
            </div>
          </div>

          {/* Forma de Pagamento */}
          <fieldset>
            <legend className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-2">
              Forma de Pagamento
            </legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Selecionar forma de pagamento">
              {CONFIG.formasPagamento.map(forma => (
                <button
                  key={forma}
                  type="button"
                  role="radio"
                  aria-checked={form.formaPagamento === forma}
                  onClick={() => setForm(prev => ({ ...prev, formaPagamento: forma }))}
                  className={`py-2 px-1 rounded-xl text-xs font-medium border transition-all flex flex-col items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    form.formaPagamento === forma 
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                      : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {getPaymentIcon(forma)}
                  {forma}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Banco (apenas para Transferência) */}
          {form.formaPagamento === 'Transferência' && (
            <div>
              <label htmlFor="banco" className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-1">
                Nome do Banco
              </label>
              <input 
                id="banco"
                type="text" 
                placeholder="Ex: Nubank, Itaú..."
                value={form.banco}
                onChange={e => setForm(prev => ({ ...prev, banco: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-[var(--color-primary)]"
                aria-label="Nome do banco para transferência"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 text-sm font-bold bg-[var(--color-success)] text-white rounded-xl shadow-lg shadow-[var(--color-success)]/20 transition-transform active:scale-95 hover:opacity-90 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} aria-hidden="true" />
              Confirmar Recebimento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================
// HOOK: usePendencias
// ======================

interface UsePendenciasProps {
  pacotes: Pacote[];
  agendamentos: Agendamento[];
  clientes: Cliente[];
  terapias: Terapia[];
  transacoes: Transacao[];
}

const usePendencias = ({ pacotes, agendamentos, clientes, terapias, transacoes }: UsePendenciasProps) => {
  return useMemo(() => {
    const list: Pendencia[] = [];

    // Pacotes Pendentes
    (pacotes || []).forEach(p => {
      if (p.statusPagamento === 'Pendente' || !p.statusPagamento) {
        const cliente = (clientes || []).find(c => c.id === p.clienteId);
        list.push({
          id: p.id,
          tipo: 'pacote',
          clienteId: p.clienteId,
          clienteNome: cliente?.nome || 'Desconhecido',
          descricao: `Pacote - ${p.mesReferencia || 'Mensal'}`,
          valor: p.valorFinal || 0,
          dataOriginal: new Date().toISOString(),
          originalItem: p
        });
      }
    });

    // Agendamentos Pendentes
    (agendamentos || []).forEach(ag => {
      if (ag.statusPagamento === 'Pendente') {
        // Se for de um pacote mensal fixo, o pagamento é pelo pacote, não pelo agendamento
        const pacote = ag.pacoteId ? (pacotes || []).find(p => p.id === ag.pacoteId) : null;
        const isFromTotalPackage = pacote?.tipoPacote === 'Mensal Fixo';
        
        if (!isFromTotalPackage) {
          const cliente = (clientes || []).find(c => c.id === ag.clienteId);
          const terapia = (terapias || []).find(t => t.id === ag.terapiaId);
          list.push({
            id: ag.id,
            tipo: 'agendamento',
            clienteId: ag.clienteId,
            clienteNome: cliente?.nome || 'Desconhecido',
            descricao: terapia?.nome || 'Atendimento',
            valor: ag.valorCobrado || 0,
            dataOriginal: `${ag.data}T${ag.hora || '00:00'}:00`,
            originalItem: ag
          });
        }
      }
    });

    // Ordenar por data (mais recente primeiro)
    return list.sort((a, b) => new Date(b.dataOriginal).getTime() - new Date(a.dataOriginal).getTime());
  }, [pacotes, agendamentos, clientes, terapias, transacoes]);
};

// ======================
// COMPONENTE PRINCIPAL
// ======================

export default function ContasAReceberScreen({ onBack }: ContasAReceberScreenProps) {
  const { 
    showNotification, 
    confirmAction,
    clientes,
    terapias,
    agendamentos,
    pacotes,
    transacoes,
    updatePacote,
    updateAgendamento,
    addTransacao,
    updateTransacao,
    deletePacote,
    deleteAgendamento
  } = useAppContext();
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPendencia, setSelectedPendencia] = useState<Pendencia | null>(null);
  
  // 🎯 Hook de pendências (memoizado)
  const pendencias = usePendencias({
    pacotes: pacotes || [],
    agendamentos: agendamentos || [],
    clientes: clientes || [],
    terapias: terapias || [],
    transacoes: transacoes || []
  });

  // 🎯 Filtro de busca
  const filteredPendencias = useMemo(() => {
    if (!searchTerm.trim()) return pendencias;
    
    const query = searchTerm.toLowerCase();
    return pendencias.filter(p => 
      (p.clienteNome?.toLowerCase() || '').includes(query) ||
      (p.descricao?.toLowerCase() || '').includes(query)
    );
  }, [pendencias, searchTerm]);

  // 🎯 Loading inicial
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // 🎯 Handlers
  const handleBaixa = useCallback((p: Pendencia) => {
    setSelectedPendencia(p);
  }, []);

  const handleEditar = useCallback((p: Pendencia) => {
    showNotification('Para editar, acesse a tela de Pacotes ou Agenda.', 'info');
  }, [showNotification]);

  const handleExcluir = useCallback((p: Pendencia) => {
    const msg = p.tipo === 'pacote' 
      ? 'Tem certeza que deseja excluir este pacote? Todos os agendamentos e registros financeiros vinculados serão removidos.'
      : 'Tem certeza que deseja excluir esta pendência?';
    
    confirmAction(msg, () => {
      if (p.tipo === 'pacote') {
        deletePacote(p.id);
        showNotification('Pacote excluído com sucesso!', 'success');
      } else {
        deleteAgendamento(p.id);
        showNotification('Agendamento excluído com sucesso!', 'success');
      }
    }, { isDanger: true });
  }, [confirmAction, deletePacote, deleteAgendamento, showNotification]);

  const handleConfirmBaixa = useCallback((form: BaixaFormState) => {
    if (!selectedPendencia) {
      showNotification('Pendência não selecionada.', 'error');
      return;
    }

    try {
      let transacaoExistente = null;

      if (selectedPendencia.tipo === 'pacote') {
        transacaoExistente = (transacoes || []).find(t => t.pacoteId === selectedPendencia.id);
      } else {
        transacaoExistente = (transacoes || []).find(t => t.agendamentoId === selectedPendencia.id);
      }

      const transacaoFinanceira: Transacao = {
        id: transacaoExistente ? transacaoExistente.id : crypto.randomUUID(),
        descricao: `Recebimento: ${selectedPendencia.clienteNome} (${selectedPendencia.descricao})`,
        valor: Number(form.valorFinal),
        data: form.dataPagamento,
        metodo: form.formaPagamento,
        categoria: selectedPendencia.tipo === 'pacote' ? 'Pacotes' : 'Terapias',
        status: 'Pago',
        pacoteId: selectedPendencia.tipo === 'pacote' ? selectedPendencia.id : undefined,
        agendamentoId: selectedPendencia.tipo === 'agendamento' ? selectedPendencia.id : undefined,
        tipo: 'Receita',
        segmento: 'holistica'
      };

      if (transacaoExistente) {
        updateTransacao(transacaoFinanceira);
      } else {
        addTransacao(transacaoFinanceira);
      }
      
      // Atualizar o item de origem (Pacote ou Agendamento)
      if (selectedPendencia.tipo === 'pacote') {
        const p = selectedPendencia.originalItem as Pacote;
        const updatedPacote: Pacote = {
          ...p,
          statusPagamento: 'Pago',
          valorFinal: Number(form.valorFinal),
          dataPagamento: form.dataPagamento,
          formaPagamento: form.formaPagamento,
          bancoPagamento: form.banco || undefined
        };
        updatePacote(updatedPacote);
      } else {
        const ag = selectedPendencia.originalItem as Agendamento;
        const updatedAg: Agendamento = {
          ...ag,
          statusPagamento: 'Pago',
          valorCobrado: Number(form.valorFinal),
          dataPagamento: form.dataPagamento,
          formaPagamento: form.formaPagamento,
          bancoPagamento: form.banco || undefined
        };
        updateAgendamento(updatedAg);
      }
      
      setSelectedPendencia(null);
      showNotification('Baixa realizada e financeiro atualizado!', 'success');

    } catch (error: any) {
      console.error('Erro técnico na baixa:', error);
      showNotification('Falha ao processar baixa.', 'error');
    }
  }, [selectedPendencia, transacoes, updateTransacao, addTransacao, updatePacote, updateAgendamento, showNotification]);

  const closeModal = useCallback(() => {
    setSelectedPendencia(null);
  }, []);

  // 🎯 Total de pendências
  const totalPendente = useMemo(() => {
    return filteredPendencias.reduce((sum, p) => sum + p.valor, 0);
  }, [filteredPendencias]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <header className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              Contas a Receber
            </h1>
            <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-0.5">
              {filteredPendencias.length} pendência{filteredPendencias.length !== 1 ? 's' : ''} • {formatCurrency(totalPendente)}
            </p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="p-4 sticky top-[72px] bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] z-10">
        <div className="relative">
          <label htmlFor="search-pendencias" className="sr-only">Buscar pendências</label>
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
            size={18} 
            aria-hidden="true" 
          />
          <input 
            id="search-pendencias"
            type="search"
            placeholder="Buscar cliente ou serviço..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
            aria-label="Buscar pendências"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Limpar busca"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <main className="flex-1 overflow-y-auto px-4 pb-24" role="main" aria-label="Lista de pendências">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10" role="status" aria-live="polite">
            <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" aria-hidden="true" />
            <span className="sr-only">Carregando pendências...</span>
          </div>
        ) : filteredPendencias.length === 0 ? (
          <div 
            className="text-center py-12 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl border border-dashed border-gray-300 dark:border-gray-700"
            role="status"
            aria-live="polite"
          >
            <div className="text-6xl mb-4">✨</div>
            <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] font-medium">
              {searchTerm ? 'Nenhuma pendência encontrada para esta busca.' : 'Nenhuma pendência encontrada.'}
            </p>
            {!searchTerm && (
              <p className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-2 opacity-70">
                Todas as contas estão em dia!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label={`${filteredPendencias.length} pendências encontradas`}>
            {filteredPendencias.map(p => (
              <PendenciaCard
                key={`${p.tipo}-${p.id}`}
                pendencia={p}
                onBaixa={handleBaixa}
                onEditar={handleEditar}
                onExcluir={handleExcluir}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal de Baixa */}
      <BaixaModal
        isOpen={!!selectedPendencia}
        pendencia={selectedPendencia}
        onClose={closeModal}
        onConfirm={handleConfirmBaixa}
      />
    </div>
  );
}