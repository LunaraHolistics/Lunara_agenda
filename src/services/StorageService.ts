import { AsyncStorage } from '../utils/storage';

export const StorageKeys = {
  CLIENTES: 'clientes',
  TERAPIAS: 'terapias',
  PACOTES: 'pacotes',
  AGENDAMENTOS: 'agendamentos',
  BLOQUEIOS: 'bloqueios',
};

export const StorageService = {
  /**
   * Salva um novo item na lista correspondente à chave.
   */
  async saveItem<T>(key: string, item: T): Promise<void> {
    try {
      const existing = await StorageService.getItems<T>(key);
      existing.push(item);
      await AsyncStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error(`Erro ao salvar item na chave ${key}:`, error);
      throw error;
    }
  },

  /**
   * Busca todos os itens de uma chave.
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
   * Atualiza um item existente baseado no seu ID.
   */
  async updateItem<T extends { id: string | number }>(key: string, updatedItem: T): Promise<void> {
    try {
      const existing = await StorageService.getItems<T>(key);
      const index = existing.findIndex((item) => item.id.toString() === updatedItem.id.toString());
      if (index !== -1) {
        existing[index] = updatedItem;
        await AsyncStorage.setItem(key, JSON.stringify(existing));
      } else {
        throw new Error('Item não encontrado para atualização.');
      }
    } catch (error) {
      console.error(`Erro ao atualizar item na chave ${key}:`, error);
      throw error;
    }
  },

  /**
   * Deleta um item baseado no seu ID.
   */
  async deleteItem<T extends { id: string | number }>(key: string, id: string | number): Promise<void> {
    try {
      console.log("Ação: Excluir | Alvo:", id);
      const existing = await StorageService.getItems<T>(key);
      const filtered = existing.filter((item) => item.id.toString() !== id.toString());
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
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
      window.location.reload();
    } catch (error) {
      console.error("Erro ao resetar o sistema:", error);
      throw error;
    }
  },
};
