import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { StorageService, StorageKeys } from './services/StorageService';
import { Agendamento } from './types';

export interface ImportedContact {
  nome: string;
  telefone: string;
}

export interface CountryDDI {
  code: string;
  flag: string;
  name: string;
}

export const DDI_LIST: CountryDDI[] = [
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+1', flag: '🇺🇸', name: 'EUA' },
  { code: '+244', flag: '🇦🇴', name: 'Angola' },
  { code: '+258', flag: '🇲🇿', name: 'Moçambique' },
  { code: '+238', flag: '🇨🇻', name: 'Cabo Verde' },
  { code: '+245', flag: '🇬🇼', name: 'Guiné-Bissau' },
  { code: '+239', flag: '🇸🇹', name: 'São Tomé e Príncipe' },
  { code: '+670', flag: '🇹🇱', name: 'Timor-Leste' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguai' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguai' },
];

interface AppContextType {
  handleImportContacts: () => Promise<ImportedContact[] | null>;
  ddiList: CountryDDI[];
  completeAppointment: (agendamentoId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const ddiList = DDI_LIST;
  const [notifiedAppointments, setNotifiedAppointments] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkPendingAppointments = async () => {
      try {
        const agendamentos = await StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS);
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const pending = agendamentos.filter(ag => {
          const agDate = new Date(ag.dataHora);
          const agDay = agDate.toISOString().split('T')[0];
          
          // Check if it's today, not realized/canceled, and more than 30 mins overdue
          if (agDay === today && ag.statusAtendimento === 'Agendado') {
            const overdueTime = new Date(agDate.getTime() + 30 * 60000);
            return now > overdueTime && !notifiedAppointments.has(ag.id);
          }
          return false;
        });

        if (pending.length > 0) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("Atendimento Pendente", {
              body: `O atendimento de um cliente passou do horário e não foi finalizado.`,
              icon: "/favicon.png"
            });
          }

          setNotifiedAppointments(prev => {
            const next = new Set(prev);
            pending.forEach(ag => next.add(ag.id));
            return next;
          });
        }
      } catch (error) {
        console.error('Erro ao verificar agendamentos pendentes:', error);
      }
    };

    // Check immediately and then every 15 minutes
    checkPendingAppointments();
    const interval = setInterval(checkPendingAppointments, 15 * 60000);

    return () => clearInterval(interval);
  }, [notifiedAppointments]);

  const handleImportContacts = async (): Promise<ImportedContact[] | null> => {
    // 1. Try Web Contacts API
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: true };
        const contacts = await (navigator as any).contacts.select(props, opts);
        
        if (contacts && contacts.length > 0) {
          return contacts.map((c: any) => ({
            nome: c.name?.[0] || 'Sem Nome',
            telefone: c.tel?.[0] || '',
          }));
        }
        return null;
      } catch (err) {
        console.error('Erro ao selecionar contatos:', err);
      }
    }

    // Fallback: CSV Import
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (event: any) => {
          try {
            const text = event.target.result;
            const lines = text.split('\n');
            // Assuming CSV format: Nome,Telefone
            const imported = lines.slice(1)
              .map((line: string) => {
                const parts = line.split(',');
                if (parts.length < 2) return null;
                return { 
                  nome: parts[0]?.trim(), 
                  telefone: parts[1]?.trim() 
                };
              })
              .filter((c: any): c is ImportedContact => !!(c && c.nome && c.telefone));
            
            if (imported.length > 0) {
              resolve(imported);
            } else {
              alert("Nenhum contato válido encontrado no CSV. Certifique-se de que o arquivo segue o formato 'Nome,Telefone'.");
              resolve(null);
            }
          } catch (err) {
            console.error('Erro ao processar CSV:', err);
            alert("Erro ao processar o arquivo CSV.");
            resolve(null);
          }
        };
        reader.readAsText(file);
      };

      alert("Não foi possível acessar seus contatos. Esta funcionalidade pode não estar disponível neste navegador. Tente importar via CSV.");
      input.click();
    });
  };

  const completeAppointment = async (agendamentoId: string) => {
    try {
      const agendamentos = await StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS);
      const index = agendamentos.findIndex(a => String(a.id) === String(agendamentoId));
      if (index !== -1) {
        agendamentos[index] = { ...agendamentos[index], statusAtendimento: 'Realizado' };
        await StorageService.updateItem(StorageKeys.AGENDAMENTOS, agendamentos[index]);
      }
    } catch (error) {
      console.error('Erro ao completar agendamento:', error);
    }
  };

  return (
    <AppContext.Provider value={{ handleImportContacts, ddiList, completeAppointment }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
