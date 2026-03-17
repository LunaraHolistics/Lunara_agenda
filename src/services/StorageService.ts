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

const tableMap: Record<string, string> = {
  [StorageKeys.CLIENTES]: 'clientes',
  [StorageKeys.TERAPIAS]: 'terapias',
  [StorageKeys.PACOTES]: 'pacotes',
  [StorageKeys.AGENDAMENTOS]: 'agendamentos',
  [StorageKeys.BLOQUEIOS]: 'bloqueios',
  [StorageKeys.FINANCAS]: 'financeiro',
  [StorageKeys.TRANSACOES]: 'financeiro',
};

export const fieldMappings: Record<string, Record<string, string>> = {
  clientes: {
    id: 'id',
    userId: 'user_id',
    name: 'name',
    phone: 'phone',
    notes: 'notes'
  },
  terapias: {
    id: 'id',
    userId: 'user_id',
    name: 'name',
    price: 'price',
    duration: 'duration'
  },
  pacotes: {
    id: 'id',
    userId: 'user_id',
    clienteId: 'clienteId',
    mesReferencia: 'mesReferencia',
    tipoPacote: 'tipoPacote',
    valorFinal: 'valorFinal',
    status: 'status',
    itens: 'itens',
    observacoes: 'observacoes'
  },
  agendamentos: {
    id: 'id',
    userId: 'user_id',
    clientId: 'client_id',
    date: 'date',
    time: 'time',
    packageId: 'package_id',
    therapyItemId: 'therapy_item_id',
    statusAtendimento: 'status_atendimento',
    statusPagamento: 'status_pagamento',
    valorCobrado: 'valor_sessao'
  },
  bloqueios: {
    id: 'id',
    userId: 'user_id',
    data: 'data',
    horaInicio: 'hora_inicio',
    horaFim: 'hora_fim',
    motivo: 'motivo'
  },
  financeiro: {
    id: 'id',
    userId: 'user_id',
    descricao: 'descricao',
    valor: 'valor',
    data: 'data',
    metodo: 'metodo',
    categoria: 'categoria',
    status: 'status',
    pacoteId: 'pacoteId',
    dataPagamento: 'data_pagamento'
  }
};

const getReverseMapping = (table: string) => {
  const mapping = fieldMappings[table];
  const reverse: Record<string, string> = {};
  if (!mapping) return reverse;

  for (const [k, v] of Object.entries(mapping)) {
    reverse[v] = k;
  }
  return reverse;
};

export const mapToSnakeCase = (table: string, item: any) => {
  const mapping = fieldMappings[table];
  const dbItem: any = {};

  if (!mapping) return item;

  // Normalize legacy fields and ensure correct property names
  const normalizedItem = { ...item };
  
  // Handle specific renames requested by user
  if (normalizedItem.amount !== undefined) normalizedItem.valor = normalizedItem.amount;
  if (normalizedItem.price !== undefined) normalizedItem.valorFinal = normalizedItem.price;
  if (normalizedItem.therapies !== undefined) normalizedItem.itens = normalizedItem.therapies;
  if (normalizedItem.month !== undefined) normalizedItem.mesReferencia = normalizedItem.month;
  if (normalizedItem.type !== undefined) normalizedItem.tipoPacote = normalizedItem.type;
  if (normalizedItem.observations !== undefined) normalizedItem.observacoes = normalizedItem.observations;
  if (normalizedItem.therapy_item_id !== undefined) normalizedItem.therapyItemId = normalizedItem.therapy_item_id;
  if (normalizedItem.status_atendimento !== undefined) normalizedItem.statusAtendimento = normalizedItem.status_atendimento;
  if (normalizedItem.status_pagamento !== undefined) normalizedItem.statusPagamento = normalizedItem.status_pagamento;
  if (normalizedItem.valor_cobrado !== undefined) normalizedItem.valorCobrado = normalizedItem.valor_cobrado;

  // STRICT MAPPING: Only include fields defined in fieldMappings
  for (const [appKey, dbKey] of Object.entries(mapping)) {
    let value = normalizedItem[appKey];
    
    if (value === undefined) continue;

    // Handle JSON fields (itens)
    if (dbKey === 'itens' && typeof value === 'object' && value !== null) {
      value = JSON.stringify(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // If it's an object but not supposed to be JSON, try to get ID or stringify
      value = value.id || String(value);
    }

    // Ensure numeric types for specific fields
    const numericFields = ['valor', 'valorFinal', 'valor_sessao', 'price', 'duration'];
    if (numericFields.includes(dbKey)) {
      value = Number(value) || 0;
    }

    // Ensure IDs are strings and not objects
    const idFields = ['id', 'user_id', 'clienteId', 'client_id', 'package_id', 'pacoteId', 'therapy_item_id'];
    if (idFields.includes(dbKey) && value !== null) {
      value = String(value);
    }

    dbItem[dbKey] = value;
  }

  return dbItem;
};

export const mapFromSnakeCase = (table: string, item: any) => {
  const reverseMapping = getReverseMapping(table);
  const newItem: any = {};

  for (const [k, v] of Object.entries(item)) {
    const appKey =
      reverseMapping[k] ||
      k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

    let value = v;
    
    // Attempt to parse JSON strings
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // Not valid JSON, keep as string
      }
    }

    newItem[appKey] = value;
  }

  return newItem;
};

export const StorageService = {

  async getItems<T = any>(key: string): Promise<T[]> {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  async emitUpdate(key?: string) {
    window.dispatchEvent(new Event('storage-update'));
    if (key) window.dispatchEvent(new CustomEvent('storage-key-update', { detail: key }));
  },

  async syncWithCloud(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Ensure local changes are pushed to the cloud first
      await this.syncWithSupabase();

      // Get pending changes to avoid overwriting them with stale cloud data
      const pending = await this.getPendingChanges();
      const pendingIds = new Set(pending.map(p => p.item?.id || p.id));

      for (const key of Object.values(StorageKeys)) {
        const table = tableMap[key];

        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', user.id);

        if (!error && data) {
          const cloud = data.map(item => mapFromSnakeCase(table, item));
          const local = await this.getItems(key);

          const merged = [
            ...local.filter(l => !cloud.some(c => c.id === l.id) || pendingIds.has(l.id)),
            ...cloud.filter(c => !pendingIds.has(c.id))
          ];

          await AsyncStorage.setItem(key, JSON.stringify(merged));
        }
      }

      await this.emitUpdate();

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
    pending.push({ ...change, retry: 0 });

    await AsyncStorage.setItem('pending_changes', JSON.stringify(pending));

    window.dispatchEvent(new Event('pending-changes-update'));

    this.syncWithSupabase().catch(console.error);
  },

  async syncWithSupabase(): Promise<void> {
    try {
      let pending = await this.getPendingChanges();
      if (pending.length === 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Define priority for sync to respect foreign keys
      const priority: Record<string, number> = {
        [StorageKeys.CLIENTES]: 1,
        [StorageKeys.TERAPIAS]: 1,
        [StorageKeys.PACOTES]: 2,
        [StorageKeys.AGENDAMENTOS]: 3,
        [StorageKeys.TRANSACOES]: 4,
        [StorageKeys.BLOQUEIOS]: 5
      };

      // Sort pending changes by priority
      pending.sort((a, b) => (priority[a.key] || 99) - (priority[b.key] || 99));

      const remaining: any[] = [];
      let hasError = false;

      for (let i = 0; i < pending.length; i++) {
        const change = pending[i];
        
        if (hasError) {
          remaining.push(change);
          continue;
        }

        try {
          const table = tableMap[change.key];

          if (change.type === 'save' || change.type === 'update') {
            const dbItem = mapToSnakeCase(table, change.item);
            dbItem.user_id = user.id;

            const { error } = await supabase
              .from(table)
              .upsert(dbItem, { onConflict: 'id' });

            if (error) throw error;
          }

          if (change.type === 'delete') {
            const { error } = await supabase
              .from(table)
              .delete()
              .eq('id', String(change.id))
              .eq('user_id', user.id);

            if (error) throw error;
          }

        } catch (err) {
          console.error("Erro ao sincronizar item:", err);
          hasError = true;
          change.retry = (change.retry || 0) + 1;

          if (change.retry < 5) {
            remaining.push(change);
          } else {
            console.error("Descartando mudança após 5 tentativas:", change);
            hasError = false; // Continue processing next items since we discarded this one
          }
        }
      }

      await AsyncStorage.setItem('pending_changes', JSON.stringify(remaining));
      await this.emitUpdate();

    } catch (error) {
      console.error("Erro na sincronização:", error);
    }
  },

  async saveItem<T extends { id: string }>(key: string, item: T): Promise<void> {
    const existing = await this.getItems(key);

    const updated = [...existing, item];

    await AsyncStorage.setItem(key, JSON.stringify(updated));
    await this.emitUpdate(key);

    await this.addPendingChange({ type: 'save', key, item });
  },

  async updateItem<T extends { id: string }>(key: string, updatedItem: T): Promise<void> {
    const existing = await this.getItems(key);

    const updated = existing.map(i =>
      String(i.id) === String(updatedItem.id) ? updatedItem : i
    );

    await AsyncStorage.setItem(key, JSON.stringify(updated));
    await this.emitUpdate(key);

    await this.addPendingChange({ type: 'update', key, item: updatedItem });
  },

  async deleteItem<T extends { id: string }>(key: string, id: string): Promise<void> {
    const existing = await this.getItems(key);

    const updated = existing.filter(i => String(i.id) !== String(id));

    await AsyncStorage.setItem(key, JSON.stringify(updated));
    await this.emitUpdate(key);

    await this.addPendingChange({ type: 'delete', key, id });
  },

  async bulkRestore(data: any): Promise<void> {
    for (const key of Object.values(StorageKeys)) {
      if (data[key]) {
        await AsyncStorage.setItem(key, JSON.stringify(data[key]));
        // Mark all as pending saves to sync to cloud
        for (const item of data[key]) {
          await this.addPendingChange({ type: 'save', key, item });
        }
      }
    }
    await this.emitUpdate();
  },

  async repairDatabase(): Promise<void> {
    for (const key of Object.values(StorageKeys)) {
      const items = await this.getItems(key);
      const repairedItems = items.map((item: any) => {
        // Fix common issues
        if (item.nome && !item.name) item.name = item.nome;
        if (item.valor && !item.price) item.price = item.valor;
        // Ensure IDs are strings
        if (item.id) item.id = String(item.id);
        return item;
      });
      await AsyncStorage.setItem(key, JSON.stringify(repairedItems));
    }
    await this.emitUpdate();
  },

  async resetSistemaTotal(): Promise<void> {
    for (const key of Object.values(StorageKeys)) {
      await AsyncStorage.setItem(key, JSON.stringify([]));
    }
    await AsyncStorage.setItem('pending_changes', JSON.stringify([]));
    await this.emitUpdate();
  }

};