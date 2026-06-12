// ======================
// VALIDADORES CENTRALIZADOS
// ======================

/**
 * Valida formato de email
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email.trim()) {
    return { valid: false, error: 'E-mail é obrigatório' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'E-mail inválido' };
  }
  
  return { valid: true };
};

/**
 * Valida senha com força mínima
 */
export const validatePassword = (
  password: string, 
  options: { minLength?: number; requireStrength?: boolean } = {}
): { valid: boolean; error?: string; strength?: number } => {
  const { minLength = 6, requireStrength = false } = options;
  
  if (!password) {
    return { valid: false, error: 'Senha é obrigatória' };
  }
  
  if (password.length < minLength) {
    return { 
      valid: false, 
      error: `Senha deve ter pelo menos ${minLength} caracteres`,
      strength: Math.min(33, (password.length / minLength) * 33)
    };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Senha não pode exceder 128 caracteres' };
  }
  
  // Calcular força da senha
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  
  if (requireStrength && strength < 50) {
    return { 
      valid: false, 
      error: 'Senha muito fraca. Use letras maiúsculas, números e símbolos.',
      strength
    };
  }
  
  return { valid: true, strength };
};

/**
 * Valida confirmação de senha
 */
export const validateConfirmPassword = (
  password: string, 
  confirmPassword: string
): { valid: boolean; error?: string } => {
  if (!confirmPassword) {
    return { valid: false, error: 'Confirmação de senha é obrigatória' };
  }
  
  if (password !== confirmPassword) {
    return { valid: false, error: 'As senhas não coincidem' };
  }
  
  return { valid: true };
};

/**
 * Valida CPF brasileiro (algoritmo oficial)
 */
export const validateCPF = (cpf: string): { valid: boolean; error?: string } => {
  if (!cpf) return { valid: true }; // CPF é opcional
  
  // Remove formatação
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return { valid: false, error: 'CPF deve ter 11 dígitos' };
  }
  
  // Verifica se não é sequência repetida
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return { valid: false, error: 'CPF inválido' };
  }
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  if (digit1 !== parseInt(cleanCPF[9]) || digit2 !== parseInt(cleanCPF[10])) {
    return { valid: false, error: 'CPF inválido' };
  }
  
  return { valid: true };
};

/**
 * Valida CNPJ brasileiro
 */
export const validateCNPJ = (cnpj: string): { valid: boolean; error?: string } => {
  if (!cnpj) return { valid: true }; // CNPJ é opcional
  
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) {
    return { valid: false, error: 'CNPJ deve ter 14 dígitos' };
  }
  
  // Verifica se não é sequência repetida
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
    return { valid: false, error: 'CNPJ inválido' };
  }
  
  // Validação dos dígitos verificadores
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights1[i];
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights2[i];
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  if (digit1 !== parseInt(cleanCNPJ[12]) || digit2 !== parseInt(cleanCNPJ[13])) {
    return { valid: false, error: 'CNPJ inválido' };
  }
  
  return { valid: true };
};

/**
 * Valida telefone brasileiro
 */
export const validatePhone = (phone: string, ddi: string = '+55'): { valid: boolean; error?: string } => {
  if (!phone) return { valid: true }; // Telefone é opcional
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (ddi === '+55') {
    // Brasil: 10 ou 11 dígitos (com DDD)
    if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
      return { valid: false, error: 'Telefone brasileiro deve ter 10 ou 11 dígitos' };
    }
    
    // Verifica se DDD é válido (11-99)
    const ddd = parseInt(cleanPhone.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
      return { valid: false, error: 'DDD inválido' };
    }
  } else {
    // Internacional: 7-15 dígitos
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      return { valid: false, error: 'Telefone internacional deve ter 7-15 dígitos' };
    }
  }
  
  return { valid: true };
};

/**
 * Valida data no formato ISO (YYYY-MM-DD)
 */
export const validateDate = (date: string): { valid: boolean; error?: string } => {
  if (!date) {
    return { valid: false, error: 'Data é obrigatória' };
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { valid: false, error: 'Formato de data inválido (YYYY-MM-DD)' };
  }
  
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: 'Data inválida' };
  }
  
  return { valid: true };
};

/**
 * Valida hora no formato HH:mm
 */
export const validateTime = (time: string): { valid: boolean; error?: string } => {
  if (!time) {
    return { valid: false, error: 'Horário é obrigatório' };
  }
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return { valid: false, error: 'Formato de horário inválido (HH:mm)' };
  }
  
  return { valid: true };
};

/**
 * Valida valor monetário
 */
export const validateCurrency = (
  value: number, 
  options: { min?: number; max?: number; required?: boolean } = {}
): { valid: boolean; error?: string } => {
  const { min = 0, max = 999999.99, required = true } = options;
  
  if (required && (!value || value <= 0)) {
    return { valid: false, error: 'Valor é obrigatório' };
  }
  
  if (value < min) {
    return { valid: false, error: `Valor mínimo: R$ ${min.toFixed(2)}` };
  }
  
  if (value > max) {
    return { valid: false, error: `Valor máximo: R$ ${max.toFixed(2)}` };
  }
  
  return { valid: true };
};

/**
 * Valida URL
 */
export const validateURL = (url: string): { valid: boolean; error?: string } => {
  if (!url) return { valid: true }; // URL é opcional
  
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'URL inválida' };
  }
};

/**
 * Valida campo obrigatório genérico
 */
export const validateRequired = (
  value: any, 
  fieldName: string
): { valid: boolean; error?: string } => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { valid: false, error: `${fieldName} é obrigatório` };
  }
  
  return { valid: true };
};

/**
 * Valida comprimento de string
 */
export const validateLength = (
  value: string, 
  options: { min?: number; max?: number; fieldName?: string }
): { valid: boolean; error?: string } => {
  const { min, max, fieldName = 'Campo' } = options;
  
  if (min && value.length < min) {
    return { valid: false, error: `${fieldName} deve ter pelo menos ${min} caracteres` };
  }
  
  if (max && value.length > max) {
    return { valid: false, error: `${fieldName} não pode exceder ${max} caracteres` };
  }
  
  return { valid: true };
};

/**
 * Valida múltiplos campos de uma vez
 */
export const validateForm = <T extends Record<string, any>>(
  formData: T,
  validators: Record<keyof T, (value: any) => { valid: boolean; error?: string }>
): { valid: boolean; errors: Partial<Record<keyof T, string>> } => {
  const errors: Partial<Record<keyof T, string>> = {};
  
  for (const field in validators) {
    const result = validators[field](formData[field]);
    if (!result.valid && result.error) {
      errors[field] = result.error;
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Formata CPF para exibição
 */
export const formatCPF = (cpf: string): string => {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata CNPJ para exibição
 */
export const formatCNPJ = (cnpj: string): string => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Formata telefone brasileiro para exibição
 */
export const formatPhoneBR = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};