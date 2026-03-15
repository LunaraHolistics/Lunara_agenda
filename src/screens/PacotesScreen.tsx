import React, { useState, useEffect } from 'react';
import { Save, Trash2, GripVertical, Plus, PackageOpen, CheckCircle, ChevronLeft, Edit2, User, AlertCircle } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Cliente, Terapia, Pacote, ItemPacote, PagamentoInfo, Agendamento } from '../types';
import { AsyncStorage } from '../utils/storage';
import { useAppContext } from '../AppContext';

export default function PacotesScreen() {
  const { showNotification, confirmAction } = useAppContext();
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
  const [itensPacote, setItensPacote] = useState<ItemPacote[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [tipoPacote, setTipoPacote] = useState<'Mensal Fixo' | 'Avulso'>('Mensal Fixo');
  const [observacoes, setObservacoes] = useState('');
  
  // Payment State
  const [tipoCobranca, setTipoCobranca] = useState<'Por Atendimento' | 'Total'>('Por Atendimento');
  const [historicoPagamento, setHistoricoPagamento] = useState<PagamentoInfo>({
    status: 'Pendente',
    valor: 0,
  });

  useEffect(() => {
    loadData();
    window.addEventListener('storage-sync', loadData);
    return () => window.removeEventListener('storage-sync', loadData);
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    const [clis, ters, pacs] = await Promise.all([
      StorageService.getItems<Cliente>(StorageKeys.CLIENTES),
      StorageService.getItems<Terapia>(StorageKeys.TERAPIAS),
      StorageService.getItems<Pacote>(StorageKeys.PACOTES),
    ]);
    setClientes(clis.filter(c => c.status));
    setTerapias(ters);
    setPacotes(pacs);
    setLoading(false);
  };

  const handleEdit = (pacote: Pacote) => {
    setEditingPacoteId(pacote.id);
    setClienteId(pacote.clienteId);
    setMesReferencia(pacote.mesReferencia);
    setItensPacote(pacote.itens);
    setTipoPacote(pacote.tipoPacote || 'Mensal Fixo');
    setTipoCobranca(pacote.tipoCobranca || 'Por Atendimento');
    setObservacoes(pacote.observacoes || '');
    if (pacote.historicoPagamento) {
      setHistoricoPagamento(pacote.historicoPagamento);
    } else {
      setHistoricoPagamento({ status: 'Pendente', valor: pacote.valorFinal });
    }
    setViewMode('form');
  };

  const handleNew = () => {
    setEditingPacoteId(null);
    setClienteId('');
    setItensPacote([]);
    setTipoPacote('Mensal Fixo');
    setTipoCobranca('Por Atendimento');
    setObservacoes('');
    setHistoricoPagamento({ status: 'Pendente', valor: 0 });
    setViewMode('form');
  };

  const handleDeleteTotal = async (pacoteId: string) => {
    console.log("Botão Excluir Clicado para o ID:", pacoteId);
    confirmAction('Deseja realmente excluir este pacote totalmente?', () => {
      confirmAction('Deseja também remover os próximos agendamentos vinculados a este pacote?', 
        async () => {
          await performDelete(pacoteId, true);
        }, 
        { 
          title: 'Remover Agendamentos?', 
          confirmText: 'Sim, remover', 
          cancelText: 'Não, manter agendamentos',
          onCancel: async () => {
            await performDelete(pacoteId, false);
          }
        }
      );
    }, { isDanger: true });
  };

  const performDelete = async (pacoteId: string, removeAgendamentos: boolean) => {
    try {
      // 1. Remover Agendamentos se solicitado
      if (removeAgendamentos) {
        const agends = await StorageService.getItems<Agendamento>(StorageKeys.AGENDAMENTOS);
        const filteredAgends = agends.filter(a => String(a.pacoteId) !== String(pacoteId) || a.statusAtendimento !== 'Agendado');
        await AsyncStorage.setItem(StorageKeys.AGENDAMENTOS, JSON.stringify(filteredAgends));
      }
      
      // 2. Buscar todos os pacotes para atualização estrutural
      const allPacotes = await StorageService.getItems<Pacote>(StorageKeys.PACOTES);
      const novaLista = allPacotes.filter(p => String(p.id) !== String(pacoteId));
      
      // 3. Salvar no Storage
      await AsyncStorage.setItem(StorageKeys.PACOTES, JSON.stringify(novaLista));
      
      // 4. Atualizar UI (setState funcional)
      setPacotes(prev => prev.filter(p => String(p.id) !== String(pacoteId)));
      setRefreshTrigger(prev => prev + 1);
      
      // 5. Resetar formulário
      setEditingPacoteId(null);
      setClienteId('');
      setItensPacote([]);
      setTipoPacote('Mensal Fixo');
      setTipoCobranca('Por Atendimento');
      setHistoricoPagamento({ status: 'Pendente', valor: 0 });
      
      showNotification('Pacote excluído com sucesso!', 'success');
      setViewMode('list');
    } catch (error: any) {
      console.error('Erro ao excluir pacote:', error);
      showNotification('Erro ao excluir pacote: ' + error.message, 'error');
    }
  };

  const handleSave = async () => {
    if (!clienteId) {
      showNotification('Selecione um cliente.', 'error');
      return;
    }

    // Lógica de Pacote Vazio = Exclusão
    if (itensPacote.length === 0) {
      if (editingPacoteId) {
        confirmAction('O pacote está vazio. Deseja excluí-lo?', async () => {
          await StorageService.deleteItem(StorageKeys.PACOTES, editingPacoteId);
          showNotification('Pacote removido com sucesso!', 'success');
          setViewMode('list');
          loadData();
        }, { isDanger: true });
      } else {
        showNotification('Adicione pelo menos uma terapia ao pacote.', 'error');
      }
      return;
    }

    const todosPacotes = await StorageService.getItems<Pacote>(StorageKeys.PACOTES);
    const pacoteExistente = editingPacoteId 
      ? todosPacotes.find(p => p.id === editingPacoteId)
      : todosPacotes.find(p => p.clienteId === clienteId && p.mesReferencia === mesReferencia);

    const itensComSaldo = itensPacote.map(item => {
      const itemExistente = pacoteExistente?.itens.find(i => i.id === item.id);
      if (itemExistente) {
        const consumidos = itemExistente.quantidade - itemExistente.quantidadeRestante;
        const novoRestante = Math.max(0, item.quantidade - consumidos);
        return {
          ...item,
          quantidadeRestante: novoRestante
        };
      }
      return {
        ...item,
        quantidadeRestante: item.quantidade
      };
    });
    
    let novaLista;
    const novoPacote: Pacote = {
      id: editingPacoteId || Date.now().toString(),
      clienteId,
      mesReferencia,
      itens: itensComSaldo,
      valorBruto: totais.bruto,
      valorDescontoTotal: totais.descontoTotal,
      valorFinal: totais.final,
      dataCriacao: editingPacoteId ? (todosPacotes.find(p => p.id === editingPacoteId)?.dataCriacao || new Date().toISOString()) : new Date().toISOString(),
      tipoCobranca,
      tipoPacote,
      historicoPagamento: tipoCobranca === 'Total' ? historicoPagamento : undefined,
      observacoes,
    };

    if (editingPacoteId) {
      novaLista = todosPacotes.map(p => p.id === editingPacoteId ? novoPacote : p);
    } else {
      const index = todosPacotes.findIndex(p => p.clienteId === clienteId && p.mesReferencia === mesReferencia);
      if (index !== -1) {
        novaLista = todosPacotes.map(p => (p.clienteId === clienteId && p.mesReferencia === mesReferencia) ? novoPacote : p);
      } else {
        novaLista = [...todosPacotes, novoPacote];
      }
    }
    
    await AsyncStorage.setItem(StorageKeys.PACOTES, JSON.stringify(novaLista));
    
    showNotification('Pacote salvo com sucesso!', 'success');
    setViewMode('list');
    loadData();
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, terapiaId: string) => {
    e.dataTransfer.setData('terapiaId', terapiaId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const terapiaId = e.dataTransfer.getData('terapiaId');
    if (terapiaId) {
      addTerapiaToPacote(terapiaId);
    }
  };

  const addTerapiaToPacote = (terapiaId: string) => {
    if (itensPacote.some(item => item.terapiaId === terapiaId)) {
      showNotification('Esta terapia já faz parte do pacote atual', 'info');
      return;
    }
    const newItem: ItemPacote = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      terapiaId,
      quantidade: 4,
      quantidadeRestante: 4,
      tipoDesconto: 'fixo',
      valorDesconto: 0,
    };
    setItensPacote([...itensPacote, newItem]);
  };

  const updateItem = (id: string, field: keyof ItemPacote, value: any) => {
    setItensPacote(itensPacote.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    setItensPacote(itensPacote.filter(item => item.id !== id));
  };

  // Cálculos
  const getTerapia = (id: string) => terapias.find(t => t.id === id);

  const calcularTotais = () => {
    let bruto = 0;
    let descontoTotal = 0;

    itensPacote.forEach(item => {
      const terapia = getTerapia(item.terapiaId);
      if (terapia) {
        const valorBrutoItem = terapia.valor * item.quantidade;
        bruto += valorBrutoItem;

        const valorDescontoItem = item.tipoDesconto === 'fixo' 
          ? Number(item.valorDesconto) 
          : valorBrutoItem * (Number(item.valorDesconto) / 100);
        
        descontoTotal += valorDescontoItem;
      }
    });

    return {
      bruto,
      descontoTotal,
      final: bruto - descontoTotal
    };
  };

  const totais = calcularTotais();

  useEffect(() => {
    if (historicoPagamento.valor !== totais.final) {
      setHistoricoPagamento(prev => ({ ...prev, valor: totais.final }));
    }
  }, [totais.final]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

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
      <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
        <div className="p-6 pb-4 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Pacotes Ativos</h2>
          <button 
            onClick={handleNew}
            className="p-2 bg-[var(--color-primary)] text-white rounded-full shadow-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
            </div>
          ) : pacotes.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
              <PackageOpen size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">Nenhum pacote ativo encontrado.</p>
              <button onClick={handleNew} className="mt-4 text-[var(--color-primary)] font-bold">Criar Primeiro Pacote</button>
            </div>
          ) : (
            pacotes.map(p => {
              const cliente = clientes.find(c => c.id === p.clienteId);
              return (
                <div key={p.id} className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">{cliente?.nome || 'Desconhecido'}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.tipoPacote === 'Mensal Fixo' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                          {p.tipoPacote || 'Mensal Fixo'}
                        </span>
                        <span className="text-xs text-[var(--color-text-sec-light)]">{p.mesReferencia}</span>
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
                        style={{ zIndex: 9999 }}
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
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)]">
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
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={!!editingPacoteId}
                className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
              >
                <option value="" disabled>Selecione o Cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="w-36">
              <label className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-1">
                Mês Ref.
              </label>
              <input 
                type="month"
                value={mesReferencia}
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

      <div className="flex-1 overflow-y-auto flex flex-col pb-8">
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
                onDragStart={(e) => handleDragStart(e, terapia.id)}
                className="snap-start shrink-0 w-40 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm cursor-grab active:cursor-grabbing flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <GripVertical size={16} className="text-gray-400" />
                    <button 
                      onClick={() => addTerapiaToPacote(terapia.id)}
                      className="p-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] leading-tight mt-1">
                    {terapia.nome}
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
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <h3 className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-4 flex items-center gap-2">
            <PackageOpen size={18} className="text-[var(--color-primary)]" />
            Itens do Pacote
          </h3>

          {itensPacote.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)]">
              <p className="text-sm text-center opacity-60">Arraste as terapias para cá<br/>ou use o botão + acima</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itensPacote.map((item, index) => {
                const terapia = getTerapia(item.terapiaId);
                if (!terapia) return null;

                return (
                  <div key={item.id} className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-sm">
                        {index + 1}. {terapia.nome}
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
                          value={item.quantidade}
                          onChange={(e) => {
                            const novaQtd = parseInt(e.target.value) || 1;
                            updateItem(item.id, 'quantidade', novaQtd);
                            if (item.quantidadeRestante > novaQtd) {
                              updateItem(item.id, 'quantidadeRestante', novaQtd);
                            }
                          }}
                          className="w-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-2 py-2 text-sm outline-none text-center font-bold"
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Saldo</label>
                        <input 
                          type="number" 
                          min="0"
                          max={item.quantidade}
                          value={item.quantidadeRestante}
                          onChange={(e) => {
                            const novoSaldo = parseInt(e.target.value) || 0;
                            if (novoSaldo > item.quantidade) {
                              showNotification("O saldo restante não pode exceder o total contratado", "error");
                              return;
                            }
                            updateItem(item.id, 'quantidadeRestante', novoSaldo);
                          }}
                          className="w-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-2 py-2 text-sm outline-none text-center font-bold text-[var(--color-primary)]"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Tipo Desc.</label>
                        <select 
                          value={item.tipoDesconto}
                          onChange={(e) => updateItem(item.id, 'tipoDesconto', e.target.value)}
                          className="w-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-2 py-2 text-sm outline-none font-medium"
                        >
                          <option value="fixo">R$ Fixo</option>
                          <option value="porcentagem">% Desc.</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Valor Desconto</label>
                        <input 
                          type="number" 
                          min="0"
                          step={item.tipoDesconto === 'fixo' ? "0.01" : "1"}
                          value={item.valorDesconto}
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

        {/* Opções de Cobrança */}
        {itensPacote.length > 0 && (
          <div className="p-5 mx-4 mb-4 rounded-3xl border border-gray-200 dark:border-gray-800 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] shrink-0">
            <div className="mb-4">
              <label className="block text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase mb-2">Observações</label>
              <textarea 
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                rows={3}
                placeholder="Anotações sobre o tratamento..."
              />
            </div>

            <h3 className="text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase tracking-wider mb-4">
              Configuração de Cobrança
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button 
                onClick={() => setTipoCobranca('Por Atendimento')}
                className={`py-3 rounded-xl text-xs font-bold border transition-all ${tipoCobranca === 'Por Atendimento' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-gray-500 border-gray-100 dark:border-gray-800'}`}
              >
                Por Atendimento
              </button>
              <button 
                onClick={() => setTipoCobranca('Total')}
                className={`py-3 rounded-xl text-xs font-bold border transition-all ${tipoCobranca === 'Total' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] text-gray-500 border-gray-100 dark:border-gray-800'}`}
              >
                Total Antecipado
              </button>
            </div>

            {tipoCobranca === 'Total' && (
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">Status do Pagamento</span>
                  <button 
                    onClick={handleMarcarPago}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      historicoPagamento.status === 'Pago' 
                        ? 'bg-[var(--color-success)] text-white' 
                        : 'bg-[var(--color-warning)] text-white'
                    }`}
                  >
                    <CheckCircle size={16} />
                    {historicoPagamento.status === 'Pago' ? 'PAGO' : 'PENDENTE'}
                  </button>
                </div>

                {historicoPagamento.status === 'Pago' && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Data</label>
                      <input 
                        type="date" 
                        value={historicoPagamento.data || ''}
                        onChange={(e) => setHistoricoPagamento(prev => ({ ...prev, data: e.target.value }))}
                        className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Forma</label>
                      <select 
                        value={historicoPagamento.forma || ''}
                        onChange={(e) => setHistoricoPagamento(prev => ({ ...prev, forma: e.target.value }))}
                        className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none font-medium"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Crédito">Crédito</option>
                        <option value="Débito">Débito</option>
                        <option value="Transferência">Transferência</option>
                        <option value="Dinheiro">Dinheiro</option>
                      </select>
                    </div>
                    {historicoPagamento.forma === 'Transferência' && (
                      <div className="col-span-2 mt-2">
                        <label className="block text-[10px] font-bold text-[var(--color-text-sec-light)] uppercase mb-1">Banco</label>
                        <input 
                          type="text" 
                          placeholder="Nome do Banco"
                          value={historicoPagamento.banco || ''}
                          onChange={(e) => setHistoricoPagamento(prev => ({ ...prev, banco: e.target.value }))}
                          className="w-full bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none font-medium"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Totais */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-t border-gray-200 dark:border-gray-800 p-6 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] shrink-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase">Valor Bruto</span>
          <span className="text-sm font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">{formatCurrency(totais.bruto)}</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] uppercase">Economia (Desconto)</span>
          <span className="text-sm font-bold text-[var(--color-success)]">-{formatCurrency(totais.descontoTotal)}</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800 mb-5">
          <span className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">VALOR FINAL</span>
          <span className="text-2xl font-black text-[var(--color-primary)]">{formatCurrency(totais.final)}</span>
        </div>
        
        <button 
          onClick={handleSave}
          className="w-full py-4 bg-[var(--color-primary)] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Save size={20} />
          {editingPacoteId ? 'ATUALIZAR PACOTE' : 'SALVAR PACOTE'}
        </button>
      </div>
    </div>
  );
}
