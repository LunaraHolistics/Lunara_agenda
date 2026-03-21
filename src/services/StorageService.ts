export const StorageKeys = {
  CLIENTES: '@lunara_clientes',
  TERAPIAS: '@lunara_terapias',
  AGENDAMENTOS: '@lunara_agendamentos',
  TRANSACOES: '@lunara_financeiro',
  PACOTES: '@lunara_pacotes',
  BLOQUEIOS: '@lunara_bloqueios',
  DESPESAS: '@lunara_despesas',
  DADOS_PROFISSIONAIS: '@lunara_dados_profissionais',
};

export const StorageService = {
  saveData: (key: string, data: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao salvar dados', e);
    }
  },
  getData: (key: string): any => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Erro ao ler dados da chave ${key}. Limpando chave para evitar corrupção.`, e);
      localStorage.removeItem(key);
      return null;
    }
  },
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },
  clear: (): void => {
    localStorage.clear();
  }
};
