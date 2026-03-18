import React, { useState, useMemo } from 'react';
import { ArrowLeft, Filter, TrendingUp, TrendingDown, DollarSign, Calendar, X, Save, Plus } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { Transacao } from '../types';

interface FinanceiroProps {
  onBack: () => void;
}

export default function FinanceiroScreen({ onBack }: FinanceiroProps) {
  const { 
    transacoes, 
    despesas,
    clientes, 
    pacotes,
    updateTransacao, 
    deleteTransacao, 
    addDespesa,
    deleteDespesa,
    confirmAction, 
    showNotification 
  } = useAppContext();
  
  // Filtros
  const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth()));
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Receita' | 'Despesa'>('Todos');

  // Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddDespesaModalOpen, setIsAddDespesaModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transacao>>({});
  const [newDespesa, setNewDespesa] = useState({
    descricao: '',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    categoria: 'Outros' as any,
    formaPagamento: 'PIX',
    observacao: ''
  });

  const handleEditClick = (t: Transacao) => {
    setEditingTransaction({ ...t });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTransaction.id || !editingTransaction.descricao || !editingTransaction.valor) {
      showNotification('Preencha os campos obrigatórios.', 'error');
      return;
    }
    updateTransacao(editingTransaction as Transacao);
    showNotification('Transação atualizada com sucesso!', 'success');
    setIsEditModalOpen(false);
  };

  const handleSaveDespesa = () => {
    if (!newDespesa.descricao || !newDespesa.valor || !newDespesa.data) {
      showNotification('Preencha os campos obrigatórios.', 'error');
      return;
    }
    addDespesa(newDespesa);
    showNotification('Despesa registrada com sucesso!', 'success');
    setIsAddDespesaModalOpen(false);
    setNewDespesa({
      descricao: '',
      valor: 0,
      data: new Date().toISOString().split('T')[0],
      categoria: 'Outros',
      formaPagamento: 'PIX',
      observacao: ''
    });
  };

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const filteredTransacoes = useMemo(() => {
    const combined = [
      ...(transacoes || []).map(t => ({ ...t, isDespesaState: false })),
      ...(despesas || []).map(d => ({ ...d, tipo: 'Despesa' as const, status: 'Pago' as const, isDespesaState: true }))
    ];

    return combined.filter(t => {
      // Orphan filter: se tiver pacoteId, o pacote deve existir
      if ('pacoteId' in t && t.pacoteId && !(pacotes || []).some(p => p.id === t.pacoteId)) return false;

      const date = new Date(t.data + 'T12:00:00'); // Evitar problemas de fuso horário
      const matchMes = String(date.getMonth()) === filtroMes;
      const matchAno = String(date.getFullYear()) === filtroAno;
      const matchTipo = filtroTipo === 'Todos' || t.tipo === filtroTipo;
      
      return matchMes && matchAno && matchTipo;
    }).sort((a, b) => {
      // 1. Priorizar Pendentes (Contas a Receber)
      if (a.status === 'Pendente' && b.status !== 'Pendente') return -1;
      if (a.status !== 'Pendente' && b.status === 'Pendente') return 1;

      // 2. Se ambos forem Pendentes, ordenar por data ASC (mais antigo/vencido primeiro)
      if (a.status === 'Pendente' && b.status === 'Pendente') {
        return new Date(a.data).getTime() - new Date(b.data).getTime();
      }

      // 3. Se ambos forem Pagos/Despesas, ordenar por data DESC (mais recente primeiro)
      return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
  }, [transacoes, despesas, pacotes, filtroMes, filtroAno, filtroTipo]);

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
        <h1 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex-1">
          Fluxo de Caixa
        </h1>
        <button 
          onClick={() => setIsAddDespesaModalOpen(true)}
          className="bg-[var(--color-error)] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Despesa
        </button>
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
                <div className="text-right flex flex-col items-end">
                  <p className={`font-bold ${t.tipo === 'Receita' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                    {t.tipo === 'Receita' ? '+' : '-'}{formatCurrency(t.valor)}
                  </p>
                  <p className="text-[10px] text-gray-400">{t.categoria}</p>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => handleEditClick(t)}
                      className="text-[10px] text-blue-500 font-bold uppercase"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => {
                        if ((t as any).isDespesaState) {
                          confirmAction('Deseja excluir esta despesa?', () => {
                            deleteDespesa(t.id);
                            showNotification('Despesa excluída!', 'success');
                          }, { isDanger: true });
                        } else {
                          confirmAction('Tem certeza que deseja excluir esta transação?', () => {
                            deleteTransacao(t.id);
                            showNotification('Transação excluída!', 'success');
                          }, { isDanger: true });
                        }
                      }}
                      className="text-[10px] text-red-500 font-bold uppercase"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Adicionar Despesa */}
      {isAddDespesaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                Nova Despesa
              </h2>
              <button onClick={() => setIsAddDespesaModalOpen(false)} className="text-gray-400 p-1">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Descrição</label>
                <input 
                  type="text" 
                  placeholder="Ex: Aluguel, Materiais..."
                  value={newDespesa.descricao}
                  onChange={e => setNewDespesa({...newDespesa, descricao: e.target.value})}
                  className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0,00"
                    value={newDespesa.valor || ''}
                    onChange={e => setNewDespesa({...newDespesa, valor: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Data</label>
                  <input 
                    type="date" 
                    value={newDespesa.data}
                    onChange={e => setNewDespesa({...newDespesa, data: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Categoria</label>
                  <select 
                    value={newDespesa.categoria}
                    onChange={e => setNewDespesa({...newDespesa, categoria: e.target.value as any})}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                  >
                    <option value="Material">Material</option>
                    <option value="Ferramenta">Ferramenta</option>
                    <option value="Fixo">Fixo</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Pagamento</label>
                  <select 
                    value={newDespesa.formaPagamento}
                    onChange={e => setNewDespesa({...newDespesa, formaPagamento: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleSaveDespesa}
                className="w-full py-4 bg-[var(--color-error)] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity mt-4 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Cadastrar Despesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                Editar Transação
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 p-1">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={editingTransaction.descricao || ''}
                  onChange={e => setEditingTransaction({...editingTransaction, descricao: e.target.value})}
                  className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingTransaction.valor || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, valor: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Data</label>
                  <input 
                    type="date" 
                    value={editingTransaction.data || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, data: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Categoria</label>
                  <input 
                    type="text" 
                    value={editingTransaction.categoria || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, categoria: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Método</label>
                  <select 
                    value={editingTransaction.metodo || 'PIX'}
                    onChange={e => setEditingTransaction({...editingTransaction, metodo: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Débito">Débito</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Tipo</label>
                  <select 
                    value={editingTransaction.tipo || 'Receita'}
                    onChange={e => setEditingTransaction({...editingTransaction, tipo: e.target.value as 'Receita' | 'Despesa'})}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                  >
                    <option value="Receita">Receita</option>
                    <option value="Despesa">Despesa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Status</label>
                  <select 
                    value={editingTransaction.status || 'Pago'}
                    onChange={e => setEditingTransaction({...editingTransaction, status: e.target.value as 'Pago' | 'Pendente'})}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none border border-gray-100 dark:border-gray-800"
                  >
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleSaveEdit}
                className="w-full py-4 bg-[var(--color-primary)] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity mt-4 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
