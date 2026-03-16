import React, { useRef, useState } from 'react';
import { ArrowLeft, Download, Upload, AlertTriangle, Settings as SettingsIcon, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { useAppContext } from '../AppContext';

interface ConfiguracoesProps {
  onBack: () => void;
}

type StatusType = {
  type: 'success' | 'error' | 'loading' | 'none';
  message: string;
};

export default function ConfiguracoesScreen({ onBack }: ConfiguracoesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<StatusType>({ type: 'none', message: '' });
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { confirmAction } = useAppContext();

  const showStatus = (type: StatusType['type'], message: string) => {
    setStatus({ type, message });
    // Auto clear success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => setStatus({ type: 'none', message: '' }), 5000);
    }
  };

  const handleBackup = async () => {
    try {
      setStatus({ type: 'none', message: '' });
      const data = {
        [StorageKeys.CLIENTES]: await StorageService.getItems(StorageKeys.CLIENTES),
        [StorageKeys.TERAPIAS]: await StorageService.getItems(StorageKeys.TERAPIAS),
        [StorageKeys.PACOTES]: await StorageService.getItems(StorageKeys.PACOTES),
        [StorageKeys.AGENDAMENTOS]: await StorageService.getItems(StorageKeys.AGENDAMENTOS),
        [StorageKeys.BLOQUEIOS]: await StorageService.getItems(StorageKeys.BLOQUEIOS),
      };

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const date = new Date();
      const dateString = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
      const fileName = `backup-terapias-${dateString}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showStatus('success', 'Backup gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar backup:', error);
      showStatus('error', 'Erro ao gerar arquivo de backup.');
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("Arquivo selecionado:", file.name);
    setStatus({ type: 'none', message: '' });

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

        const legacyMap: Record<string, string> = {
          clients: 'clientes',
          therapies: 'terapias',
          packages: 'pacotes',
          appointments: 'agendamentos'
        };

        const normalizedData: any = {};
        const ptKeys = Object.values(StorageKeys);
        
        ptKeys.forEach(ptKey => {
          if (data[ptKey]) {
            normalizedData[ptKey] = data[ptKey];
          }
        });

        Object.keys(legacyMap).forEach(engKey => {
          const ptKey = legacyMap[engKey];
          if (data[engKey] && !normalizedData[ptKey]) {
            normalizedData[ptKey] = data[engKey];
          }
        });

        ptKeys.forEach(ptKey => {
          if (!normalizedData[ptKey]) {
            normalizedData[ptKey] = [];
          }
        });

        const isValid = ptKeys.every(key => Array.isArray(normalizedData[key]));

        if (!isValid) {
          showStatus('error', 'Erro: Estrutura de dados não reconhecida.');
          return;
        }

        // Proceeding with restoration automatically as requested
        showStatus('loading', 'Importando dados, por favor aguarde...');
        await StorageService.bulkRestore(normalizedData);

        const totalClientes = normalizedData.clientes.length;
        const totalAgendamentos = normalizedData.agendamentos.length;

        showStatus('success', `Sucesso! ${totalClientes} clientes e ${totalAgendamentos} agendamentos importados.`);
        
        // Reload after a short delay to show the success message
        setTimeout(() => window.location.reload(), 2000);
        
      } catch (error: any) {
        console.error('Erro ao restaurar dados:', error);
        showStatus('error', "Erro inesperado: " + error.message);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = () => {
      showStatus('error', "Erro ao ler o arquivo.");
    };

    reader.readAsText(file);
  };

  const handleRepairDatabase = async () => {
    confirmAction(
      'Deseja realmente reparar o banco de dados? Por segurança, faremos um backup automático antes de iniciar. Esta ação converterá formatos de data antigos, removerá registros inválidos e garantirá a integridade dos dados.',
      async () => {
        showStatus('loading', 'Fazendo backup de segurança...');
        try {
          // 1. Fazer Backup primeiro
          await handleBackup();
          
          showStatus('loading', 'Reparando banco de dados, por favor aguarde...');
          // 2. Executar Reparo
          await StorageService.repairDatabase();
          
          showStatus('success', 'Banco de dados reparado com sucesso!');
          setTimeout(() => window.location.reload(), 2000);
        } catch (error: any) {
          console.error('Erro ao reparar banco:', error);
          showStatus('error', 'Erro ao reparar banco: ' + error.message);
        }
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <div className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
          <SettingsIcon size={20} />
          Configurações
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Status Message */}
        {status.type !== 'none' && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            status.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
              : status.type === 'loading'
              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : status.type === 'loading' ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" /> : <XCircle size={20} />}
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-wider mb-3">
            Sincronização em Nuvem
          </h2>
          <p className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-4 leading-relaxed">
            Seus dados estão sendo sincronizados automaticamente com o Supabase. 
            Isso permite que você acesse as mesmas informações no PC e no Celular.
          </p>
          
          <button 
            onClick={async () => {
              try {
                await StorageService.syncWithCloud();
                showStatus('success', 'Sincronização concluída!');
                setTimeout(() => window.location.reload(), 1500);
              } catch (err) {
                showStatus('error', 'Erro ao sincronizar com a nuvem.');
              }
            }}
            className="w-full py-2.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium rounded-xl hover:bg-[var(--color-primary)]/20 transition-colors mb-8"
          >
            Sincronizar Agora
          </button>

          <h2 className="text-sm font-semibold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-wider mb-3">
            Backup e Restauração Local
          </h2>

          <div className="space-y-4">
            {/* Botão de Backup */}
            <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg">
                  <Download size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Fazer Backup Agora</h3>
                  <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-1">
                    Gera um arquivo .json com todos os seus dados.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleBackup}
                className="w-full py-2.5 bg-[var(--color-primary)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                Gerar Arquivo de Backup
              </button>
            </div>

            {/* Botão de Restauração */}
            <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-red-200 dark:border-red-900/30 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Restaurar Dados</h3>
                  <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-1">
                    Importa um arquivo .json de backup.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-4 p-2.5 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
                <p className="text-[10px] font-medium text-red-600 dark:text-red-400">
                  Isso substituirá todos os seus dados atuais.
                </p>
              </div>

              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <button 
                onClick={handleRestoreClick}
                className="w-full py-2.5 bg-transparent border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                Selecionar Arquivo de Backup
              </button>
            </div>

            {/* Botão de Reparo */}
            <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-amber-200 dark:border-amber-900/30 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Reparar Banco de Dados</h3>
                  <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-1">
                    Corrige datas e remove registros corrompidos.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleRepairDatabase}
                className="w-full py-2.5 bg-amber-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                Executar Reparo
              </button>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4">Zona de Risco</h3>
              
              {!showConfirmReset ? (
                <button 
                  onClick={() => {
                    setShowConfirmReset(true);
                    setConfirmText('');
                  }}
                  className="w-full py-2 bg-transparent border border-red-600 text-red-600 text-xs font-bold rounded-lg hover:bg-red-600/5 transition-colors"
                >
                  Apagar Todos os Dados
                </button>
              ) : (
                <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 text-center">
                    TEM CERTEZA ABSOLUTA?
                  </p>
                  <input 
                    type="text" 
                    placeholder="Digite EXCLUIR para confirmar"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full p-2 text-xs border border-red-200 rounded-lg text-center outline-none focus:border-red-500"
                  />
                  <p className="text-[10px] text-red-600 dark:text-red-400 text-center">
                    Atenção: Esta ação apagará permanentemente os dados da sua conta Supabase e de todos os dispositivos conectados.
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setShowConfirmReset(false);
                        setConfirmText('');
                      }}
                      className="flex-1 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirmText !== 'EXCLUIR') return;
                        try {
                          await StorageService.resetSistemaTotal();
                          showStatus('success', 'Sistema resetado com sucesso!');
                          setTimeout(() => window.location.reload(), 1500);
                        } catch (err) {
                          showStatus('error', 'Erro ao resetar sistema.');
                          setShowConfirmReset(false);
                          setConfirmText('');
                        }
                      }}
                      disabled={confirmText !== 'EXCLUIR'}
                      className={`flex-1 py-2 text-white text-xs font-bold rounded-lg ${confirmText === 'EXCLUIR' ? 'bg-red-600' : 'bg-red-300 cursor-not-allowed'}`}
                    >
                      Sim, Apagar Tudo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
