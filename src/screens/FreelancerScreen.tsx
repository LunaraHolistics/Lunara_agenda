import React, { useState, useMemo, useCallback, memo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, X, Save, Plus, Briefcase, Activity, CheckCircle, Clock, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { Transacao, Despesa } from '../types';

// ======================
// TYPES E CONSTANTES
// ======================

interface FreelancerProps {
  onBack: () => void;
}

type ModalType = 'Receita' | 'Despesa';
type TransactionStatus = 'Pago' | 'Pendente';

interface FormData {
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  metodo: string;
  status: TransactionStatus;
}

interface CombinedTransaction extends Transacao {
  isDespesaState: boolean;
}

const CONFIG = {
  meses: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ] as const,
  anos: [2024, 2025, 2026] as const,
  categorias: ['Freelancer', 'Material', 'Transporte', 'Alimentação', 'Outros'] as const,
  metodos: ['PIX', 'Dinheiro', 'Transferência', 'Cartão'] as const,
  accentColor: '#1e293b' // slate-800
} as const;

const DEFAULT_FORM_DATA: FormData = {
  descricao: '',
  valor: 0,
  data: new Date().toISOString().split('T')[0],
  categoria: 'Freelancer',
  metodo: 'PIX',
  status: 'Pago'
};

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

const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const getFilterString = (year: string, month: string): string => {
  return `${year}-${String(Number(month) + 1).padStart(2, '0')}`;
};

// ======================
// SUB-COMPONENTES MEMOIZED
// ======================

interface UnifiedStatsCardProps {
  holistica: number;
  freelancer: number;
  total: number;
  pendente: number;
}

const UnifiedStatsCard = memo(({ holistica, freelancer, total, pendente }: UnifiedStatsCardProps) => {
  return (
    <div className="bg-slate-800 dark:bg-slate-900 p-4 rounded-[1.5rem] text-white shadow-xl relative overflow-hidden border border-slate-700">
      <div className="absolute top-0 right-0 p-2 opacity-5" aria-hidden="true">
        <Briefcase size={80} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center" aria-hidden="true">
            <Activity size={12} className="text-blue-400" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Resumo Consolidado</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white/5 p-2 rounded-xl border border-white/10">
            <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Saldo Clínica</p>
            <p className="text-sm font-bold text-emerald-400" aria-label={`Saldo clínica: ${formatCurrency(holistica)}`}>
              {formatCurrency(holistica)}
            </p>
          </div>
          <div className="bg-white/5 p-2 rounded-xl border border-white/10">
            <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Saldo Freelancer</p>
            <p className="text-sm font-bold text-blue-400" aria-label={`Saldo freelancer: ${formatCurrency(freelancer)}`}>
              {formatCurrency(freelancer)}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Total Geral Líquido</p>
              <p className="text-xl font-black text-white" aria-label={`Total geral: ${formatCurrency(total)}`}>
                {formatCurrency(total)}
              </p>
            </div>
            <div className="text-right bg-white/5 px-2 py-1 rounded-lg border border-white/5">
              <p className="text-[8px] uppercase font-bold text-amber-400">A Receber (Free)</p>
              <p className="text-xs font-bold text-amber-400" aria-label={`A receber: ${formatCurrency(pendente)}`}>
                {formatCurrency(pendente)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
UnifiedStatsCard.displayName = 'UnifiedStatsCard';

interface StatsCardsProps {
  receitas: number;
  despesas: number;
}

const StatsCards = memo(({ receitas, despesas }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 text-emerald-600 mb-0.5">
          <TrendingUp size={12} aria-hidden="true" />
          <span className="text-[9px] font-bold uppercase">Ganhos</span>
        </div>
        <p className="text-base font-bold text-slate-800 dark:text-slate-100" aria-label={`Ganhos: ${formatCurrency(receitas)}`}>
          {formatCurrency(receitas)}
        </p>
      </div>
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 text-rose-600 mb-0.5">
          <TrendingDown size={12} aria-hidden="true" />
          <span className="text-[9px] font-bold uppercase">Gastos</span>
        </div>
        <p className="text-base font-bold text-slate-800 dark:text-slate-100" aria-label={`Gastos: ${formatCurrency(despesas)}`}>
          {formatCurrency(despesas)}
        </p>
      </div>
    </div>
  );
});
StatsCards.displayName = 'StatsCards';

interface TransactionItemProps {
  transaction: CombinedTransaction;
  onEdit: (t: CombinedTransaction) => void;
  onDelete: (t: CombinedTransaction) => void;
}

const TransactionItem = memo(({ transaction, onEdit, onDelete }: TransactionItemProps) => {
  const isReceita = transaction.tipo === 'Receita';
  
  return (
    <article 
      className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between"
      role="listitem"
      aria-label={`${transaction.descricao}, ${formatCurrency(transaction.valor)}, ${transaction.status}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div 
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isReceita ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}
          aria-hidden="true"
        >
          {isReceita ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-tight truncate">
            {transaction.descricao}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[9px] text-slate-500 flex items-center gap-1">
              <Calendar size={8} aria-hidden="true" />
              {formatDateBR(transaction.data)}
            </span>
            <span className="text-[9px] text-slate-500 px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
              {transaction.metodo || 'PIX'}
            </span>
            {transaction.status === 'Pendente' && (
              <span className="text-[9px] font-bold text-amber-600 px-1 py-0.5 bg-amber-100 rounded flex items-center gap-1" role="status">
                <Clock size={8} aria-hidden="true" /> PENDENTE
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex flex-col items-end shrink-0 ml-2">
        <p 
          className={`font-bold text-sm ${isReceita ? 'text-emerald-600' : 'text-rose-600'}`}
          aria-label={`Valor: ${formatCurrency(transaction.valor)}`}
        >
          {isReceita ? '+' : '-'}{formatCurrency(transaction.valor)}
        </p>
        <nav className="flex gap-2 mt-1" role="group" aria-label={`Ações para ${transaction.descricao}`}>
          <button 
            onClick={() => onEdit(transaction)}
            className="text-[9px] text-blue-500 font-bold uppercase hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label={`Editar ${transaction.descricao}`}
          >
            Editar
          </button>
          <button 
            onClick={() => onDelete(transaction)}
            className="text-[9px] text-rose-500 font-bold uppercase hover:underline focus:outline-none focus:ring-2 focus:ring-rose-500 rounded"
            aria-label={`Excluir ${transaction.descricao}`}
          >
            Excluir
          </button>
        </nav>
      </div>
    </article>
  );
});
TransactionItem.displayName = 'TransactionItem';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  modalType: ModalType;
  editingTransaction?: CombinedTransaction | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  modalType, 
  editingTransaction 
}) => {
  const [form, setForm] = useState<FormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setForm({
          descricao: editingTransaction.descricao || '',
          valor: editingTransaction.valor || 0,
          data: editingTransaction.data || '',
          categoria: editingTransaction.categoria || 'Freelancer',
          metodo: editingTransaction.metodo || (editingTransaction as any).formaPagamento || 'PIX',
          status: editingTransaction.status || 'Pago'
        });
      } else {
        setForm(DEFAULT_FORM_DATA);
      }
      setErrors({});
    }
  }, [isOpen, editingTransaction]);

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

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!form.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }
    if (!form.valor || form.valor <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }
    if (!form.data) {
      newErrors.data = 'Data é obrigatória';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const dataToSave = editingTransaction 
      ? { ...editingTransaction, ...form, isDespesaState: modalType === 'Despesa' }
      : { ...form };
    
    onSave(dataToSave);
  };

  const updateField = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isEditMode = !!editingTransaction;
  const title = isEditMode ? 'Editar Registro' : `Nova ${modalType} Freelancer`;
  const buttonColor = modalType === 'Receita' ? 'bg-emerald-600' : 'bg-rose-600';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-[100dvh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-6 shadow-2xl shadow-slate-900/20 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-slate-900 z-10 pb-2">
          <h2 id="modal-title" className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Fechar modal"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
          {/* Descrição */}
          <div>
            <label htmlFor="descricao" className="block text-xs font-bold text-slate-500 uppercase mb-1">
              {modalType === 'Receita' ? 'Local / Empresa' : 'Descrição / Local'}
            </label>
            <input 
              id="descricao"
              type="text" 
              placeholder="Ex: Freelance Empresa X"
              value={form.descricao}
              onChange={e => updateField('descricao', e.target.value)}
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border ${
                errors.descricao ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
              }`}
              aria-invalid={!!errors.descricao}
              required
              autoFocus
            />
            {errors.descricao && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1" role="alert">
                <AlertCircle size={12} /> {errors.descricao}
              </p>
            )}
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="valor" className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
              <input 
                id="valor"
                type="number" 
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.valor || ''}
                onChange={e => updateField('valor', parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border font-bold ${
                  errors.valor ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
                aria-invalid={!!errors.valor}
                required
              />
              {errors.valor && (
                <p className="text-xs text-rose-500 mt-1" role="alert">{errors.valor}</p>
              )}
            </div>
            <div>
              <label htmlFor="data" className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
              <input 
                id="data"
                type="date" 
                value={form.data}
                onChange={e => updateField('data', e.target.value)}
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border ${
                  errors.data ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                }`}
                aria-invalid={!!errors.data}
                required
              />
              {errors.data && (
                <p className="text-xs text-rose-500 mt-1" role="alert">{errors.data}</p>
              )}
            </div>
          </div>

          {/* Status/Categoria e Método */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status-categoria" className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {modalType === 'Receita' ? 'Status' : 'Categoria'}
              </label>
              {modalType === 'Receita' ? (
                <select 
                  id="status-categoria"
                  value={form.status}
                  onChange={e => updateField('status', e.target.value as TransactionStatus)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                  aria-label="Status do pagamento"
                >
                  <option value="Pago">Recebido</option>
                  <option value="Pendente">Pendente</option>
                </select>
              ) : (
                <select 
                  id="status-categoria"
                  value={form.categoria}
                  onChange={e => updateField('categoria', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                  aria-label="Categoria da despesa"
                >
                  {CONFIG.categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="metodo" className="block text-xs font-bold text-slate-500 uppercase mb-1">Método</label>
              <select 
                id="metodo"
                value={form.metodo}
                onChange={e => updateField('metodo', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                aria-label="Método de pagamento"
              >
                {CONFIG.metodos.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className={`flex-1 py-3 text-sm font-bold ${buttonColor} text-white rounded-xl shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              <Save size={18} aria-hidden="true" />
              {isEditMode ? 'Salvar Alterações' : `Salvar ${modalType}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================
// HOOK: useFreelancerStats
// ======================

interface UseFreelancerStatsProps {
  transacoes: Transacao[];
  despesas: Despesa[];
  filtroMes: string;
  filtroAno: string;
}

const useFreelancerStats = ({ transacoes, despesas, filtroMes, filtroAno }: UseFreelancerStatsProps) => {
  return useMemo(() => {
    const filterStr = getFilterString(filtroAno, filtroMes);

    // Cálculos para Holística
    const holisticaReceitas = (transacoes || [])
      .filter(t => (!t.segmento || t.segmento === 'holistica') && t.tipo === 'Receita' && t.status === 'Pago' && String(t.data).slice(0, 7) === filterStr)
      .reduce((acc, t) => acc + t.valor, 0);
    
    const holisticaDespesas = (despesas || [])
      .filter(d => (!d.segmento || d.segmento === 'holistica') && String(d.data).slice(0, 7) === filterStr)
      .reduce((acc, d) => acc + d.valor, 0);

    // Cálculos para Freelancer
    const freelancerReceitas = (transacoes || [])
      .filter(t => t.segmento === 'freelancer' && t.tipo === 'Receita' && t.status === 'Pago' && String(t.data).slice(0, 7) === filterStr)
      .reduce((acc, t) => acc + t.valor, 0);
    
    const freelancerDespesas = (despesas || [])
      .filter(d => d.segmento === 'freelancer' && String(d.data).slice(0, 7) === filterStr)
      .reduce((acc, d) => acc + d.valor, 0);

    const saldoHolistica = holisticaReceitas - holisticaDespesas;
    const saldoFreelancer = freelancerReceitas - freelancerDespesas;

    return {
      unified: {
        holistica: saldoHolistica,
        freelancer: saldoFreelancer,
        total: saldoHolistica + saldoFreelancer
      },
      freelancer: {
        receitas: freelancerReceitas,
        despesas: freelancerDespesas,
        saldo: saldoFreelancer
      }
    };
  }, [transacoes, despesas, filtroMes, filtroAno]);
};

// ======================
// HOOK: useFreelancerFilters
// ======================

const useFreelancerFilters = () => {
  const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth()));
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Receita' | 'Despesa'>('Todos');

  return {
    filtroMes,
    filtroAno,
    filtroTipo,
    setFiltroMes,
    setFiltroAno,
    setFiltroTipo
  };
};

// ======================
// COMPONENTE PRINCIPAL
// ======================

export default function FreelancerScreen({ onBack }: FreelancerProps) {
  const { 
    transacoes, 
    despesas,
    addTransacao,
    addDespesa,
    updateTransacao, 
    updateDespesa,
    deleteTransacao, 
    deleteDespesa,
    confirmAction, 
    showNotification 
  } = useAppContext();
  
  // UI State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('Receita');
  const [editingTransaction, setEditingTransaction] = useState<CombinedTransaction | null>(null);

  // 🎯 Hooks customizados
  const { filtroMes, filtroAno, filtroTipo, setFiltroMes, setFiltroAno, setFiltroTipo } = useFreelancerFilters();
  
  const { unified, freelancer } = useFreelancerStats({
    transacoes: transacoes || [],
    despesas: despesas || [],
    filtroMes,
    filtroAno
  });

  // 🎯 Transações filtradas
  const filteredTransacoes = useMemo((): CombinedTransaction[] => {
    const combined: CombinedTransaction[] = [
      ...(transacoes || [])
        .filter(t => t.segmento === 'freelancer')
        .map(t => ({ ...t, isDespesaState: false })),
      ...(despesas || [])
        .filter(d => d.segmento === 'freelancer')
        .map(d => ({ 
          ...d, 
          tipo: 'Despesa' as const, 
          status: 'Pago' as const, 
          isDespesaState: true,
          metodo: d.formaPagamento || 'PIX'
        }))
    ];

    const filterStr = getFilterString(filtroAno, filtroMes);

    return combined
      .filter(t => {
        const matchMesAno = String(t.data).slice(0, 7) === filterStr;
        const matchTipo = filtroTipo === 'Todos' || t.tipo === filtroTipo;
        return matchMesAno && matchTipo;
      })
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [transacoes, despesas, filtroMes, filtroAno, filtroTipo]);

  // 🎯 Stats das transações filtradas
  const stats = useMemo(() => {
    const receitas = filteredTransacoes
      .filter(t => t.tipo === 'Receita' && t.status === 'Pago')
      .reduce((acc, t) => acc + t.valor, 0);
    
    const despesasCalc = filteredTransacoes
      .filter(t => t.tipo === 'Despesa')
      .reduce((acc, t) => acc + t.valor, 0);
    
    const pendente = filteredTransacoes
      .filter(t => t.tipo === 'Receita' && t.status === 'Pendente')
      .reduce((acc, t) => acc + t.valor, 0);
    
    return { receitas, despesas: despesasCalc, saldo: receitas - despesasCalc, pendente };
  }, [filteredTransacoes]);

  // 🎯 Handlers
  const handleEditClick = useCallback((t: CombinedTransaction) => {
    setEditingTransaction(t);
    setModalType(t.tipo === 'Receita' ? 'Receita' : 'Despesa');
    setIsEditModalOpen(true);
  }, []);

  const handleSave = useCallback((data: any) => {
    if (!data.descricao || !data.valor || !data.data) {
      showNotification('Preencha os campos obrigatórios.', 'error');
      return;
    }

    if (data.id) {
      // Edição
      const { isDespesaState, ...transactionData } = data;
      
      if (isDespesaState) {
        updateDespesa(transactionData as Despesa);
      } else {
        updateTransacao(transactionData as Transacao);
      }
      showNotification('Alteração salva com sucesso!', 'success');
      setIsEditModalOpen(false);
    } else {
      // Novo
      if (modalType === 'Receita') {
        addTransacao({
          ...data,
          tipo: 'Receita',
          segmento: 'freelancer'
        });
      } else {
        addDespesa({
          ...data,
          formaPagamento: data.metodo,
          segmento: 'freelancer'
        });
      }
      showNotification(`${modalType} registrada com sucesso!`, 'success');
      setIsAddModalOpen(false);
    }
  }, [modalType, addTransacao, addDespesa, updateTransacao, updateDespesa, showNotification]);

  const handleDelete = useCallback((t: CombinedTransaction) => {
    confirmAction('Excluir este registro?', () => {
      if (t.isDespesaState) {
        deleteDespesa(t.id);
      } else {
        deleteTransacao(t.id);
      }
      showNotification('Removido!', 'success');
    }, { isDanger: true });
  }, [confirmAction, deleteDespesa, deleteTransacao, showNotification]);

  const openAddModal = useCallback((type: ModalType) => {
    setModalType(type);
    setIsAddModalOpen(true);
  }, []);

  const closeModals = useCallback(() => {
    setIsEditModalOpen(false);
    setIsAddModalOpen(false);
    setEditingTransaction(null);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="pt-8 pb-2 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 sticky top-0 z-20 shrink-0">
        <button 
          onClick={onBack} 
          className="p-1.5 -ml-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          aria-label="Voltar para dashboard"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
            Freelancer
          </h1>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider truncate">
            Serviços Externos
          </p>
        </div>
        <nav className="flex gap-1.5" role="group" aria-label="Adicionar transação">
          <button 
            onClick={() => openAddModal('Receita')}
            className="bg-emerald-600 text-white p-1.5 rounded-lg shadow-sm hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Adicionar nova receita"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
          <button 
            onClick={() => openAddModal('Despesa')}
            className="bg-rose-600 text-white p-1.5 rounded-lg shadow-sm hover:bg-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
            aria-label="Adicionar nova despesa"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </nav>
      </header>

      {/* Card Unificado */}
      <section className="p-3 shrink-0" aria-label="Resumo consolidado">
        <UnifiedStatsCard 
          holistica={unified.holistica}
          freelancer={unified.freelancer}
          total={unified.total}
          pendente={stats.pendente}
        />
      </section>

      {/* Stats Cards */}
      <section className="px-3 pb-2 shrink-0" aria-label="Resumo do mês freelancer">
        <StatsCards receitas={stats.receitas} despesas={stats.despesas} />
      </section>

      {/* Filtros */}
      <section className="px-3 pb-2 shrink-0" aria-label="Filtros de período">
        <div className="flex gap-2">
          <label htmlFor="filtro-mes" className="sr-only">Selecionar mês</label>
          <select 
            id="filtro-mes"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Selecionar mês"
          >
            {CONFIG.meses.map((mes, index) => (
              <option key={index} value={index}>{mes}</option>
            ))}
          </select>
          <label htmlFor="filtro-ano" className="sr-only">Selecionar ano</label>
          <select 
            id="filtro-ano"
            value={filtroAno}
            onChange={(e) => setFiltroAno(e.target.value)}
            className="w-20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Selecionar ano"
          >
            {CONFIG.anos.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Lista de Transações */}
      <main className="flex-1 overflow-y-auto px-3 pb-20" role="main" aria-label="Lista de transações freelancer">
        {filteredTransacoes.length === 0 ? (
          <div 
            className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800"
            role="status"
            aria-live="polite"
          >
            <Briefcase className="mx-auto text-slate-300 mb-2" size={24} aria-hidden="true" />
            <p className="text-slate-500 text-xs">Nenhum registro freelancer.</p>
            <button 
              onClick={() => openAddModal('Receita')}
              className="mt-3 text-xs text-emerald-600 font-bold hover:underline"
            >
              Adicionar primeira receita
            </button>
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label={`${filteredTransacoes.length} transações encontradas`}>
            {filteredTransacoes.map(t => (
              <TransactionItem
                key={t.id}
                transaction={t}
                onEdit={handleEditClick}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modais */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={closeModals}
        onSave={handleSave}
        modalType={modalType}
      />

      <TransactionModal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        onSave={handleSave}
        modalType={modalType}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}