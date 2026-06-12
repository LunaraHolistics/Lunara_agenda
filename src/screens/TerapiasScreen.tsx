import React, { useState, useCallback, useMemo, memo } from 'react';
import { Plus, Edit2, Trash2, X, Clock, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { Terapia } from '../types';
import { useAppContext } from '../AppContext';

// ======================
// TYPES E CONSTANTES
// ======================

interface TerapiaFormState {
  nome: string;
  valor: string;
  duracao: string;
}

const CONFIG = {
  validation: {
    minNomeLength: 3,
    maxNomeLength: 100,
    minValor: 0.01,
    maxValor: 999999.99,
    minDuracao: 5,
    maxDuracao: 480
  },
  animationDuration: 200,
  deleteConfirmTimeout: 3000
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

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

const parseValor = (value: string): number => {
  const parsed = parseFloat(value.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};

const parseDuracao = (value: string): number => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
};

const validateForm = (form: TerapiaFormState): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!form.nome.trim()) {
    errors.nome = 'Nome é obrigatório';
  } else if (form.nome.trim().length < CONFIG.validation.minNomeLength) {
    errors.nome = `Nome deve ter pelo menos ${CONFIG.validation.minNomeLength} caracteres`;
  } else if (form.nome.trim().length > CONFIG.validation.maxNomeLength) {
    errors.nome = `Nome deve ter no máximo ${CONFIG.validation.maxNomeLength} caracteres`;
  }

  const valor = parseValor(form.valor);
  if (!form.valor || valor < CONFIG.validation.minValor) {
    errors.valor = `Valor deve ser maior que R$ ${CONFIG.validation.minValor.toFixed(2)}`;
  } else if (valor > CONFIG.validation.maxValor) {
    errors.valor = `Valor não pode exceder R$ ${CONFIG.validation.maxValor.toFixed(2)}`;
  }

  const duracao = parseDuracao(form.duracao);
  if (!form.duracao || duracao < CONFIG.validation.minDuracao) {
    errors.duracao = `Duração deve ser pelo menos ${CONFIG.validation.minDuracao} minutos`;
  } else if (duracao > CONFIG.validation.maxDuracao) {
    errors.duracao = `Duração não pode exceder ${CONFIG.validation.maxDuracao} minutos`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

// ======================
// SUB-COMPONENTES MEMOIZED
// ======================

interface TerapiaCardProps {
  terapia: Terapia;
  onEdit: (t: Terapia) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, terapia: Terapia) => void;
  isConfirmingDelete: boolean;
}

const TerapiaCard = memo(({ terapia, onEdit, onDelete, onDragStart, isConfirmingDelete }: TerapiaCardProps) => {
  const handleDeleteClick = () => {
    if (isConfirmingDelete) {
      onDelete(terapia.id);
    } else {
      onDelete(terapia.id);
    }
  };

  return (
    <article 
      draggable
      onDragStart={(e) => onDragStart(e, terapia)}
      className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      role="listitem"
      aria-label={`Terapia: ${terapia.nome}, duração: ${formatDuration(terapia.duracao)}, valor: ${formatCurrency(terapia.valor)}`}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-lg truncate">
          {terapia.nome || "Sem nome"}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm flex items-center gap-1">
            <Clock size={14} aria-hidden="true" />
            {formatDuration(terapia.duracao)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 shrink-0 ml-4">
        <span 
          className="font-semibold text-[var(--color-primary)] text-lg whitespace-nowrap"
          aria-label={`Valor: ${formatCurrency(terapia.valor)}`}
        >
          {formatCurrency(terapia.valor)}
        </span>
        
        <nav className="flex items-center gap-2" role="group" aria-label={`Ações para ${terapia.nome}`}>
          <button 
            onClick={() => onEdit(terapia)}
            className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            aria-label={`Editar ${terapia.nome}`}
            title="Editar terapia"
          >
            <Edit2 size={20} aria-hidden="true" />
          </button>
          <button 
            onClick={handleDeleteClick}
            className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] ${
              isConfirmingDelete 
                ? 'bg-[var(--color-error)] text-white animate-pulse' 
                : 'text-[var(--color-error)] hover:bg-[var(--color-error)]/10'
            }`}
            aria-label={isConfirmingDelete ? `Confirmar exclusão de ${terapia.nome}` : `Excluir ${terapia.nome}`}
            title={isConfirmingDelete ? 'Toque novamente para confirmar' : 'Excluir terapia'}
          >
            {isConfirmingDelete ? (
              <AlertCircle size={20} aria-hidden="true" />
            ) : (
              <Trash2 size={20} aria-hidden="true" />
            )}
          </button>
        </nav>
      </div>
    </article>
  );
});
TerapiaCard.displayName = 'TerapiaCard';

interface TerapiaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Terapia, 'id'>, id?: string) => void;
  editingTerapia?: Terapia | null;
}

const TerapiaFormModal: React.FC<TerapiaFormModalProps> = ({ isOpen, onClose, onSave, editingTerapia }) => {
  const [form, setForm] = useState<TerapiaFormState>({ nome: '', valor: '', duracao: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Reset form when modal opens or editingTerapia changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingTerapia) {
        setForm({
          nome: editingTerapia.nome,
          valor: String(editingTerapia.valor || 0),
          duracao: String(editingTerapia.duracao || 0)
        });
      } else {
        setForm({ nome: '', valor: '', duracao: '' });
      }
      setErrors({});
      setIsDirty(false);
    }
  }, [isOpen, editingTerapia]);

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

  const handleFieldChange = (field: keyof TerapiaFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const terapiaData: Omit<Terapia, 'id'> = {
      nome: form.nome.trim(),
      valor: parseValor(form.valor),
      duracao: parseDuracao(form.duracao)
    };

    onSave(terapiaData, editingTerapia?.id);
    onClose();
  };

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="modal-title" className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {editingTerapia ? 'Editar Terapia' : 'Nova Terapia'}
          </h2>
          <button 
            onClick={onClose}
            className="text-[var(--color-text-sec-light)] p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Fechar modal"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
              Nome da Terapia <span className="text-[var(--color-error)]">*</span>
            </label>
            <input 
              id="nome"
              type="text"
              value={form.nome}
              onChange={(e) => handleFieldChange('nome', e.target.value)}
              className={`w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all ${
                errors.nome ? 'ring-2 ring-[var(--color-error)]' : ''
              }`}
              placeholder="Ex: Massagem Relaxante"
              aria-invalid={!!errors.nome}
              aria-describedby={errors.nome ? 'nome-error' : undefined}
              required
              autoFocus
            />
            {errors.nome && (
              <p id="nome-error" className="text-xs text-[var(--color-error)] mt-1 flex items-center gap-1" role="alert">
                <AlertCircle size={12} aria-hidden="true" /> {errors.nome}
              </p>
            )}
          </div>

          {/* Valor e Duração */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="valor" className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
                Valor (R$) <span className="text-[var(--color-error)]">*</span>
              </label>
              <input 
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    handleFieldChange('valor', val);
                  }
                }}
                className={`w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all ${
                  errors.valor ? 'ring-2 ring-[var(--color-error)]' : ''
                }`}
                placeholder="0.00"
                aria-invalid={!!errors.valor}
                required
              />
              {errors.valor && (
                <p className="text-xs text-[var(--color-error)] mt-1 flex items-center gap-1" role="alert">
                  <AlertCircle size={12} aria-hidden="true" /> {errors.valor}
                </p>
              )}
            </div>

            <div className="flex-1">
              <label htmlFor="duracao" className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
                Duração (min) <span className="text-[var(--color-error)]">*</span>
              </label>
              <input 
                id="duracao"
                type="number"
                min="0"
                value={form.duracao}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseInt(val, 10) >= 0) {
                    handleFieldChange('duracao', val);
                  }
                }}
                className={`w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all ${
                  errors.duracao ? 'ring-2 ring-[var(--color-error)]' : ''
                }`}
                placeholder="60"
                aria-invalid={!!errors.duracao}
                required
              />
              {errors.duracao && (
                <p className="text-xs text-[var(--color-error)] mt-1 flex items-center gap-1" role="alert">
                  <AlertCircle size={12} aria-hidden="true" /> {errors.duracao}
                </p>
              )}
            </div>
          </div>

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
              className="flex-1 py-3 text-sm font-bold bg-[var(--color-primary)] text-white rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition-transform active:scale-95 hover:opacity-90"
            >
              {editingTerapia ? 'Salvar Alterações' : 'Criar Terapia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================
// HOOK: useDeleteConfirmation
// ======================

const useDeleteConfirmation = () => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const requestConfirmation = useCallback((id: string) => {
    setConfirmingId(id);
    
    timeoutRef.current = setTimeout(() => {
      setConfirmingId(null);
    }, CONFIG.deleteConfirmTimeout);
  }, []);

  const isConfirming = useCallback((id: string) => confirmingId === id, [confirmingId]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { confirmingId, requestConfirmation, isConfirming };
};

// ======================
// COMPONENTE PRINCIPAL
// ======================

export default function TerapiasScreen() {
  const { 
    showNotification, 
    confirmAction, 
    addTerapia, 
    updateTerapia, 
    deleteTerapia, 
    terapias 
  } = useAppContext();
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerapia, setEditingTerapia] = useState<Terapia | null>(null);
  
  // 🎯 Hook de confirmação de exclusão
  const { requestConfirmation, isConfirming } = useDeleteConfirmation();

  // 🎯 Handlers
  const handleSave = useCallback((data: Omit<Terapia, 'id'>, id?: string) => {
    if (id) {
      updateTerapia({ ...data, id });
      showNotification('Terapia atualizada com sucesso!', 'success');
    } else {
      addTerapia(data);
      showNotification('Terapia criada com sucesso!', 'success');
    }
  }, [updateTerapia, addTerapia, showNotification]);

  const handleEdit = useCallback((terapia: Terapia) => {
    setEditingTerapia(terapia);
    setIsModalOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditingTerapia(null);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (isConfirming(id)) {
      // Segunda confirmação: executar exclusão
      deleteTerapia(id);
      showNotification('Terapia excluída com sucesso!', 'success');
    } else {
      // Primeira confirmação: mostrar alerta visual
      requestConfirmation(id);
      showNotification('Toque novamente para confirmar exclusão', 'warning');
    }
  }, [deleteTerapia, showNotification, isConfirming, requestConfirmation]);

  const handleDragStart = useCallback((e: React.DragEvent, terapia: Terapia) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('terapiaId', terapia.id);
    e.dataTransfer.setData('name', terapia.nome);
    e.dataTransfer.setData('time', `${terapia.duracao} min`);
    e.dataTransfer.setData('valor', String(terapia.valor));
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTerapia(null);
  }, []);

  // 🎯 Lista ordenada de terapias
  const sortedTerapias = useMemo(() => {
    return [...(terapias || [])].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [terapias]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <header className="p-4 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          Terapias Oferecidas
        </h1>
        <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm mt-1">
          Gerencie seus serviços e valores
        </p>
      </header>

      {/* List */}
      <main className="flex-1 overflow-y-auto px-4 pb-24" role="main" aria-label="Lista de terapias">
        {sortedTerapias.length === 0 ? (
          <div 
            className="text-center py-12 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 mt-6"
            role="status"
            aria-live="polite"
          >
            <div className="text-6xl mb-4">💆</div>
            <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] font-medium">
              Nenhuma terapia cadastrada.
            </p>
            <p className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-2 opacity-70">
              Comece adicionando sua primeira terapia.
            </p>
            <button 
              onClick={handleNew}
              className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Adicionar Terapia
            </button>
          </div>
        ) : (
          <div className="space-y-3 mt-4" role="list" aria-label={`${sortedTerapias.length} terapias disponíveis`}>
            {sortedTerapias.map(terapia => (
              <TerapiaCard
                key={terapia.id}
                terapia={terapia}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                isConfirmingDelete={isConfirming(terapia.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button 
        onClick={handleNew}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity z-20 focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/50"
        aria-label="Adicionar nova terapia"
      >
        <Plus size={28} aria-hidden="true" />
      </button>

      {/* Modal */}
      <TerapiaFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        editingTerapia={editingTerapia}
      />
    </div>
  );
}