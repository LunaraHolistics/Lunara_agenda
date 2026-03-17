import { AsyncStorage } from '../utils/storage';
import { supabase } from '../supabaseClient';

export const StorageKeys = {
  CLIENTES: 'clientes',
  TERAPIAS: 'terapias',
  PACOTES: 'pacotes',
  AGENDAMENTOS: 'agendamentos',
  BLOQUEIOS: 'bloqueios',
  FINANCAS: 'financas',
  TRANSACOES: 'financeiro',
};

// Mapeamento de chaves do App para nomes de tabelas no Supabase
const tableMap: Record<string, string> = {
  [StorageKeys.CLIENTES]: 'clientes',
  [StorageKeys.TERAPIAS]: 'terapias',
  [StorageKeys.PACOTES]: 'pacotes',
  [StorageKeys.AGENDAMENTOS]: 'agendamentos',
  [StorageKeys.BLOQUEIOS]: 'bloqueios',
  [StorageKeys.FINANCAS]: 'financeiro', // CORRIGIDO: Nome exato conforme sua imagem
  [StorageKeys.TRANSACOES]: 'financeiro',
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
    price: 'price',
    payment_method: 'payment_method',
    payment_date: 'payment_date',
    itens: 'therapies',
    observacoes: 'observations'
  },
  agendamentos: {
    id: 'id',
    clientId: 'client_id',
    date: 'date',
    time: 'time',
    packageId: 'package_id',
    therapy_item_id: 'therapy_item_id',
    therapy_name: 'therapy_name',
    status_atendimento: 'status_atendimento',
    status_pagamento: 'status_pagamento'
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
    status: 'status',
    clienteId: 'client_id',
    pacoteId: 'package_id',
    metodo: 'method',
    banco: 'bank'
  },
  financeiro: {
    id: 'id',
    descricao: 'description',
    valor: 'amount',
    data: 'date',
    tipo: 'type',
    categoria: 'category',
    status: 'status',
    clienteId: 'client_id',
    pacoteId: 'package_id',
    metodo: 'method',
    banco: 'bank'
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
  async getItems<T>(key: string): Promise<T[]> {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

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

  async getPendingChanges(): Promise<any[]> {
    const data = await AsyncStorage.getItem('pending_changes');
    return data ? JSON.parse(data) : [];
  },

  async addPendingChange(change: any): Promise<void> {
    const pending = await this.getPendingChanges();
    pending.push(change);
    await AsyncStorage.setItem('pending_changes', JSON.stringify(pending));
    window.dispatchEvent(new Event('pending-changes-update'));
  },

  async syncWithSupabase(): Promise<void> {
    try {
      const pending = await this.getPendingChanges();
      if (pending.length === 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const change of pending) {
        const table = tableMap[change.key];
        let error;
        if (change.type === 'save') {
          const dbItem = mapToSnakeCase(table, change.item);
          if (table === 'financeiro') delete dbItem.id;
          dbItem.user_id = user.id;
          ({ error } = await supabase.from(table).insert(dbItem));
        } else if (change.type === 'update') {
          const dbItem = mapToSnakeCase(table, change.item);
          if (table === 'financeiro') delete dbItem.id;
          ({ error } = await supabase.from(table).update(dbItem).eq('id', String(change.item.id)));
        } else if (change.type === 'delete') {
          ({ error } = await supabase.from(table).delete().eq('id', String(change.id)));
        }

        if (error) throw error;
      }

      await AsyncStorage.setItem('pending_changes', JSON.stringify([]));
      window.dispatchEvent(new Event('storage-sync'));
      window.dispatchEvent(new Event('pending-changes-update'));
    } catch (error) {
      console.error("Erro na sincronização:", error);
      throw error;
    }
  },

  async saveItem<T extends { id: string }>(key: string, item: T): Promise<void> {
    try {
      const existing = await StorageService.getItems<T>(key);
      existing.push(item);
      await AsyncStorage.setItem(key, JSON.stringify(existing));
      await this.addPendingChange({ type: 'save', key, item });
    } catch (error) {
      console.error(`Erro ao salvar item na chave ${key}:`, error);
      throw error;
    }
  },

  async updateItem<T extends { id: string }>(key: string, updatedItem: T): Promise<void> {
    try {
      const existing = await StorageService.getItems<T>(key);
      const index = existing.findIndex((item) => item && item.id && String(item.id) === String(updatedItem?.id));
      
      if (index !== -1) {
        existing[index] = updatedItem;
        await AsyncStorage.setItem(key, JSON.stringify(existing));
        await this.addPendingChange({ type: 'update', key, item: updatedItem });
      }
    } catch (error) {
      console.error(`Erro ao atualizar item na chave ${key}:`, error);
      throw error;
    }
  },

  async deleteItem<T extends { id: string }>(key: string, id: string): Promise<void> {
    try {
      const existing = await StorageService.getItems<T>(key);
      const filtered = existing.filter((item) => item && item.id && String(item.id) !== String(id));
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      await this.addPendingChange({ type: 'delete', key, id });
    } catch (error) {
      console.error(`Erro ao deletar item na chave ${key}:`, error);
      throw error;
    }
  },

  async fetchResumoFinanceiro(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('financeiro')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'Pago')
        .gte('data_pagamento', firstDay)
        .lte('data_pagamento', lastDay);

      if (error) throw error;

      const resumo = data.reduce((acc: any, item: any) => {
        const cat = item.categoria || 'Outros';
        const met = item.metodo || 'Outros';
        if (!acc[cat]) acc[cat] = {};
        if (!acc[cat][met]) acc[cat][met] = 0;
        acc[cat][met] += Number(item.valor) || 0;
        return acc;
      }, {});

      return resumo;
    } catch (error) {
      console.error("Erro ao buscar resumo financeiro:", error);
      return null;
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