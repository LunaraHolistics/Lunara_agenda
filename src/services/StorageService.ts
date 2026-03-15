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
        // Convert snake_case from DB to camelCase for App
        const camelData = data.map(item => {
          const newItem: any = {};
          for (const [k, v] of Object.entries(item)) {
            const camelK = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            newItem[camelK] = v;
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
        // Convert camelCase to snake_case for DB
        const snakeItem: any = { user_id: user.id };
        for (const [k, v] of Object.entries(item)) {
          const snakeK = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          snakeItem[snakeK] = v;
        }
        await supabase.from(table).insert(snakeItem);
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
          const snakeItem: any = {};
          for (const [k, v] of Object.entries(updatedItem)) {
            const snakeK = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            snakeItem[snakeK] = v;
          }
          await supabase.from(table).update(snakeItem).eq('id', updatedItem.id);
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
          
          // Delete all current user data for this table
          await supabase.from(table).delete().eq('user_id', user.id);
          
          if (items.length > 0) {
            // Convert camelCase to snake_case for DB
            const snakeItems = items.map(item => {
              const snakeItem: any = { user_id: user.id };
              for (const [k, v] of Object.entries(item)) {
                const snakeK = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                snakeItem[snakeK] = v;
              }
              return snakeItem;
            });

            // Supabase insert in chunks if needed, but for now assuming reasonable size
            const { error } = await supabase.from(table).insert(snakeItems);
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
