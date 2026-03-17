import React, { useRef, useState } from 'react';
import { ArrowLeft, Download, Upload, AlertTriangle, Settings as SettingsIcon, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
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
  const { confirmAction, repairDatabase, exportarBackup, importarBackup } = useAppContext();

  const showStatus = (type: StatusType['type'], message: string) => {
    setStatus({ type, message });
    if (type === 'success') {
      setTimeout(() => setStatus({ type: 'none', message: '' }), 5000);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

        showStatus('loading', 'Importando dados...');
        importarBackup(data);
        showStatus('success', `Sucesso! Dados importados.`);
        
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
            Modo Local-First
          </h2>
          <p className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-6 leading-relaxed">
            Seus dados são salvos apenas neste dispositivo. Use a função de backup abaixo para salvar seus dados manualmente.
          </p>

          <div className="space-y-4">
            {/* Botão de Backup */}
            <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg">
                  <Download size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Exportar Backup</h3>
                  <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-1">
                    Gera um arquivo .json com todos os seus dados.
                  </p>
                </div>
              </div>
              <button 
                onClick={exportarBackup}
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
              />
              <button 
                onClick={handleRestoreClick}
                className="w-full py-2.5 bg-transparent border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                Selecionar Arquivo .json
              </button>
            </div>

            {/* Manutenção */}
            <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Manutenção</h3>
                  <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-1">
                    Ferramentas para corrigir inconsistências nos dados.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={repairDatabase}
                  className="w-full py-2.5 bg-amber-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                >
                  Reparar Banco de Dados
                </button>
              </div>
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
                      onClick={() => {
                        if (confirmText !== 'EXCLUIR') return;
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
                          setShowConfirmReset(false);
                          setConfirmText('');
                        }, { isDanger: true });
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
