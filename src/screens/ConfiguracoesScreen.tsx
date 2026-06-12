import React, { useRef, useState, useCallback, useMemo, memo } from 'react';
import { ArrowLeft, Download, Upload, AlertTriangle, Settings as SettingsIcon, CheckCircle2, XCircle, ShieldCheck, Pencil, ChevronDown, ChevronUp, Database, Loader2 } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { DadosProfissionais } from '../types';
import { StorageService, StorageKeys } from '../services/StorageService';

// ======================
// TYPES E CONSTANTES
// ======================

interface ConfiguracoesProps {
  onBack: () => void;
}

type StatusType = {
  type: 'success' | 'error' | 'loading' | 'none';
  message: string;
};

const CONFIG = {
  statusDuration: 5000,
  confirmText: 'EXCLUIR'
} as const;

const DEFAULT_DADOS_PROFISSIONAIS: DadosProfissionais = {
  nomeRazaoSocial: '',
  nomeEmpresa: '',
  tipoProfissional: 'Autônomo',
  cpfCnpj: '',
  registroProfissional: '',
  endereco: '',
  telefone: ''
};

// ======================
// UTILITÁRIOS PURE
// ======================

const getStatusIcon = (type: StatusType['type']) => {
  switch (type) {
    case 'success': return <CheckCircle2 size={20} aria-hidden="true" />;
    case 'loading': return <Loader2 className="animate-spin" size={20} aria-hidden="true" />;
    case 'error': return <XCircle size={20} aria-hidden="true" />;
    default: return null;
  }
};

const getStatusClasses = (type: StatusType['type']) => {
  const baseClasses = 'mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300';
  
  switch (type) {
    case 'success':
      return `${baseClasses} bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400`;
    case 'loading':
      return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400`;
    case 'error':
      return `${baseClasses} bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400`;
    default:
      return '';
  }
};

// ======================
// SUB-COMPONENTES MEMOIZED
// ======================

interface StatusMessageProps {
  status: StatusType;
}

const StatusMessage = memo(({ status }: StatusMessageProps) => {
  if (status.type === 'none') return null;
  
  return (
    <div 
      className={getStatusClasses(status.type)}
      role="status"
      aria-live="polite"
    >
      {getStatusIcon(status.type)}
      <p className="text-sm font-medium">{status.message}</p>
    </div>
  );
});
StatusMessage.displayName = 'StatusMessage';

interface DadosProfissionaisSectionProps {
  dados: DadosProfissionais;
  isExpanded: boolean;
  isEditing: boolean;
  onToggleExpand: () => void;
  onToggleEdit: () => void;
  onSave: () => void;
  onUpdate: (dados: DadosProfissionais) => void;
}

const DadosProfissionaisSection = memo(({
  dados,
  isExpanded,
  isEditing,
  onToggleExpand,
  onToggleEdit,
  onSave,
  onUpdate
}: DadosProfissionaisSectionProps) => {
  return (
    <section 
      className="mb-8 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-6 rounded-3xl shadow-sm"
      aria-labelledby="dados-profissionais-title"
    >
      <button
        onClick={onToggleExpand}
        className="flex justify-between items-center mb-4 w-full cursor-pointer text-left hover:opacity-80 transition-opacity"
        aria-expanded={isExpanded}
        aria-controls="dados-profissionais-content"
      >
        <h2 id="dados-profissionais-title" className="text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          Dados para Recibos e Informes
        </h2>
        <div className="flex items-center gap-2" aria-hidden="true">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>
      
      <div id="dados-profissionais-content">
        {!isExpanded && (
          <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
            Dados salvos: {dados.nomeEmpresa || dados.nomeRazaoSocial || 'Não informado'}
          </p>
        )}

        {isExpanded && (
          <>
            {!isEditing ? (
              <>
                <div className="flex justify-end mb-4">
                  <button 
                    onClick={onToggleEdit} 
                    className="flex items-center gap-2 text-[var(--color-primary)] font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded"
                    aria-label="Editar dados profissionais"
                  >
                    <Pencil size={18} aria-hidden="true" /> Editar
                  </button>
                </div>
                <div className="space-y-2 text-sm" role="list">
                  <p role="listitem"><span className="font-bold">Nome:</span> {dados.nomeRazaoSocial || '-'}</p>
                  {dados.nomeEmpresa && <p role="listitem"><span className="font-bold">Empresa:</span> {dados.nomeEmpresa}</p>}
                  <p role="listitem"><span className="font-bold">Tipo:</span> {dados.tipoProfissional}</p>
                  <p role="listitem"><span className="font-bold">CPF/CNPJ:</span> {dados.cpfCnpj || '-'}</p>
                  <p role="listitem"><span className="font-bold">Registro:</span> {dados.registroProfissional || '-'}</p>
                  <p role="listitem"><span className="font-bold">Endereço:</span> {dados.endereco || '-'}</p>
                  <p role="listitem"><span className="font-bold">Telefone:</span> {dados.telefone || '-'}</p>
                </div>
              </>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <label htmlFor="nome-razao" className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Nome Completo/Razão Social
                  </label>
                  <input 
                    id="nome-razao"
                    type="text" 
                    value={dados.nomeRazaoSocial} 
                    onChange={e => onUpdate({...dados, nomeRazaoSocial: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label="Nome completo ou razão social"
                  />
                </div>
                <div>
                  <label htmlFor="nome-empresa" className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Nome da Empresa / Nome Fantasia
                  </label>
                  <input 
                    id="nome-empresa"
                    type="text" 
                    value={dados.nomeEmpresa} 
                    onChange={e => onUpdate({...dados, nomeEmpresa: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label="Nome da empresa ou nome fantasia"
                  />
                </div>
                <fieldset>
                  <legend className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo de Profissional</legend>
                  <div className="flex gap-4" role="radiogroup" aria-label="Tipo de profissional">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="tipo" 
                        value="Autônomo" 
                        checked={dados.tipoProfissional === 'Autônomo'} 
                        onChange={() => onUpdate({...dados, tipoProfissional: 'Autônomo', cpfCnpj: ''})}
                        aria-label="Autônomo"
                      />
                      <span>Autônomo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="tipo" 
                        value="MEI" 
                        checked={dados.tipoProfissional === 'MEI'} 
                        onChange={() => onUpdate({...dados, tipoProfissional: 'MEI'})}
                        aria-label="MEI"
                      />
                      <span>MEI</span>
                    </label>
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="cpf-cnpj" className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    {dados.tipoProfissional === 'MEI' ? 'CNPJ' : 'CPF'}
                  </label>
                  <input 
                    id="cpf-cnpj"
                    type="text" 
                    value={dados.cpfCnpj} 
                    onChange={e => onUpdate({...dados, cpfCnpj: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label={dados.tipoProfissional === 'MEI' ? 'CNPJ' : 'CPF'}
                    required={dados.tipoProfissional === 'MEI'}
                  />
                </div>
                <div>
                  <label htmlFor="registro" className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Registro Profissional
                  </label>
                  <input 
                    id="registro"
                    type="text" 
                    value={dados.registroProfissional} 
                    onChange={e => onUpdate({...dados, registroProfissional: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label="Registro profissional"
                  />
                </div>
                <div>
                  <label htmlFor="endereco" className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Endereço
                  </label>
                  <input 
                    id="endereco"
                    type="text" 
                    value={dados.endereco} 
                    onChange={e => onUpdate({...dados, endereco: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label="Endereço completo"
                  />
                </div>
                <div>
                  <label htmlFor="telefone" className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Telefone
                  </label>
                  <input 
                    id="telefone"
                    type="text" 
                    value={dados.telefone} 
                    onChange={e => onUpdate({...dados, telefone: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label="Telefone de contato"
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:bg-[var(--color-primary)]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    Salvar Dados
                  </button>
                  <button 
                    type="button"
                    onClick={onToggleEdit} 
                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
});
DadosProfissionaisSection.displayName = 'DadosProfissionaisSection';

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  buttonVariant: 'primary' | 'secondary' | 'danger' | 'warning';
  onClick: () => void;
  children?: React.ReactNode;
}

const ActionCard = memo(({ icon, title, description, buttonLabel, buttonVariant, onClick, children }: ActionCardProps) => {
  const variantClasses = {
    primary: 'bg-[var(--color-primary)] text-white hover:opacity-90',
    secondary: 'bg-transparent border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5',
    danger: 'bg-transparent border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10',
    warning: 'bg-amber-500 text-white hover:opacity-90'
  };

  return (
    <article className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg shrink-0" aria-hidden="true">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">{title}</h3>
          <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-1">{description}</p>
        </div>
      </div>
      
      {children ? (
        <div className="flex flex-col gap-2">{children}</div>
      ) : (
        <button 
          onClick={onClick}
          className={`w-full py-2.5 font-medium rounded-xl transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 ${variantClasses[buttonVariant]}`}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </button>
      )}
    </article>
  );
});
ActionCard.displayName = 'ActionCard';

interface ConfirmResetDialogProps {
  isOpen: boolean;
  confirmText: string;
  onConfirmTextChange: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmResetDialog = memo(({ isOpen, confirmText, onConfirmTextChange, onConfirm, onCancel }: ConfirmResetDialogProps) => {
  if (!isOpen) return null;

  const canConfirm = confirmText === CONFIG.confirmText;

  return (
    <div 
      className="space-y-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl"
      role="alertdialog"
      aria-labelledby="confirm-reset-title"
      aria-describedby="confirm-reset-description"
    >
      <p id="confirm-reset-title" className="text-xs font-bold text-red-700 dark:text-red-400 text-center">
        TEM CERTEZA ABSOLUTA?
      </p>
      <p id="confirm-reset-description" className="sr-only">
        Digite EXCLUIR para confirmar a exclusão de todos os dados
      </p>
      <input 
        type="text" 
        placeholder={`Digite ${CONFIG.confirmText} para confirmar`}
        value={confirmText}
        onChange={(e) => onConfirmTextChange(e.target.value)}
        className="w-full p-2 text-xs border border-red-200 dark:border-red-800 rounded-lg text-center outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500"
        aria-label={`Digite ${CONFIG.confirmText} para confirmar`}
        autoFocus
      />
      <div className="flex gap-2">
        <button 
          onClick={onCancel}
          className="flex-1 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Cancelar
        </button>
        <button 
          onClick={onConfirm}
          disabled={!canConfirm}
          className={`flex-1 py-2 text-white text-xs font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${
            canConfirm 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-red-300 dark:bg-red-900/50 cursor-not-allowed'
          }`}
          aria-label={canConfirm ? 'Confirmar exclusão de todos os dados' : `Digite ${CONFIG.confirmText} para habilitar`}
        >
          Sim, Apagar Tudo
        </button>
      </div>
    </div>
  );
});
ConfirmResetDialog.displayName = 'ConfirmResetDialog';

// ======================
// HOOK: useDadosProfissionais
// ======================

interface UseDadosProfissionaisProps {
  showStatus: (type: StatusType['type'], message: string) => void;
}

const useDadosProfissionais = ({ showStatus }: UseDadosProfissionaisProps) => {
  const [dados, setDados] = useState<DadosProfissionais>(() => {
    return StorageService.getData(StorageKeys.DADOS_PROFISSIONAIS) || DEFAULT_DADOS_PROFISSIONAIS;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(() => {
    const data = StorageService.getData(StorageKeys.DADOS_PROFISSIONAIS);
    return !data || !data.nomeRazaoSocial;
  });

  const save = useCallback(() => {
    StorageService.saveData(StorageKeys.DADOS_PROFISSIONAIS, dados);
    showStatus('success', 'Dados atualizados!');
    setIsEditing(false);
    setIsExpanded(false);
  }, [dados, showStatus]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const toggleEdit = useCallback(() => {
    setIsEditing(prev => !prev);
  }, []);

  return {
    dados,
    setDados,
    isEditing,
    isExpanded,
    save,
    toggleExpand,
    toggleEdit
  };
};

// ======================
// HOOK: useBackupRestore
// ======================

interface UseBackupRestoreProps {
  exportarBackup: () => void;
  importarBackup: (data: any) => void;
  resetSystem: () => void;
  confirmAction: (msg: string, onConfirm: () => void, options?: any) => void;
  showStatus: (type: StatusType['type'], message: string) => void;
}

const useBackupRestore = ({
  exportarBackup,
  importarBackup,
  resetSystem,
  confirmAction,
  showStatus
}: UseBackupRestoreProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleExport = useCallback(() => {
    exportarBackup();
    showStatus('success', 'Backup gerado com sucesso!');
  }, [exportarBackup, showStatus]);

  const handleRestoreClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    showStatus('none', '');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let data;
        
        try {
          data = JSON.parse(content);
        } catch (err) {
          showStatus('error', 'Erro: O arquivo não é um JSON válido.');
          return;
        }

        showStatus('loading', 'Importando dados...');
        importarBackup(data);
        showStatus('success', 'Sucesso! Dados importados.');
        
      } catch (error: any) {
        console.error('Erro ao restaurar dados:', error);
        showStatus('error', "Erro inesperado: " + error.message);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  }, [importarBackup, showStatus]);

  const handleResetSystem = useCallback(() => {
    resetSystem();
  }, [resetSystem]);

  const openConfirmReset = useCallback(() => {
    setShowConfirmReset(true);
    setConfirmText('');
  }, []);

  const closeConfirmReset = useCallback(() => {
    setShowConfirmReset(false);
    setConfirmText('');
  }, []);

  const handleConfirmReset = useCallback(() => {
    if (confirmText !== CONFIG.confirmText) return;
    
    confirmAction('Isso apagará permanentemente todos os dados. Continuar?', () => {
      importarBackup({
        clientes: [],
        agendamentos: [],
        terapias: [],
        pacotes: [],
        bloqueios: [],
        transacoes: []
      });
      showStatus('success', 'Sistema resetado com sucesso!');
      closeConfirmReset();
    }, { isDanger: true });
  }, [confirmText, confirmAction, importarBackup, showStatus, closeConfirmReset]);

  return {
    fileInputRef,
    showConfirmReset,
    confirmText,
    setConfirmText,
    handleExport,
    handleRestoreClick,
    handleFileChange,
    handleResetSystem,
    openConfirmReset,
    closeConfirmReset,
    handleConfirmReset
  };
};

// ======================
// COMPONENTE PRINCIPAL
// ======================

export default function ConfiguracoesScreen({ onBack }: ConfiguracoesProps) {
  const { 
    confirmAction, 
    repairDatabase, 
    exportarBackup, 
    importarBackup, 
    resetSystem, 
    clientes 
  } = useAppContext();
  
  // UI State
  const [status, setStatus] = useState<StatusType>({ type: 'none', message: '' });

  // 🎯 Hooks customizados
  const showStatus = useCallback((type: StatusType['type'], message: string) => {
    setStatus({ type, message });
    if (type === 'success') {
      setTimeout(() => setStatus({ type: 'none', message: '' }), CONFIG.statusDuration);
    }
  }, []);

  const {
    dados,
    setDados,
    isEditing,
    isExpanded,
    save: saveDados,
    toggleExpand,
    toggleEdit
  } = useDadosProfissionais({ showStatus });

  const {
    fileInputRef,
    showConfirmReset,
    confirmText,
    setConfirmText,
    handleExport,
    handleRestoreClick,
    handleFileChange,
    handleResetSystem,
    openConfirmReset,
    closeConfirmReset,
    handleConfirmReset
  } = useBackupRestore({
    exportarBackup,
    importarBackup,
    resetSystem,
    confirmAction,
    showStatus
  });

  // 🎯 Memoização
  const totalClientes = useMemo(() => clientes?.length || 0, [clientes]);

  const handleRepairDatabase = useCallback(() => {
    repairDatabase();
    showStatus('success', 'Banco de dados reparado!');
  }, [repairDatabase, showStatus]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <header className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 sticky top-0 z-10">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          aria-label="Voltar para dashboard"
        >
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
          <SettingsIcon size={20} aria-hidden="true" />
          Configurações
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-32" role="main" aria-label="Configurações do sistema">
        {/* Status Message */}
        <StatusMessage status={status} />

        {/* Dados Profissionais */}
        <DadosProfissionaisSection
          dados={dados}
          isExpanded={isExpanded}
          isEditing={isEditing}
          onToggleExpand={toggleExpand}
          onToggleEdit={toggleEdit}
          onSave={saveDados}
          onUpdate={setDados}
        />

        <section aria-labelledby="modo-local-title">
          <h2 id="modo-local-title" className="text-sm font-semibold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-wider mb-3">
            Modo Local-First
          </h2>
          <p className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-6 leading-relaxed">
            Seus dados são salvos apenas neste dispositivo. Use a função de backup abaixo para salvar seus dados manualmente.
          </p>

          <div className="space-y-4">
            {/* Status do Banco de Dados */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 flex items-center gap-3" role="status">
              <ShieldCheck size={24} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300">Status do Banco de Dados</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {totalClientes} cliente{totalClientes !== 1 ? 's' : ''} carregado{totalClientes !== 1 ? 's' : ''} na memória local.
                </p>
              </div>
            </div>

            {/* Exportar Backup */}
            <ActionCard
              icon={<Download size={24} />}
              title="Exportar Backup"
              description="Gera um arquivo .json com todos os seus dados."
              buttonLabel="Gerar Arquivo de Backup"
              buttonVariant="primary"
              onClick={handleExport}
            />

            {/* Importar Backup */}
            <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-red-200 dark:border-red-900/30 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg shrink-0" aria-hidden="true">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Importar Backup</h3>
                  <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-1">
                    Substitui os dados atuais por um arquivo de backup.
                  </p>
                </div>
              </div>
              
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                aria-label="Selecionar arquivo de backup"
              />
              <button 
                onClick={handleRestoreClick}
                className="w-full py-2.5 bg-transparent border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Selecionar arquivo .json para importar"
              >
                Selecionar Arquivo .json
              </button>
            </div>

            {/* Manutenção */}
            <ActionCard
              icon={<AlertTriangle size={24} />}
              title="Manutenção"
              description="Ferramentas para corrigir inconsistências nos dados."
              buttonLabel="Reparar Banco de Dados"
              buttonVariant="warning"
              onClick={handleRepairDatabase}
            />

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-4" id="danger-zone-title">
                Zona de Risco
              </h3>
              
              {/* Reset Total */}
              <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-red-200 dark:border-red-900/30 shadow-sm mb-4">
                <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">Reset Total do Sistema</h3>
                <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-4">
                  Limpa todos os dados salvos. Após clicar, recarregue a página (F5).
                </p>
                <button 
                  onClick={handleResetSystem}
                  className="w-full py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Resetar todo o sistema"
                >
                  Reset Total do Sistema
                </button>
              </div>

              {/* Apagar Todos os Dados */}
              {!showConfirmReset ? (
                <button 
                  onClick={openConfirmReset}
                  className="w-full py-2 bg-transparent border border-red-600 text-red-600 text-xs font-bold rounded-lg hover:bg-red-600/5 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Abrir confirmação para apagar todos os dados"
                >
                  Apagar Todos os Dados
                </button>
              ) : (
                <ConfirmResetDialog
                  isOpen={showConfirmReset}
                  confirmText={confirmText}
                  onConfirmTextChange={setConfirmText}
                  onConfirm={handleConfirmReset}
                  onCancel={closeConfirmReset}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}