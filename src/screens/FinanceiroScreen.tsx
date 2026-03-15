import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Agendamento, Cliente, Terapia } from '../types';

interface FinanceiroProps {
  onBack: () => void;
}

export default function FinanceiroScreen({ onBack }: FinanceiroProps) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [terapias, setTerapias] = useState<Terapia[]>([]);
  
  // Filtros
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth().toString());
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroCliente, setFiltroCliente] = useState('todos');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [agends, clis, ters] = await Promise.all([
      StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS),
      StorageService.getItems<Cliente>(StorageKeys.CLIENTES),
      StorageService.getItems<Terapia>(StorageKeys.TERAPIAS),
    ]);
    setAgendamentos(agends);
    setClientes(clis);
    setTerapias(ters);
  };

  const getClienteNome = (id: string) => clientes.find(c => c.id === id)?.nome || 'Desconhecido';
  const getTerapiaNome = (id: string) => terapias.find(t => t.id === id)?.nome || 'Desconhecida';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  // Aplicação dos filtros
  const filteredAgendamentos = agendamentos.filter(ag => {
    const date = new Date(ag.dataHora);
    const matchMes = date.getMonth().toString() === filtroMes;
    const matchAno = date.getFullYear().toString() === filtroAno;
    const matchCliente = filtroCliente === 'todos' || ag.clienteId === filtroCliente;
    
    // Consideramos apenas atendimentos não cancelados para o financeiro
    const matchStatus = ag.statusAtendimento !== 'Cancelado';

    return matchMes && matchAno && matchCliente && matchStatus;
  }).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());

  // Cálculos de Totais
  const totalRecebido = filteredAgendamentos
    .filter(ag => ag.statusPagamento === 'Pago')
    .reduce((acc, ag) => acc + ag.valorCobrado, 0);

  const totalPendente = filteredAgendamentos
    .filter(ag => ag.statusPagamento === 'Pendente')
    .reduce((acc, ag) => acc + ag.valorCobrado, 0);

  const totalBruto = totalRecebido + totalPendente;

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header */}
      <div className="pt-12 pb-4 px-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          Controle Financeiro
        </h1>
      </div>

      {/* Filtros */}
      <div className="p-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex items-center gap-2 text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
          <Filter size={16} />
          <span className="text-sm font-medium">Filtros</span>
        </div>
        
        <div className="flex gap-3">
          <select 
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="flex-1 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          >
            {meses.map((mes, index) => (
              <option key={index} value={index}>{mes}</option>
            ))}
          </select>

          <select 
            value={filtroAno}
            onChange={(e) => setFiltroAno(e.target.value)}
            className="w-24 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>

        <select 
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        >
          <option value="todos">Todos os Clientes</option>
          {clientes.filter(c => c.status).map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {filteredAgendamentos.length === 0 ? (
          <div className="text-center text-[var(--color-text-sec-light)] mt-10">
            Nenhum registro financeiro no período.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAgendamentos.map(ag => (
              <div key={ag.id} className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                      {getClienteNome(ag.clienteId)}
                    </h3>
                    <p className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">
                      {formatDate(ag.dataHora)} • {ag.terapiaIds ? ag.terapiaIds.map(tid => getTerapiaNome(tid)).filter(Boolean).join(' + ') : getTerapiaNome(ag.terapiaId)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                    ag.statusPagamento === 'Pago' 
                      ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' 
                      : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                  }`}>
                    {ag.statusPagamento}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">
                    {ag.desconto > 0 ? `Desconto: ${formatCurrency(ag.desconto)}` : 'Sem desconto'}
                  </span>
                  <span className="font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                    {formatCurrency(ag.valorCobrado)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé de Totais */}
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-t border-gray-200 dark:border-gray-800 p-4 pb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">Recebido</span>
          <span className="font-medium text-[var(--color-success)]">{formatCurrency(totalRecebido)}</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">Pendente</span>
          <span className="font-medium text-[var(--color-warning)]">{formatCurrency(totalPendente)}</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Total Bruto</span>
          <span className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totalBruto)}</span>
        </div>
      </div>
    </div>
  );
}
