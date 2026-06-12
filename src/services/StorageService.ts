// 🎯 Tipos e interfaces
export interface StorageMetadata {
  version: string;
  lastUpdated: string;
  size: number;
  compressionEnabled: boolean;
}

export interface StorageStats {
  totalKeys: number;
  totalSize: number;
  totalSizeFormatted: string;
  keys: {
    key: string;
    size: number;
    sizeFormatted: string;
    lastUpdated: string;
  }[];
  quotaUsed: number;
  quotaTotal: number;
  quotaPercentage: number;
}

export interface StorageOptions {
  compress?: boolean;
  version?: string;
  fallbackToMemory?: boolean;
  enableBackup?: boolean;
  backupInterval?: number;
}

export const StorageKeys = {
  CLIENTES: '@lunara_clientes',
  TERAPIAS: '@lunara_terapias',
  AGENDAMENTOS: '@lunara_agendamentos',
  TRANSACOES: '@lunara_financeiro',
  PACOTES: '@lunara_pacotes',
  BLOQUEIOS: '@lunara_bloqueios',
  DESPESAS: '@lunara_despesas',
  DADOS_PROFISSIONAIS: '@lunara_dados_profissionais',
  METADATA: '@lunara_metadata',
  BACKUP_TIMESTAMP: '@lunara_backup_timestamp',
};

// 🎯 Memory Storage fallback (quando localStorage falha)
class MemoryStorage {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys());
    return keys[index] || null;
  }

  get length(): number {
    return this.storage.size;
  }
}

// 🎯 Compressão simples (RLE para strings repetitivas)
const compressData = (data: string): string => {
  try {
    // Para dados pequenos, não comprimir
    if (data.length < 1000) return data;
    
    // Compressão RLE simples
    let compressed = '';
    let count = 1;
    
    for (let i = 0; i < data.length; i++) {
      if (i < data.length - 1 && data[i] === data[i + 1]) {
        count++;
      } else {
        compressed += count > 3 ? `${count}${data[i]}` : data[i].repeat(count);
        count = 1;
      }
    }
    
    // Só usar compressão se realmente reduziu o tamanho
    return compressed.length < data.length ? `__COMPRESSED__${compressed}` : data;
  } catch (e) {
    console.warn('Erro ao comprimir dados, retornando original:', e);
    return data;
  }
};

const decompressData = (data: string): string => {
  try {
    if (!data.startsWith('__COMPRESSED__')) return data;
    
    const compressed = data.slice('__COMPRESSED__'.length);
    let decompressed = '';
    let i = 0;
    
    while (i < compressed.length) {
      let numStr = '';
      while (i < compressed.length && /\d/.test(compressed[i])) {
        numStr += compressed[i];
        i++;
      }
      
      if (numStr && i < compressed.length) {
        const count = parseInt(numStr, 10);
        const char = compressed[i];
        decompressed += char.repeat(count);
        i++;
      } else if (i < compressed.length) {
        decompressed += compressed[i];
        i++;
      }
    }
    
    return decompressed;
  } catch (e) {
    console.warn('Erro ao descomprimir dados:', e);
    return data;
  }
};

// 🎯 Detecção de storage disponível
const getAvailableStorage = (): Storage | MemoryStorage => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return localStorage;
  } catch (e) {
    console.warn('localStorage não disponível, usando memory storage:', e);
    return new MemoryStorage();
  }
};

// 🎯 Storage principal com todas as melhorias
export const StorageService = {
  _storage: getAvailableStorage(),
  _memoryFallback: new MemoryStorage(),
  _isUsingMemory: false,
  _metadata: new Map<string, { lastUpdated: string; size: number }>(),
  
  // 🎯 Salvar dados com tratamento robusto de erros
  saveData: (key: string, data: any, options: StorageOptions = {}): boolean => {
    try {
      const { compress = false, version = '1.0' } = options;
      
      // Serializar dados
      let serialized = JSON.stringify(data);
      
      // Comprimir se solicitado
      if (compress) {
        serialized = compressData(serialized);
      }
      
      // Tentar salvar no storage disponível
      const storage = StorageService._isUsingMemory ? StorageService._memoryFallback : StorageService._storage;
      
      try {
        storage.setItem(key, serialized);
      } catch (quotaError: any) {
        // QuotaExceededError - tentar limpar espaço
        if (quotaError.name === 'QuotaExceededError' || quotaError.code === 22) {
          console.warn('Quota excedida, tentando liberar espaço...');
          
          // Tentar limpar dados antigos
          StorageService.cleanupOldData();
          
          // Tentar novamente
          try {
            storage.setItem(key, serialized);
          } catch (retryError) {
            // Se ainda falhar, usar memory storage
            console.error('Não foi possível salvar mesmo após limpeza, usando memory storage:', retryError);
            StorageService._isUsingMemory = true;
            StorageService._memoryFallback.setItem(key, serialized);
          }
        } else {
          throw quotaError;
        }
      }
      
      // Atualizar metadados
      StorageService._metadata.set(key, {
        lastUpdated: new Date().toISOString(),
        size: serialized.length
      });
      
      // Salvar metadados periodicamente
      StorageService.saveMetadata();
      
      console.log(`✓ Dados salvos: ${key} (${serialized.length} bytes)`);
      return true;
    } catch (e: any) {
      console.error(`✗ Erro ao salvar dados na chave ${key}:`, e);
      
      // Último recurso: memory storage
      try {
        StorageService._isUsingMemory = true;
        StorageService._memoryFallback.setItem(key, JSON.stringify(data));
        console.warn(`⚠ Dados salvos em memória (fallback): ${key}`);
        return true;
      } catch (fallbackError) {
        console.error('✗ Falha total ao salvar dados:', fallbackError);
        return false;
      }
    }
  },

  // 🎯 Ler dados com validação e recuperação
  getData: (key: string, options: StorageOptions = {}): any => {
    try {
      const { version = '1.0' } = options;
      
      // Tentar ler do storage principal
      let data: string | null = null;
      
      if (StorageService._isUsingMemory) {
        data = StorageService._memoryFallback.getItem(key);
      } else {
        data = StorageService._storage.getItem(key);
        
        // Se não encontrou no principal, tentar no memory
        if (!data) {
          data = StorageService._memoryFallback.getItem(key);
        }
      }
      
      if (!data) {
        return null;
      }
      
      // Descomprimir se necessário
      if (data.startsWith('__COMPRESSED__')) {
        data = decompressData(data);
      }
      
      // Parse JSON
      try {
        const parsed = JSON.parse(data);
        
        // Validar integridade básica
        if (StorageService.validateData(parsed)) {
          return parsed;
        } else {
          console.warn(`⚠ Dados corrompidos detectados na chave ${key}, tentando recuperação...`);
          return StorageService.attemptRecovery(key, parsed);
        }
      } catch (parseError) {
        console.error(`✗ Erro ao fazer parse da chave ${key}:`, parseError);
        
        // Tentar recuperar dados corrompidos
        const recovered = StorageService.attemptRecovery(key, data);
        if (recovered !== null) {
          return recovered;
        }
        
        // Se não conseguiu recuperar, limpar chave
        console.warn(`🗑 Limpando chave corrompida: ${key}`);
        StorageService.removeItem(key);
        return null;
      }
    } catch (e: any) {
      console.error(`✗ Erro ao ler dados da chave ${key}:`, e);
      return null;
    }
  },

  // 🎯 Remover item
  removeItem: (key: string): void => {
    try {
      if (StorageService._isUsingMemory) {
        StorageService._memoryFallback.removeItem(key);
      } else {
        StorageService._storage.removeItem(key);
        StorageService._memoryFallback.removeItem(key); // Remover de ambos
      }
      
      StorageService._metadata.delete(key);
      StorageService.saveMetadata();
      
      console.log(`✓ Item removido: ${key}`);
    } catch (e) {
      console.error(`✗ Erro ao remover item ${key}:`, e);
    }
  },

  // 🎯 Limpar todo o storage
  clear: (): void => {
    try {
      if (StorageService._isUsingMemory) {
        StorageService._memoryFallback.clear();
      } else {
        StorageService._storage.clear();
        StorageService._memoryFallback.clear();
      }
      
      StorageService._metadata.clear();
      console.log('✓ Storage limpo completamente');
    } catch (e) {
      console.error('✗ Erro ao limpar storage:', e);
    }
  },

  // 🎯 Verificar se chave existe
  hasKey: (key: string): boolean => {
    try {
      if (StorageService._isUsingMemory) {
        return StorageService._memoryFallback.getItem(key) !== null;
      }
      
      return (
        StorageService._storage.getItem(key) !== null ||
        StorageService._memoryFallback.getItem(key) !== null
      );
    } catch (e) {
      return false;
    }
  },

  // 🎯 Obter todas as chaves
  getAllKeys: (): string[] => {
    try {
      const keys = new Set<string>();
      
      if (StorageService._isUsingMemory) {
        for (let i = 0; i < StorageService._memoryFallback.length; i++) {
          const key = StorageService._memoryFallback.key(i);
          if (key) keys.add(key);
        }
      } else {
        for (let i = 0; i < StorageService._storage.length; i++) {
          const key = StorageService._storage.key(i);
          if (key) keys.add(key);
        }
        
        for (let i = 0; i < StorageService._memoryFallback.length; i++) {
          const key = StorageService._memoryFallback.key(i);
          if (key) keys.add(key);
        }
      }
      
      return Array.from(keys);
    } catch (e) {
      console.error('✗ Erro ao obter chaves:', e);
      return [];
    }
  },

  // 🎯 Obter estatísticas do storage
  getStats: (): StorageStats => {
    try {
      const keys = StorageService.getAllKeys();
      let totalSize = 0;
      
      const keyStats = keys.map(key => {
        let size = 0;
        
        if (StorageService._isUsingMemory) {
          const data = StorageService._memoryFallback.getItem(key);
          size = data ? data.length : 0;
        } else {
          const data = StorageService._storage.getItem(key);
          size = data ? data.length : 0;
        }
        
        totalSize += size;
        
        const metadata = StorageService._metadata.get(key);
        
        return {
          key,
          size,
          sizeFormatted: StorageService.formatBytes(size),
          lastUpdated: metadata?.lastUpdated || 'N/A'
        };
      });
      
      // Estimar quota (localStorage geralmente tem 5-10MB)
      const quotaTotal = 5 * 1024 * 1024; // 5MB estimado
      const quotaPercentage = (totalSize / quotaTotal) * 100;
      
      return {
        totalKeys: keys.length,
        totalSize,
        totalSizeFormatted: StorageService.formatBytes(totalSize),
        keys: keyStats.sort((a, b) => b.size - a.size),
        quotaUsed: totalSize,
        quotaTotal,
        quotaPercentage: Math.min(quotaPercentage, 100)
      };
    } catch (e) {
      console.error('✗ Erro ao obter estatísticas:', e);
      return {
        totalKeys: 0,
        totalSize: 0,
        totalSizeFormatted: '0 B',
        keys: [],
        quotaUsed: 0,
        quotaTotal: 5 * 1024 * 1024,
        quotaPercentage: 0
      };
    }
  },

  // 🎯 Formatar bytes para leitura humana
  formatBytes: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  // 🎯 Validar integridade dos dados
  validateData: (data: any): boolean => {
    try {
      // Verificar se é um array válido
      if (Array.isArray(data)) {
        return data.every(item => item && typeof item === 'object');
      }
      
      // Verificar se é um objeto válido
      if (data && typeof data === 'object') {
        return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  },

  // 🎯 Tentar recuperar dados corrompidos
  attemptRecovery: (key: string, data: any): any => {
    try {
      // Se for string, tentar parse novamente
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (StorageService.validateData(parsed)) {
            console.log(`✓ Dados recuperados com sucesso: ${key}`);
            return parsed;
          }
        } catch (e) {
          // Tentar extrair JSON de string corrompida
          const match = data.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              if (StorageService.validateData(parsed)) {
                console.log(`✓ Dados recuperados de string corrompida: ${key}`);
                return parsed;
              }
            } catch (e) {
              // Falhou
            }
          }
        }
      }
      
      // Se for array com alguns itens inválidos, filtrar
      if (Array.isArray(data)) {
        const validItems = data.filter(item => item && typeof item === 'object');
        if (validItems.length > 0) {
          console.log(`✓ ${validItems.length}/${data.length} itens recuperados: ${key}`);
          return validItems;
        }
      }
      
      return null;
    } catch (e) {
      console.error(`✗ Falha ao recuperar dados: ${key}`, e);
      return null;
    }
  },

  // 🎯 Limpar dados antigos para liberar espaço
  cleanupOldData: (): void => {
    try {
      console.log('🧹 Iniciando limpeza de dados antigos...');
      
      const keys = StorageService.getAllKeys();
      const keySizes: { key: string; size: number; lastUpdated: string }[] = [];
      
      // Coletar informações de todas as chaves
      keys.forEach(key => {
        if (key === StorageKeys.METADATA || key === StorageKeys.BACKUP_TIMESTAMP) return;
        
        let size = 0;
        let lastUpdated = '';
        
        if (StorageService._isUsingMemory) {
          const data = StorageService._memoryFallback.getItem(key);
          size = data ? data.length : 0;
        } else {
          const data = StorageService._storage.getItem(key);
          size = data ? data.length : 0;
        }
        
        const metadata = StorageService._metadata.get(key);
        lastUpdated = metadata?.lastUpdated || new Date().toISOString();
        
        keySizes.push({ key, size, lastUpdated });
      });
      
      // Ordenar por data (mais antigos primeiro)
      keySizes.sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime());
      
      // Remover 20% dos dados mais antigos
      const toRemove = Math.ceil(keySizes.length * 0.2);
      let freedSpace = 0;
      
      for (let i = 0; i < toRemove && i < keySizes.length; i++) {
        const item = keySizes[i];
        StorageService.removeItem(item.key);
        freedSpace += item.size;
        console.log(`🗑 Removido: ${item.key} (${StorageService.formatBytes(item.size)})`);
      }
      
      console.log(`✓ Limpeza concluída: ${StorageService.formatBytes(freedSpace)} liberados`);
    } catch (e) {
      console.error('✗ Erro ao limpar dados antigos:', e);
    }
  },

  // 🎯 Salvar metadados
  saveMetadata: (): void => {
    try {
      const metadataObj: Record<string, any> = {};
      StorageService._metadata.forEach((value, key) => {
        metadataObj[key] = value;
      });
      
      const storage = StorageService._isUsingMemory ? StorageService._memoryFallback : StorageService._storage;
      storage.setItem(StorageKeys.METADATA, JSON.stringify(metadataObj));
    } catch (e) {
      // Ignorar erros de metadados
    }
  },

  // 🎯 Carregar metadados
  loadMetadata: (): void => {
    try {
      const storage = StorageService._isUsingMemory ? StorageService._memoryFallback : StorageService._storage;
      const data = storage.getItem(StorageKeys.METADATA);
      
      if (data) {
        const metadataObj = JSON.parse(data);
        StorageService._metadata.clear();
        
        Object.entries(metadataObj).forEach(([key, value]) => {
          StorageService._metadata.set(key, value as any);
        });
      }
    } catch (e) {
      console.warn('Erro ao carregar metadados:', e);
    }
  },

  // 🎯 Exportar todos os dados como backup
  exportAllData: (): string => {
    try {
      const allData: Record<string, any> = {};
      const keys = StorageService.getAllKeys();
      
      keys.forEach(key => {
        const data = StorageService.getData(key);
        if (data !== null) {
          allData[key] = data;
        }
      });
      
      return JSON.stringify({
        version: '3.0',
        exportDate: new Date().toISOString(),
        data: allData
      }, null, 2);
    } catch (e) {
      console.error('✗ Erro ao exportar dados:', e);
      return JSON.stringify({ error: 'Falha ao exportar' });
    }
  },

  // 🎯 Importar dados de backup
  importAllData: (backupJson: string): boolean => {
    try {
      const backup = JSON.parse(backupJson);
      
      if (!backup.data || typeof backup.data !== 'object') {
        throw new Error('Formato de backup inválido');
      }
      
      // Limpar storage atual
      StorageService.clear();
      
      // Importar todos os dados
      Object.entries(backup.data).forEach(([key, data]) => {
        StorageService.saveData(key, data);
      });
      
      console.log(`✓ Backup importado com sucesso (${Object.keys(backup.data).length} chaves)`);
      return true;
    } catch (e) {
      console.error('✗ Erro ao importar backup:', e);
      return false;
    }
  },

  // 🎯 Verificar integridade do storage
  checkIntegrity: (): { valid: boolean; issues: string[] } => {
    try {
      const issues: string[] = [];
      const keys = StorageService.getAllKeys();
      
      keys.forEach(key => {
        try {
          const data = StorageService.getData(key);
          
          if (data === null && StorageService.hasKey(key)) {
            issues.push(`Chave ${key} existe mas dados são nulos`);
          }
          
          if (data !== null && !StorageService.validateData(data)) {
            issues.push(`Chave ${key} contém dados inválidos`);
          }
        } catch (e) {
          issues.push(`Erro ao verificar chave ${key}: ${e}`);
        }
      });
      
      return {
        valid: issues.length === 0,
        issues
      };
    } catch (e) {
      return {
        valid: false,
        issues: [`Erro geral ao verificar integridade: ${e}`]
      };
    }
  },

  // 🎯 Forçar sincronização com memory storage
  syncToMemory: (): void => {
    try {
      if (StorageService._isUsingMemory) return;
      
      const keys = StorageService.getAllKeys();
      
      keys.forEach(key => {
        const data = StorageService._storage.getItem(key);
        if (data) {
          StorageService._memoryFallback.setItem(key, data);
        }
      });
      
      console.log(`✓ Sincronizado: ${keys.length} chaves para memory storage`);
    } catch (e) {
      console.error('✗ Erro ao sincronizar para memory:', e);
    }
  },

  // 🎯 Verificar se está usando memory storage
  isUsingMemoryStorage: (): boolean => {
    return StorageService._isUsingMemory;
  },

  // 🎯 Resetar para localStorage (se possível)
  resetToLocalStorage: (): boolean => {
    try {
      // Testar se localStorage está disponível agora
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Migrar dados do memory para localStorage
      const keys = StorageService.getAllKeys();
      
      keys.forEach(key => {
        const data = StorageService._memoryFallback.getItem(key);
        if (data) {
          localStorage.setItem(key, data);
        }
      });
      
      StorageService._isUsingMemory = false;
      console.log('✓ Resetado para localStorage com sucesso');
      return true;
    } catch (e) {
      console.warn('localStorage ainda não disponível:', e);
      return false;
    }
  },

  // 🎯 Obter tamanho de uma chave específica
  getKeySize: (key: string): number => {
    try {
      let data: string | null = null;
      
      if (StorageService._isUsingMemory) {
        data = StorageService._memoryFallback.getItem(key);
      } else {
        data = StorageService._storage.getItem(key);
      }
      
      return data ? data.length : 0;
    } catch (e) {
      return 0;
    }
  },

  // 🎯 Backup automático (chamado periodicamente)
  autoBackup: (): void => {
    try {
      const lastBackup = StorageService.getData(StorageKeys.BACKUP_TIMESTAMP);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      // Fazer backup a cada hora
      if (!lastBackup || (now - lastBackup) > oneHour) {
        const backupData = StorageService.exportAllData();
        
        // Salvar backup em uma chave especial
        StorageService.saveData('@lunara_auto_backup', backupData, { compress: true });
        StorageService.saveData(StorageKeys.BACKUP_TIMESTAMP, now);
        
        console.log('✓ Backup automático realizado');
      }
    } catch (e) {
      console.warn('Erro no backup automático:', e);
    }
  },

  // 🎯 Restaurar do último backup automático
  restoreFromAutoBackup: (): boolean => {
    try {
      const backupData = StorageService.getData('@lunara_auto_backup');
      
      if (!backupData) {
        console.warn('Nenhum backup automático encontrado');
        return false;
      }
      
      return StorageService.importAllData(backupData);
    } catch (e) {
      console.error('Erro ao restaurar backup automático:', e);
      return false;
    }
  },

  // 🎯 Inicializar serviço (chamar na inicialização do app)
  initialize: (): void => {
    try {
      console.log('🚀 Inicializando StorageService...');
      
      // Carregar metadados
      StorageService.loadMetadata();
      
      // Verificar integridade
      const integrity = StorageService.checkIntegrity();
      
      if (!integrity.valid) {
        console.warn('⚠ Problemas de integridade detectados:', integrity.issues);
      }
      
      // Iniciar backup automático (a cada hora)
      setInterval(() => {
        StorageService.autoBackup();
      }, 60 * 60 * 1000);
      
      // Fazer backup inicial
      StorageService.autoBackup();
      
      console.log('✓ StorageService inicializado com sucesso');
      console.log(`📊 Status: ${StorageService._isUsingMemory ? 'Memory Storage' : 'localStorage'}`);
      
      const stats = StorageService.getStats();
      console.log(`📦 Uso: ${stats.totalSizeFormatted} em ${stats.totalKeys} chaves (${stats.quotaPercentage.toFixed(1)}% da quota)`);
    } catch (e) {
      console.error('✗ Erro ao inicializar StorageService:', e);
    }
  }
};

// 🎯 Inicializar automaticamente quando importado
if (typeof window !== 'undefined') {
  // Aguardar DOM carregar completamente
  if (document.readyState === 'complete') {
    StorageService.initialize();
  } else {
    window.addEventListener('load', () => {
      StorageService.initialize();
    });
  }
}