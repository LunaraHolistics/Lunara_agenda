import React, { useState, useCallback, useMemo, memo } from 'react';
import { LogIn, Mail, Lock, Loader2, UserPlus, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '../AppContext';

// ======================
// TYPES E CONSTANTES
// ======================

interface LoginProps {
  onLoginSuccess: () => void;
}

type AuthMode = 'login' | 'signup';

interface AuthFormState {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const CONFIG = {
  minPasswordLength: 6,
  maxPasswordLength: 128,
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  debounceDelay: 300,
  animationDuration: 200
} as const;

// ======================
// UTILITÁRIOS PURE
// ======================

const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email.trim()) {
    return { valid: false, error: 'E-mail é obrigatório' };
  }
  if (!CONFIG.emailRegex.test(email)) {
    return { valid: false, error: 'E-mail inválido' };
  }
  return { valid: true };
};

const validatePassword = (password: string, isSignUp: boolean): { valid: boolean; error?: string; strength?: number } => {
  if (!password) {
    return { valid: false, error: 'Senha é obrigatória' };
  }
  if (password.length < CONFIG.minPasswordLength) {
    return { 
      valid: false, 
      error: `Senha deve ter pelo menos ${CONFIG.minPasswordLength} caracteres`,
      strength: Math.min(33, (password.length / CONFIG.minPasswordLength) * 33)
    };
  }
  if (password.length > CONFIG.maxPasswordLength) {
    return { valid: false, error: `Senha não pode exceder ${CONFIG.maxPasswordLength} caracteres` };
  }
  
  // Calcular força da senha (apenas para signup)
  let strength = 0;
  if (isSignUp) {
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  }
  
  return { valid: true, strength };
};

const validateConfirmPassword = (password: string, confirmPassword: string): { valid: boolean; error?: string } => {
  if (!confirmPassword) {
    return { valid: false, error: 'Confirmação de senha é obrigatória' };
  }
  if (password !== confirmPassword) {
    return { valid: false, error: 'As senhas não coincidem' };
  }
  return { valid: true };
};

const getPasswordStrengthLabel = (strength: number): { label: string; color: string } => {
  if (strength < 25) return { label: 'Muito fraca', color: 'text-red-500' };
  if (strength < 50) return { label: 'Fraca', color: 'text-orange-500' };
  if (strength < 75) return { label: 'Média', color: 'text-yellow-500' };
  if (strength < 100) return { label: 'Forte', color: 'text-green-500' };
  return { label: 'Muito forte', color: 'text-emerald-500' };
};

// ======================
// SUB-COMPONENTES MEMOIZED
// ======================

interface PasswordStrengthIndicatorProps {
  strength: number;
  show: boolean;
}

const PasswordStrengthIndicator = memo(({ strength, show }: PasswordStrengthIndicatorProps) => {
  if (!show) return null;
  
  const { label, color } = getPasswordStrengthLabel(strength);
  
  return (
    <div className="mt-2" aria-label={`Força da senha: ${label}`}>
      <div className="flex gap-1 mb-1">
        {[0, 25, 50, 75].map((threshold, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-all duration-200 ${
              strength >= threshold ? 'bg-current' : 'bg-gray-200 dark:bg-gray-700'
            } ${color}`}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${color}`} role="status" aria-live="polite">
        {label}
      </p>
    </div>
  );
});
PasswordStrengthIndicator.displayName = 'PasswordStrengthIndicator';

interface AuthInputProps {
  id: string;
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  showPasswordToggle?: boolean;
  children?: React.ReactNode;
}

const AuthInput = memo(({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
  error,
  required = false,
  autoComplete,
  showPasswordToggle = false,
  children
}: AuthInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = showPasswordToggle && showPassword ? 'text' : type;
  
  return (
    <div>
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true">
          {icon}
        </div>
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-10 pr-${showPasswordToggle ? '10' : '4'} py-2 bg-gray-50 dark:bg-zinc-800 border rounded-xl outline-none focus:ring-2 focus:ring-[#006699] text-gray-900 dark:text-white transition-all ${
            error 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-200 dark:border-zinc-700'
          }`}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#006699] rounded"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p 
          id={`${id}-error`}
          className="mt-1 text-xs text-red-500 flex items-center gap-1"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </p>
      )}
      {children}
    </div>
  );
});
AuthInput.displayName = 'AuthInput';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage = memo(({ message }: ErrorMessageProps) => {
  if (!message) return null;
  
  return (
    <div 
      className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-2"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
});
ErrorMessage.displayName = 'ErrorMessage';

// ======================
// HOOK: useAuthForm
// ======================

interface UseAuthFormProps {
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  onLoginSuccess: () => void;
}

const useAuthForm = ({ showNotification, onLoginSuccess }: UseAuthFormProps) => {
  const [form, setForm] = useState<AuthFormState>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);

  const updateField = useCallback((field: keyof AuthFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
    
    // Update password strength
    if (field === 'password' && isSignUp) {
      const validation = validatePassword(value, true);
      setPasswordStrength(validation.strength || 0);
    }
  }, [errors, isSignUp]);

  const toggleMode = useCallback(() => {
    setIsSignUp(prev => !prev);
    setForm({ email: '', password: '', confirmPassword: '' });
    setErrors({});
    setPasswordStrength(0);
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    
    const emailValidation = validateEmail(form.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error;
    }
    
    const passwordValidation = validatePassword(form.password, isSignUp);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.error;
    }
    
    if (isSignUp) {
      const confirmValidation = validateConfirmPassword(form.password, form.confirmPassword);
      if (!confirmValidation.valid) {
        newErrors.confirmPassword = confirmValidation.error;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, isSignUp]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      // Focus first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.focus();
      }
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      // Simular delay de autenticação
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Login bypass for local-first (mantido do original)
      showNotification('Acesso local liberado!', 'success');
      onLoginSuccess();
      
    } catch (err: any) {
      const errorMessage = err.message || 'Erro desconhecido';
      setErrors({ general: `Falha no login: ${errorMessage}` });
      showNotification(`Falha no login: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [validate, errors, showNotification, onLoginSuccess]);

  return {
    form,
    errors,
    loading,
    isSignUp,
    passwordStrength,
    updateField,
    toggleMode,
    handleSubmit
  };
};

// ======================
// COMPONENTE PRINCIPAL
// ======================

export default function Login({ onLoginSuccess }: LoginProps) {
  const { showNotification } = useAppContext();
  
  const {
    form,
    errors,
    loading,
    isSignUp,
    passwordStrength,
    updateField,
    toggleMode,
    handleSubmit
  } = useAuthForm({ showNotification, onLoginSuccess });

  // 🎯 Memoização
  const title = useMemo(() => isSignUp ? 'Criar Conta' : 'Lunara Agenda', [isSignUp]);
  const subtitle = useMemo(() => 
    isSignUp 
      ? 'Cadastre-se para sincronizar seus dados.' 
      : 'Entre para sincronizar seus atendimentos.',
    [isSignUp]
  );
  const buttonText = useMemo(() => {
    if (loading) return 'Processando...';
    return isSignUp ? 'Criar Conta' : 'Entrar';
  }, [loading, isSignUp]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
      <main 
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-zinc-800"
        role="main"
        aria-labelledby="auth-title"
      >
        {/* Header */}
        <header className="flex flex-col items-center mb-8">
          <div 
            className="w-16 h-16 bg-[#006699] rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg"
            aria-hidden="true"
          >
            {isSignUp ? <UserPlus size={32} /> : <LogIn size={32} />}
          </div>
          <h1 id="auth-title" className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 text-center">
            {subtitle}
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <AuthInput
            id="email"
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(value) => updateField('email', value)}
            placeholder="seu@email.com"
            icon={<Mail size={18} />}
            error={errors.email}
            required
            autoComplete="email"
          />

          {/* Password */}
          <AuthInput
            id="password"
            label="Senha"
            type="password"
            value={form.password}
            onChange={(value) => updateField('password', value)}
            placeholder="••••••••"
            icon={<Lock size={18} />}
            error={errors.password}
            required
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            showPasswordToggle
          >
            {isSignUp && (
              <PasswordStrengthIndicator 
                strength={passwordStrength} 
                show={form.password.length > 0} 
              />
            )}
          </AuthInput>

          {/* Confirm Password (apenas signup) */}
          {isSignUp && (
            <AuthInput
              id="confirmPassword"
              label="Confirmar Senha"
              type="password"
              value={form.confirmPassword}
              onChange={(value) => updateField('confirmPassword', value)}
              placeholder="••••••••"
              icon={<Lock size={18} />}
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
              showPasswordToggle
            />
          )}

          {/* General Error */}
          <ErrorMessage message={errors.general || ''} />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#006699] text-white rounded-xl font-semibold shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#006699] focus:ring-offset-2"
            aria-label={buttonText}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                <span>Processando...</span>
              </>
            ) : isSignUp ? (
              <>
                <UserPlus size={20} aria-hidden="true" />
                <span>Criar Conta</span>
              </>
            ) : (
              <>
                <LogIn size={20} aria-hidden="true" />
                <span>Entrar</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <footer className="mt-6 text-center space-y-4">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-[#006699] font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-[#006699] rounded px-2 py-1"
            aria-label={isSignUp ? 'Ir para login' : 'Ir para cadastro'}
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
          </button>
          
          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-xs text-gray-400">
              Suporte: <a 
                href="mailto:celsot.holistics@gmail.com" 
                className="text-[#006699] hover:underline focus:outline-none focus:ring-2 focus:ring-[#006699] rounded"
                aria-label="Enviar email para suporte"
              >
                celsot.holistics@gmail.com
              </a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}