import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { StorageService, StorageKeys } from '../services/StorageService';
import { Terapia } from '../types';

export default function TerapiasScreen() {
  const [terapias, setTerapias] = useState<Terapia[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerapia, setEditingTerapia] = useState<Terapia | null>(null);
  
  // Form states
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [duracao, setDuracao] = useState('');

  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  useEffect(() => {
    loadTerapias();
  }, []);

  const loadTerapias = async () => {
    const data = await StorageService.getItems<Terapia>(StorageKeys.TERAPIAS);
    setTerapias(data);
  };

  const handleSave = async () => {
    if (!nome.trim() || !valor || !duracao) {
      alert('Preencha todos os campos corretamente.');
      return;
    }

    const terapiaData: Terapia = {
      id: editingTerapia ? editingTerapia.id : Date.now().toString(),
      nome,
      valor: parseFloat(valor.replace(',', '.')),
      duracao: parseInt(duracao, 10),
    };

    if (editingTerapia) {
      await StorageService.updateItem(StorageKeys.TERAPIAS, terapiaData);
    } else {
      await StorageService.saveItem(StorageKeys.TERAPIAS, terapiaData);
    }

    closeModal();
    loadTerapias();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Deseja realmente excluir esta terapia?')) {
      await StorageService.deleteItem(StorageKeys.TERAPIAS, id);
      loadTerapias();
      setActiveActionId(null);
    }
  };

  const openModal = (terapia?: Terapia) => {
    if (terapia) {
      setEditingTerapia(terapia);
      setNome(terapia.nome);
      setValor(terapia.valor.toString());
      setDuracao(terapia.duracao.toString());
    } else {
      setEditingTerapia(null);
      setNome('');
      setValor('');
      setDuracao('');
    }
    setIsModalOpen(true);
    setActiveActionId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTerapia(null);
  };

  // Long press logic
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (id: string) => {
    timerRef.current = setTimeout(() => {
      setActiveActionId(id);
    }, 500); // 500ms long press
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="p-4 bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] sticky top-0 z-10">
        <h2 className="text-xl font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
          Terapias Oferecidas
        </h2>
        <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm mt-1">
          Gerencie seus serviços e valores
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {terapias.length === 0 ? (
          <div className="text-center text-[var(--color-text-sec-light)] mt-10">
            Nenhuma terapia cadastrada.
          </div>
        ) : (
          <div className="space-y-3">
            {terapias.map(terapia => (
              <div 
                key={terapia.id}
                onPointerDown={() => handlePointerDown(terapia.id)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm relative overflow-hidden select-none flex justify-between items-center"
              >
                <div>
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-lg">
                    {terapia.nome}
                  </h3>
                  <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm mt-1">
                    {terapia.duracao} minutos
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-[var(--color-primary)] text-lg">
                    {formatCurrency(terapia.valor)}
                  </span>
                </div>

                {/* Actions Overlay (shown on long press) */}
                {activeActionId === terapia.id && (
                  <div className="absolute inset-0 bg-[var(--color-surface-light)]/90 dark:bg-[var(--color-surface-dark)]/90 backdrop-blur-sm flex items-center justify-center gap-4">
                    <button 
                      onClick={() => openModal(terapia)}
                      className="p-3 bg-[var(--color-primary)] text-white rounded-full shadow-md"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete(terapia.id)}
                      className="p-3 bg-[var(--color-error)] text-white rounded-full shadow-md"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button 
                      onClick={() => setActiveActionId(null)}
                      className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full shadow-md"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => openModal()}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity z-20"
      >
        <Plus size={28} />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                {editingTerapia ? 'Editar Terapia' : 'Nova Terapia'}
              </h2>
              <button onClick={closeModal} className="text-[var(--color-text-sec-light)] p-1">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
                  Nome da Terapia *
                </label>
                <input 
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Ex: Massagem Relaxante"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
                    Valor (R$) *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] mb-1">
                    Duração (min) *
                  </label>
                  <input 
                    type="number"
                    value={duracao}
                    onChange={(e) => setDuracao(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="60"
                  />
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full py-3.5 mt-4 bg-[var(--color-primary)] text-white font-medium rounded-xl shadow-md hover:opacity-90 transition-opacity"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
