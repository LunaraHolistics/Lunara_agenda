import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { Terapia } from '../types';
import { useAppContext } from '../AppContext';

export default function TerapiasScreen() {
  const { showNotification, confirmAction, addTerapia, updateTerapia, deleteTerapia, terapias } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerapia, setEditingTerapia] = useState<Terapia | null>(null);
  
  // Form states
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [duracao, setDuracao] = useState('');

  const handleSave = async () => {
    const parsedValor = parseFloat(valor.replace(',', '.'));
    const parsedDuracao = parseInt(duracao, 10);

    if (!nome.trim()) {
      showNotification('O nome da terapia é obrigatório.', 'error');
      return;
    }

    if (isNaN(parsedValor) || parsedValor <= 0) {
      showNotification('O valor deve ser um número positivo.', 'error');
      return;
    }

    if (isNaN(parsedDuracao) || parsedDuracao <= 0) {
      showNotification('A duração deve ser um número positivo.', 'error');
      return;
    }

    const terapiaData: Omit<Terapia, 'id'> = {
      nome,
      valor: parsedValor,
      duracao: parsedDuracao,
    };

    if (editingTerapia) {
      updateTerapia({ ...editingTerapia, ...terapiaData });
    } else {
      addTerapia(terapiaData);
    }

    closeModal();
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    deleteTerapia(id);
    setConfirmDeleteId(null);
  };

  const openModal = (terapia?: Terapia) => {
    if (terapia) {
      setEditingTerapia(terapia);
      setNome(terapia.nome);
      setValor(String(terapia.valor || 0));
      setDuracao(String(terapia.duracao || 0));
    } else {
      setEditingTerapia(null);
      setNome('');
      setValor('');
      setDuracao('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTerapia(null);
    setConfirmDeleteId(null);
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
        {(terapias || []).length === 0 ? (
          <div className="text-center text-[var(--color-text-sec-light)] mt-10">
            Nenhuma terapia cadastrada.
          </div>
        ) : (
          <div className="space-y-3">
            {(terapias || []).map(terapia => (
              <div 
                key={terapia.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('terapiaId', terapia.id);
                  e.dataTransfer.setData('name', terapia.nome);
                  e.dataTransfer.setData('time', `${terapia.duracao} min`);
                }}
                className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-grab active:cursor-grabbing"
              >
                <div>
                  <h3 className="font-medium text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-lg">
                    {terapia.nome || "Sem nome"}
                  </h3>
                  <p className="text-[var(--color-text-sec-light)] dark:text-[var(--color-text-sec-dark)] text-sm mt-1">
                    {terapia.duracao} minutos
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-[var(--color-primary)] text-lg">
                    {formatCurrency(terapia.valor)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openModal(terapia)}
                      className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-full transition-colors"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirmDeleteId === terapia.id) {
                          handleDelete(terapia.id);
                        } else {
                          setConfirmDeleteId(terapia.id);
                          setTimeout(() => setConfirmDeleteId(null), 3000);
                        }
                      }}
                      className={`p-2 rounded-full transition-colors ${confirmDeleteId === terapia.id ? 'bg-[var(--color-error)] text-white' : 'text-[var(--color-error)] hover:bg-[var(--color-error)]/10'}`}
                    >
                      {confirmDeleteId === terapia.id ? 'Excluir?' : <Trash2 size={20} />}
                    </button>
                  </div>
                </div>
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-light)] dark:bg-[var(--color-bg-dark)] w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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
                    min="0"
                    value={valor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) {
                        setValor(val);
                      }
                    }}
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
                    min="0"
                    value={duracao}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || parseInt(val, 10) >= 0) {
                        setDuracao(val);
                      }
                    }}
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
