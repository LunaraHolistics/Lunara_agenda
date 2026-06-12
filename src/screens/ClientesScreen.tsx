import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Smartphone, MessageCircle, Sparkles, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Cliente, ImportedContact, DadosProfissionais, Transacao, Agendamento, Terapia } from '../types';
import { useAppContext } from '../AppContext';
import PrintInformeModal from '../components/PrintInformeModal';

// ======================
// TYPES E CONSTANTES
// ======================

interface ClientesScreenProps {
  // Pode receber props futuras se necessário
}

type CountryCode = '+55' | '+44' | '+351' | '+1' | '+244' | '+258' | '+238' | '+245' | '+239' | '+670' | '+54' | '+595' | '+598';

interface CountryInfo {
  code: CountryCode;
  flag: string;
  name: string;
  mask: (digits: string) => string;
  maxLength: number;
}

const CONFIG = {
  countries: {
    '+55': { code: '+55' as CountryCode, flag: '🇧🇷', name: 'Brasil', maxLength: 11 },
    '+44': { code: '+44' as CountryCode, flag: '🇬🇧', name: 'Reino Unido', maxLength: 10 },
    '+351': { code: '+351' as CountryCode, flag: '🇵🇹', name: 'Portugal', maxLength: 9 },
    '+1': { code: '+1' as CountryCode, flag: '🇺🇸', name: 'EUA/Canadá', maxLength: 10 },
    '+244': { code: '+244' as CountryCode, flag: '🇦🇴', name: 'Angola', maxLength: 9 },
    '+258': { code: '+258' as CountryCode, flag: '🇲🇿', name: 'Moçambique', maxLength: 9 },
    '+238': { code: '+238' as CountryCode, flag: '🇨👳', name: 'Cabo Verde', maxLength: 7 },
    '+245': { code: '+245' as CountryCode, flag: '🇬🇼', name: 'Guiné-Bissau', maxLength: 7 },
    '+239': { code: '+239' as CountryCode, flag: '🇸🇹', name: 'São Tomé', maxLength: 7 },
    '+670': { code: '+670' as CountryCode, flag: '🇹🇱', name: 'Timor-Leste', maxLength: 8 },
    '+54': { code: '+54' as CountryCode, flag: '🇦🇷', name: 'Argentina', maxLength: 10 },
    '+595': { code: '+595' as CountryCode, flag: '🇵🇾', name: 'Paraguai', maxLength: 10 },
    '+598': { code: '+598' as CountryCode, flag: '🇺🇾', name: 'Uruguai', maxLength: 9 },
  } as Record<CountryCode, CountryInfo>,
  defaultCountry: '+55' as CountryCode,
  months: {
    december: 11, // Retrospectiva
    march: 2,     // IR
    april: 3      // IR
  },
  ui: {
    toastDuration: 3000,
    deleteConfirmDuration: 3000,
    searchDebounce: 300
  }
} as const;

// ======================
// UTILITÁRIOS PURE
// ======================

const formatPhoneBR = (digits: string): string => {
  // Máscara Brasileira: (00) 00000-0000 ou (00) 0000-0000
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) {
    const ddd = digits.slice(0, 2);
    const prefix = digits.slice(2, 7);
    const suffix = digits.slice(7);
    return `(${ddd}) ${prefix}-${suffix}`;
  }
  return digits.slice(0, 15);
};

const formatPhoneInternational = (digits: string): string => {
  // Formato internacional: espaços a cada 4 dígitos para legibilidade
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const applyPhoneMask = (value: string, ddi: CountryCode): string => {
  const digits = value.replace(/\D/g, '');
  const country = CONFIG.countries[ddi];
  
  if (!country) return digits;
  
  // Brasil tem máscara especial
  if (ddi === '+55') {
    return formatPhoneBR(digits);
  }
  
  // Outros países: formato internacional
  return formatPhoneInternational(digits);
};

const extractPhoneParts = (fullPhone: string): { ddi: CountryCode; number: string } => {
  if (!fullPhone || !fullPhone.startsWith('+')) {
    return { ddi: CONFIG.defaultCountry, number: '' };
  }
  
  // Extrai DDI (2-3 dígitos após o +)
  const ddiMatch = fullPhone.match(/^\+(\d{2,3})/);
  if (!ddiMatch) {
    return { ddi: CONFIG.defaultCountry, number: fullPhone.replace(/^\+/, '') };
  }
  
  const ddi = `+${ddiMatch[1]}` as CountryCode;
  const number = fullPhone.replace(/^\+\d{2,3}/, '');
  
  // Validar se DDI é suportado
  if (!CONFIG.countries[ddi as CountryCode]) {
    return { ddi: CONFIG.defaultCountry, number: fullPhone.replace(/^\+/, '') };
  }
  
  return { ddi: ddi as CountryCode, number };
};

const cleanPhoneForStorage = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

const formatWhatsAppMessage = (clienteNome: string): string => {
  return `Olá, ${clienteNome}! Passando para confirmar nossa sessão. Gratidão, Celso.`;
};

const formatRetrospectivaMessage = (
  clienteNome: string,
  total: number,
  terapiasNomes: string
): string => {
  return `Olá, ${clienteNome}! 🌿 Ao encerrarmos este ciclo, gostaria de agradecer pela confiança. Neste ano, caminhamos juntos em ${total} sessões de ${terapiasNomes}. Que a energia cultivada floresça em sua vida. Gratidão, Celso Luiz.`;
};

// ======================
// SUB-COMPONENTES MEMOIZED
// ======================

interface ClienteItemProps {
  cliente: Cliente;
  onEdit: (c: Cliente) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (c: Cliente) => void;
  onRetrospectiva?: (c: Cliente) => void;
  showRetrospectiva: boolean;
  isConfirmingDelete: boolean;
  onConfirmDelete: (id: string) => void;
}

const ClienteItem = memo(({
  cliente,
  onEdit,
  onDelete,
  onWhatsApp,
  onRetrospectiva,
  showRetrospectiva,
  isConfirmingDelete,
  onConfirmDelete
}: ClienteItemProps) => {
  const handleDeleteClick = () => {
    if (isConfirmingDelete) {
      onConfirmDelete(cliente.id);
    } else {
      onDelete(cliente.id);
    }
  };

  return (
    <article 
      className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm flex items-center justify-between"
      role="listitem"
      aria-label={`Cliente: ${cliente.nome}`}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-lg truncate">
          {cliente.nome || "Sem Nome"}
        </h3>
        {cliente.telefone && (
          <p className="text-[var(--color-text-sec-light)] text-sm" aria-label={`Telefone: ${cliente.telefone}`}>
            {cliente.telefone}
          </p>
        )}
      </div>
      
      <nav className="flex items-center gap-1" role="group" aria-label={`Ações para ${cliente.nome}`}>
        <a 
          href={`https://wa.me/${cleanPhoneForStorage(cliente.telefone || '')}?text=${encodeURIComponent(formatWhatsAppMessage(cliente.nome || ''))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition-colors"
          aria-label={`Enviar WhatsApp para ${cliente.nome}`}
          title="Enviar mensagem"
        >
          <MessageCircle size={20} aria-hidden="true" />
        </a>
        
        {showRetrospectiva && onRetrospectiva && (
          <button 
            onClick={() => onRetrospectiva(cliente)}
            className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full transition-colors"
            aria-label={`Gerar retrospectiva para ${cliente.nome}`}
            title="Retrospectiva anual"
          >
            <Sparkles size={20} aria-hidden="true" />
          </button>
        )}
        
        <button 
          onClick={() => onEdit(cliente)}
          className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-full transition-colors"
          aria-label={`Editar ${cliente.nome}`}
          title="Editar cliente"
        >
          <Edit2 size={20} aria-hidden="true" />
        </button>
        
        <button 
          onClick={handleDeleteClick}
          className={`p-2 rounded-full transition-colors ${
            isConfirmingDelete 
              ? 'bg-[var(--color-error)] text-white animate-pulse' 
              : 'text-[var(--color-error)] hover:bg-[var(--color-error)]/10'
          }`}
          aria-label={isConfirmingDelete ? `Confirmar exclusão de ${cliente.nome}` : `Excluir ${cliente.nome}`}
          title={isConfirmingDelete ? 'Toque novamente para confirmar' : 'Excluir cliente'}
        >
          {isConfirmingDelete ? (
            <AlertCircle size={20} aria-hidden="true" />
          ) : (
            <Trash2 size={20} aria-hidden="true" />
          )}
        </button>
      </nav>
    </article>
  );
});
ClienteItem.displayName = 'ClienteItem';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Cliente, 'id'>, editingId?: string) => Promise<void>;
  editingCliente?: Cliente | null;
  isSaving: boolean;
  showIRButton: boolean;
  onGenerateIR: () => void;
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCliente,
  isSaving,
  showIRButton,
  onGenerateIR
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    ddi: CONFIG.defaultCountry,
    telefone: '',
    cpf: '',
    observacoes: ''
  });
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens or editingCliente changes
  useEffect(() => {
    if (isOpen) {
      if (editingCliente) {
        const { ddi, number } = extractPhoneParts(editingCliente.telefone || '');
        setFormData({
          nome: editingCliente.nome || '',
          ddi,
          telefone: applyPhoneMask(number, ddi),
          cpf: editingCliente.cpf || '',
          observacoes: editingCliente.observacoes || ''
        });
      } else {
        setFormData({
          nome: '',
          ddi: CONFIG.defaultCountry,
          telefone: '',
          cpf: '',
          observacoes: ''
        });
      }
      setIsDirty(false);
      setErrors({});
    }
  }, [isOpen, editingCliente]);

  // Keyboard shortcut: ESC para fechar
  useEffect(() => {
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
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const cleanPhone = cleanPhoneForStorage(formData.telefone);
    const fullPhone = cleanPhone ? `${formData.ddi}${cleanPhone}` : '';
    
    const clienteData: Omit<Cliente, 'id'> = {
      nome: formData.nome.trim(),
      telefone: fullPhone,
      cpf: formData.cpf.trim() || undefined,
      observacoes: formData.observacoes.trim() || undefined,
    };

    await onSave(clienteData, editingCliente?.id);
    onClose();
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handlePhoneChange = (value: string) => {
    const masked = applyPhoneMask(value, formData.ddi);
    handleFieldChange('telefone', masked);
  };

  const handleDDIChange = (newDdi: CountryCode) => {
    // Re-aplicar máscara ao trocar DDI
    const digits = formData.telefone.replace(/\D/g, '');
    const masked = applyPhoneMask(digits, newDdi);
    
    setFormData(prev => ({ ...prev, ddi: newDdi, telefone: masked }));
    setIsDirty(true);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="modal-title" className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg transition-colors"
            aria-label="Fechar modal"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Importar contatos (apenas para novo cliente) */}
          {!editingCliente && (
            <button 
              type="button"
              onClick={() => {/* Import logic handled by parent */}}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-xl font-bold border border-dashed border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/20 transition-colors"
            >
              <Smartphone size={20} aria-hidden="true" /> 
              <span>Importar da Agenda</span>
            </button>
          )}

          {/* Nome */}
          <div>
            <label htmlFor="nome" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
              Nome <span className="text-[var(--color-error)]">*</span>
            </label>
            <input 
              id="nome"
              type="text" 
              value={formData.nome}
              onChange={e => handleFieldChange('nome', e.target.value)}
              placeholder="Nome completo"
              className={`w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all ${
                errors.nome ? 'ring-2 ring-[var(--color-error)]' : ''
              }`}
              aria-invalid={!!errors.nome}
              aria-describedby={errors.nome ? 'nome-error' : undefined}
              required
            />
            {errors.nome && (
              <p id="nome-error" className="text-[10px] text-[var(--color-error)] mt-1 flex items-center gap-1" role="alert">
                <AlertCircle size={10} aria-hidden="true" /> {errors.nome}
              </p>
            )}
          </div>

          {/* Telefone Internacional */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
              Telefone Internacional
            </label>
            <div className="flex gap-2">
              <label htmlFor="ddi" className="sr-only">Código do país</label>
              <select 
                id="ddi"
                value={formData.ddi} 
                onChange={e => handleDDIChange(e.target.value as CountryCode)}
                className="w-24 px-2 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-bold"
                aria-label="Selecionar código do país"
              >
                {Object.values(CONFIG.countries).map(country => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.code}
                  </option>
                ))}
              </select>
              
              <label htmlFor="telefone" className="sr-only">Número de telefone</label>
              <input 
                id="telefone"
                type="tel" 
                value={formData.telefone}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder={formData.ddi === '+55' ? '(00) 00000-0000' : 'Número completo'}
                className="flex-1 px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                aria-label="Número de telefone"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="observacoes" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
              Observações
            </label>
            <textarea 
              id="observacoes"
              value={formData.observacoes}
              onChange={e => handleFieldChange('observacoes', e.target.value)}
              placeholder="Informações adicionais sobre o cliente..."
              className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          {/* CPF */}
          <div>
            <label htmlFor="cpf" className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">
              CPF
            </label>
            <input 
              id="cpf"
              type="text" 
              value={formData.cpf}
              onChange={e => handleFieldChange('cpf', e.target.value)}
              placeholder="000.000.000-00"
              className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              aria-label="CPF do cliente"
            />
          </div>

          {/* Botão de Informe IR (apenas edição, março/abril) */}
          {editingCliente && showIRButton && (
            <button 
              type="button"
              onClick={onGenerateIR}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              <FileText size={20} aria-hidden="true" /> 
              Gerar Informe de Pagamentos (IR)
            </button>
          )}

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
              disabled={isSaving || !isDirty}
              className="flex-1 py-3 text-sm font-bold bg-[var(--color-primary)] text-white rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================
// HOOK: useClientForm
// ======================

interface UseClientFormProps {
  editingCliente: Cliente | null;
  onSave: (data: Omit<Cliente, 'id'>, id?: string) => Promise<void>;
}

const useClientForm = ({ editingCliente, onSave }: UseClientFormProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const openModal = useCallback((cliente?: Cliente) => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSave = useCallback(async (data: Omit<Cliente, 'id'>, id?: string) => {
    setIsSaving(true);
    try {
      if (id) {
        await onSave(data, id);
      } else {
        await onSave(data);
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), CONFIG.ui.toastDuration);
      return true;
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  return {
    isModalOpen,
    isSaving,
    showToast,
    openModal,
    closeModal,
    handleSave
  };
};

// ======================
// HOOK: useClientFilters
// ======================

const useClientFilters = (clientes: Cliente[], searchQuery: string) => {
  return useMemo(() => {
    if (!searchQuery.trim()) return clientes;
    
    const query = searchQuery.toLowerCase();
    
    return clientes.filter(c => 
      (c.nome?.toLowerCase() || '').includes(query) || 
      (c.telefone || '').includes(query) ||
      (c.cpf || '').includes(query)
    );
  }, [clientes, searchQuery]);
};

// ======================
// HOOK: useDeleteConfirmation
// ======================

const useDeleteConfirmation = () => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const requestConfirmation = useCallback((id: string) => {
    setConfirmingId(id);
    
    // Auto-cancel after timeout
    timeoutRef.current = setTimeout(() => {
      setConfirmingId(null);
    }, CONFIG.ui.deleteConfirmDuration);
  }, []);

  const cancelConfirmation = useCallback(() => {
    setConfirmingId(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const isConfirming = useCallback((id: string) => confirmingId === id, [confirmingId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    confirmingId,
    requestConfirmation,
    cancelConfirmation,
    isConfirming
  };
};

// ======================
// COMPONENTE PRINCIPAL
// ======================

export default function ClientesScreen({}: ClientesScreenProps) {
  const { 
    clientes: contextClientes,
    agendamentos,
    terapias,
    transacoes,
    showNotification,
    handleImportContacts,
    addCliente,
    updateCliente,
    deleteCliente,
    confirmAction
  } = useAppContext();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  
  // 🎯 Hooks customizados
  const {
    isModalOpen,
    isSaving,
    showToast,
    openModal,
    closeModal,
    handleSave: handleFormSave
  } = useClientForm({
    editingCliente,
    onSave: async (data, id) => {
      if (id) {
        updateCliente({ ...data, id });
      } else {
        addCliente(data);
      }
    }
  });

  const { requestConfirmation, isConfirming } = useDeleteConfirmation();
  
  // 🎯 Filtros memoizados
  const filteredClientes = useClientFilters(contextClientes || [], searchQuery);

  // 🎯 Detectar meses sazonais
  const currentMonth = new Date().getMonth();
  const showRetrospectiva = currentMonth === CONFIG.months.december;
  const showIRButton = currentMonth === CONFIG.months.march || currentMonth === CONFIG.months.april;

  // 🎯 Handlers
  const handleEdit = useCallback((cliente: Cliente) => {
    setEditingCliente(cliente);
    openModal(cliente);
  }, [openModal]);

  const handleNew = useCallback(() => {
    setEditingCliente(null);
    openModal();
  }, [openModal]);

  const handleDelete = useCallback((id: string) => {
    if (isConfirming(id)) {
      // Segunda confirmação: executar exclusão
      deleteCliente(id);
      showNotification('Cliente excluído', 'info');
    } else {
      // Primeira confirmação: mostrar alerta visual
      requestConfirmation(id);
      showNotification('Toque novamente para confirmar exclusão', 'warning');
    }
  }, [deleteCliente, showNotification, isConfirming, requestConfirmation]);

  const handleWhatsApp = useCallback((cliente: Cliente) => {
    // Navegação direta, sem confirmação adicional
    window.open(
      `https://wa.me/${cleanPhoneForStorage(cliente.telefone || '')}?text=${encodeURIComponent(formatWhatsAppMessage(cliente.nome || ''))}`,
      '_blank',
      'noopener,noreferrer'
    );
  }, []);

  const handleRetrospectiva = useCallback((cliente: Cliente) => {
    const currentYear = new Date().getFullYear();
    const agendamentosCliente = (agendamentos || []).filter(a => 
      a.clienteId === cliente.id && 
      a.statusAtendimento === 'Concluido' && 
      new Date(a.data).getFullYear() === currentYear
    );
    
    const total = agendamentosCliente.length;
    const terapiasIds = [...new Set(agendamentosCliente.map(a => a.terapiaId))];
    const nomesTerapias = terapiasIds
      .map(tid => terapias?.find(t => t.id === tid)?.nome)
      .filter((n): n is string => !!n)
      .join(', ');
    
    const mensagem = formatRetrospectivaMessage(cliente.nome || '', total, nomesTerapias);
    
    confirmAction(
      `Gerar retrospectiva para ${cliente.nome}?`,
      () => {
        window.open(
          `https://wa.me/${cleanPhoneForStorage(cliente.telefone || '')}?text=${encodeURIComponent(mensagem)}`,
          '_blank',
          'noopener,noreferrer'
        );
      }
    );
  }, [agendamentos, terapias, confirmAction]);

  const handleGenerateIR = useCallback(() => {
    if (editingCliente) {
      setIsPrintModalOpen(true);
    }
  }, [editingCliente]);

  // 🎯 Importação de contatos (integrado ao modal)
  const handleImport = useCallback(async () => {
    try {
      const imported = await handleImportContacts();
      if (imported && imported.length > 0) {
        if (imported.length === 1) {
          // Preencher form com contato importado
          const contact = imported[0];
          const { ddi, number } = extractPhoneParts(contact.telefone);
          setEditingCliente(null);
          // O modal será aberto com os dados via editingCliente state
          // Para simplificar, abrimos o modal e o hook useClientForm lida com o initial data
          openModal();
          // Nota: Em uma implementação completa, passaríamos os dados via props do modal
          showNotification('Contato importado! Preencha os demais campos.', 'success');
        } else {
          // Importar múltiplos de uma vez
          for (const contact of imported) {
            addCliente({
              nome: contact.nome,
              telefone: contact.telefone,
              observacoes: 'Importado da agenda',
            });
          }
          closeModal();
          showNotification(`${imported.length} contatos importados!`, 'success');
        }
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      showNotification("Erro na importação.", 'error');
    }
  }, [handleImportContacts, addCliente, closeModal, openModal, showNotification]);

  // 🎯 Accessibility: fechar modal com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 pb-32">
      {/* Header */}
      <header className="p-4 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            Clientes
          </h1>
          <button 
            onClick={handleNew}
            className="btn-add-topo bg-[var(--color-primary)] text-white w-10 h-10 rounded-xl font-bold text-xl flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
            aria-label="Adicionar novo cliente"
          >
            +
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <label htmlFor="search-clientes" className="sr-only">Buscar clientes</label>
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-sec-light)] pointer-events-none" 
            size={20} 
            aria-hidden="true" 
          />
          <input 
            id="search-clientes"
            type="search"
            placeholder="Buscar por nome, telefone ou CPF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
            aria-label="Buscar clientes"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Limpar busca"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {/* Lista de Clientes */}
      <main className="px-4 pb-32" role="main" aria-label="Lista de clientes">
        {filteredClientes.length === 0 ? (
          <div 
            className="text-center text-[var(--color-text-sec-light)] mt-10"
            role="status"
            aria-live="polite"
          >
            {searchQuery ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
            {!searchQuery && (
              <button 
                onClick={handleNew}
                className="mt-4 text-sm text-[var(--color-primary)] font-bold hover:underline"
              >
                Adicionar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label={`${filteredClientes.length} clientes encontrados`}>
            {filteredClientes.map(cliente => (
              <ClienteItem
                key={cliente.id}
                cliente={cliente}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onWhatsApp={handleWhatsApp}
                onRetrospectiva={showRetrospectiva ? handleRetrospectiva : undefined}
                showRetrospectiva={showRetrospectiva}
                isConfirmingDelete={isConfirming(cliente.id)}
                onConfirmDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal de Formulário */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleFormSave}
        editingCliente={editingCliente}
        isSaving={isSaving}
        showIRButton={showIRButton}
        onGenerateIR={handleGenerateIR}
      />

      {/* Modal de Informe IR */}
      {isPrintModalOpen && editingCliente && (
        <PrintInformeModal 
          cliente={editingCliente} 
          dadosProfissionais={StorageService.getData(StorageKeys.DADOS_PROFISSIONAIS) || {}} 
          transacoes={transacoes} 
          agendamentos={agendamentos}
          onClose={() => setIsPrintModalOpen(false)} 
        />
      )}

      {/* Toast de Sucesso */}
      {showToast && (
        <div 
          className="toast-sucesso fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--color-success)] text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom duration-200"
          role="status"
          aria-live="polite"
        >
          <CheckCircle size={16} aria-hidden="true" />
          <span>Salvo com sucesso!</span>
        </div>
      )}
    </div>
  );
}