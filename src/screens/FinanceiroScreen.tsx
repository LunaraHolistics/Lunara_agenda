import React, { useState, useMemo } from 'react';
import { ArrowLeft, Filter, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { Transacao } from '../types';

interface FinanceiroProps {
  onBack: () => void;
}

export default function FinanceiroScreen({ onBack }: FinanceiroProps) {
  const { transacoes, clientes } = useAppContext();
  
  // Filtros
  const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth()));
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Receita' | 'Despesa'>('Todos');

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const filteredTransacoes = useMemo(() => {
    return transacoes.filter(t => {
      const date = new Date(t.data + 'T12:00:00'); // Evitar problemas de fuso horário
      const matchMes = String(date.getMonth()) === filtroMes;
      const matchAno = String(date.getFullYear()) === filtroAno;
      const matchTipo = filtroTipo === 'Todos' || t.tipo === filtroTipo;
      
      return matchMes && matchAno && matchTipo;
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [transacoes, filtroMes, filtroAno, filtroTipo]);

  const stats = useMemo(() => {
    const receitas = filteredTransacoes
      .filter(t => t.tipo === 'Receita' && t.status === 'Pago')
      .reduce((acc, t) => acc + t.valor, 0);
      
    const despesas = filteredTransacoes
      .filter(t => t.tipo === 'Despesa' && t.status === 'Pago')
      .reduce((acc, t) => acc + t.valor, 0);
      
    const pendente = filteredTransacoes
      .filter(t => t.status === 'Pendente')
      .reduce((acc, t) => acc + t.valor, 0);

    return { receitas, despesas, saldo: receitas - despesas, pendente };
  }, [filteredTransacoes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <div className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          Fluxo de Caixa
        </h1>
      </div>

      {/* Resumo de Cards */}
      <div className="p-4 grid grid-cols-2 gap-3 shrink-0">
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-success)] mb-1">
            <TrendingUp size={16} />
            <span className="text-[10px] font-bold uppercase">Receitas</span>
          </div>
          <p className="text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {formatCurrency(stats.receitas)}
          </p>
        </div>
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-error)] mb-1">
            <TrendingDown size={16} />
            <span className="text-[10px] font-bold uppercase">Despesas</span>
          </div>
          <p className="text-lg font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {formatCurrency(stats.despesas)}
          </p>
        </div>
        <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm col-span-2 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-[var(--color-primary)] mb-1">
              <DollarSign size={16} />
              <span className="text-[10px] font-bold uppercase">Saldo Líquido</span>
            </div>
            <p className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              {formatCurrency(stats.saldo)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-[var(--color-warning)] block mb-1">A Receber</span>
            <p className="text-sm font-bold text-[var(--color-warning)]">
              {formatCurrency(stats.pendente)}
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 pb-4 space-y-3 shrink-0">
        <div className="flex gap-2">
          <select 
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="flex-1 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none"
          >
            {meses.map((mes, index) => (
              <option key={index} value={index}>{mes}</option>
            ))}
          </select>
          <select 
            value={filtroAno}
            onChange={(e) => setFiltroAno(e.target.value)}
            className="w-24 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          {['Todos', 'Receita', 'Despesa'].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo as any)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                filtroTipo === tipo 
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md' 
                  : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-gray-500 border-gray-200 dark:border-gray-800'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {filteredTransacoes.length === 0 ? (
          <div className="text-center py-12 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl border border-dashed border-gray-300 dark:border-gray-800">
            <p className="text-gray-500 text-sm">Nenhuma transação neste período.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransacoes.map(t => (
              <div key={t.id} className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    t.tipo === 'Receita' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-error)]/10 text-[var(--color-error)]'
                  }`}>
                    {t.tipo === 'Receita' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] leading-tight">
                      {t.descricao}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(t.data)}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md">
                        {t.metodo || 'PIX'}
                      </span>
                      {t.status === 'Pendente' && (
                        <span className="text-[10px] font-bold text-[var(--color-warning)] px-1.5 py-0.5 bg-[var(--color-warning)]/10 rounded-md">
                          PENDENTE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${t.tipo === 'Receita' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                    {t.tipo === 'Receita' ? '+' : '-'}{formatCurrency(t.valor)}
                  </p>
                  <p className="text-[10px] text-gray-400">{t.categoria}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
