/**
 * Verifica se uma data é hoje
 */
export const isToday = (date: Date | string): boolean => {
  const today = new Date();
  const checkDate = new Date(date);
  
  return (
    today.getFullYear() === checkDate.getFullYear() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getDate() === checkDate.getDate()
  );
};

/**
 * Verifica se uma data é amanhã
 */
export const isTomorrow = (date: Date | string): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const checkDate = new Date(date);
  
  return (
    tomorrow.getFullYear() === checkDate.getFullYear() &&
    tomorrow.getMonth() === checkDate.getMonth() &&
    tomorrow.getDate() === checkDate.getDate()
  );
};

/**
 * Verifica se uma data está no passado
 */
export const isPast = (date: Date | string): boolean => {
  return new Date(date) < new Date();
};

/**
 * Verifica se uma data está no futuro
 */
export const isFuture = (date: Date | string): boolean => {
  return new Date(date) > new Date();
};

/**
 * Calcula diferença em dias entre duas datas
 */
export const daysBetween = (date1: Date | string, date2: Date | string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Adiciona dias a uma data
 */
export const addDays = (date: Date | string, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Adiciona meses a uma data
 */
export const addMonths = (date: Date | string, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * Obtém o primeiro dia do mês
 */
export const getFirstDayOfMonth = (date: Date | string): Date => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * Obtém o último dia do mês
 */
export const getLastDayOfMonth = (date: Date | string): Date => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

/**
 * Verifica se duas datas são do mesmo mês
 */
export const isSameMonth = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth()
  );
};

/**
 * Formata data relativa (hoje, ontem, há X dias)
 */
export const formatRelativeDate = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Há ${Math.floor(diffDays / 30)} meses`;
  
  return `Há ${Math.floor(diffDays / 365)} anos`;
};

/**
 * Obtém nome do mês em português
 */
export const getMonthName = (month: number): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month];
};

/**
 * Obtém nome do dia da semana em português
 */
export const getDayName = (day: number): string => {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[day];
};