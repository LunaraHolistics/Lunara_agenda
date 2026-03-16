import React, { useState, useEffect } from 'react';
import { ChevronLeft, BarChart2, DollarSign, Calendar, User, Activity, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../AppContext';

interface RelatoriosScreenProps {
  onBack: () => void;
}

export default function RelatoriosScreen({ onBack }: RelatoriosScreenProps) {
  const { agendamentos, pacotes, clientes, terapias, bloqueios, loading: contextLoading } = useAppContext();
  const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth()));
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));

  const formatSafe = (d: any) => {
    const date = new Date(d);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  if (contextLoading) {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mb-4"></div>
        <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] font-medium">
          Carregando Relatórios...
        </p>
      </div>
    );
  }

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Filtering logic using formatSafe
  const filteredAgendamentos = agendamentos.filter(ag => {
    const date = formatSafe(ag.date);
    return String(date.getMonth()) === filtroMes && String(date.getFullYear()) === filtroAno;
  });

  const filteredPacotes = pacotes.filter(p => {
    // mesReferencia is YYYY-MM
    if (!p.mesReferencia) return false;
    const [year, month] = p.mesReferencia.split('-');
    return year === filtroAno && String(parseInt(month) - 1) === filtroMes;
  });

  // Totals calculation
  const totalPacotes = filteredPacotes.reduce((acc, p) => acc + (Number(p?.valorFinal) || 0), 0);
  const totalAvulsos = filteredAgendamentos
    .filter(ag => !ag.package_id)
    .reduce((acc, ag) => {
      const terapia = terapias.find(t => t.id === ag.therapy_item_id);
      return acc + (Number(terapia?.price) || Number(ag.valorCobrado) || 0);
    }, 0);

  const totalGeral = totalPacotes + totalAvulsos;

  const getClienteNome = (id: string) => {
    const cli = clientes.find(c => String(c.id) === String(id));
    return cli?.name || cli?.nome || 'Desconhecido';
  };
  const getTerapiaNome = (ag: any) => {
    const terapia = terapias.find(t => String(t.id) === String(ag.therapy_item_id));
    return terapia?.name || terapia?.nome || ag.therapy_name || "Sem nome";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <div className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          Relatórios e Estatísticas
        </h1>
      </div>

      {/* Filtros */}
      <div className="p-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex gap-3">
        <select 
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="flex-1 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none"
        >
          {meses.map((mes, index) => (
            <option key={index} value={index}>{mes}</option>
          ))}
        </select>

        <select 
          value={filtroAno}
          onChange={(e) => setFiltroAno(e.target.value)}
          className="w-24 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none"
        >
          {[...Array(5)].map((_, i) => {
            const year = new Date().getFullYear() - 2 + i;
            return <option key={year} value={year}>{year}</option>;
          })}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pacotes</p>
            <h3 className="text-2xl font-bold text-[var(--color-primary)]">{formatCurrency(totalPacotes)}</h3>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avulsos</p>
            <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(totalAvulsos)}</h3>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Geral</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalGeral)}</h3>
          </div>
        </div>

        {/* Atendimentos do Período */}
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Atendimentos do Período</h3>
        <div className="space-y-3">
          {filteredAgendamentos.length === 0 ? (
            <div className="py-10 text-center text-gray-400 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
              Nenhum atendimento encontrado para este período.
            </div>
          ) : (
            filteredAgendamentos.map(ag => (
              <div key={ag.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500">
                  <User size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white">{getClienteNome(ag.client_id)}</h4>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Activity size={12} />
                    {getTerapiaNome(ag)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(ag.valorCobrado ?? 0)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {formatSafe(ag.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bloqueios do Período */}
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-8 mb-4 px-1">Bloqueios do Período</h3>
        <div className="space-y-3">
          {bloqueios.filter(b => {
             const date = formatSafe(b.data); // Using 'data' field as requested
             return String(date.getMonth()) === filtroMes && String(date.getFullYear()) === filtroAno;
          }).length === 0 ? (
            <div className="py-10 text-center text-gray-400 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
              Nenhum bloqueio encontrado para este período.
            </div>
          ) : (
            bloqueios.filter(b => {
              const date = formatSafe(b.data);
              return String(date.getMonth()) === filtroMes && String(date.getFullYear()) === filtroAno;
            }).map(b => (
              <div key={b.id} className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 dark:text-red-300">{b.motivo || 'Bloqueio de Agenda'}</h4>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    {b.hora_inicio} - {b.hora_fim}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-red-400 font-bold">
                    {formatSafe(b.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
