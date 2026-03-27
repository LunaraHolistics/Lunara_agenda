import React, { useState, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, X, Save, Plus, Briefcase, Activity, CheckCircle, Clock, Tag } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { Transacao } from '../types';

interface FreelancerProps {
  onBack: () => void;
}

export default function FreelancerScreen({ onBack }: FreelancerProps) {
  const { 
    transacoes, 
    despesas,
    addTransacao,
    addDespesa,
    updateTransacao, 
    updateDespesa,
    deleteTransacao, 
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Receita' | 'Despesa'>('Receita');
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transacao>>({});
  const [formData, setFormData] = useState({
    descricao: '',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    categoria: 'Freelancer',
    metodo: 'PIX',
    status: 'Pago' as 'Pago' | 'Pendente'
  });

  const handleEditClick = (t: any) => {
    setEditingTransaction({ ...t });
    setIsEditModalOpen(true);
  };

  const handleSave = (data: any) => {
    if (!data.descricao || !data.valor || !data.data) {
      showNotification('Preencha os campos obrigatórios.', 'error');
      return;
    }

    if (data.id) {
      // Lógica de Edição (Update)
      const { isDespesaState, ...transactionData } = data;
      
      if (isDespesaState) {
        updateDespesa(transactionData as any);
      } else {
        updateTransacao(transactionData as Transacao);
      }
      showNotification('Alteração salva com sucesso!', 'success');
      setIsEditModalOpen(false);
    } else {
      // Lógica de Novo (Insert)
      if (modalType === 'Receita') {
        addTransacao({
          ...data,
          tipo: 'Receita',
          segmento: 'freelancer'
        });
      } else {
        addDespesa({
          ...data,
          formaPagamento: data.metodo,
          segmento: 'freelancer'
        });
      }
      showNotification(`${modalType} registrada com sucesso!`, 'success');
      setIsAddModalOpen(false);
      setFormData({
        descricao: '',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        categoria: 'Freelancer',
        metodo: 'PIX',
        status: 'Pago'
      });
    }
  };

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Cálculos para o Card Unificado
  const unifiedStats = useMemo(() => {
    const holisticaReceitas = (transacoes || [])
      .filter(t => (!t.segmento || t.segmento === 'holistica') && t.tipo === 'Receita' && t.status === 'Pago')
      .reduce((acc, t) => acc + t.valor, 0);
    const holisticaDespesas = (despesas || [])
      .filter(d => !d.segmento || d.segmento === 'holistica')
      .reduce((acc, d) => acc + d.valor, 0);
    
    const freelancerReceitas = (transacoes || [])
      .filter(t => t.segmento === 'freelancer' && t.tipo === 'Receita' && t.status === 'Pago')
      .reduce((acc, t) => acc + t.valor, 0);
    const freelancerDespesas = (despesas || [])
      .filter(d => d.segmento === 'freelancer')
      .reduce((acc, d) => acc + d.valor, 0);

    const saldoHolistica = holisticaReceitas - holisticaDespesas;
    const saldoFreelancer = freelancerReceitas - freelancerDespesas;

    return {
      holistica: saldoHolistica,
      freelancer: saldoFreelancer,
      total: saldoHolistica + saldoFreelancer
    };
  }, [transacoes, despesas]);

  const filteredTransacoes = useMemo(() => {
    const combined = [
      ...(transacoes || []).filter(t => t.segmento === 'freelancer').map(t => ({ ...t, isDespesaState: false })),
      ...(despesas || []).filter(d => d.segmento === 'freelancer').map(d => ({ ...d, tipo: 'Despesa' as const, status: 'Pago' as const, isDespesaState: true }))
    ];

    return combined.filter(t => {
      const date = new Date(t.data + 'T12:00:00');
      const matchMes = String(date.getMonth()) === filtroMes;
      const matchAno = String(date.getFullYear()) === filtroAno;
      const matchTipo = filtroTipo === 'Todos' || t.tipo === filtroTipo;
      return matchMes && matchAno && matchTipo;
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [transacoes, despesas, filtroMes, filtroAno, filtroTipo]);

  const stats = useMemo(() => {
    const receitas = filteredTransacoes
      .filter(t => t.tipo === 'Receita' && t.status === 'Pago')
      .reduce((acc, t) => acc + t.valor, 0);
    const despesas = filteredTransacoes
      .filter(t => t.tipo === 'Despesa')
      .reduce((acc, t) => acc + t.valor, 0);
    const pendente = filteredTransacoes
      .filter(t => t.tipo === 'Receita' && t.status === 'Pendente')
      .reduce((acc, t) => acc + t.valor, 0);
    return { receitas, despesas, saldo: receitas - despesas, pendente };
  }, [filteredTransacoes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Cores de destaque para Freelancer (Grafite/Azul Marinho)
  const accentColor = "#1e293b"; // slate-800

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="pt-8 pb-2 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 sticky top-0 z-20 shrink-0">
        <button onClick={onBack} className="p-1.5 -ml-1 text-slate-600 dark:text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
            Freelancer
          </h1>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider truncate">
            Serviços Externos
          </p>
        </div>
        <div className="flex gap-1.5">
          <button 
            onClick={() => { setModalType('Receita'); setIsAddModalOpen(true); }}
            className="bg-emerald-600 text-white p-1.5 rounded-lg shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Plus size={18} />
          </button>
          <button 
            onClick={() => { setModalType('Despesa'); setIsAddModalOpen(true); }}
            className="bg-rose-600 text-white p-1.5 rounded-lg shadow-sm hover:bg-rose-700 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Card Unificado - Saúde Financeira Total */}
      <div className="p-3 shrink-0">
        <div className="bg-slate-800 dark:bg-slate-900 p-4 rounded-[1.5rem] text-white shadow-xl relative overflow-hidden border border-slate-700">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Briefcase size={80} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Activity size={12} className="text-blue-400" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Resumo Consolidado</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Saldo Clínica</p>
                <p className="text-sm font-bold text-emerald-400">{formatCurrency(unifiedStats.holistica)}</p>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Saldo Freelancer</p>
                <p className="text-sm font-bold text-blue-400">{formatCurrency(unifiedStats.freelancer)}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Total Geral Líquido</p>
                  <p className="text-xl font-black text-white">{formatCurrency(unifiedStats.total)}</p>
                </div>
                <div className="text-right bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                  <p className="text-[8px] uppercase font-bold text-amber-400">A Receber (Free)</p>
                  <p className="text-xs font-bold text-amber-400">{formatCurrency(stats.pendente)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo do Mês Freelancer */}
      <div className="px-3 pb-2 grid grid-cols-2 gap-2 shrink-0">
        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-0.5">
            <TrendingUp size={12} />
            <span className="text-[9px] font-bold uppercase">Ganhos</span>
          </div>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            {formatCurrency(stats.receitas)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-rose-600 mb-0.5">
            <TrendingDown size={12} />
            <span className="text-[9px] font-bold uppercase">Gastos</span>
          </div>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            {formatCurrency(stats.despesas)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex gap-2">
          <select 
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs outline-none"
          >
            {meses.map((mes, index) => (
              <option key={index} value={index}>{mes}</option>
            ))}
          </select>
          <select 
            value={filtroAno}
            onChange={(e) => setFiltroAno(e.target.value)}
            className="w-20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs outline-none"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Transações Freelancer */}
      <div className="flex-1 overflow-y-auto px-3 pb-20">
        {filteredTransacoes.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
            <Briefcase className="mx-auto text-slate-300 mb-2" size={24} />
            <p className="text-slate-500 text-xs">Nenhum registro freelancer.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransacoes.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    t.tipo === 'Receita' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {t.tipo === 'Receita' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-tight truncate">
                      {t.descricao}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-slate-500 flex items-center gap-1">
                        <Calendar size={8} />
                        {t.data.split('-').reverse().join('/')}
                      </span>
                      <span className="text-[9px] text-slate-500 px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                        {t.metodo || 'PIX'}
                      </span>
                      {t.status === 'Pendente' && (
                        <span className="text-[9px] font-bold text-amber-600 px-1 py-0.5 bg-amber-100 rounded flex items-center gap-1">
                          <Clock size={8} /> PENDENTE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end shrink-0 ml-2">
                  <p className={`font-bold text-sm ${t.tipo === 'Receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.tipo === 'Receita' ? '+' : '-'}{formatCurrency(t.valor)}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={() => handleEditClick(t)}
                      className="text-[9px] text-blue-500 font-bold uppercase"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => {
                        confirmAction('Excluir este registro?', () => {
                          if ((t as any).isDespesaState) {
                            deleteDespesa(t.id);
                          } else {
                            deleteTransacao(t.id);
                          }
                          showNotification('Removido!', 'success');
                        }, { isDanger: true });
                      }}
                      className="text-[9px] text-rose-500 font-bold uppercase"
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

      {/* Modal Adicionar Receita/Despesa */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-[100dvh]">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-6 shadow-2xl shadow-slate-900/20 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-slate-900 z-10 pb-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Nova {modalType} Freelancer
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 pb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {modalType === 'Receita' ? 'Local / Empresa' : 'Descrição / Local'}
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Freelance Empresa X"
                  value={formData.descricao}
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0,00"
                    value={formData.valor || ''}
                    onChange={e => setFormData({...formData, valor: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                  <input 
                    type="date" 
                    value={formData.data}
                    onChange={e => setFormData({...formData, data: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {modalType === 'Receita' ? 'Status' : 'Categoria'}
                  </label>
                  {modalType === 'Receita' ? (
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                    >
                      <option value="Pago">Recebido</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  ) : (
                    <select 
                      value={formData.categoria}
                      onChange={e => setFormData({...formData, categoria: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                    >
                      <option value="Material">Material</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Outros">Outros</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método</label>
                  <select 
                    value={formData.metodo}
                    onChange={e => setFormData({...formData, metodo: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Cartão">Cartão</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={() => handleSave(formData)}
                className={`w-full py-4 ${modalType === 'Receita' ? 'bg-emerald-600' : 'bg-rose-600'} text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity mt-4 flex items-center justify-center gap-2`}
              >
                <Save size={20} />
                Salvar {modalType}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-[100dvh]">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-6 shadow-2xl shadow-slate-900/20 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-slate-900 z-10 pb-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Editar Registro
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 pb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={editingTransaction.descricao || ''}
                  onChange={e => setEditingTransaction({...editingTransaction, descricao: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingTransaction.valor || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, valor: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                  <input 
                    type="date" 
                    value={editingTransaction.data || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, data: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {!(editingTransaction as any).isDespesaState && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select 
                      value={editingTransaction.status || 'Pago'}
                      onChange={e => setEditingTransaction({...editingTransaction, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                    >
                      <option value="Pago">Recebido</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  </div>
                )}
                <div className={(editingTransaction as any).isDespesaState ? "col-span-2" : ""}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método</label>
                  <select 
                    value={(editingTransaction as any).isDespesaState ? (editingTransaction as any).formaPagamento || 'PIX' : editingTransaction.metodo || 'PIX'}
                    onChange={e => {
                      if ((editingTransaction as any).isDespesaState) {
                        setEditingTransaction({...editingTransaction, formaPagamento: e.target.value});
                      } else {
                        setEditingTransaction({...editingTransaction, metodo: e.target.value});
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl outline-none border border-slate-200 dark:border-slate-700"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Cartão">Cartão</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={() => handleSave(editingTransaction)}
                className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity mt-4 flex items-center justify-center gap-2"
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
