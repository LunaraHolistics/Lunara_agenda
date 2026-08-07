import React, { useState } from 'react';
// import { supabase } from '../supabaseClient';
import { LogIn, Mail, Lock, Loader2, UserPlus } from 'lucide-react';
import { useAppContext } from '../AppContext';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const { showNotification, setStatusMsg } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusMsg(null);

    try {
      // Login bypass for local-first
      showNotification('Acesso local liberado!', 'success');
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message);
      setStatusMsg("Falha no login: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-zinc-800">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#006699] rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isSignUp ? 'Criar Conta' : 'Lunara Agenda'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 text-center">
            {isSignUp 
              ? 'Cadastre-se para sincronizar seus dados.' 
              : 'Entre para sincronizar seus atendimentos.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-[#006699] text-gray-900 dark:text-white"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-[#006699] text-gray-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#006699] text-white rounded-xl font-semibold shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : isSignUp ? (
              <>
                <UserPlus size={20} />
                Criar Conta
              </>
            ) : (
              <>
                <LogIn size={20} />
                Entrar
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-[#006699] font-medium hover:underline"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
          </button>
          
          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-xs text-gray-400">
              Suporte: celsot.holistics@gmail.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
