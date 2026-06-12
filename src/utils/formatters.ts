/**
 * Formata valor monetário em BRL
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Formata data para padrão brasileiro
 */
export const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr + 'T12:00:00'); // Evita problemas de fuso
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
};

/**
 * Formata data e hora para padrão brasileiro
 */
export const formatDateTimeBR = (dateStr: string, timeStr?: string): string => {
  if (!dateStr) return '';
  
  try {
    const dateTimeStr = timeStr ? `${dateStr}T${timeStr}` : dateStr;
    const date = new Date(dateTimeStr);
    return date.toLocaleString('pt-BR');
  } catch {
    return dateStr;
  }
};

/**
 * Formata duração em minutos para formato legível
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

/**
 * Formata número com separadores de milhar
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

/**
 * Formata porcentagem
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Trunca texto com ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Formata nome para exibição (primeiro nome)
 */
export const formatFirstName = (fullName: string): string => {
  if (!fullName) return '';
  return fullName.split(' ')[0];
};

/**
 * Formata iniciais do nome
 */
export const formatInitials = (fullName: string): string => {
  if (!fullName) return '';
  
  const names = fullName.trim().split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};