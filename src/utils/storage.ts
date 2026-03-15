// Simulando o AsyncStorage do React Native para o ambiente Web (100% Offline)
export const AsyncStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Erro ao salvar dados', e);
      throw e;
    }
  },
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Erro ao ler dados', e);
      throw e;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Erro ao remover dados', e);
      throw e;
    }
  },
  clear: async (): Promise<void> => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Erro ao limpar dados', e);
      throw e;
    }
  }
};
