import React, { useState, useEffect } from 'react';
import { Save, Trash2, GripVertical, Plus, PackageOpen, CheckCircle, ChevronLeft, Edit2, User, AlertCircle } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Cliente, Terapia, Pacote, ItemPacote, PagamentoInfo, Agendamento } from '../types';
import { AsyncStorage } from '../utils/storage';
import { useAppContext } from '../AppContext';

export default function PacotesScreen() {
  const { showNotification, confirmAction, session } = useAppContext();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [terapias, setTerapias] = useState<Terapia[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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
  const [valorFinal, setValorFinal] = useState<number | null>(null);
  const [valorManual, setValorManual] = useState<number | null>(null);
  
  // Payment State
  const [historicoPagamento, setHistoricoPagamento] = useState({
    status: 'Pendente',
    data: undefined as string | undefined,
    forma: undefined as string | undefined,
    banco: undefined as string | undefined,
    valor: 0
  });

  useEffect(() => {
    loadData();
    window.addEventListener('storage-sync', loadData);
    return () => window.removeEventListener('storage-sync', loadData);
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clis, ters, pacs] = await Promise.all([
        StorageService.getItems<Cliente>(StorageKeys.CLIENTES),
        StorageService.getItems<Terapia>(StorageKeys.TERAPIAS),
        StorageService.getItems<Pacote>(StorageKeys.PACOTES),
      ]);
      // Sincronia de IDs para garantir que o filtro funcione (Andreza/Amanda)
      setClientes(clis.filter(c => c.name || c.nome)); 
      setTerapias(ters);
      setPacotes(pacs);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (pacote: Pacote) => {
    await loadData();
    setEditingPacoteId(String(pacote.id));
    setClienteId(String(pacote.clienteId));
    setMesReferencia(pacote.mesReferencia);
    setItens(Array.isArray(pacote.itens) ? pacote.itens : JSON.parse(pacote.itens || '[]'));
    setTipoPacote(pacote.tipoPacote);
    setObservacoes(pacote.observacoes || '');
    setValorManual(pacote.valorFinal != null ? Number(pacote.valorFinal) : null);
    setHistoricoPagamento(typeof pacote.historicoPagamento === 'string' 
      ? JSON.parse(pacote.historicoPagamento) 
      : (pacote.historicoPagamento || { status: 'Pendente', valor: 0 }));
    setViewMode('form');
  };

  const handleNew = async () => {
    await loadData();
    setEditingPacoteId(null);
    setClienteId('');
    setItens([]);
    setTipoPacote('Mensal Fixo');
    setValorManual(null);
    setHistoricoPagamento({ status: 'Pendente', valor: 0, data: undefined, forma: undefined, banco: undefined });
    setViewMode('form');
  };

  // REFORMULADO: Agora usa o StorageService corrigido para evitar erros de FK
  const handleDeleteTotal = async (pacoteId: string) => {
    confirmAction('Deseja realmente excluir este pacote? Os agendamentos futuros serão desvinculados automaticamente.', async () => {
      try {
        setLoading(true);
        // Chama a nossa nova lógica que limpa os vínculos no Supabase primeiro
        await StorageService.deleteItem(StorageKeys.PACOTES, pacoteId);
        
        showNotification('Pacote excluído com sucesso!', 'success');
        await loadData(); // Recarrega tudo
        setViewMode('list');
      } catch (error: any) {
        showNotification('Erro ao excluir: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }, { isDanger: true });
  };

    const handleSave = async () => {
      if (!clienteId) {
        showNotification('Selecione um cliente.', 'error');
        return;
      }

      try {
        setLoading(true);
        // Garante que o ID seja consistente
        const pacoteId = editingPacoteId || `pac_${Date.now()}`;
        const valorCalculado = valorManual !== null ? valorManual : totais.final;

        const novoPacote: Pacote = {
          id: pacoteId,
          userId: session?.user?.id || '',
          clienteId: String(clienteId),
          mesReferencia,
          price: valorCalculado,
          payment_method: historicoPagamento.forma || 'PIX',
          payment_date: historicoPagamento.data || new Date().toISOString().split('T')[0],
          itens: JSON.stringify(itens),
          tipoPacote,
          observacoes,
        };
        
        console.log("Salvando pacote:", novoPacote);
        if (itens.length === 0) {
          console.warn("Atenção: A lista de terapias está vazia.");
        }

        if (editingPacoteId) {
          await StorageService.updateItem(StorageKeys.PACOTES, novoPacote);
        } else {
          await StorageService.saveItem(StorageKeys.PACOTES, novoPacote);
        }

        // Sincronização Financeira Otimizada
        if (historicoPagamento.status === 'Pago') {
          const clienteNome = clientes.find(c => String(c.id) === String(clienteId))?.name || 'Cliente';
          
          const transacao = {
            id: `trans_${Date.now()}`,
            pacoteId: pacoteId,
            clienteId: String(clienteId),
            user_id: session?.user?.id,
            tipo: 'Ganho',
            descricao: `Pacote - ${clienteNome}`,
            valor: Number(valorCalculado),
            data: historicoPagamento.data || new Date().toISOString().split('T')[0],
            metodo: historicoPagamento.forma || 'PIX',
            banco: historicoPagamento.banco || null,
            categoria: 'Terapias'
          };

          // Tenta atualizar ou criar a transação baseada no pacoteId
          const transacoes = await StorageService.getItems<any>(StorageKeys.TRANSACOES);
          const transacaoExistente = transacoes.find(t => t.pacoteId === pacoteId);

          if (transacaoExistente) {
            await StorageService.updateItem(StorageKeys.TRANSACOES, { ...transacao, id: transacaoExistente.id });
          } else {
            await StorageService.saveItem(StorageKeys.TRANSACOES, transacao);
          }
        }

        showNotification('Pacote salvo com sucesso!', 'success');
        setViewMode('list');
        await loadData();
        window.dispatchEvent(new Event('storage-sync'));
      } catch (error: any) {
        showNotification('Erro ao salvar: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
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
    if (itens.some(item => String(item.terapiaId) === tId)) {
      showNotification('Terapia já inclusa', 'info');
      return;
    }
    const terapiaObj = terapias.find(t => String(t.id) === tId);
    const newItem: ItemPacote = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      terapiaId: tId,
      quantidadeTotal: 1,
      quantidadeRestante: 1,
      valorSessao: terapiaObj?.price || 0,
      valorDesconto: 0,
    };
    setItens([...itens, newItem]);
  };

  const updateItem = (id: string, field: keyof ItemPacote, value: any) => {
    setItens(itens.map(item => {
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
  };

  const removeItem = (id: string) => {
    setItens(itens.filter(item => item.id !== id));
  };

  const getTerapia = (id: string) => terapias.find(t => String(t.id) === String(id));

  const calcularTotais = () => {
    let bruto = 0;
    let descontoTotal = 0;
    itens.forEach(item => {
      const terapia = getTerapia(item.terapiaId);
      if (terapia) {
        bruto += terapia.price * item.quantidadeTotal;
        descontoTotal += Number(item.valorDesconto) || 0;
      }
    });
    return { bruto, descontoTotal, final: bruto - descontoTotal };
  };

  const totais = calcularTotais();

  useEffect(() => {
    setHistoricoPagamento(prev => ({ ...prev, valor: totais.final }));
  }, [totais.final]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleMarcarPago = () => {
    setHistoricoPagamento(prev => ({
      ...prev,
      status: prev.status === 'Pago' ? 'Pendente' : 'Pago',
      data: prev.status === 'Pendente' ? new Date().toISOString().split('T')[0] : undefined,
      forma: prev.status === 'Pendente' ? 'PIX' : undefined,
    }));
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
          ) : pacotes.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-surface-light)] rounded-3xl border border-dashed border-gray-300">
              <PackageOpen size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Nenhum pacote ativo.</p>
            </div>
          ) : (
            pacotes.map(p => {
              const cliente = clientes.find(c => String(c.id) === String(p.clienteId));
              let therapies: ItemPacote[] = Array.isArray(p.itens) ? p.itens : JSON.parse(p.itens || '[]');
              return (
                <div key={p.id} className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      {/* Correção para exibir o nome independente da origem do campo */}
                      <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                        {cliente?.name || cliente?.nome || 'Cliente não encontrado'}
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
                {clientes.map(c => (
                  <option key={c.id} value={c.id || ''}>{c.name || c.nome || 'Sem Nome'}</option>
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
            {terapias.map(terapia => (
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
                    {terapia.name || terapia.nome || 'Sem Nome'}
                  </h4>
                </div>
                <p className="text-[var(--color-primary)] font-bold text-sm mt-2">
                  {formatCurrency(terapia.price)}
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
              {itens.map((item, index) => {
                const terapia = getTerapia(item.terapiaId);
                if (!terapia) return null;

                return (
                  <div key={item.id} className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">
                        {index + 1}. {terapia.name || terapia.nome || 'Sem Nome'}
                      </h4>
                      <button onClick={() => removeItem(item.id)} className="text-[var(--color-error)] p-1.5 bg-[var(--color-error)]/10 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex gap-3 items-end">
                      <div className="w-20">
                        <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Qtd</label>
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantidadeTotal || ''}
                          onChange={(e) => {
                            const novaQtd = parseInt(e.target.value) || 1;
                            updateItem(item.id, 'quantidadeTotal', novaQtd);
                            updateItem(item.id, 'quantidadeRestante', novaQtd);
                          }}
                          className="w-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-2 py-2 text-sm outline-none text-center font-bold"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Valor Desconto</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          value={item.valorDesconto || ''}
                          onChange={(e) => updateItem(item.id, 'valorDesconto', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-sm outline-none font-bold text-[var(--color-success)]"
                        />
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
                    historicoPagamento.status === 'Pago' ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-warning)] text-white'
                  }`}
                >
                  <CheckCircle size={16} />
                  {historicoPagamento.status === 'Pago' ? 'PAGO' : 'PENDENTE'}
                </button>
              </div>

              {historicoPagamento.status === 'Pago' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Data</label>
                    <input 
                      type="date" 
                      value={historicoPagamento.data || ''}
                      onChange={(e) => setHistoricoPagamento(prev => ({ ...prev, data: e.target.value }))}
                      className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Forma</label>
                    <select 
                      value={historicoPagamento.forma || ''}
                      onChange={(e) => setHistoricoPagamento(prev => ({ ...prev, forma: e.target.value }))}
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
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-[var(--color-text-sec-light)] uppercase">Desconto</span>
          <span className="text-sm font-bold text-[var(--color-success)]">-{formatCurrency(totais.descontoTotal)}</span>
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