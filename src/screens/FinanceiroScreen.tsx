import React, { useState, useMemo, useCallback, memo } from 'react';
import { ArrowLeft, Filter, TrendingUp, TrendingDown, DollarSign, Calendar, X, Save, Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { Transacao, Despesa, CategoriaDespesa, FormaPagamento, StatusPagamento } from '../types';

// ======================
// TYPES E CONSTANTES
// ======================

interface FinanceiroProps {
  onBack: () => void;
}

type TransactionType = 'receita' | 'despesa';
type TransactionStatus = 'pago' | 'pendente';

interface CombinedTransaction {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: TransactionType;
  status: TransactionStatus;
  categoria: string;
  metodo?: string;
  formaPagamento?: string;
  observacao?: string;
  segmento?: 'holistica' | 'freelancer';
  // Origem para saber qual API usar
  source: 'transacao' | 'despesa';
  // Campos opcionais específicos
  pacoteId?: string;
  agendamentoId?: string;
}

const CONFIG = {
  years: [2024, 2025, 2026, 2027],
  categorias: ['Material', 'Ferramenta', 'Fixo', 'Marketing', 'Impostos', 'Outros'] as CategoriaDespesa[],
  formasPagamento: ['PIX', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Transferência', 'Boleto'] as FormaPagamento[],
  metodosTransacao: ['PIX', 'Dinheiro', 'Transferência', 'Crédito', 'Débito', 'Boleto'],
  animationDuration: 200
} as const;

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
] as const;

// ======================
// UTILITÁRIOS PURE
// ======================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const parseDate = (dateStr: string): Date => {
  // Adiciona meio-dia para evitar problemas de fuso horário
  return new Date(`${dateStr}T12:00:00`);
};

const isSameMonth = (date: Date, month: number, year: number): boolean => {
  return date.getMonth() === month && date.getFullYear() === year;
};

const hasValidPacote = (pacoteId: string | undefined, pacotes: Array<{ id: string }>): boolean => {
  if (!pacoteId) return true;
  return pacotes.some(p => p.id === pacoteId);
};

// ======================
// SUB-COMPONENTES MEMOIZED
// ======================

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'success' | 'error' | 'primary' | 'warning';
  subtitle?: { label: string; value: string; color?: string };
  'aria-label'?: string;
}

const StatCard = memo(({ title, value, icon, color, subtitle, 'aria-label': ariaLabel }: StatCardProps) => {
  const colorClasses = {
    success: 'text-[var(--color-success)] bg-[var(--color-success)]/10',
    error: 'text-[var(--color-error)] bg-[var(--color-error)]/10',
    primary: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10',
    warning: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10'
  };

  return (
    <div 
      className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
      aria-label={ariaLabel}
    >
      <div className={`flex items-center gap-2 ${colorClasses[color]} mb-1`}>
        {icon}
        <span className="text-[10px] font-bold uppercase">{title}</span>
      </div>
      <p className="text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
        {value}
      </p>
      {subtitle && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className={`text-[10px] font-bold uppercase ${subtitle.color || 'text-[var(--color-warning)]'} block mb-1`}>
            {subtitle.label}
          </span>
          <p className={`text-sm font-bold ${subtitle.color || 'text-[var(--color-warning)]'}`}>
            {subtitle.value}
          </p>
        </div>
      )}
    </div>
  );
});
StatCard.displayName = 'StatCard';

interface TransactionItemProps {
  transaction: CombinedTransaction;
  onEdit: (t: CombinedTransaction) => void;
  onDelete: (t: CombinedTransaction) => void;
  isDeleting?: boolean;
}

const TransactionItem = memo(({ transaction, onEdit, onDelete, isDeleting }: TransactionItemProps) => {
  const isReceita = transaction.tipo === 'receita';
  const isPendente = transaction.status === 'pendente';
  
  return (
    <article 
      className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between"
      role="listitem"
      aria-label={`${transaction.descricao}, ${formatCurrency(transaction.valor)}, ${transaction.status}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div 
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isReceita ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-error)]/10 text-[var(--color-error)]'
          }`}
          aria-hidden="true"
        >
          {isReceita ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
        </div>
        
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] leading-tight truncate">
            {transaction.descricao}
          </h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] flex items-center gap-1">
              <Calendar size={10} aria-hidden="true" />
              {formatDateBR(transaction.data)}
            </span>
            <span className="text-[10px] text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md">
              {transaction.metodo || transaction.formaPagamento || 'PIX'}
            </span>
            {isPendente && (
              <span 
                className="text-[10px] font-bold text-[var(--color-warning)] px-1.5 py-0.5 bg-[var(--color-warning)]/10 rounded-md"
                role="status"
                aria-label="Status: pendente"
              >
                PENDENTE
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-right flex flex-col items-end shrink-0 ml-4">
        <p 
          className={`font-bold ${isReceita ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}
          aria-label={`Valor: ${formatCurrency(transaction.valor)} ${isReceita ? 'receita' : 'despesa'}`}
        >
          {isReceita ? '+' : '-'}{formatCurrency(transaction.valor)}
        </p>
        <p className="text-[10px] text-gray-400 truncate max-w-[100px]" title={transaction.categoria}>
          {transaction.categoria}
        </p>
        
        <div className="flex gap-2 mt-2" role="group" aria-label={`Ações para ${transaction.descricao}`}>
          <button 
            onClick={() => onEdit(transaction)}
            className="text-[10px] text-blue-500 font-bold uppercase hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label={`Editar ${transaction.descricao}`}
            disabled={isDeleting}
          >
            Editar
          </button>
          <button 
            onClick={() => onDelete(transaction)}
            className="text-[10px] text-red-500 font-bold uppercase hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded disabled:opacity-50"
            aria-label={`Excluir ${transaction.descricao}`}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : 'Excluir'}
          </button>
        </div>
      </div>
    </article>
  );
});
TransactionItem.displayName = 'TransactionItem';

// ======================
// HOOK: useFinancialFilters
// ======================

interface FilterState {
  month: string;
  year: string;
  type: 'Todos' | 'Receita' | 'Despesa';
}

const useFinancialFilters = (initialFilters?: Partial<FilterState>) => {
  const now = new Date();
  const [filters, setFilters] = useState<FilterState>({
    month: String(now.getMonth()),
    year: String(now.getFullYear()),
    type: 'Todos',
    ...initialFilters
  });

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      month: String(now.getMonth()),
      year: String(now.getFullYear()),
      type: 'Todos'
    });
  }, [now]);

  return {
    filters,
    updateFilter,
    resetFilters,
    isActive: filters.month !== String(now.getMonth()) || 
              filters.year !== String(now.getFullYear()) || 
              filters.type !== 'Todos'
  };
};

// ======================
// HOOK: useFinancialStats
// ======================

interface FinancialStats {
  receitas: number;
  despesas: number;
  saldo: number;
  pendente: number;
  totalTransacoes: number;
}

const useFinancialStats = (transactions: CombinedTransaction[]): FinancialStats => {
  return useMemo(() => {
    const receitas = transactions
      .filter(t => t.tipo === 'receita' && t.status === 'pago')
      .reduce((acc, t) => acc + t.valor, 0);
      
    const despesas = transactions
      .filter(t => t.tipo === 'despesa' && t.status === 'pago')
      .reduce((acc, t) => acc + t.valor, 0);
      
    const pendente = transactions
      .filter(t => t.status === 'pendente')
      .reduce((acc, t) => acc + t.valor, 0);

    return {
      receitas,
      despesas,
      saldo: receitas - despesas,
      pendente,
      totalTransacoes: transactions.length
    };
  }, [transactions]);
};

// ======================
// HOOK: useTransactionActions
// ======================

interface UseTransactionActionsProps {
  onUpdateTransacao: (t: Transacao) => void;
  onUpdateDespesa: (d: Despesa) => void;
  onDeleteTransacao: (id: string) => void;
  onDeleteDespesa: (id: string) => void;
  onShowNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onConfirmAction: (msg: string, onConfirm: () => void, options?: any) => void;
}

const useTransactionActions = ({
  onUpdateTransacao,
  onUpdateDespesa,
  onDeleteTransacao,
  onDeleteDespesa,
  onShowNotification,
  onConfirmAction
}: UseTransactionActionsProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = useCallback((t: CombinedTransaction) => {
    // Retorna os dados prontos para o modal
    return { ...t };
  }, []);

  const handleSave = useCallback(async (data: CombinedTransaction) => {
    try {
      if (data.source === 'despesa') {
        onUpdateDespesa(data as unknown as Despesa);
      } else {
        onUpdateTransacao(data as unknown as Transacao);
      }
      onShowNotification('Alteração salva com sucesso!', 'success');
      return true;
    } catch (error) {
      onShowNotification('Erro ao salvar alteração.', 'error');
      return false;
    }
  }, [onUpdateTransacao, onUpdateDespesa, onShowNotification]);

  const handleDelete = useCallback(async (t: CombinedTransaction) => {
    setDeletingId(t.id);
    
    try {
      const action = () => {
        if (t.source === 'despesa') {
          onDeleteDespesa(t.id);
        } else {
          onDeleteTransacao(t.id);
        }
        onShowNotification('Item excluído com sucesso!', 'success');
      };

      const message = t.source === 'despesa' 
        ? 'Deseja excluir esta despesa?' 
        : 'Tem certeza que deseja excluir esta transação?';

      onConfirmAction(message, action, { isDanger: true });
    } finally {
      setDeletingId(null);
    }
  }, [onDeleteTransacao, onDeleteDespesa, onShowNotification, onConfirmAction]);

  return {
    handleEdit,
    handleSave,
    handleDelete,
    isDeleting: (id: string) => deletingId === id
  };
};

// ======================
// COMPONENT: TransactionModal
// ======================

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CombinedTransaction) => Promise<boolean>;
  initialData?: CombinedTransaction;
  title: string;
  isDespesaMode?: boolean;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  title,
  isDespesaMode = false
}) => {
  const [formData, setFormData] = useState<Partial<CombinedTransaction>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or initialData changes
  React.useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        descricao: '',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        categoria: 'Outros',
        formaPagamento: 'PIX',
        metodo: 'PIX',
        tipo: isDespesaMode ? 'despesa' : 'receita',
        status: 'pago',
        source: isDespesaMode ? 'despesa' : 'transacao',
        segmento: 'holistica'
      });
      setErrors({});
    }
  }, [isOpen, initialData, isDespesaMode]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.descricao?.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }
    if (!formData.valor || formData.valor <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }
    if (!formData.data) {
      newErrors.data = 'Data é obrigatória';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSaving(true);
    try {
      const success = await onSave(formData as CombinedTransaction);
      if (success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof CombinedTransaction, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 id="modal-title" className="text-xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {title}
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
          {/* Descrição */}
          <div>
            <label htmlFor="descricao" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
              Descrição <span className="text-[var(--color-error)]">*</span>
            </label>
            <input 
              id="descricao"
              type="text" 
              placeholder={isDespesaMode ? "Ex: Aluguel, Materiais..." : "Ex: Sessão Cartomancia"}
              value={formData.descricao || ''}
              onChange={e => handleChange('descricao', e.target.value)}
              className={`w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border ${
                errors.descricao ? 'border-[var(--color-error)]' : 'border-gray-100 dark:border-gray-800'
              }`}
              aria-invalid={!!errors.descricao}
              aria-describedby={errors.descricao ? 'descricao-error' : undefined}
            />
            {errors.descricao && (
              <p id="descricao-error" className="text-[10px] text-[var(--color-error)] mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> {errors.descricao}
              </p>
            )}
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="valor" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
                Valor (R$) <span className="text-[var(--color-error)]">*</span>
              </label>
              <input 
                id="valor"
                type="number" 
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valor || ''}
                onChange={e => handleChange('valor', parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border font-bold ${
                  errors.valor ? 'border-[var(--color-error)]' : 'border-gray-100 dark:border-gray-800'
                }`}
                aria-invalid={!!errors.valor}
              />
              {errors.valor && (
                <p className="text-[10px] text-[var(--color-error)] mt-1">{errors.valor}</p>
              )}
            </div>
            <div>
              <label htmlFor="data" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
                Data <span className="text-[var(--color-error)]">*</span>
              </label>
              <input 
                id="data"
                type="date" 
                value={formData.data || ''}
                onChange={e => handleChange('data', e.target.value)}
                className={`w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border ${
                  errors.data ? 'border-[var(--color-error)]' : 'border-gray-100 dark:border-gray-800'
                }`}
                aria-invalid={!!errors.data}
              />
            </div>
          </div>

          {/* Categoria e Método */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="categoria" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
                Categoria
              </label>
              <select 
                id="categoria"
                value={formData.categoria || 'Outros'}
                onChange={e => handleChange('categoria', e.target.value)}
                className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
              >
                {CONFIG.categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="metodo" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
                {isDespesaMode ? 'Pagamento' : 'Método'}
              </label>
              <select 
                id="metodo"
                value={isDespesaMode ? (formData.formaPagamento || 'PIX') : (formData.metodo || 'PIX')}
                onChange={e => {
                  if (isDespesaMode) {
                    handleChange('formaPagamento', e.target.value);
                  } else {
                    handleChange('metodo', e.target.value);
                  }
                }}
                className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
              >
                {(isDespesaMode ? CONFIG.formasPagamento : CONFIG.metodosTransacao).map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo e Status (apenas para transações, não despesas) */}
          {!isDespesaMode && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tipo" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
                  Tipo
                </label>
                <select 
                  id="tipo"
                  value={formData.tipo || 'receita'}
                  onChange={e => handleChange('tipo', e.target.value as TransactionType)}
                  className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                >
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
                  Status
                </label>
                <select 
                  id="status"
                  value={formData.status || 'pago'}
                  onChange={e => handleChange('status', e.target.value as TransactionStatus)}
                  className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                >
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>
            </div>
          )}

          {/* Observação */}
          <div>
            <label htmlFor="observacao" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
              Observação
            </label>
            <textarea 
              id="observacao"
              placeholder="Detalhes adicionais..."
              value={formData.observacao || ''}
              onChange={e => handleChange('observacao', e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 text-sm font-bold bg-[var(--color-primary)] text-white rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} aria-hidden="true" />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================
// COMPONENTE PRINCIPAL
// ======================

export default function FinanceiroScreen({ onBack }: FinanceiroProps) {
  const { 
    transacoes, 
    despesas,
    clientes, 
    pacotes,
    updateTransacao, 
    updateDespesa,
    deleteTransacao, 
    addDespesa,
    deleteDespesa,
    confirmAction, 
    showNotification 
  } = useAppContext();
  
  // UI State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddDespesaModalOpen, setIsAddDespesaModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CombinedTransaction | null>(null);

  // 🎯 Hook de filtros
  const { filters, updateFilter } = useFinancialFilters();

  // 🎯 Converter dados para formato unificado (executado uma vez)
  const combinedData = useMemo((): CombinedTransaction[] => {
    const transacoesMapped = (transacoes || [])
      .filter(t => !t.segmento || t.segmento === 'holistica')
      .map((t): CombinedTransaction => ({
        id: t.id,
        descricao: t.descricao,
        valor: t.valor,
        data: t.data,
        tipo: t.tipo === 'Receita' ? 'receita' : 'despesa',
        status: t.status === 'Pago' ? 'pago' : 'pendente',
        categoria: t.categoria || 'Outros',
        metodo: t.metodo,
        segmento: t.segmento,
        source: 'transacao',
        pacoteId: t.pacoteId,
        agendamentoId: t.agendamentoId
      }));

    const despesasMapped = (despesas || [])
      .filter(d => !d.segmento || d.segmento === 'holistica')
      .map((d): CombinedTransaction => ({
        id: d.id,
        descricao: d.descricao,
        valor: d.valor,
        data: d.data,
        tipo: 'despesa',
        status: 'pago',
        categoria: d.categoria,
        formaPagamento: d.formaPagamento,
        observacao: d.observacao,
        segmento: d.segmento,
        source: 'despesa'
      }));

    return [...transacoesMapped, ...despesasMapped];
  }, [transacoes, despesas]);

  // 🎯 Filtro principal (otimizado)
  const filteredTransacoes = useMemo(() => {
    const filterMonth = parseInt(filters.month, 10);
    const filterYear = parseInt(filters.year, 10);

    return combinedData
      .filter(t => {
        // Orphan filter
        if (t.pacoteId && !hasValidPacote(t.pacoteId, pacotes || [])) return false;
        
        // Filter zero values
        if (t.valor === 0) return false;

        // Date filters
        const date = parseDate(t.data);
        if (!isSameMonth(date, filterMonth, filterYear)) return false;

        // Type filter
        if (filters.type !== 'Todos') {
          const typeMap: Record<string, TransactionType> = {
            'Receita': 'receita',
            'Despesa': 'despesa'
          };
          if (t.tipo !== typeMap[filters.type]) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // 1. Pendentes first
        if (a.status === 'pendente' && b.status !== 'pendente') return -1;
        if (a.status !== 'pendente' && b.status === 'pendente') return 1;

        // 2. Both pending: oldest first
        if (a.status === 'pendente' && b.status === 'pendente') {
          return parseDate(a.data).getTime() - parseDate(b.data).getTime();
        }

        // 3. Both paid: newest first
        return parseDate(b.data).getTime() - parseDate(a.data).getTime();
      });
  }, [combinedData, pacotes, filters]);

  // 🎯 Stats calculados a partir dos dados filtrados
  const stats = useFinancialStats(filteredTransacoes);

  // 🎯 Actions hook
  const { handleEdit, handleSave, handleDelete, isDeleting } = useTransactionActions({
    onUpdateTransacao: updateTransacao,
    onUpdateDespesa: updateDespesa,
    onDeleteTransacao: deleteTransacao,
    onDeleteDespesa: deleteDespesa,
    onShowNotification: showNotification,
    onConfirmAction: confirmAction
  });

  // 🎯 Handlers para modais
  const openEditModal = useCallback((t: CombinedTransaction) => {
    setEditingTransaction(handleEdit(t));
    setIsEditModalOpen(true);
  }, [handleEdit]);

  const handleAddDespesa = useCallback(async (data: CombinedTransaction) => {
    try {
      addDespesa({
        descricao: data.descricao || '',
        valor: data.valor || 0,
        data: data.data || '',
        categoria: data.categoria as CategoriaDespesa || 'Outros',
        formaPagamento: data.formaPagamento as FormaPagamento || 'PIX',
        observacao: data.observacao,
        segmento: 'holistica'
      });
      showNotification('Despesa registrada com sucesso!', 'success');
      return true;
    } catch (error) {
      showNotification('Erro ao registrar despesa.', 'error');
      return false;
    }
  }, [addDespesa, showNotification]);

  // 🎯 Accessibility: keyboard shortcut para fechar modais
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditModalOpen) setIsEditModalOpen(false);
        if (isAddDespesaModalOpen) setIsAddDespesaModalOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen, isAddDespesaModalOpen]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <header className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 sticky top-0 z-20">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Voltar para dashboard"
        >
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex-1">
          Fluxo de Caixa
        </h1>
        <button 
          onClick={() => setIsAddDespesaModalOpen(true)}
          className="bg-[var(--color-error)] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
          aria-label="Adicionar nova despesa"
        >
          <Plus size={16} aria-hidden="true" />
          Despesa
        </button>
      </header>

      {/* Resumo de Cards */}
      <section className="p-4 grid grid-cols-2 gap-3 shrink-0" aria-label="Resumo financeiro">
        <StatCard 
          title="Receitas"
          value={formatCurrency(stats.receitas)}
          icon={<TrendingUp size={16} aria-hidden="true" />}
          color="success"
          aria-label={`Receitas totais: ${formatCurrency(stats.receitas)}`}
        />
        <StatCard 
          title="Despesas"
          value={formatCurrency(stats.despesas)}
          icon={<TrendingDown size={16} aria-hidden="true" />}
          color="error"
          aria-label={`Despesas totais: ${formatCurrency(stats.despesas)}`}
        />
        <StatCard 
          title="Saldo Líquido"
          value={formatCurrency(stats.saldo)}
          icon={<DollarSign size={16} aria-hidden="true" />}
          color="primary"
          subtitle={{
            label: 'A Receber',
            value: formatCurrency(stats.pendente),
            color: 'text-[var(--color-warning)]'
          }}
          aria-label={`Saldo líquido: ${formatCurrency(stats.saldo)}, com ${formatCurrency(stats.pendente)} pendente`}
        />
      </section>

      {/* Filtros */}
      <section className="px-4 pb-4 space-y-3 shrink-0" aria-label="Filtros de transações">
        <div className="flex gap-2">
          <label htmlFor="filtro-mes" className="sr-only">Filtrar por mês</label>
          <select 
            id="filtro-mes"
            value={filters.month}
            onChange={(e) => updateFilter('month', e.target.value)}
            className="flex-1 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            aria-label="Selecionar mês"
          >
            {MESES.map((mes, index) => (
              <option key={index} value={index}>{mes}</option>
            ))}
          </select>
          
          <label htmlFor="filtro-ano" className="sr-only">Filtrar por ano</label>
          <select 
            id="filtro-ano"
            value={filters.year}
            onChange={(e) => updateFilter('year', e.target.value)}
            className="w-24 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            aria-label="Selecionar ano"
          >
            {CONFIG.years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2" role="group" aria-label="Filtrar por tipo de transação">
          {(['Todos', 'Receita', 'Despesa'] as const).map((tipo) => (
            <button
              key={tipo}
              onClick={() => updateFilter('type', tipo)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                filters.type === tipo 
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md' 
                  : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-gray-500 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              aria-pressed={filters.type === tipo}
            >
              {tipo}
            </button>
          ))}
        </div>
      </section>

      {/* Lista de Transações */}
      <main className="flex-1 overflow-y-auto px-4 pb-32" role="main" aria-label="Lista de transações">
        {filteredTransacoes.length === 0 ? (
          <div 
            className="text-center py-12 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl border border-dashed border-gray-300 dark:border-gray-800"
            role="status"
            aria-live="polite"
          >
            <p className="text-gray-500 text-sm">Nenhuma transação neste período.</p>
            <button 
              onClick={() => setIsAddDespesaModalOpen(true)}
              className="mt-4 text-sm text-[var(--color-primary)] font-bold hover:underline"
            >
              Adicionar primeira despesa
            </button>
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label={`${filteredTransacoes.length} transações encontradas`}>
            {filteredTransacoes.map(t => (
              <TransactionItem
                key={t.id}
                transaction={t}
                onEdit={openEditModal}
                onDelete={handleDelete}
                isDeleting={isDeleting(t.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modais */}
      <TransactionModal
        isOpen={isAddDespesaModalOpen}
        onClose={() => setIsAddDespesaModalOpen(false)}
        onSave={handleAddDespesa}
        title="Nova Despesa"
        isDespesaMode={true}
      />

      <TransactionModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSave}
        initialData={editingTransaction || undefined}
        title="Editar Transação"
        isDespesaMode={editingTransaction?.source === 'despesa'}
      />
    </div>
  );
}