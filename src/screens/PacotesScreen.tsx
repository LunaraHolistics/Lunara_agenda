import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Save, Trash2, GripVertical, Plus, PackageOpen, CheckCircle, ChevronLeft, Edit2, User, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Cliente, Terapia, Pacote, ItemPacote, Transacao } from '../types';
import { useAppContext } from '../AppContext';

// ======================
// TYPES E CONSTANTES
// ======================

type ViewMode = 'list' | 'form';
type PacoteTipo = 'Mensal Fixo' | 'Avulso';
type StatusPagamento = 'Pendente' | 'Pago';

interface PacoteFormState {
  clienteId: string;
  mesReferencia: string;
  itens: ItemPacote[];
  tipoPacote: PacoteTipo;
  observacoes: string;
  valorManual: number | null;
  statusPagamento: StatusPagamento;
  dataPagamento?: string;
  formaPagamento?: string;
  bancoPagamento?: string;
}

const CONFIG = {
  defaultMesReferencia: () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },
  formasPagamento: ['PIX', 'Crédito', 'Débito', 'Transferência', 'Dinheiro'] as const,
  animationDuration: 150
} as const;

// ======================
// UTILITÁRIOS PURE
// ======================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const calcularTotaisPacote = (itens: ItemPacote[], terapias: Terapia[]): { bruto: number; final: number } => {
  let bruto = 0;
  for (const item of itens) {
    const terapia = terapias.find(t => t.id === item.terapiaId);
    if (terapia) {
      bruto += terapia.valor * (item.quantidadeTotal || 1);
    }
  }
  return { bruto, final: bruto };
};

const getPacotesDoPeriodo = (pacotes: Pacote[], meses: string[]): Pacote[] => {
  return pacotes.filter(p => 
    p.status === 'Ativo' && meses.includes(p.mesReferencia)
  );
};

// ======================
// SUB-COMPONENTES MEMOIZED
// ======================

interface PacoteListItemProps {
  pacote: Pacote;
  cliente?: Cliente;
  terapias: Terapia[];
  agendamentos: Agendamento[];
  onEdit: (p: Pacote) => void;
  onDelete: (id: string) => void;
  onRenew: (id: string) => void;
}

const PacoteListItem = memo(({ pacote, cliente, terapias, agendamentos, onEdit, onDelete, onRenew }: PacoteListItemProps) => {
  return (
    <article 
      className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between"
      role="listitem"
      aria-label={`Pacote de ${cliente?.nome || 'cliente'} - ${pacote.mesReferencia}`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full flex items-center justify-center shrink-0" aria-hidden="true">
          <User size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] truncate">
            {cliente?.nome || 'Cliente não encontrado'}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span 
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                pacote.tipoPacote === 'Mensal Fixo' 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' 
                  : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'
              }`}
              aria-label={`Tipo: ${pacote.tipoPacote}`}
            >
              {pacote.tipoPacote || 'Mensal Fixo'}
            </span>
            <span className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">
              {pacote.mesReferencia}
            </span>
            {pacote.statusPagamento === 'Pago' && (
              <span className="text-[10px] font-bold text-[var(--color-success)] bg-[var(--color-success)]/10 px-1.5 py-0.5 rounded" aria-label="Pago">
                ✓ Pago
              </span>
            )}
          </div>
          
          {/* Contador de sessões */}
          <div className="mt-2 space-y-1" aria-label="Progresso das terapias">
            {(pacote.itens || []).map(item => {
              const terapia = terapias.find(t => t.id === item.terapiaId);
              const total = agendamentos.filter(a => a.pacoteId === pacote.id && a.terapiaId === item.terapiaId).length;
              const concluidos = agendamentos.filter(a => a.pacoteId === pacote.id && a.terapiaId === item.terapiaId && a.statusAtendimento === 'Concluido').length;
              const agendados = agendamentos.filter(a => a.pacoteId === pacote.id && a.terapiaId === item.terapiaId && a.statusAtendimento === 'Agendado').length;
              
              return (
                <div key={item.id} className="flex items-center gap-2 text-[10px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" aria-hidden="true"></div>
                  <span className="font-medium opacity-70 truncate max-w-[120px]" title={terapia?.nome}>
                    {terapia?.nome || 'Terapia'}
                  </span>
                  <span className="font-bold text-[var(--color-primary)]">
                    {concluidos}/{total}
                    {agendados > 0 && <span className="opacity-50 font-normal"> (+{agendados})</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <nav className="flex gap-2 relative z-20 shrink-0 ml-2" role="group" aria-label={`Ações para pacote de ${cliente?.nome}`}>
        {pacote.tipoPacote === 'Mensal Fixo' && (
          <button 
            onClick={() => onRenew(pacote.id)}
            className="p-2 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
            aria-label={`Renovar pacote de ${cliente?.nome} para próximo mês`}
            title="Renovar para o próximo mês"
          >
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        )}
        <button 
          onClick={() => onEdit(pacote)}
          className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          aria-label={`Editar pacote de ${cliente?.nome}`}
        >
          <Edit2 size={18} aria-hidden="true" />
        </button>
        <button 
          onClick={() => onDelete(pacote.id)}
          className="p-2 text-[var(--color-error)] bg-[var(--color-error)]/10 rounded-xl hover:bg-[var(--color-error)]/20 transition-colors active:opacity-50"
          aria-label={`Excluir pacote de ${cliente?.nome}`}
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </nav>
    </article>
  );
});
PacoteListItem.displayName = 'PacoteListItem';

interface TerapiaCardProps {
  terapia: Terapia;
  onAdd: (terapiaId: string) => void;
  onDragStart: (e: React.DragEvent, terapiaId: string) => void;
}

const TerapiaCard = memo(({ terapia, onAdd, onDragStart }: TerapiaCardProps) => {
  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, terapia.id)}
      className="snap-start shrink-0 w-40 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm cursor-grab active:cursor-grabbing flex flex-col justify-between"
      role="listitem"
      aria-label={`Terapia: ${terapia.nome}, valor: ${formatCurrency(terapia.valor)}`}
    >
      <div>
        <div className="flex justify-between items-start mb-1">
          <GripVertical size={16} className="text-gray-400" aria-hidden="true" />
          <button 
            onClick={() => onAdd(terapia.id)}
            className="p-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors"
            aria-label={`Adicionar ${terapia.nome} ao pacote`}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
        <h4 className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] leading-tight mt-1 truncate" title={terapia.nome}>
          {terapia.nome || 'Sem Nome'}
        </h4>
      </div>
      <p className="text-[var(--color-primary)] font-bold text-sm mt-2">
        {formatCurrency(terapia.valor)}
      </p>
    </div>
  );
});
TerapiaCard.displayName = 'TerapiaCard';

// ======================
// HOOK: usePacoteForm
// ======================

interface UsePacoteFormProps {
  editingPacote?: Pacote | null;
  terapias: Terapia[];
  onSave: (data: Pacote) => void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const usePacoteForm = ({ editingPacote, terapias, onSave, showNotification }: UsePacoteFormProps) => {
  const [form, setForm] = useState<PacoteFormState>({
    clienteId: '',
    mesReferencia: CONFIG.defaultMesReferencia(),
    itens: [],
    tipoPacote: 'Mensal Fixo',
    observacoes: '',
    valorManual: null,
    statusPagamento: 'Pendente',
    dataPagamento: undefined,
    formaPagamento: undefined,
    bancoPagamento: undefined
  });
  
  const [isDirty, setIsDirty] = useState(false);

  // Reset form quando editingPacote mudar
  useEffect(() => {
    if (editingPacote) {
      setForm({
        clienteId: editingPacote.clienteId,
        mesReferencia: editingPacote.mesReferencia,
        itens: editingPacote.itens || [],
        tipoPacote: editingPacote.tipoPacote as PacoteTipo,
        observacoes: editingPacote.observacoes || '',
        valorManual: editingPacote.valorFinal,
        statusPagamento: editingPacote.statusPagamento || 'Pendente',
        dataPagamento: editingPacote.dataPagamento,
        formaPagamento: editingPacote.formaPagamento,
        bancoPagamento: editingPacote.bancoPagamento
      });
      setIsDirty(false);
    } else {
      setForm(prev => ({
        ...prev,
        clienteId: '',
        itens: [],
        tipoPacote: 'Mensal Fixo',
        observacoes: '',
        valorManual: null,
        statusPagamento: 'Pendente',
        dataPagamento: undefined,
        formaPagamento: undefined,
        bancoPagamento: undefined
      }));
      setIsDirty(false);
    }
  }, [editingPacote]);

  const updateField = useCallback(<K extends keyof PacoteFormState>(field: K, value: PacoteFormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const addItem = useCallback((terapiaId: string) => {
    if (form.itens.some(item => item.terapiaId === terapiaId)) {
      showNotification('Terapia já inclusa', 'info');
      return;
    }
    const newItem: ItemPacote = {
      id: crypto.randomUUID(),
      terapiaId,
      quantidadeTotal: 1,
      quantidadeRestante: 1
    };
    updateField('itens', [...form.itens, newItem]);
  }, [form.itens, updateField, showNotification]);

  const updateItem = useCallback((id: string, field: keyof ItemPacote, value: any) => {
    const updated = form.itens.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Se mudou quantidadeTotal, ajustar quantidadeRestante proporcionalmente
        if (field === 'quantidadeTotal') {
          const diff = Number(value) - Number(item.quantidadeTotal);
          updatedItem.quantidadeRestante = Number(item.quantidadeRestante) + diff;
        }
        return updatedItem;
      }
      return item;
    });
    updateField('itens', updated);
  }, [form.itens, updateField]);

  const removeItem = useCallback((id: string) => {
    updateField('itens', form.itens.filter(item => item.id !== id));
  }, [form.itens, updateField]);

  const calcularTotais = useMemo(() => {
    return calcularTotaisPacote(form.itens, terapias);
  }, [form.itens, terapias]);

  const valorFinal = form.valorManual !== null ? form.valorManual : calcularTotais.final;

  const validate = (): boolean => {
    if (!form.clienteId) {
      showNotification('Selecione um cliente válido.', 'error');
      return false;
    }
    if (form.itens.length === 0) {
      showNotification('Adicione pelo menos uma terapia ao pacote.', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = useCallback((): Pacote | null => {
    if (!validate()) return null;
    
    const pacoteId = editingPacote?.id || crypto.randomUUID();
    
    return {
      id: pacoteId,
      clienteId: form.clienteId,
      mesReferencia: form.mesReferencia,
      valorFinal: valorFinal,
      itens: form.itens,
      tipoPacote: form.tipoPacote,
      status: 'Ativo',
      statusPagamento: form.statusPagamento,
      dataPagamento: form.dataPagamento,
      formaPagamento: form.formaPagamento,
      bancoPagamento: form.bancoPagamento,
      observacoes: form.observacoes
    };
  }, [editingPacote, form, valorFinal, validate]);

  const reset = useCallback(() => {
    setForm({
      clienteId: '',
      mesReferencia: CONFIG.defaultMesReferencia(),
      itens: [],
      tipoPacote: 'Mensal Fixo',
      observacoes: '',
      valorManual: null,
      statusPagamento: 'Pendente',
      dataPagamento: undefined,
      formaPagamento: undefined,
      bancoPagamento: undefined
    });
    setIsDirty(false);
  }, []);

  return {
    form,
    isDirty,
    valorFinal,
    totais: calcularTotais,
    updateField,
    addItem,
    updateItem,
    removeItem,
    handleSubmit,
    reset
  };
};

// ======================
// COMPONENTE PRINCIPAL
// ======================

export default function PacotesScreen() {
  const { 
    showNotification, 
    confirmAction, 
    clientes,
    terapias,
    pacotes,
    agendamentos,
    transacoes,
    addPacote, 
    updatePacote, 
    deletePacote,
    addTransacao,
    updateTransacao,
    renewPacote
  } = useAppContext();
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(false);
  const [editingPacoteId, setEditingPacoteId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  // 🎯 Hook do formulário
  const {
    form,
    isDirty,
    valorFinal,
    totais,
    updateField,
    addItem,
    updateItem,
    removeItem,
    handleSubmit,
    reset
  } = usePacoteForm({
    editingPacote: editingPacoteId ? pacotes?.find(p => p.id === editingPacoteId) || null : null,
    terapias: terapias || [],
    onSave: () => {}, // Chamado manualmente no handleSave
    showNotification
  });

  // 🎯 Filtros memoizados
  const pacotesDoPeriodo = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    
    return getPacotesDoPeriodo(pacotes || [], [currentMonthStr, nextMonthStr]);
  }, [pacotes]);

  // 🎯 Handlers
  const handleEdit = useCallback((pacote: Pacote) => {
    setEditingPacoteId(pacote.id);
    setViewMode('form');
  }, []);

  const handleNew = useCallback(() => {
    setEditingPacoteId(null);
    reset();
    setViewMode('form');
  }, [reset]);

  const handleDelete = useCallback((pacoteId: string) => {
    confirmAction(
      'Deseja realmente excluir este pacote? Todos os agendamentos e registros financeiros vinculados serão removidos permanentemente.',
      async () => {
        try {
          setLoading(true);
          await deletePacote(pacoteId);
          setViewMode('list');
          showNotification('Pacote excluído com sucesso.', 'success');
        } catch (error: any) {
          showNotification('Erro ao excluir: ' + error.message, 'error');
        } finally {
          setLoading(false);
        }
      },
      { isDanger: true }
    );
  }, [confirmAction, deletePacote, showNotification]);

  const handleRenew = useCallback((pacoteId: string) => {
    confirmAction(
      'Deseja renovar este pacote para o próximo mês? Os agendamentos serão duplicados para 4 semanas depois.',
      () => renewPacote(pacoteId)
    );
  }, [confirmAction, renewPacote]);

  const handleDragStart = useCallback((e: React.DragEvent, terapiaId: string) => {
    e.dataTransfer.setData('terapiaId', terapiaId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const terapiaId = e.dataTransfer.getData('terapiaId');
    if (terapiaId) addItem(terapiaId);
  }, [addItem]);

  const handleMarcarPago = useCallback(() => {
    const novoStatus = form.statusPagamento === 'Pago' ? 'Pendente' : 'Pago';
    updateField('statusPagamento', novoStatus);
    if (novoStatus === 'Pago') {
      updateField('dataPagamento', new Date().toISOString().split('T')[0]);
      updateField('formaPagamento', 'PIX');
    } else {
      updateField('dataPagamento', undefined);
      updateField('formaPagamento', undefined);
      updateField('bancoPagamento', undefined);
    }
  }, [form.statusPagamento, updateField]);

  const handleSave = useCallback(() => {
    const pacoteData = handleSubmit();
    if (!pacoteData) return;

    const originalPacote = editingPacoteId ? pacotes?.find(p => p.id === editingPacoteId) : null;
    const isAlreadyPaid = originalPacote?.statusPagamento === 'Pago' && originalPacote?.dataPagamento;
    
    let valorFinalParaPacote = valorFinal;
    let valorExtra = 0;

    // Lógica de Serviço Extra
    if (isAlreadyPaid && valorFinal > (originalPacote?.valorFinal || 0)) {
      valorExtra = valorFinal - (originalPacote?.valorFinal || 0);
      valorFinalParaPacote = originalPacote!.valorFinal;
    }

    // Salvar pacote
    if (editingPacoteId) {
      updatePacote({ ...pacoteData, valorFinal: valorFinalParaPacote });
    } else {
      addPacote({ ...pacoteData, valorFinal: valorFinalParaPacote });
    }

    // Sincronização Financeira
    const cliente = clientes?.find(c => c.id === form.clienteId);
    const clienteNome = cliente?.nome || 'Cliente';
    
    const transacaoData: Omit<Transacao, 'id'> = {
      descricao: `Pacote - ${clienteNome}`,
      valor: valorFinalParaPacote,
      data: form.dataPagamento || new Date().toISOString().split('T')[0],
      metodo: form.formaPagamento || 'PIX',
      categoria: 'Pacotes',
      status: form.statusPagamento,
      pacoteId: pacoteData.id,
      tipo: 'Receita',
      segmento: 'holistica'
    };

    const transacaoExistente = transacoes?.find(t => t.pacoteId === pacoteData.id);
    if (transacaoExistente) {
      updateTransacao({ ...transacaoData, id: transacaoExistente.id });
    } else {
      addTransacao({ ...transacaoData, id: crypto.randomUUID() });
    }

    // Lançamento de Serviço Extra
    if (valorExtra > 0) {
      addTransacao({
        id: crypto.randomUUID(),
        descricao: `Serviço Extra - ${clienteNome}`,
        valor: valorExtra,
        data: new Date().toISOString().split('T')[0],
        metodo: 'PIX',
        categoria: 'Serviço Extra',
        status: 'Pendente',
        tipo: 'Receita',
        segmento: 'holistica'
      });
      showNotification(`R$ ${valorExtra.toFixed(2)} gerado como Serviço Extra!`, 'info');
    }
    
    setViewMode('list');
    showNotification('Pacote salvo com sucesso!', 'success');
  }, [
    handleSubmit, editingPacoteId, pacotes, valorFinal, clientes, form,
    updatePacote, addPacote, transacoes, updateTransacao, addTransacao, showNotification
  ]);

  // 🎯 Keyboard shortcut: ESC para voltar à lista
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewMode === 'form') {
        setViewMode('list');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  // 🎯 Renderização condicional
  if (viewMode === 'list') {
    return (
      <div className="h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 pb-32 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
        <header className="p-6 pb-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Pacotes Ativos</h1>
          <button 
            onClick={handleNew}
            className="p-2 bg-[var(--color-primary)] text-white rounded-full shadow-lg hover:opacity-90 transition-opacity"
            aria-label="Criar novo pacote"
          >
            <Plus size={24} aria-hidden="true" />
          </button>
        </header>

        <main className="p-4 space-y-3" role="main" aria-label="Lista de pacotes">
          {loading ? (
            <div className="flex justify-center py-10" role="status" aria-live="polite">
              <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" aria-hidden="true" />
              <span className="sr-only">Carregando pacotes...</span>
            </div>
          ) : pacotesDoPeriodo.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl border border-dashed border-gray-300 dark:border-gray-700" role="status">
              <PackageOpen size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
              <p className="text-gray-500 dark:text-gray-400">Nenhum pacote ativo.</p>
              <button 
                onClick={handleNew}
                className="mt-4 text-sm text-[var(--color-primary)] font-bold hover:underline"
              >
                Criar primeiro pacote
              </button>
            </div>
          ) : (
            <div className="space-y-3" role="list" aria-label={`${pacotesDoPeriodo.length} pacotes encontrados`}>
              {pacotesDoPeriodo.map(pacote => (
                <PacoteListItem
                  key={pacote.id}
                  pacote={pacote}
                  cliente={clientes?.find(c => c.id === pacote.clienteId)}
                  terapias={terapias || []}
                  agendamentos={agendamentos || []}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRenew={handleRenew}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // 🎯 View: Formulário
  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 [webkit-overflow-scrolling:touch] pb-32 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <header className="p-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 z-10 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => setViewMode('list')}
            className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Voltar para lista"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {editingPacoteId ? 'Editar Pacote' : 'Montar Pacote'}
          </h1>
        </div>
        
        {/* Seletores */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="cliente-select" className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-1">
                Cliente
              </label>
              <select 
                id="cliente-select"
                value={form.clienteId}
                onChange={(e) => updateField('clienteId', e.target.value)}
                disabled={!!editingPacoteId}
                className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                aria-label="Selecionar cliente"
              >
                <option value="" disabled>Selecione o Cliente...</option>
                {(clientes || []).map(c => (
                  <option key={c.id} value={c.id}>{c.nome || 'Sem Nome'}</option>
                ))}
              </select>
            </div>
            <div className="w-36">
              <label htmlFor="mes-ref" className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-1">
                Mês Ref.
              </label>
              <input 
                id="mes-ref"
                type="month"
                value={form.mesReferencia}
                onChange={(e) => updateField('mesReferencia', e.target.value)}
                className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                aria-label="Selecionar mês de referência"
              />
            </div>
          </div>

          {/* Tipo de Pacote */}
          <fieldset>
            <legend className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-2">
              Tipo de Pacote
            </legend>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de pacote">
              {(['Mensal Fixo', 'Avulso'] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  role="radio"
                  aria-checked={form.tipoPacote === tipo}
                  onClick={() => updateField('tipoPacote', tipo)}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    form.tipoPacote === tipo 
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                      : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-gray-500 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </header>

      <main className="flex flex-col pb-8">
        {/* Terapias Disponíveis */}
        <section className="p-4 shrink-0" aria-labelledby="terapias-disponiveis">
          <h2 id="terapias-disponiveis" className="text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-wider mb-3">
            Adicionar Terapias
          </h2>
          <div className="flex overflow-x-auto pb-2 gap-3 snap-x" role="list" aria-label="Terapias disponíveis para adicionar">
            {(terapias || []).map(terapia => (
              <TerapiaCard
                key={terapia.id}
                terapia={terapia}
                onAdd={addItem}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        </section>

        {/* Dropzone */}
        <section 
          className={`shrink-0 p-4 mx-4 mb-4 rounded-3xl border-2 border-dashed transition-all ${
            isDraggingOver 
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.02]' 
              : 'border-gray-200 dark:border-gray-800 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          role="region"
          aria-label="Área para adicionar terapias ao pacote"
        >
          <h3 className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-4 flex items-center gap-2">
            <PackageOpen size={18} className="text-[var(--color-primary)]" aria-hidden="true" />
            Itens do Pacote
          </h3>

          {form.itens.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]" role="status">
              <p className="text-sm text-center opacity-60">Arraste as terapias para cá<br/>ou use o botão + acima</p>
            </div>
          ) : (
            <div className="space-y-3" role="list" aria-label="Itens adicionados ao pacote">
              {form.itens.map((item, index) => {
                const terapia = terapias?.find(t => t.id === item.terapiaId);
                if (!terapia) return null;

                return (
                  <article key={item.id} className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">
                        {index + 1}. {terapia.nome || 'Sem Nome'}
                      </h4>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-[var(--color-error)] p-1.5 bg-[var(--color-error)]/10 rounded-lg hover:bg-[var(--color-error)]/20 transition-colors"
                        aria-label={`Remover ${terapia.nome} do pacote`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                    
                    <div className="flex gap-3 items-end">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1 text-center">Qtd</label>
                        <div className="flex items-center gap-1" role="group" aria-label={`Quantidade de ${terapia.nome}`}>
                          <button 
                            onClick={() => updateItem(item.id, 'quantidadeTotal', Math.max(1, (item.quantidadeTotal || 1) - 1))}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold transition-colors"
                            aria-label="Diminuir quantidade"
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            min="1"
                            value={item.quantidadeTotal || ''}
                            onChange={(e) => {
                              const novaQtd = Math.max(1, parseInt(e.target.value) || 1);
                              updateItem(item.id, 'quantidadeTotal', novaQtd);
                            }}
                            className="w-12 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-100 dark:border-gray-800 rounded-lg px-1 py-1.5 text-sm outline-none text-center font-bold"
                            aria-label="Quantidade de sessões"
                          />
                          <button 
                            onClick={() => updateItem(item.id, 'quantidadeTotal', (item.quantidadeTotal || 1) + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold transition-colors"
                            aria-label="Aumentar quantidade"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Observações e Pagamento */}
        {form.itens.length > 0 && (
          <section className="p-5 mx-4 mb-4 rounded-3xl border border-gray-200 dark:border-gray-800 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] shrink-0">
            {/* Observações */}
            <div className="mb-4">
              <label htmlFor="observacoes" className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-2">
                Observações
              </label>
              <textarea 
                id="observacoes"
                value={form.observacoes}
                onChange={(e) => updateField('observacoes', e.target.value)}
                className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                rows={3}
                placeholder="Anotações sobre o tratamento..."
                aria-label="Observações adicionais sobre o pacote"
              />
            </div>

            {/* Pagamento */}
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Status do Pagamento</span>
                <button 
                  onClick={handleMarcarPago}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    form.statusPagamento === 'Pago' 
                      ? 'bg-[var(--color-success)] text-white focus:ring-[var(--color-success)]' 
                      : 'bg-[var(--color-warning)] text-white focus:ring-[var(--color-warning)]'
                  }`}
                  aria-pressed={form.statusPagamento === 'Pago'}
                  aria-label={form.statusPagamento === 'Pago' ? 'Marcar como pendente' : 'Marcar como pago'}
                >
                  <CheckCircle size={16} aria-hidden="true" />
                  {form.statusPagamento === 'Pago' ? 'PAGO' : 'PENDENTE'}
                </button>
              </div>

              {form.statusPagamento === 'Pago' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="data-pagamento" className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Data</label>
                    <input 
                      id="data-pagamento"
                      type="date" 
                      value={form.dataPagamento || ''}
                      onChange={(e) => updateField('dataPagamento', e.target.value)}
                      className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      aria-label="Data do pagamento"
                    />
                  </div>
                  <div>
                    <label htmlFor="forma-pagamento" className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Forma</label>
                    <select 
                      id="forma-pagamento"
                      value={form.formaPagamento || ''}
                      onChange={(e) => updateField('formaPagamento', e.target.value)}
                      className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      aria-label="Forma de pagamento"
                    >
                      {CONFIG.formasPagamento.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer / Totais */}
      <footer className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-t border-gray-200 dark:border-gray-800 p-6 shadow-lg sticky bottom-0 z-20">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-[var(--color-text-sec-light)] uppercase">Bruto</span>
          <span className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">{formatCurrency(totais.bruto)}</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800 mb-5">
          <span className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">VALOR FINAL</span>
          <input 
            type="number"
            min="0"
            step="0.01"
            value={valorFinal}
            onChange={(e) => updateField('valorManual', parseFloat(e.target.value) || 0)}
            className="text-2xl font-black text-[var(--color-primary)] bg-transparent w-32 text-right outline-none border-b border-dashed border-[var(--color-primary)] focus:border-solid"
            aria-label="Valor final do pacote"
          />
        </div>
        
        <button 
          onClick={handleSave}
          disabled={!isDirty || loading}
          className="w-full py-4 bg-[var(--color-primary)] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={20} aria-hidden="true" />
              {editingPacoteId ? 'SALVAR ALTERAÇÕES' : 'SALVAR PACOTE'}
            </>
          )}
        </button>
      </footer>
    </div>
  );
}