import { AsyncStorage } from '../utils/storage';
import { supabase } from '../supabaseClient';

export const StorageKeys = {
  CLIENTES: 'clientes',
  TERAPIAS: 'terapias',
  PACOTES: 'pacotes',
  AGENDAMENTOS: 'agendamentos',
  BLOQUEIOS: 'bloqueios',
  FINANCAS: 'financas',
};

// Mapeamento de chaves do App para nomes de tabelas no Supabase
const tableMap: Record<string, string> = {
  [StorageKeys.CLIENTES]: 'clientes',
  [StorageKeys.TERAPIAS]: 'terapias',
  [StorageKeys.PACOTES]: 'pacotes',
  [StorageKeys.AGENDAMENTOS]: 'agendamentos',
  [StorageKeys.BLOQUEIOS]: 'bloqueios',
  [StorageKeys.FINANCAS]: 'financeiro', // CORRIGIDO: Nome exato conforme sua imagem
};

// Mapeamento explícito de campos (App camelCase -> DB snake_case)
export const fieldMappings: Record<string, Record<string, string>> = {
  clientes: {
    id: 'id',
    name: 'name',
    phone: 'phone',
    notes: 'notes'
  },
  terapias: {
    id: 'id',
    name: 'name',
    price: 'price',
    duration: 'duration'
  },
  pacotes: {
    id: 'id',
    clienteId: 'client_id',
    mesReferencia: 'month',
    tipoPacote: 'type',
    valorFinal: 'price',
    historicoPagamento: 'status',
    formaPagamento: 'payment_method',
    dataPagamento: 'payment_date',
    bancoPagamento: 'bank',
    observacoes: 'observations',
    itens: 'therapies'
  },
  agendamentos: {
    id: 'id',
    client_id: 'client_id',
    date: 'date',
    time: 'time',
    package_id: 'package_id',
    therapy_item_id: 'therapy_item_id',
    therapy_name: 'therapy_name'
  },
  bloqueios: {
    id: 'id',
    data: 'data',
    horaInicio: 'hora_inicio',
    horaFim: 'hora_fim',
    motivo: 'motivo'
  },
  financas: {
    id: 'id',
    descricao: 'description',
    valor: 'amount',
    data: 'date',
    tipo: 'type',
    categoria: 'category',
    status: 'status'
  }
};

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
  async syncWithCloud(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const key of Object.values(StorageKeys)) {
        const table = tableMap[key];
        const { data, error } = await supabase.from(table).select('*').eq('user_id', user.id);
        
        if (!error && data) {
          const camelData = data.map(item => mapFromSnakeCase(table, item));
          await AsyncStorage.setItem(key, JSON.stringify(camelData));
        }
      }
      window.dispatchEvent(new Event('storage-sync'));
    } catch (error) {
      console.error("Erro na sincronização:", error);
    }
  },

  async saveItem<T extends { id: string }>(key: string, item: T): Promise<void> {
    try {
      const existing = await StorageService.getItems<T>(key);
      existing.push(item);
      await AsyncStorage.setItem(key, JSON.stringify(existing));

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const table = tableMap[key];
        const dbItem = mapToSnakeCase(table, item);
        dbItem.user_id = user.id;
        
        const { error } = await supabase.from(table).insert(dbItem);
        if (error) throw error;
      }
    } catch (error) {
      console.error(`Erro ao salvar item na chave ${key}:`, error);
      throw error;
    }
  },

  async getItems<T>(key: string): Promise<T[]> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Erro ao buscar itens da chave ${key}:`, error);
      return [];
    }
  },

  async updateItem<T extends { id: string }>(key: string, updatedItem: T): Promise<void> {
    try {
      const existing = await StorageService.getItems<T>(key);
      const index = existing.findIndex((item) => item && item.id && String(item.id) === String(updatedItem?.id));
      
      if (index !== -1) {
        existing[index] = updatedItem;
        await AsyncStorage.setItem(key, JSON.stringify(existing));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const table = tableMap[key];
          const dbItem = mapToSnakeCase(table, updatedItem);
          const { error } = await supabase.from(table).update(dbItem).eq('id', String(updatedItem.id));
          if (error) throw error;
        }
      }
    } catch (error) {
      console.error(`Erro ao atualizar item na chave ${key}:`, error);
      throw error;
    }
  },

  async deleteItem<T extends { id: string }>(key: string, id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const idStr = String(id);

      if (key === StorageKeys.PACOTES && user) {
        await supabase.from('agendamentos').delete().eq('package_id', idStr);
        const localAgendamentos = await StorageService.getItems<any>(StorageKeys.AGENDAMENTOS);
        const filteredAgendamentos = localAgendamentos.filter(a => 
          String(a.packageId || a.package_id) !== idStr
        );
        await AsyncStorage.setItem(StorageKeys.AGENDAMENTOS, JSON.stringify(filteredAgendamentos));
      }

      const existing = await StorageService.getItems<T>(key);
      const filtered = existing.filter((item) => item && item.id && String(item.id) !== idStr);
      await AsyncStorage.setItem(key, JSON.stringify(filtered));

      if (user) {
        const table = tableMap[key];
        const { error } = await supabase.from(table).delete().eq('id', idStr);
        if (error) throw error;
      }
    } catch (error) {
      console.error(`Erro ao deletar item na chave ${key}:`, error);
      throw error;
    }
  },

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

  async bulkRestore(data: Record<string, any[]>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      for (const key of Object.values(StorageKeys)) {
        const items = data[key] || [];
        await AsyncStorage.setItem(key, JSON.stringify(items));

        const table = tableMap[key];
        await supabase.from(table).delete().eq('user_id', user.id);
        
        if (items.length > 0) {
          const dbItems = items.map(item => {
            const dbItem = mapToSnakeCase(table, item);
            dbItem.user_id = user.id;
            return dbItem;
          });
          const { error } = await supabase.from(table).insert(dbItems);
          if (error) console.error(`Erro ao restaurar nuvem para ${table}:`, error);
        }
      }
      window.dispatchEvent(new Event('storage-sync'));
    } catch (error) {
      console.error("Erro no bulkRestore:", error);
      throw error;
    }
  },

  async repairDatabase(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      for (const key of Object.values(StorageKeys)) {
        let items = await StorageService.getItems<any>(key);
        items = items.filter(item => item && item.id).map(item => {
          const newItem = { ...item, id: String(item.id) };
          if (!newItem.userId) newItem.userId = user.id;
          if (key === StorageKeys.AGENDAMENTOS && newItem.date?.includes('/')) {
            const [d, m, y] = newItem.date.split('/');
            newItem.date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
          return newItem;
        });

        await AsyncStorage.setItem(key, JSON.stringify(items));
        const table = tableMap[key];
        await supabase.from(table).delete().eq('user_id', user.id);
        if (items.length > 0) {
          const dbItems = items.map(item => {
            const dbItem = mapToSnakeCase(table, item);
            dbItem.user_id = user.id;
            return dbItem;
          });
          await supabase.from(table).insert(dbItems);
        }
      }
      window.dispatchEvent(new Event('storage-sync'));
    } catch (error) {
      console.error("Erro ao reparar banco:", error);
      throw error;
    }
  }
};