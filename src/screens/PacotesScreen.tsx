import React, { useState, useEffect } from 'react';
import { Save, Trash2, GripVertical, Plus, PackageOpen, CheckCircle, ChevronLeft, Edit2, User } from 'lucide-react';
import { Cliente, Terapia, Pacote, ItemPacote, Transacao } from '../types';
import { useAppContext } from '../AppContext';

export default function PacotesScreen() {
  const { 
    showNotification, 
    confirmAction, 
    clientes,
    terapias,
    pacotes,
    transacoes,
    addPacote, 
    updatePacote, 
    deletePacote,
    addTransacao,
    updateTransacao
  } = useAppContext();
  
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [editingPacoteId, setEditingPacoteId] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [mesReferencia, setMesReferencia] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [itens, setItens] = useState<ItemPacote[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [tipoPacote, setTipoPacote] = useState<'Mensal Fixo' | 'Avulso'>('Mensal Fixo');
  const [observacoes, setObservacoes] = useState('');
  const [valorManual, setValorManual] = useState<number | null>(null);
  
  // Payment State (Temporary for form)
  const [statusPagamento, setStatusPagamento] = useState<'Pendente' | 'Pago'>('Pendente');
  const [dataPagamento, setDataPagamento] = useState<string | undefined>(undefined);
  const [formaPagamento, setFormaPagamento] = useState<string | undefined>(undefined);
  const [bancoPagamento, setBancoPagamento] = useState<string | undefined>(undefined);

  const handleEdit = async (pacote: Pacote) => {
    setEditingPacoteId(pacote.id);
    setClienteId(pacote.clienteId);
    setMesReferencia(pacote.mesReferencia);
    setItens(pacote.itens || []);
    setTipoPacote(pacote.tipoPacote as any);
    setObservacoes(pacote.observacoes || '');
    setValorManual(pacote.valorFinal);
    
    setStatusPagamento(pacote.statusPagamento || 'Pendente');
    setDataPagamento(pacote.dataPagamento);
    setFormaPagamento(pacote.formaPagamento);
    setBancoPagamento(pacote.bancoPagamento);
    
    setViewMode('form');
  };

  const handleNew = () => {
    setEditingPacoteId(null);
    setClienteId('');
    setItens([]);
    setTipoPacote('Mensal Fixo');
    setValorManual(null);
    setObservacoes('');
    setStatusPagamento('Pendente');
    setDataPagamento(undefined);
    setFormaPagamento(undefined);
    setBancoPagamento(undefined);
    setViewMode('form');
  };

  const handleDeleteTotal = async (pacoteId: string) => {
    confirmAction('Deseja realmente excluir este pacote? Os agendamentos futuros serão desvinculados automaticamente.', async () => {
      try {
        setLoading(true);
        await deletePacote(pacoteId);
        showNotification('Pacote excluído com sucesso!', 'success');
        setViewMode('list');
      } catch (error: any) {
        showNotification('Erro ao excluir: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }, { isDanger: true });
  };

  const handleSave = () => {
    if (!clienteId) {
      showNotification('Selecione um cliente válido.', 'error');
      return;
    }

    const pacoteId = editingPacoteId || crypto.randomUUID();
    const valorCalculado = valorManual !== null ? valorManual : totais.final;

    const pacoteData: Pacote = {
      id: pacoteId,
      clienteId: clienteId,
      mesReferencia,
      valorFinal: Number(valorCalculado),
      itens: itens,
      tipoPacote,
      status: 'Ativo',
      statusPagamento,
      dataPagamento,
      formaPagamento,
      bancoPagamento,
      observacoes
    };

    if (editingPacoteId) {
      updatePacote(pacoteData);
    } else {
      addPacote(pacoteData);
    }

    // Sincronização Financeira
    const cliente = (clientes || []).find(c => c.id === clienteId);
    const clienteNome = cliente?.nome || 'Cliente';
    
    const transacaoData: Transacao = {
      id: (transacoes || []).find(t => t.pacoteId === pacoteId)?.id || crypto.randomUUID(),
      descricao: `Pacote - ${clienteNome}`,
      valor: Number(valorCalculado),
      data: dataPagamento || new Date().toISOString().split('T')[0],
      metodo: formaPagamento || 'PIX',
      categoria: 'Pacotes',
      status: statusPagamento,
      pacoteId: pacoteId,
      tipo: 'Receita'
    };

    const transacaoExistente = (transacoes || []).find(t => t.pacoteId === pacoteId);
    if (transacaoExistente) {
      updateTransacao(transacaoData);
    } else {
      addTransacao(transacaoData);
    }
    
    setViewMode('list');
    showNotification('Pacote salvo com sucesso!', 'success');
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, terapiaId: string) => {
    e.dataTransfer.setData('terapiaId', String(terapiaId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const terapiaId = e.dataTransfer.getData('terapiaId');
    if (terapiaId) addTerapiaToPacote(terapiaId);
  };

  const addTerapiaToPacote = (terapiaId: string) => {
    const tId = String(terapiaId);
    if ((itens || []).some(item => item.terapiaId === tId)) {
      showNotification('Terapia já inclusa', 'info');
      return;
    }
    const terapiaObj = (terapias || []).find(t => t.id === tId);
    const newItem: ItemPacote = {
      id: crypto.randomUUID(),
      terapiaId: tId,
      quantidadeTotal: 1,
      quantidadeRestante: 1
    };
    setItens(prev => [...prev, newItem]);
    setValorManual(null); // Força o recálculo do valor total
  };

  const updateItem = (id: string, field: keyof ItemPacote, value: any) => {
    setItens(prev => (prev || []).map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantidadeTotal') {
          const diff = Number(value) - Number(item.quantidadeTotal);
          updated.quantidadeRestante = Number(item.quantidadeRestante) + diff;
        }
        return updated;
      }
      return item;
    }));
    setValorManual(null); // Força o recálculo do valor total
  };

  const removeItem = (id: string) => {
    setItens(prev => (prev || []).filter(item => item.id !== id));
    setValorManual(null); // Força o recálculo do valor total
  };

  const getTerapia = (id: string) => (terapias || []).find(t => t.id === id);

  const calcularTotais = () => {
    let bruto = 0;
    (itens || []).forEach(item => {
      const terapia = getTerapia(item.terapiaId);
      if (terapia) {
        bruto += terapia.valor * item.quantidadeTotal;
      }
    });
    return { bruto, final: bruto };
  };

  const totais = calcularTotais();

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleMarcarPago = () => {
    const novoStatus = statusPagamento === 'Pago' ? 'Pendente' : 'Pago';
    setStatusPagamento(novoStatus);
    if (novoStatus === 'Pago') {
      setDataPagamento(new Date().toISOString().split('T')[0]);
      setFormaPagamento('PIX');
    } else {
      setDataPagamento(undefined);
      setFormaPagamento(undefined);
      setBancoPagamento(undefined);
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 pb-10 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
        <div className="p-6 pb-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Pacotes Ativos</h2>
          <button onClick={handleNew} className="p-2 bg-[var(--color-primary)] text-white rounded-full shadow-lg hover:opacity-90">
            <Plus size={24} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div></div>
          ) : (pacotes || []).length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-surface-light)] rounded-3xl border border-dashed border-gray-300">
              <PackageOpen size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Nenhum pacote ativo.</p>
            </div>
          ) : (
            (pacotes || []).map(p => {
              const cliente = (clientes || []).find(c => c.id === p.clienteId);
              return (
                <div key={p.id} className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                        {cliente?.nome || 'Cliente não encontrado'}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.tipoPacote === 'Mensal Fixo' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {p.tipoPacote || 'Mensal Fixo'}
                        </span>
                        <span className="text-xs text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">
                          {p.mesReferencia}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 relative z-20">
                    <button 
                      onClick={() => handleEdit(p)}
                      className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTotal(p.id)}
                      className="p-2 text-[var(--color-error)] bg-[var(--color-error)]/10 rounded-xl hover:bg-[var(--color-error)]/20 transition-colors active:opacity-50 shadow-md"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 [webkit-overflow-scrolling:touch] bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
      {/* Header & Seletores */}
      <div className="p-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 z-10 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setViewMode('list')} className="p-2 -ml-2 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
            {editingPacoteId ? 'Editar Pacote' : 'Montar Pacote'}
          </h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-1">
                Cliente
              </label>
              <select 
                value={clienteId || ''}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={!!editingPacoteId}
                className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
              >
                <option value="" disabled>Selecione o Cliente...</option>
                {(clientes || []).map(c => (
                  <option key={c.id} value={c.id || ''}>{c.nome || 'Sem Nome'}</option>
                ))}
              </select>
            </div>
            <div className="w-36">
              <label className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-1">
                Mês Ref.
              </label>
              <input 
                type="month"
                value={mesReferencia || ''}
                onChange={(e) => setMesReferencia(e.target.value)}
                className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-2">Tipo de Pacote</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setTipoPacote('Mensal Fixo')}
                className={`py-3 rounded-xl text-sm font-bold border transition-all ${tipoPacote === 'Mensal Fixo' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-gray-500 border-gray-200 dark:border-gray-800'}`}
              >
                Mensal Fixo
              </button>
              <button 
                onClick={() => setTipoPacote('Avulso')}
                className={`py-3 rounded-xl text-sm font-bold border transition-all ${tipoPacote === 'Avulso' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-gray-500 border-gray-200 dark:border-gray-800'}`}
              >
                Avulso
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col pb-8">
        {/* Terapias Disponíveis */}
        <div className="p-4 shrink-0">
          <h3 className="text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-wider mb-3">
            Adicionar Terapias
          </h3>
          <div className="flex overflow-x-auto pb-2 gap-3 snap-x">
            {(terapias || []).map(terapia => (
              <div 
                key={terapia.id}
                draggable
                onDragStart={(e) => handleDragStart(e, String(terapia.id))}
                className="snap-start shrink-0 w-40 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm cursor-grab active:cursor-grabbing flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <GripVertical size={16} className="text-gray-400" />
                    <button 
                      onClick={() => addTerapiaToPacote(String(terapia.id))}
                      className="p-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] leading-tight mt-1">
                    {terapia.nome || 'Sem Nome'}
                  </h4>
                </div>
                <p className="text-[var(--color-primary)] font-bold text-sm mt-2">
                  {formatCurrency(terapia.valor)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Dropzone */}
        <div 
          className={`shrink-0 p-4 mx-4 mb-4 rounded-3xl border-2 border-dashed transition-all ${
            isDraggingOver 
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.02]' 
              : 'border-gray-200 dark:border-gray-800 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
        >
          <h3 className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-4 flex items-center gap-2">
            <PackageOpen size={18} className="text-[var(--color-primary)]" />
            Itens do Pacote
          </h3>

          {itens.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">
              <p className="text-sm text-center opacity-60">Arraste as terapias para cá<br/>ou use o botão + acima</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(itens || []).map((item, index) => {
                const terapia = getTerapia(item.terapiaId);
                if (!terapia) return null;

                return (
                  <div key={item.id} className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">
                        {index + 1}. {terapia.nome || 'Sem Nome'}
                      </h4>
                      <button onClick={() => removeItem(item.id)} className="text-[var(--color-error)] p-1.5 bg-[var(--color-error)]/10 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex gap-3 items-end">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1 text-center">Qtd</label>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              const novaQtd = Math.max(1, (item.quantidadeTotal || 1) - 1);
                              updateItem(item.id, 'quantidadeTotal', novaQtd);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold transition-colors"
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            min="1"
                            value={item.quantidadeTotal || ''}
                            onChange={(e) => {
                              const novaQtd = Math.max(1, parseInt(e.target.value) || 1);
                              updateItem(item.id, 'quantidadeTotal', novaQtd);
                            }}
                            className="w-12 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-100 dark:border-gray-800 rounded-lg px-1 py-1.5 text-sm outline-none text-center font-bold"
                          />
                          <button 
                            onClick={() => {
                              const novaQtd = (item.quantidadeTotal || 1) + 1;
                              updateItem(item.id, 'quantidadeTotal', novaQtd);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Observações */}
        {itens.length > 0 && (
          <div className="p-5 mx-4 mb-4 rounded-3xl border border-gray-200 dark:border-gray-800 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] shrink-0">
            <div className="mb-4">
              <label className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-2">Observações</label>
              <textarea 
                value={observacoes || ''}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                rows={3}
                placeholder="Anotações sobre o tratamento..."
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Status do Pagamento</span>
                <button 
                  onClick={handleMarcarPago}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    statusPagamento === 'Pago' ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-warning)] text-white'
                  }`}
                >
                  <CheckCircle size={16} />
                  {statusPagamento === 'Pago' ? 'PAGO' : 'PENDENTE'}
                </button>
              </div>

              {statusPagamento === 'Pago' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Data</label>
                    <input 
                      type="date" 
                      value={dataPagamento || ''}
                      onChange={(e) => setDataPagamento(e.target.value)}
                      className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Forma</label>
                    <select 
                      value={formaPagamento || ''}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none"
                    >
                      <option value="PIX">PIX</option>
                      <option value="Crédito">Crédito</option>
                      <option value="Débito">Débito</option>
                      <option value="Transferência">Transferência</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Totais */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-t border-gray-200 dark:border-gray-800 p-6 shadow-lg sticky bottom-0 z-20">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-[var(--color-text-sec-light)] uppercase">Bruto</span>
          <span className="text-sm font-bold text-[var(--color-text-main-light)]">{formatCurrency(totais.bruto)}</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100 mb-5">
          <span className="font-bold text-[var(--color-text-main-light)]">VALOR FINAL</span>
          <input 
            type="number"
            value={valorManual !== null ? valorManual : (totais.final || '')}
            onChange={(e) => setValorManual(parseFloat(e.target.value) || 0)}
            className="text-2xl font-black text-[var(--color-primary)] bg-transparent w-32 text-right outline-none border-b border-dashed border-[var(--color-primary)]"
          />
        </div>
        
        <button 
          onClick={handleSave}
          className="w-full py-4 bg-[var(--color-primary)] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {editingPacoteId ? 'SALVAR ALTERAÇÕES' : 'SALVAR PACOTE'}
        </button>
      </div>
    </div>
  );
}
