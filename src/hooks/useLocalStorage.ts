import { useState, useEffect } from 'react';

/**
 * Hook para persistência em localStorage com tipagem
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State para armazenar o valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Erro ao ler localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Setter que persiste no localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Erro ao salvar localStorage key "${key}":`, error);
    }
  };

  // Listener para mudanças em outras abas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Erro ao sincronizar localStorage key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}

/**
 * Hook para localStorage com validação
 */
export function useValidatedLocalStorage<T>(
  key: string,
  initialValue: T,
  validator: (value: any) => value is T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      const parsed = item ? JSON.parse(item) : null;
      
      if (parsed && validator(parsed)) {
        return parsed;
      }
      
      return initialValue;
    } catch (error) {
      console.error(`Erro ao ler localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      if (!validator(valueToStore)) {
        console.error(`Valor inválido para localStorage key "${key}"`);
        return;
      }
      
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Erro ao salvar localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Hook para localStorage com expiração
 */
export function useExpiringLocalStorage<T>(
  key: string,
  initialValue: T,
  expirationMs: number = 24 * 60 * 60 * 1000 // 24 horas
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      
      const { value, timestamp } = JSON.parse(item);
      const now = Date.now();
      
      if (now - timestamp > expirationMs) {
        window.localStorage.removeItem(key);
        return initialValue;
      }
      
      return value;
    } catch (error) {
      console.error(`Erro ao ler localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      window.localStorage.setItem(
        key,
        JSON.stringify({
          value: valueToStore,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      console.error(`Erro ao salvar localStorage key "${key}":`, error);
    }
  };

  const clearValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Erro ao limpar localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, clearValue];
}