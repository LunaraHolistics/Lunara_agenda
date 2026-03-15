import { AsyncStorage } from '../utils/storage';
import { supabase } from '../supabaseClient';

export const StorageKeys = {
  CLIENTES: 'clientes',
  TERAPIAS: 'terapias',
  PACOTES: 'pacotes',
  AGENDAMENTOS: 'agendamentos',
  BLOQUEIOS: 'bloqueios',
};

// Helper to map JS keys to Supabase table names
const tableMap: Record<string, string> = {
  [StorageKeys.CLIENTES]: 'clientes',
  [StorageKeys.TERAPIAS]: 'terapias',
  [StorageKeys.PACOTES]: 'pacotes',
  [StorageKeys.AGENDAMENTOS]: 'agendamentos',
  [StorageKeys.BLOQUEIOS]: 'bloqueios',
};

// Explicit field mappings (App camelCase -> DB English snake_case)
export const fieldMappings: Record<string, Record<string, string>> = {
  clientes: {
    nome: 'name',
    telefone: 'phone',
    observacoes: 'notes',
    status: 'status',
    ddi: 'ddi',
    id: 'id'
  },
  terapias: {
    nome: 'name',
    valor: 'price',
    duracao: 'duration',
    id: 'id'
  },
  pacotes: {
    clienteId: 'client_id',
    mesReferencia: 'reference_month',
    itens: 'items',
    valorBruto: 'gross_value',
    valorDescontoTotal: 'total_discount_value',
    valorFinal: 'final_value',
    dataCriacao: 'created_at',
    tipoCobranca: 'billing_type',
    tipoPacote: 'package_type',
    historicoPagamento: 'payment_history',
    observacoes: 'notes',
    id: 'id'
  },
  agendamentos: {
    clienteId: 'client_id',
    terapiaId: 'therapy_id',
    terapiaIds: 'therapy_ids',
    date: 'date',
    time: 'time',
    valorCobrado: 'charged_value',
    desconto: 'discount',
    statusPagamento: 'payment_status',
    statusAtendimento: 'appointment_status',
    pacoteId: 'package_id',
    itemPacoteId: 'package_item_id',
    tipoAtendimento: 'appointment_type',
    formaPagamento: 'payment_method',
    bancoPagamento: 'payment_bank',
    dataPagamento: 'payment_date',
    id: 'id'
  },
  bloqueios: {
    data: 'date',
    horaInicio: 'start_time',
    horaFim: 'end_time',
    motivo: 'reason',
    id: 'id'
  }
};

// Reverse mapping helper
export const getReverseMapping = (table: string) => {
  const mapping = fieldMappings[table];
  if (!mapping) return {};
  const reverse: Record<string, string> = {};
  for (const [k, v] of Object.entries(mapping)) {
    reverse[v] = k;
  }
  return reverse;
};

export const mapToSnakeCase = (table: string, item: any) => {
  const mapping = fieldMappings[table] || {};
  const dbItem: any = {};
  for (const [k, v] of Object.entries(item)) {
    const dbKey = mapping[k] || k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    dbItem[dbKey] = v;
  }
  return dbItem;
};

export const mapFromSnakeCase = (table: string, item: any) => {
  const reverseMapping = getReverseMapping(table);
  const newItem: any = {};
  for (const [k, v] of Object.entries(item)) {
    const appKey = reverseMapping[k] || k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newItem[appKey] = v;
  }
  return newItem;
};

export const StorageService = {
  /**
   * Syncs local data with Supabase.
   */
  async syncWithCloud(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const key of Object.values(StorageKeys)) {
      const table = tableMap[key];
      const { data, error } = await supabase.from(table).select('*');
      
      if (!error && data) {
        const reverseMapping = getReverseMapping(table);
        // Convert DB English snake_case to App camelCase
        const camelData = data.map(item => {
          const newItem: any = {};
          for (const [k, v] of Object.entries(item)) {
            const appKey = reverseMapping[k] || k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            newItem[appKey] = v;
          }
          return newItem;
        });
        await AsyncStorage.setItem(key, JSON.stringify(camelData));
      }
    }
    window.dispatchEvent(new Event('storage-sync'));
  },

  /**
   * Salva um novo item na lista correspondente à chave e sincroniza com Supabase.
   */
  async saveItem<T extends { id: string }>(key: string, item: T): Promise<void> {
    try {
      // Local Save
      const existing = await StorageService.getItems<T>(key);
      existing.push(item);
      await AsyncStorage.setItem(key, JSON.stringify(existing));

      // Cloud Save
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const table = tableMap[key];
        const mapping = fieldMappings[table] || {};
        
        // Convert App camelCase to DB English snake_case
        const dbItem: any = { user_id: user.id };
        for (const [k, v] of Object.entries(item)) {
          const dbKey = mapping[k] || k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          dbItem[dbKey] = v;
        }
        
        const { error } = await supabase.from(table).insert(dbItem);
        if (error) {
          console.error(`Erro Supabase Insert (${table}):`, error);
          throw error;
        }
      }
    } catch (error) {
      console.error(`Erro ao salvar item na chave ${key}:`, error);
      throw error;
    }
  },

  /**
   * Busca todos os itens de uma chave (Cache first).
   */
  async getItems<T>(key: string): Promise<T[]> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Erro ao buscar itens da chave ${key}:`, error);
      return [];
    }
  },

  /**
   * Atualiza um item existente e sincroniza com Supabase.
   */
  async updateItem<T extends { id: string }>(key: string, updatedItem: T): Promise<void> {
    try {
      // Local Update
      const existing = await StorageService.getItems<T>(key);
      const index = existing.findIndex((item) => item.id.toString() === updatedItem.id.toString());
      if (index !== -1) {
        existing[index] = updatedItem;
        await AsyncStorage.setItem(key, JSON.stringify(existing));

        // Cloud Update
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const table = tableMap[key];
          const mapping = fieldMappings[table] || {};
          
          const dbItem: any = {};
          for (const [k, v] of Object.entries(updatedItem)) {
            const dbKey = mapping[k] || k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            dbItem[dbKey] = v;
          }
          
          const { error } = await supabase.from(table).update(dbItem).eq('id', updatedItem.id);
          if (error) {
            console.error(`Erro Supabase Update (${table}):`, error);
            throw error;
          }
        }
      } else {
        throw new Error('Item não encontrado para atualização.');
      }
    } catch (error) {
      console.error(`Erro ao atualizar item na chave ${key}:`, error);
      throw error;
    }
  },

  /**
   * Deleta um item e sincroniza com Supabase.
   */
  async deleteItem<T extends { id: string }>(key: string, id: string): Promise<void> {
    try {
      // Local Delete
      const existing = await StorageService.getItems<T>(key);
      const filtered = existing.filter((item) => item.id.toString() !== id.toString());
      await AsyncStorage.setItem(key, JSON.stringify(filtered));

      // Cloud Delete
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const table = tableMap[key];
        await supabase.from(table).delete().eq('id', id);
      }
    } catch (error) {
      console.error(`Erro ao deletar item na chave ${key}:`, error);
      throw error;
    }
  },

  /**
   * Limpa todos os dados do sistema.
   */
  async resetSistemaTotal(): Promise<void> {
    try {
      await AsyncStorage.clear();
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error("Erro ao resetar o sistema:", error);
      throw error;
    }
  },

  /**
   * Restaura dados em massa (Backup).
   */
  async bulkRestore(data: Record<string, any[]>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const key of Object.values(StorageKeys)) {
        const items = data[key] || [];
        
        // Local Save
        await AsyncStorage.setItem(key, JSON.stringify(items));

        // Cloud Save (Delete existing and insert new)
        if (user) {
          const table = tableMap[key];
          const mapping = fieldMappings[table] || {};
          
          // Delete all current user data for this table
          await supabase.from(table).delete().eq('user_id', user.id);
          
          if (items.length > 0) {
            // Convert App camelCase to DB English snake_case
            const dbItems = items.map(item => {
              const dbItem: any = { user_id: user.id };
              for (const [k, v] of Object.entries(item)) {
                const dbKey = mapping[k] || k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                dbItem[dbKey] = v;
              }
              return dbItem;
            });

            // Supabase insert
            const { error } = await supabase.from(table).insert(dbItems);
            if (error) console.error(`Erro ao restaurar nuvem para ${table}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Erro no bulkRestore:", error);
      throw error;
    }
  }
};
