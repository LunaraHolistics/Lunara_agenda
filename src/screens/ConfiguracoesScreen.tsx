import React, { useRef } from 'react';
import { ArrowLeft, Download, Upload, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { AsyncStorage } from '../utils/storage';

interface ConfiguracoesProps {
  onBack: () => void;
}

export default function ConfiguracoesScreen({ onBack }: ConfiguracoesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    try {
      // Coleta todos os dados
      const data = {
        [StorageKeys.CLIENTES]: await StorageService.getItems(StorageKeys.CLIENTES),
        [StorageKeys.TERAPIAS]: await StorageService.getItems(StorageKeys.TERAPIAS),
        [StorageKeys.PACOTES]: await StorageService.getItems(StorageKeys.PACOTES),
        [StorageKeys.AGENDAMENTOS]: await StorageService.getItems(StorageKeys.AGENDAMENTOS),
        [StorageKeys.BLOQUEIOS]: await StorageService.getItems(StorageKeys.BLOQUEIOS),
      };

      const jsonString = JSON.stringify(data, null, 2);
      
      // Em um ambiente React Native real, usaríamos expo-file-system e expo-sharing.
      // Como estamos no preview web, usamos Blob e URL.createObjectURL para simular o download do arquivo.
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
      
    } catch (error) {
      console.error('Erro ao gerar backup:', error);
      alert('Erro ao gerar arquivo de backup.');
    }
  };

  const handleRestoreClick = () => {
    // Simula o expo-document-picker abrindo o seletor de arquivos nativo
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validação da estrutura do JSON
        const requiredKeys = [
          StorageKeys.CLIENTES,
          StorageKeys.TERAPIAS,
          StorageKeys.PACOTES,
          StorageKeys.AGENDAMENTOS,
          StorageKeys.BLOQUEIOS
        ];

        const isValid = requiredKeys.every(key => Array.isArray(data[key]));

        if (!isValid) {
          alert('Arquivo de backup inválido ou corrompido. A estrutura não corresponde aos dados do aplicativo.');
          return;
        }

        if (window.confirm('ATENÇÃO: Isso substituirá TODOS os seus dados atuais pelos dados do backup. Deseja continuar?')) {
          // Limpa o storage atual e sobrescreve com os novos dados
          await AsyncStorage.clear();
          
          for (const key of requiredKeys) {
            await AsyncStorage.setItem(key, JSON.stringify(data[key]));
          }

          alert('Restauração concluída com sucesso! O aplicativo será recarregado.');
          window.location.reload();
        }
      } catch (error) {
        console.error('Erro ao ler arquivo de backup:', error);
        alert('Erro ao processar o arquivo. Certifique-se de que é um arquivo JSON válido gerado por este aplicativo.');
      }
      
      // Reseta o input para permitir selecionar o mesmo arquivo novamente se necessário
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-wider mb-3">
            Backup e Restauração
          </h2>
          <p className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-4 leading-relaxed">
            Como o aplicativo funciona 100% offline, seus dados ficam salvos apenas neste dispositivo. 
            Gere backups regularmente para não perder suas informações caso troque de aparelho.
          </p>

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
                    Gera um arquivo .json com todos os seus clientes, terapias, pacotes e agendamentos.
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
            <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-[var(--color-error)]/30 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-lg">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Restaurar Dados</h3>
                  <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mt-1">
                    Importa um arquivo .json de backup gerado anteriormente.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-4 p-2.5 bg-[var(--color-error)]/10 rounded-lg">
                <AlertTriangle size={16} className="text-[var(--color-error)] shrink-0" />
                <p className="text-[10px] font-medium text-[var(--color-error)]">
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
                className="w-full py-2.5 bg-transparent border-2 border-[var(--color-error)] text-[var(--color-error)] font-medium rounded-xl hover:bg-[var(--color-error)]/5 transition-colors"
              >
                Selecionar Arquivo de Backup
              </button>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4">Zona de Risco</h3>
              <button 
                onClick={async () => {
                  if (window.confirm('CUIDADO: Tem certeza absoluta que deseja apagar todos os dados do sistema? Esta ação é irreversível.')) {
                    await StorageService.resetSistemaTotal();
                    alert('Sistema resetado com sucesso! O aplicativo será recarregado.');
                    window.location.reload();
                  }
                }}
                className="w-full py-2 bg-transparent border border-red-600 text-red-600 text-xs font-bold rounded-lg hover:bg-red-600/5 transition-colors"
              >
                Apagar Todos os Dados
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
